import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, quota } = body;

    if (action === "reset-quota") {
      const db = await getDb();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      await db.collection("discountQuota").deleteOne({ dateKey: today });

      return NextResponse.json({
        success: true,
        message: "Quota reset for today",
      });
    }

    if (action === "set-quota" && typeof quota === "number") {
      const db = await getDb();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      await db.collection("discountQuota").updateOne(
        { dateKey: today },
        {
          $set: {
            limit: quota,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            dateKey: today,
            used: 0,
            reservations: [],
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      return NextResponse.json({
        success: true,
        message: `Quota set to ${quota} for today`,
      });
    }

    if (action === "exhaust-quota") {
      const db = await getDb();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      // Set used = limit to exhaust quota
      await db.collection("discountQuota").updateOne(
        { dateKey: today },
        {
          $set: {
            used: 100,
            limit: 100,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            dateKey: today,
            reservations: [],
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      return NextResponse.json({
        success: true,
        message: "Quota exhausted for today",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in test action:", error);
    return NextResponse.json(
      { error: "Failed to execute test action" },
      { status: 500 },
    );
  }
}
