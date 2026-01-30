import mongoose, { Schema, Document, Model } from "mongoose";
import { ensureConnection } from "../mongoose";

const DEFAULT_DAILY_QUOTA = parseInt(
  process.env.DAILY_DISCOUNT_QUOTA || "100",
  10,
);

// Discount quota document interface
export interface IDiscountQuota extends Document {
  dateKey: string; // YYYY-MM-DD in IST
  used: number;
  limit: number;
  reservations: string[]; // correlationIds with active reservations
  createdAt: Date;
  updatedAt: Date;
}

// Discount quota schema
const DiscountQuotaSchema = new Schema<IDiscountQuota>(
  {
    dateKey: { type: String, required: true, unique: true, index: true },
    used: { type: Number, default: 0 },
    limit: { type: Number, default: DEFAULT_DAILY_QUOTA },
    reservations: { type: [String], default: [] },
  },
  { timestamps: true, collection: "discountQuotas" }, // Explicit camelCase collection name
);

// Get or create model
function getDiscountQuotaModel(): Model<IDiscountQuota> {
  return (
    mongoose.models.DiscountQuota ||
    mongoose.model<IDiscountQuota>("DiscountQuota", DiscountQuotaSchema)
  );
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
  await ensureConnection();
  const DiscountQuota = getDiscountQuotaModel();
  const dateKey = getISTDateKey();

  const quota = await DiscountQuota.findOne({ dateKey });

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
  await ensureConnection();
  const DiscountQuota = getDiscountQuotaModel();
  const dateKey = getISTDateKey();

  // Try to update existing document atomically
  const result = await DiscountQuota.findOneAndUpdate(
    {
      dateKey,
      $expr: { $lt: ["$used", "$limit"] }, // Only update if quota available
    },
    {
      $inc: { used: 1 },
      $push: { reservations: correlationId },
    },
    { new: true },
  );

  // If no document matched, either quota is exhausted or document doesn't exist
  if (!result) {
    // Try to create a new document for today if it doesn't exist
    try {
      await DiscountQuota.create({
        dateKey,
        used: 1,
        limit: DEFAULT_DAILY_QUOTA,
        reservations: [correlationId],
      });
      return true;
    } catch (error: unknown) {
      // Document exists but quota is exhausted (duplicate key error)
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
  await ensureConnection();
  const DiscountQuota = getDiscountQuotaModel();
  const dateKey = getISTDateKey();

  const result = await DiscountQuota.findOneAndUpdate(
    {
      dateKey,
      reservations: correlationId, // Only release if we have this reservation
    },
    {
      $inc: { used: -1 },
      $pull: { reservations: correlationId },
    },
    { new: true },
  );

  return result !== null;
}

/**
 * Update quota limit (admin function)
 */
export async function updateQuotaLimit(
  newLimit: number,
): Promise<IDiscountQuota | null> {
  await ensureConnection();
  const DiscountQuota = getDiscountQuotaModel();
  const dateKey = getISTDateKey();

  return DiscountQuota.findOneAndUpdate(
    { dateKey },
    { $set: { limit: newLimit } },
    { new: true, upsert: true },
  );
}

// Export for backward compatibility
export type DiscountQuota = IDiscountQuota;
