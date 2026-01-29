import { emitEvent } from "../events/eventBus";
import {
  BookingRequestedEvent,
  BookingFailedEvent,
  SagaEvent,
} from "../events/types";
import {
  createBooking,
  updateBooking,
  Booking,
  ServiceItem,
} from "../db/models/booking";
import { generateCorrelationId } from "../events/correlationId";

const SERVICE_NAME = "BookingService";

export interface CreateBookingRequest {
  customerName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  services: ServiceItem[];
  userId?: string; // Links to authenticated user
}

/**
 * Creates a new booking and initiates the SAGA
 */
export async function initiateBooking(
  request: CreateBookingRequest,
): Promise<string> {
  const correlationId = generateCorrelationId();

  // Calculate base price
  const basePrice = request.services.reduce(
    (sum, service) => sum + service.price,
    0,
  );

  // Create booking record in pending state
  await createBooking({
    correlationId,
    userId: request.userId,
    customerName: request.customerName,
    gender: request.gender,
    dateOfBirth: request.dateOfBirth,
    services: request.services,
    basePrice,
    discountEligible: false,
    discountApplied: false,
    discountAmount: 0,
    finalPrice: basePrice,
    status: "pending",
  });

  // Emit BookingRequested event to start the SAGA
  await emitEvent<BookingRequestedEvent>(
    {
      correlationId,
      eventType: "BookingRequested",
      data: {
        customerName: request.customerName,
        gender: request.gender,
        dateOfBirth: request.dateOfBirth,
        services: request.services,
      },
    },
    SERVICE_NAME,
  );

  return correlationId;
}

/**
 * Handles BookingFailed event - marks booking as failed
 */
export async function handleBookingFailed(event: SagaEvent): Promise<void> {
  if (event.eventType !== "BookingFailed") return;

  const failedEvent = event as BookingFailedEvent;

  await updateBooking(event.correlationId, {
    status: "failed",
    errorMessage: failedEvent.data.reason,
  });
}

/**
 * Mark a booking as failed and emit BookingFailed event
 */
export async function failBooking(
  correlationId: string,
  reason: string,
  compensationExecuted: boolean,
): Promise<void> {
  await updateBooking(correlationId, {
    status: "failed",
    errorMessage: reason,
  });

  await emitEvent<BookingFailedEvent>(
    {
      correlationId,
      eventType: "BookingFailed",
      data: {
        reason,
        compensationExecuted,
      },
    },
    SERVICE_NAME,
  );
}
