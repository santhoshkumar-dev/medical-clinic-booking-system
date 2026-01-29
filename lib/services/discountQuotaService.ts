import { emitEvent } from "../events/eventBus";
import {
  PricingCalculatedEvent,
  DiscountQuotaReservedEvent,
  DiscountQuotaRejectedEvent,
  DiscountQuotaReleasedEvent,
  CompensationTriggeredEvent,
  SagaEvent,
} from "../events/types";
import { updateBooking } from "../db/models/booking";
import {
  reserveQuota,
  releaseQuota,
  getQuotaStatus,
} from "../db/models/discountQuota";
import { failBooking } from "./bookingService";

const SERVICE_NAME = "DiscountQuotaService";

/**
 * Handles PricingCalculated event - reserves discount quota if eligible
 */
export async function handlePricingCalculated(event: SagaEvent): Promise<void> {
  if (event.eventType !== "PricingCalculated") return;

  const pricingEvent = event as PricingCalculatedEvent;
  const { discountEligible } = pricingEvent.data;

  // If no discount is eligible, skip quota reservation and proceed directly
  if (!discountEligible) {
    // Emit a special quota reserved event (no quota actually used)
    const quotaStatus = await getQuotaStatus();

    await emitEvent<DiscountQuotaReservedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaReserved",
        data: {
          quotaUsed: quotaStatus.used,
          quotaLimit: quotaStatus.limit,
        },
      },
      SERVICE_NAME,
    );
    return;
  }

  // Try to reserve a quota slot
  const reserved = await reserveQuota(event.correlationId);

  if (reserved) {
    const quotaStatus = await getQuotaStatus();

    // Update booking to show quota was reserved
    await updateBooking(event.correlationId, {
      status: "quota_reserved",
      discountApplied: true,
      discountAmount: pricingEvent.data.discountAmount,
      finalPrice: pricingEvent.data.finalPrice,
    });

    await emitEvent<DiscountQuotaReservedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaReserved",
        data: {
          quotaUsed: quotaStatus.used,
          quotaLimit: quotaStatus.limit,
        },
      },
      SERVICE_NAME,
    );
  } else {
    // Quota exhausted - reject immediately (no compensation needed, saga stops here)
    await updateBooking(event.correlationId, {
      status: "quota_rejected",
    });

    await emitEvent<DiscountQuotaRejectedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaRejected",
        data: {
          reason: "Daily discount quota reached. Please try again tomorrow.",
        },
      },
      SERVICE_NAME,
    );

    // Fail the booking (no compensation needed as nothing was committed yet)
    await failBooking(
      event.correlationId,
      "Daily discount quota reached. Please try again tomorrow.",
      false,
    );
  }
}

/**
 * Handles CompensationTriggered event - releases previously reserved quota
 */
export async function handleCompensationTriggered(
  event: SagaEvent,
): Promise<void> {
  if (event.eventType !== "CompensationTriggered") return;

  const compensationEvent = event as CompensationTriggeredEvent;

  // Release the quota that was previously reserved
  const released = await releaseQuota(event.correlationId);

  if (released) {
    await emitEvent<DiscountQuotaReleasedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaReleased",
        data: {
          reason: `Compensation for ${compensationEvent.data.originalEvent}: ${compensationEvent.data.reason}`,
        },
      },
      SERVICE_NAME,
    );
  }

  // Mark the booking as failed after compensation is complete
  await failBooking(
    event.correlationId,
    compensationEvent.data.reason,
    true, // compensation was executed
  );
}
