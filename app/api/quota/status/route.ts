import { NextResponse } from "next/server";
import { getQuotaStatus, getISTDateKey } from "@/lib/db/models/discountQuota";

export async function GET() {
  try {
    const status = await getQuotaStatus();
    const dateKey = getISTDateKey();

    return NextResponse.json({
      date: dateKey,
      used: status.used,
      limit: status.limit,
      available: status.remaining,
      exhausted: status.remaining <= 0,
    });
  } catch (error) {
    console.error("Error fetching quota status:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota status" },
      { status: 500 },
    );
  }
}
