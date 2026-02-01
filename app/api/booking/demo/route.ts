import { NextRequest, NextResponse } from "next/server";
import { initiateBooking } from "@/lib/services/bookingService";
import {
  getServicesByIds,
  seedServicesIfEmpty,
} from "@/lib/db/models/medicalService";

// SAGA is initialized at server startup via instrumentation.ts

/**
 * Demo endpoint for CLI testing - bypasses authentication.
 * ⚠️ WARNING: This endpoint is for DEMO/TESTING PURPOSES ONLY.
 */
export async function POST(request: NextRequest) {
  const isDemoMode =
    request.headers.get("X-Demo-Mode") === "true" ||
    process.env.DEMO_MODE === "true" ||
    process.env.NODE_ENV === "development";

  if (!isDemoMode) {
    return NextResponse.json(
      { error: "Demo mode is not enabled." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    await seedServicesIfEmpty();

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

    const dbServices = await getServicesByIds(serviceIds);

    if (dbServices.length !== serviceIds.length) {
      const found = dbServices.map((s) => s.id);
      const missing = serviceIds.filter((id: string) => !found.includes(id));
      return NextResponse.json(
        { error: `Invalid service IDs: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const services = dbServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
    }));

    // Initiate booking SAGA
    // Quota check happens INSIDE the SAGA (DiscountQuotaService)
    const correlationId = await initiateBooking({
      customerName,
      gender,
      dateOfBirth,
      services,
    });

    return NextResponse.json({
      success: true,
      correlationId,
      message: "Booking request submitted (demo mode).",
    });
  } catch (error) {
    console.error("Error initiating demo booking:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initiate booking",
      },
      { status: 500 },
    );
  }
}
