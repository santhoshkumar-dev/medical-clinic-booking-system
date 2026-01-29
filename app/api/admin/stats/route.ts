import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/mongodb";
import { getQuotaStatus, getISTDateKey } from "@/lib/db/models/discountQuota";

export async function GET() {
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

    const db = await getDb();

    // Get today's quota
    const quotaStatus = await getQuotaStatus();

    // Get booking counts by status
    const bookingStats = await db
      .collection("bookings")
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get today's bookings count
    const today = getISTDateKey();
    const todayStart = new Date(today);
    const todayBookings = await db.collection("bookings").countDocuments({
      createdAt: { $gte: todayStart.toISOString() },
    });

    // Get discounts granted today
    const todayDiscounts = await db.collection("bookings").countDocuments({
      createdAt: { $gte: todayStart.toISOString() },
      discountApplied: true,
      status: "confirmed",
    });

    // Get last 7 days usage
    const last7Days = await db
      .collection("discountQuota")
      .find({})
      .sort({ dateKey: -1 })
      .limit(7)
      .toArray();

    // Get recent events count (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = await db.collection("auditLogs").countDocuments({
      timestamp: { $gte: oneHourAgo.toISOString() },
    });

    return NextResponse.json({
      success: true,
      stats: {
        quota: {
          limit: quotaStatus.limit,
          used: quotaStatus.used,
          remaining: quotaStatus.remaining,
        },
        bookings: {
          byStatus: bookingStats.reduce(
            (acc, item) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          today: todayBookings,
        },
        discounts: {
          today: todayDiscounts,
          history: last7Days.map((d) => ({
            date: d.dateKey,
            used: d.used,
            limit: d.limit,
          })),
        },
        events: {
          lastHour: recentEvents,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
