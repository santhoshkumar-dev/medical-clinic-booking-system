import { NextRequest, NextResponse } from "next/server";
import { getBookingByCorrelationId } from "@/lib/db/models/booking";
import { getSagaEvents } from "@/lib/db/models/sagaEvent";
import { initializeSaga } from "@/lib/services/sagaOrchestrator";

// Initialize SAGA on first request
initializeSaga();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: correlationId } = await params;

    if (!correlationId) {
      return NextResponse.json(
        { error: "Correlation ID is required" },
        { status: 400 },
      );
    }

    // Get booking details
    const booking = await getBookingByCorrelationId(correlationId);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get saga events for this booking
    const events = await getSagaEvents(correlationId);

    // Determine if saga is complete
    const isComplete = ["confirmed", "failed"].includes(booking.status);

    return NextResponse.json({
      correlationId,
      booking: {
        customerName: booking.customerName,
        gender: booking.gender,
        dateOfBirth: booking.dateOfBirth,
        services: booking.services,
        basePrice: booking.basePrice,
        discountEligible: booking.discountEligible,
        discountApplied: booking.discountApplied,
        discountAmount: booking.discountAmount,
        finalPrice: booking.finalPrice,
        status: booking.status,
        referenceId: booking.referenceId,
        errorMessage: booking.errorMessage,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
      events: events.map((event) => ({
        eventType: event.eventType,
        service: event.service,
        status: event.status,
        timestamp: event.timestamp,
        data: event.data,
      })),
      isComplete,
    });
  } catch (error) {
    console.error("Error fetching booking status:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking status" },
      { status: 500 },
    );
  }
}
