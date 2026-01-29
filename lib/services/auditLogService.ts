import { eventBus } from "../events/eventBus";
import { SagaEvent, SagaEventType } from "../events/types";
import { createAuditLog } from "../db/models/auditLog";

const SERVICE_NAME = "AuditLogService";

// All event types to subscribe to
const ALL_EVENT_TYPES: SagaEventType[] = [
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

/**
 * Handles any event - creates structured audit log
 * This service subscribes to ALL events for observability
 */
export async function handleAnyEvent(event: SagaEvent): Promise<void> {
  // Note: The eventBus already logs via createAuditLog in the publish method
  // This handler is for any additional processing needed

  // Log compensation chain for debugging
  if (
    event.eventType === "CompensationTriggered" ||
    event.eventType === "DiscountQuotaReleased" ||
    event.eventType === "PaymentReversed" ||
    event.eventType === "BookingFailed"
  ) {
    console.log(
      `[COMPENSATION] ${event.eventType} for correlation ${event.correlationId}`,
    );
  }
}

/**
 * Register audit log handlers for all events
 */
export function registerAuditLogHandlers(): void {
  for (const eventType of ALL_EVENT_TYPES) {
    eventBus.subscribe(eventType, handleAnyEvent);
  }
}
