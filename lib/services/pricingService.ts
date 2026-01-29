import { emitEvent } from "../events/eventBus";
import {
  BookingRequestedEvent,
  PricingCalculatedEvent,
  SagaEvent,
} from "../events/types";
import { updateBooking } from "../db/models/booking";
import { getDiscountPercentage } from "../db/models/serviceConfig";

const SERVICE_NAME = "PricingService";

/**
 * Business Rule R1:
 * Apply discount if either:
 * - User is female AND today is her birthday
 * - OR total base price > ₹1000
 */
function checkDiscountEligibility(
  gender: "male" | "female",
  dateOfBirth: string,
  basePrice: number,
): { isEligible: boolean; reason?: string } {
  // Check if birthday (ignoring year)
  const today = new Date();
  const dob = new Date(dateOfBirth);
  const isBirthday =
    today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth();

  // Rule 1: Female with birthday today
  if (gender === "female" && isBirthday) {
    return {
      isEligible: true,
      reason: "Birthday discount - Female customer on birthday",
    };
  }

  // Rule 2: Base price > ₹1000
  if (basePrice > 1000) {
    return {
      isEligible: true,
      reason: `Order value discount - Base price ₹${basePrice} exceeds ₹1000`,
    };
  }

  return { isEligible: false };
}

/**
 * Handles BookingRequested event - calculates pricing
 */
export async function handleBookingRequested(event: SagaEvent): Promise<void> {
  if (event.eventType !== "BookingRequested") return;

  const bookingEvent = event as BookingRequestedEvent;
  const { gender, dateOfBirth, services } = bookingEvent.data;

  // Calculate base price
  const basePrice = services.reduce((sum, service) => sum + service.price, 0);

  // Check discount eligibility (R1 rule)
  const discountCheck = checkDiscountEligibility(
    gender,
    dateOfBirth,
    basePrice,
  );

  // Get discount percentage from config (default 12%)
  const discountPercentage = await getDiscountPercentage();
  const discountDecimal = discountPercentage / 100;

  const discountAmount = discountCheck.isEligible
    ? Math.round(basePrice * discountDecimal)
    : 0;

  const finalPrice = basePrice - discountAmount;

  // Update booking with pricing info
  await updateBooking(event.correlationId, {
    basePrice,
    discountEligible: discountCheck.isEligible,
    status: "pricing_calculated",
  });

  // Emit PricingCalculated event
  await emitEvent<PricingCalculatedEvent>(
    {
      correlationId: event.correlationId,
      eventType: "PricingCalculated",
      data: {
        basePrice,
        discountEligible: discountCheck.isEligible,
        discountPercentage: discountCheck.isEligible ? discountPercentage : 0,
        discountAmount,
        finalPrice,
        reason: discountCheck.reason,
      },
    },
    SERVICE_NAME,
  );
}
