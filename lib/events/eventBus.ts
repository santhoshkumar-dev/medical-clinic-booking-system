import {
  SagaEvent,
  SagaEventType,
  AdminEvent,
  AdminEventType,
  EventType,
  AnyEvent,
  EventHandler,
} from "./types";
import { appendSagaEvent } from "../db/models/sagaEvent";
import { createAuditLog, ActorType, ActionSource } from "../db/models/auditLog";
import { getPublisher, getSubscriber } from "../db/redis";

// Channel prefix for event types
const CHANNEL_PREFIX = "saga:events:";

/**
 * Redis-backed Event Bus for SAGA choreography and Admin events
 *
 * This event bus uses Redis Pub/Sub:
 * 1. Publishes events to Redis channels
 * 2. Subscribers receive events via Redis subscription
 * 3. All events are persisted to MongoDB for durability
 */
class RedisEventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private isSubscribed: boolean = false;

  /**
   * Subscribe a handler to a specific event type
   */
  subscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Initialize Redis subscriber to listen for events
   * This should be called once at startup
   */
  async initializeSubscriber(): Promise<void> {
    if (this.isSubscribed) return;

    const subscriber = getSubscriber();

    // Subscribe to all event channels
    const allEventTypes: EventType[] = [
      // SAGA events
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
      "QuotaCheckRequested",
      // Admin events
      "AdminAuthenticated",
      "DiscountQuotaUpdated",
      "AdminActionLogged",
    ];

    // Subscribe to each channel
    for (const eventType of allEventTypes) {
      await subscriber.subscribe(`${CHANNEL_PREFIX}${eventType}`);
    }

    // Handle incoming messages
    subscriber.on("message", async (channel, message) => {
      try {
        const eventType = channel.replace(CHANNEL_PREFIX, "") as EventType;
        const event = JSON.parse(message);

        // Convert timestamp string back to Date
        event.timestamp = new Date(event.timestamp);

        // Call all registered handlers for this event type
        const handlers = this.handlers.get(eventType) || [];
        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (error) {
            console.error(`[EventBus] Handler error for ${eventType}:`, error);
          }
        }
      } catch (error) {
        console.error("[EventBus] Message parsing error:", error);
      }
    });

    this.isSubscribed = true;
    console.log("[EventBus] Redis subscriber initialized");
  }

  /**
   * Publish an event - persists to MongoDB and publishes to Redis
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

    // 3. Publish to Redis channel
    const publisher = getPublisher();
    const channel = `${CHANNEL_PREFIX}${event.eventType}`;
    const message = JSON.stringify(event);

    await publisher.publish(channel, message);

    console.log(`[EventBus] Published ${event.eventType} to Redis`);
  }

  /**
   * Get all subscriptions (for debugging)
   */
  getSubscriptions(): Map<EventType, EventHandler[]> {
    return this.handlers;
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
      "QuotaCheckRequested",
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
export const eventBus = new RedisEventBus();

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
