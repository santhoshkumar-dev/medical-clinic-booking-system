import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import {
  getRecentAuditLogs,
  ActorType,
  ActionSource,
} from "@/lib/db/models/auditLog";

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
    const limit = parseInt(searchParams.get("limit") || "100");
    const actorType = searchParams.get("actorType") as ActorType | null;
    const actionSource = searchParams.get(
      "actionSource",
    ) as ActionSource | null;

    const logs = await getRecentAuditLogs({
      limit,
      actorType: actorType || undefined,
      actionSource: actionSource || undefined,
    });

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
}
