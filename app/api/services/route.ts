import { NextRequest, NextResponse } from "next/server";
import {
  getAllServices,
  getServicesForGender,
  seedServicesIfEmpty,
} from "@/lib/db/models/medicalService";

export async function GET(request: NextRequest) {
  try {
    // Ensure services are seeded
    await seedServicesIfEmpty();

    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender") as "male" | "female" | null;

    if (gender && !["male", "female"].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be "male" or "female"' },
        { status: 400 },
      );
    }

    const services = gender
      ? await getServicesForGender(gender)
      : await getAllServices();

    return NextResponse.json({
      services,
      total: services.length,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 },
    );
  }
}
