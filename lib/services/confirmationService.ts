import { emitEvent } from "../events/eventBus";
import {
  PaymentCompletedEvent,
  BookingConfirmedEvent,
  SagaEvent,
  QuotaCheckRequestedEvent,
} from "../events/types";
import {
  updateBooking,
  getBookingByCorrelationId,
  generateReferenceId,
} from "../db/models/booking";

const SERVICE_NAME = "ConfirmationService";

/**
 * Handles PaymentCompleted event - confirms the booking
 */
export async function handlePaymentCompleted(event: SagaEvent): Promise<void> {
  if (event.eventType !== "PaymentCompleted") return;

  const paymentEvent = event as PaymentCompletedEvent;

  // Get booking details
  const booking = await getBookingByCorrelationId(event.correlationId);
  if (!booking) {
    console.error(
      `Booking not found for correlation ID: ${event.correlationId}`,
    );
    return;
  }

  await emitEvent<QuotaCheckRequestedEvent>(
    {
      correlationId: event.correlationId,
      eventType: "QuotaCheckRequested",
      data: {
        amount: paymentEvent.data.amount,
        discountApplied: booking.discountApplied,
      },
    },
    SERVICE_NAME,
  );
}
