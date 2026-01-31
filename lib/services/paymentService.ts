import { emitEvent } from "../events/eventBus";
import {
  DiscountQuotaReservedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  CompensationTriggeredEvent,
  PaymentReversedEvent,
  SagaEvent,
} from "../events/types";
import { updateBooking, getBookingByCorrelationId } from "../db/models/booking";
import { failBooking } from "./bookingService";
import { v4 as uuidv4 } from "uuid";

const SERVICE_NAME = "PaymentService";

// Simulated payment processing
// In production, this would integrate with a real payment gateway
const PAYMENT_SIMULATION_MODE =
  process.env.PAYMENT_SIMULATION_MODE || "success";

// Store for payment transactions (in-memory for simulation)
const paymentTransactions: Map<
  string,
  { transactionId: string; amount: number }
> = new Map();

/**
 * Simulates payment processing
 * Returns true for success, false for failure
 */
function simulatePayment(
  correlationId: string,
  amount: number,
): { success: boolean; transactionId?: string; error?: string } {
  // Check simulation mode
  if (PAYMENT_SIMULATION_MODE === "fail") {
    return {
      success: false,
      error: "Payment declined by issuing bank (simulated failure)",
    };
  }

  // Random failure for testing (10% chance when mode is 'random')
  if (PAYMENT_SIMULATION_MODE === "random" && Math.random() < 0.1) {
    return {
      success: false,
      error: "Transaction timeout (simulated random failure)",
    };
  }

  // Success case
  const transactionId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
  paymentTransactions.set(correlationId, { transactionId, amount });

  return { success: true, transactionId };
}

/**
 * Handles DiscountQuotaReserved event - processes payment
 */
export async function handleDiscountQuotaReserved(
  event: SagaEvent,
): Promise<void> {
  if (event.eventType !== "DiscountQuotaReserved") return;

  // Get the booking to find the final price
  const booking = await getBookingByCorrelationId(event.correlationId);
  if (!booking) {
    console.error(
      `Booking not found for correlation ID: ${event.correlationId}`,
    );
    return;
  }

  const amount = booking.finalPrice;

  // Process payment
  const paymentResult = simulatePayment(event.correlationId, amount);

  if (paymentResult.success) {
    await updateBooking(event.correlationId, {
      status: "payment_completed",
    });

    await emitEvent<PaymentCompletedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "PaymentCompleted",
        data: {
          amount,
          transactionId: paymentResult.transactionId!,
        },
      },
      SERVICE_NAME,
    );
  } else {
    await updateBooking(event.correlationId, {
      status: "payment_failed",
    });

    await emitEvent<PaymentFailedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "PaymentFailed",
        data: {
          reason: paymentResult.error!,
          requiresCompensation: booking.discountApplied, // Only need compensation if quota was reserved
        },
      },
      SERVICE_NAME,
    );

    // Trigger compensation if quota was reserved
    if (booking.discountApplied) {
      await emitEvent<CompensationTriggeredEvent>(
        {
          correlationId: event.correlationId,
          eventType: "CompensationTriggered",
          data: {
            originalEvent: "PaymentFailed",
            reason: paymentResult.error!,
          },
        },
        SERVICE_NAME,
      );
    } else {
      // No compensation needed - directly fail the booking
      await failBooking(
        event.correlationId,
        paymentResult.error!,
        false, // no compensation executed
      );
    }
  }
}

/**
 * Handles CompensationTriggered for payment reversal
 */
export async function handlePaymentCompensation(
  event: SagaEvent,
): Promise<void> {
  if (event.eventType !== "CompensationTriggered") return;

  const payment = paymentTransactions.get(event.correlationId);

  if (payment) {
    // In a real system, we would call the payment gateway to reverse/refund
    paymentTransactions.delete(event.correlationId);

    await emitEvent<PaymentReversedEvent>(
      {
        correlationId: event.correlationId,
        eventType: "PaymentReversed",
        data: {
          transactionId: payment.transactionId,
          reason: "Payment reversed due to booking failure",
        },
      },
      SERVICE_NAME,
    );
  }
}
