import { emitEvent } from "../events/eventBus";
import {
  SagaEvent,
  BookingConfirmedEvent,
  CompensationTriggeredEvent,
} from "../events/types";
import {
  getBookingByCorrelationId,
  updateBooking,
  generateReferenceId,
} from "../db/models/booking";
import { getQuotaStatus, reserveQuota } from "../db/models/discountQuota";
import { failBooking } from "./bookingService";

const SERVICE_NAME = "QuotaCheckSaga";

export async function handleQuotaCheckRequested(
  event: SagaEvent,
): Promise<void> {
  if (event.eventType !== "QuotaCheckRequested") return;

  console.log(
    `[${SERVICE_NAME}] Handling QuotaCheckRequested for ${event.correlationId}`,
  );

  const booking = await getBookingByCorrelationId(event.correlationId);
  if (!booking) {
    console.error(
      `[${SERVICE_NAME}] Booking not found: ${event.correlationId}`,
    );
    return;
  }

  if (booking.discountApplied) {
    const quota = await getQuotaStatus();

    // Check if quota is exhausted
    if (quota.used >= quota.limit) {
      const reason =
        "Quota exhausted during final check. Please try again tomorrow.";

      await emitEvent<CompensationTriggeredEvent>(
        {
          correlationId: event.correlationId,
          eventType: "CompensationTriggered",
          data: {
            originalEvent: "QuotaCheckRequested",
            reason,
          },
        },
        SERVICE_NAME,
      );
      return;
    }

    // Reserve quota confirmed
    await reserveQuota(event.correlationId);
    console.log(
      `[${SERVICE_NAME}] Quota reserved/validated for ${event.correlationId}`,
    );
  }

  // ✅ FINAL CONFIRMATION
  const referenceId = await generateReferenceId();
  console.log(
    `[${SERVICE_NAME}] Confirming booking ${event.correlationId} with Ref: ${referenceId}`,
  );

  await updateBooking(event.correlationId, {
    status: "confirmed",
    referenceId,
  });

  await emitEvent<BookingConfirmedEvent>(
    {
      correlationId: event.correlationId,
      eventType: "BookingConfirmed",
      data: {
        referenceId,
        finalPrice: booking.finalPrice,
        discountApplied: booking.discountApplied,
      },
    },
    SERVICE_NAME,
  );
}
