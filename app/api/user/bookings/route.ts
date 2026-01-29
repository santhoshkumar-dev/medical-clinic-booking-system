import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/mongodb";
import { Booking } from "@/lib/db/models/booking";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please login to view your bookings" },
        { status: 401 },
      );
    }

    if (session.user.role !== "user") {
      return NextResponse.json(
        { error: "Only regular users can view personal booking history." },
        { status: 403 },
      );
    }

    const db = await getDb();
    const userId = session.user.id;

    // Get user's bookings
    const bookings = await db
      .collection<Booking>("bookings")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      bookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}
