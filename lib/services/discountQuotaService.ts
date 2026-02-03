import { emitEvent } from "../events/eventBus";
import {
  PricingCalculatedEvent,
  DiscountQuotaReservedEvent,
  DiscountQuotaReleasedEvent,
  CompensationTriggeredEvent,
  SagaEvent,
} from "../events/types";
import { updateBooking } from "../db/models/booking";
import { releaseQuota } from "../db/models/discountQuota";
import { failBooking } from "./bookingService";

const SERVICE_NAME = "DiscountQuotaService";

export async function handlePricingCalculated(event: SagaEvent): Promise<void> {
  if (event.eventType !== "PricingCalculated") return;

  const pricingEvent = event as PricingCalculatedEvent;
  const { discountEligible, basePrice, discountAmount, finalPrice } =
    pricingEvent.data;

  // Case 1: Not discount eligible
  if (!discountEligible) {
    await updateBooking(event.correlationId, {
      status: "priced",
      discountApplied: false,
      discountAmount: 0,
      finalPrice: basePrice,
    });

    await emitEvent<DiscountQuotaReservedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "DiscountQuotaReserved",
        data: {
          discountApplied: false,
        },
      },
      SERVICE_NAME,
    );

    return;
  }

  console.log(
    `[${SERVICE_NAME}] Pricing completed for ${event.correlationId}, discount eligible: ₹${discountAmount}`,
  );

  // Update booking with discounted price so PaymentService sees correct amount
  await updateBooking(event.correlationId, {
    status: "priced",
    discountApplied: true,
    discountAmount: discountAmount,
    finalPrice: finalPrice,
  });

  // Proceed to payment — quota will be checked AFTER payment
  await emitEvent<DiscountQuotaReservedEvent>(
    {
      correlationId: event.correlationId,
      eventType: "DiscountQuotaReserved",
      data: {
        discountApplied: true,
      },
    },
    SERVICE_NAME,
  );
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
