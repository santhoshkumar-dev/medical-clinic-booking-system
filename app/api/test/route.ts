import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ensureConnection } from "@/lib/db/mongoose";
import { getISTDateKey } from "@/lib/db/models/discountQuota";

export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const body = await request.json();
    const { action, quota } = body;
    const dateKey = getISTDateKey();

    // Get collection directly through mongoose connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database not connected");
    }

    if (action === "reset-quota") {
      await db.collection("discountquotas").deleteOne({ dateKey });

      return NextResponse.json({
        success: true,
        message: "Quota reset for today",
      });
    }

    if (action === "set-quota" && typeof quota === "number") {
      await db.collection("discountquotas").updateOne(
        { dateKey },
        {
          $set: {
            limit: quota,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            dateKey,
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
      // Set used = limit to exhaust quota
      await db.collection("discountquotas").updateOne(
        { dateKey },
        {
          $set: {
            used: 100,
            limit: 100,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            dateKey,
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
