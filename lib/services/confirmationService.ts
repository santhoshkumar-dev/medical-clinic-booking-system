import { emitEvent } from "../events/eventBus";
import {
  PaymentCompletedEvent,
  BookingConfirmedEvent,
  SagaEvent,
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

  // Generate a human-readable reference ID
  const referenceId = await generateReferenceId();

  // Update booking to confirmed status
  await updateBooking(event.correlationId, {
    status: "confirmed",
    referenceId,
    finalPrice: paymentEvent.data.amount,
  });

  // Emit BookingConfirmed event - terminal success state
  await emitEvent<BookingConfirmedEvent>(
    {
      correlationId: event.correlationId,
      eventType: "BookingConfirmed",
      data: {
        referenceId,
        finalPrice: paymentEvent.data.amount,
        discountApplied: booking.discountApplied,
      },
    },
    SERVICE_NAME,
  );
}
