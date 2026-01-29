import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getQuotaStatus } from "@/lib/db/models/discountQuota";
import {
  updateDiscountQuota,
  logAdminAction,
} from "@/lib/services/adminService";
import { initializeSaga } from "@/lib/services/sagaOrchestrator";

// Initialize SAGA for event handling
initializeSaga();

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

    const quota = await getQuotaStatus();

    return NextResponse.json({
      success: true,
      quota: {
        limit: quota.limit,
        used: quota.used,
        remaining: quota.remaining,
        date: quota.dateKey,
      },
    });
  } catch (error) {
    console.error("Error fetching quota:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; role?: string };
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { limit, reason } = body;

    if (typeof limit !== "number" || limit < 0) {
      return NextResponse.json(
        { error: "Invalid limit value" },
        { status: 400 },
      );
    }

    // Update quota via event (not direct mutation)
    const result = await updateDiscountQuota(
      user.id || "unknown",
      limit,
      reason,
    );

    // Log the admin action
    await logAdminAction(
      user.id || "unknown",
      "UPDATE_QUOTA",
      "discountQuota",
      { newLimit: limit, reason },
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("Error updating quota:", error);
    return NextResponse.json(
      { error: "Failed to update quota" },
      { status: 500 },
    );
  }
}
