import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/mongodb";
import { getSagaEvents } from "@/lib/db/models/sagaEvent";
import { Booking } from "@/lib/db/models/booking";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status"); // optional filter

    const db = await getDb();

    // Build query
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    // Get bookings
    const bookings = await db
      .collection<Booking>("bookings")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Enrich with saga events
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const events = await getSagaEvents(booking.correlationId);
        return {
          ...booking,
          eventCount: events.length,
          lastEvent: events.length > 0 ? events[events.length - 1] : null,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      bookings: enrichedBookings,
      total: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}
