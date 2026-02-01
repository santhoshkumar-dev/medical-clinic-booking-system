import { NextRequest, NextResponse } from "next/server";
import { initiateBooking } from "@/lib/services/bookingService";
import {
  getServicesByIds,
  seedServicesIfEmpty,
} from "@/lib/db/models/medicalService";
import { getServerSession } from "@/lib/auth/server";

// SAGA is initialized at server startup via instrumentation.ts

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure services are seeded
    await seedServicesIfEmpty();

    // Get user session (required)
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to book an appointment" },
        { status: 401 },
      );
    }

    if (session.user.role !== "user") {
      return NextResponse.json(
        {
          error:
            "Only registered users can book appointments. Admins must use a separate user account.",
        },
        { status: 403 },
      );
    }

    const userId = session.user.id;

    // Validate required fields
    const { customerName, gender, dateOfBirth, serviceIds } = body;

    if (!customerName || typeof customerName !== "string") {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 },
      );
    }

    if (!gender || !["male", "female"].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be "male" or "female"' },
        { status: 400 },
      );
    }

    if (!dateOfBirth || isNaN(Date.parse(dateOfBirth))) {
      return NextResponse.json(
        { error: "Valid date of birth is required" },
        { status: 400 },
      );
    }

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: "At least one service must be selected" },
        { status: 400 },
      );
    }

    // Fetch services from database
    const dbServices = await getServicesByIds(serviceIds);

    if (dbServices.length !== serviceIds.length) {
      const found = dbServices.map((s) => s.id);
      const missing = serviceIds.filter((id: string) => !found.includes(id));
      return NextResponse.json(
        { error: `Invalid service IDs: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // Map to service items
    const services = dbServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
    }));

    // Initiate booking SAGA
    // Quota check happens INSIDE the SAGA (DiscountQuotaService)
    // If quota exhausted, SAGA will handle rejection via compensation flow
    const correlationId = await initiateBooking({
      customerName,
      gender,
      dateOfBirth,
      services,
      userId,
    });

    return NextResponse.json({
      success: true,
      correlationId,
      message:
        "Booking request submitted. Use the correlationId to track status.",
    });
  } catch (error) {
    console.error("Error initiating booking:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initiate booking",
      },
      { status: 500 },
    );
  }
}
