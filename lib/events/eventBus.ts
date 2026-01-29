import {
  SagaEvent,
  SagaEventType,
  AdminEvent,
  AdminEventType,
  EventType,
  AnyEvent,
  EventHandler,
  EventSubscription,
} from "./types";
import { appendSagaEvent } from "../db/models/sagaEvent";
import { createAuditLog, ActorType, ActionSource } from "../db/models/auditLog";

/**
 * MongoDB-backed Event Bus for SAGA choreography and Admin events
 *
 * This event bus:
 * 1. Persists all events to MongoDB for durability and tracing
 * 2. Routes events to subscribed handlers
 * 3. Provides structured logging for all events
 */
class EventBus {
  private subscriptions: Map<EventType, EventHandler[]> = new Map();

  /**
   * Subscribe a handler to a specific event type
   */
  subscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.subscriptions.get(eventType) || [];
    handlers.push(handler);
    this.subscriptions.set(eventType, handlers);
  }

  /**
   * Subscribe multiple handlers at once
   */
  subscribeAll(subscriptions: EventSubscription[]): void {
    for (const { eventType, handler } of subscriptions) {
      this.subscribe(eventType, handler);
    }
  }

  /**
   * Publish an event - persists to MongoDB and notifies all subscribers
   */
  async publish(
    event: AnyEvent,
    service: string,
    options?: {
      actorType?: ActorType;
      actorId?: string;
      actionSource?: ActionSource;
    },
  ): Promise<void> {
    const actorType = options?.actorType || this.getActorType(event.eventType);
    const actionSource =
      options?.actionSource || this.getActionSource(event.eventType);

    // 1. Persist event to saga event log (append-only) - only for SAGA events
    if (this.isSagaEvent(event.eventType)) {
      await appendSagaEvent({
        correlationId: event.correlationId,
        eventType: event.eventType as SagaEventType,
        service,
        status: this.getEventStatus(event.eventType),
        data: event.data as Record<string, unknown>,
      });
    }

    // 2. Create audit log entry
    await createAuditLog({
      correlationId: event.correlationId,
      event: event.eventType,
      service,
      status: this.getEventStatus(event.eventType),
      data: event.data as Record<string, unknown>,
      actorType,
      actorId: options?.actorId,
      actionSource,
    });

    // 3. Notify all subscribers (fire and forget for choreography)
    const handlers = this.subscriptions.get(event.eventType) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error in handler for ${event.eventType}:`, error);
      }
    }
  }

  /**
   * Get all subscriptions (for debugging)
   */
  getSubscriptions(): Map<EventType, EventHandler[]> {
    return this.subscriptions;
  }

  /**
   * Check if event type is a SAGA event
   */
  private isSagaEvent(eventType: EventType): boolean {
    const sagaEvents: SagaEventType[] = [
      "BookingRequested",
      "PricingCalculated",
      "DiscountQuotaReserved",
      "DiscountQuotaRejected",
      "PaymentCompleted",
      "PaymentFailed",
      "BookingConfirmed",
      "BookingFailed",
      "CompensationTriggered",
      "DiscountQuotaReleased",
      "PaymentReversed",
    ];
    return sagaEvents.includes(eventType as SagaEventType);
  }

  /**
   * Determine actor type based on event type
   */
  private getActorType(eventType: EventType): ActorType {
    const adminEvents: AdminEventType[] = [
      "AdminAuthenticated",
      "DiscountQuotaUpdated",
      "AdminActionLogged",
    ];
    return adminEvents.includes(eventType as AdminEventType)
      ? "admin"
      : "system";
  }

  /**
   * Determine action source based on event type
   */
  private getActionSource(eventType: EventType): ActionSource {
    const adminEvents: AdminEventType[] = [
      "AdminAuthenticated",
      "DiscountQuotaUpdated",
      "AdminActionLogged",
    ];
    return adminEvents.includes(eventType as AdminEventType)
      ? "admin-panel"
      : "saga";
  }

  /**
   * Determine event status based on event type
   */
  private getEventStatus(
    eventType: EventType,
  ): "success" | "failure" | "compensation" {
    const failureEvents: EventType[] = [
      "DiscountQuotaRejected",
      "PaymentFailed",
      "BookingFailed",
    ];

    const compensationEvents: EventType[] = [
      "CompensationTriggered",
      "DiscountQuotaReleased",
      "PaymentReversed",
    ];

    if (failureEvents.includes(eventType)) {
      return "failure";
    }
    if (compensationEvents.includes(eventType)) {
      return "compensation";
    }
    return "success";
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Helper function to create and publish an event
 */
export async function emitEvent<T extends AnyEvent>(
  event: Omit<T, "timestamp">,
  service: string,
  options?: {
    actorType?: ActorType;
    actorId?: string;
    actionSource?: ActionSource;
  },
): Promise<void> {
  const fullEvent = {
    ...event,
    timestamp: new Date(),
  } as T;

  await eventBus.publish(fullEvent, service, options);
}
