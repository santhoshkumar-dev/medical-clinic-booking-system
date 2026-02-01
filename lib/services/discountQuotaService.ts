import { emitEvent } from "../events/eventBus";
import {
  PricingCalculatedEvent,
  DiscountQuotaReservedEvent,
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
 *
 * BEHAVIOR:
 * - If not discount eligible: proceed with base price
 * - If discount eligible AND quota available: apply discount
 * - If discount eligible BUT quota exhausted: REJECT booking (R2 requirement)
 */
export async function handlePricingCalculated(event: SagaEvent): Promise<void> {
  if (event.eventType !== "PricingCalculated") return;

  const pricingEvent = event as PricingCalculatedEvent;
  const { discountEligible, basePrice, discountAmount, finalPrice } =
    pricingEvent.data;
  const quotaStatus = await getQuotaStatus();

  // Case 1: No discount eligible - proceed with base price (no quota needed)
  if (!discountEligible) {
    // Update booking with final price = base price (no discount)
    await updateBooking(event.correlationId, {
      status: "quota_reserved",
      discountApplied: false,
      discountAmount: 0,
      finalPrice: basePrice,
    });

    await emitEvent<DiscountQuotaReservedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaReserved",
        data: {
          quotaUsed: quotaStatus.used,
          quotaLimit: quotaStatus.limit,
          discountApplied: false,
        },
      },
      SERVICE_NAME,
    );
    return;
  }

  // Case 2 & 3: Discount eligible - try to reserve quota
  const reserved = await reserveQuota(event.correlationId);

  if (reserved) {
    // Case 2: Quota available - apply discount
    const updatedQuotaStatus = await getQuotaStatus();

    await updateBooking(event.correlationId, {
      status: "quota_reserved",
      discountApplied: true,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
    });

    console.log(
      `[${SERVICE_NAME}] Quota reserved for ${event.correlationId}, discount applied: ₹${discountAmount}`,
    );

    await emitEvent<DiscountQuotaReservedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaReserved",
        data: {
          quotaUsed: updatedQuotaStatus.used,
          quotaLimit: updatedQuotaStatus.limit,
          discountApplied: true,
        },
      },
      SERVICE_NAME,
    );
  } else {
    // Case 3: Quota exhausted - REJECT the booking (R2 requirement)
    console.log(
      `[${SERVICE_NAME}] Quota exhausted for ${event.correlationId}, REJECTING booking`,
    );

    // Fail the booking immediately with quota exhaustion message
    await failBooking(
      event.correlationId,
      "Daily discount quota reached. Please try again tomorrow.",
      false, // no compensation needed - nothing was reserved
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
