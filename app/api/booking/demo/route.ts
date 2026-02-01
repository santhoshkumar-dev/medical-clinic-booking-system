import { NextRequest, NextResponse } from "next/server";
import { initiateBooking } from "@/lib/services/bookingService";
import {
  getServicesByIds,
  seedServicesIfEmpty,
} from "@/lib/db/models/medicalService";
import { getQuotaStatus } from "@/lib/db/models/discountQuota";

// SAGA is initialized at server startup via instrumentation.ts

/**
 * Demo endpoint for CLI testing - bypasses authentication.
 *
 * ⚠️ WARNING: This endpoint is for DEMO/TESTING PURPOSES ONLY.
 * In production, this should be disabled or secured.
 *
 * The main /api/booking endpoint requires authentication.
 * This /api/booking/demo endpoint allows unauthenticated requests
 * for CLI testing and video demonstrations.
 */
export async function POST(request: NextRequest) {
  // Check if demo mode is enabled via header or env
  const isDemoMode =
    request.headers.get("X-Demo-Mode") === "true" ||
    process.env.DEMO_MODE === "true" ||
    process.env.NODE_ENV === "development";

  if (!isDemoMode) {
    return NextResponse.json(
      {
        error:
          "Demo mode is not enabled. Set DEMO_MODE=true or use development environment.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    // Ensure services are seeded
    await seedServicesIfEmpty();

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

    // Calculate base price
    const basePrice = dbServices.reduce((sum, s) => sum + s.price, 0);

    // Check discount eligibility (R1 rule)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const isBirthday =
      dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
    const discountEligible =
      (gender === "female" && isBirthday) || basePrice > 1000;

    // Early rejection: Check quota BEFORE starting SAGA (R2 rule)
    if (discountEligible) {
      const quotaStatus = await getQuotaStatus();
      if (quotaStatus.used >= quotaStatus.limit) {
        return NextResponse.json(
          {
            error: "Daily discount quota reached. Please try again tomorrow.",
            code: "QUOTA_EXHAUSTED",
          },
          { status: 400 },
        );
      }
    }

    // Map to service items
    const services = dbServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
    }));

    // Initiate booking SAGA (without userId for demo)
    const correlationId = await initiateBooking({
      customerName,
      gender,
      dateOfBirth,
      services,
      // userId is intentionally omitted for demo
    });

    return NextResponse.json({
      success: true,
      correlationId,
      message:
        "Booking request submitted (demo mode). Use the correlationId to track status.",
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
