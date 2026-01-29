import { ObjectId } from "mongodb";
import { getDb } from "../mongodb";

const DEFAULT_DAILY_QUOTA = parseInt(
  process.env.DAILY_DISCOUNT_QUOTA || "100",
  10,
);

export interface DiscountQuota {
  _id?: ObjectId;
  dateKey: string; // YYYY-MM-DD in IST
  used: number;
  limit: number;
  reservations: string[]; // correlationIds with active reservations
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gets the current date key in IST timezone (YYYY-MM-DD format)
 */
export function getISTDateKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Gets the current quota status for today
 */
export async function getQuotaStatus(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  dateKey: string;
}> {
  const db = await getDb();
  const dateKey = getISTDateKey();

  const quota = await db
    .collection<DiscountQuota>("discountQuota")
    .findOne({ dateKey });

  if (!quota) {
    return {
      used: 0,
      limit: DEFAULT_DAILY_QUOTA,
      remaining: DEFAULT_DAILY_QUOTA,
      dateKey,
    };
  }

  return {
    used: quota.used,
    limit: quota.limit,
    remaining: quota.limit - quota.used,
    dateKey,
  };
}

/**
 * Attempts to reserve a discount quota slot
 * Returns true if reservation successful, false if quota exhausted
 */
export async function reserveQuota(correlationId: string): Promise<boolean> {
  const db = await getDb();
  const dateKey = getISTDateKey();
  const now = new Date();

  // Use findOneAndUpdate with upsert for atomic operation
  const result = await db
    .collection<DiscountQuota>("discountQuota")
    .findOneAndUpdate(
      {
        dateKey,
        $expr: { $lt: ["$used", "$limit"] }, // Only update if quota available
      },
      {
        $inc: { used: 1 },
        $push: { reservations: correlationId },
        $set: { updatedAt: now },
        $setOnInsert: {
          dateKey,
          limit: DEFAULT_DAILY_QUOTA,
          createdAt: now,
        },
      },
      {
        upsert: false,
        returnDocument: "after",
      },
    );

  // If no document matched, either quota is exhausted or document doesn't exist
  if (!result) {
    // Try to create a new document for today if it doesn't exist
    try {
      await db.collection<DiscountQuota>("discountQuota").insertOne({
        dateKey,
        used: 1,
        limit: DEFAULT_DAILY_QUOTA,
        reservations: [correlationId],
        createdAt: now,
        updatedAt: now,
      });
      return true;
    } catch (error: unknown) {
      // Document exists but quota is exhausted
      if ((error as { code?: number }).code === 11000) {
        return false;
      }
      throw error;
    }
  }

  return true;
}

/**
 * Releases a previously reserved quota slot (compensation action)
 */
export async function releaseQuota(correlationId: string): Promise<boolean> {
  const db = await getDb();
  const dateKey = getISTDateKey();

  const result = await db
    .collection<DiscountQuota>("discountQuota")
    .findOneAndUpdate(
      {
        dateKey,
        reservations: correlationId, // Only release if we have this reservation
      },
      {
        $inc: { used: -1 },
        $pull: { reservations: correlationId },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );

  return result !== null;
}
