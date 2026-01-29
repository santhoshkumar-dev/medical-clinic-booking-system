import { ObjectId } from "mongodb";
import { getDb } from "../mongodb";

export type BookingStatus =
  | "pending"
  | "pricing_calculated"
  | "quota_reserved"
  | "quota_rejected"
  | "payment_completed"
  | "payment_failed"
  | "confirmed"
  | "failed";

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

export interface Booking {
  _id?: ObjectId;
  correlationId: string;
  userId?: string; // Links booking to authenticated user
  customerName: string;
  gender: "male" | "female";
  dateOfBirth: string; // ISO date string
  services: ServiceItem[];
  basePrice: number;
  discountEligible: boolean;
  discountApplied: boolean;
  discountAmount: number;
  finalPrice: number;
  status: BookingStatus;
  referenceId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createBooking(
  booking: Omit<Booking, "_id" | "createdAt" | "updatedAt">,
): Promise<Booking> {
  const db = await getDb();
  const now = new Date();

  const doc: Booking = {
    ...booking,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<Booking>("bookings").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateBooking(
  correlationId: string,
  updates: Partial<Booking>,
): Promise<Booking | null> {
  const db = await getDb();

  const result = await db.collection<Booking>("bookings").findOneAndUpdate(
    { correlationId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return result;
}

export async function getBookingByCorrelationId(
  correlationId: string,
): Promise<Booking | null> {
  const db = await getDb();
  return db.collection<Booking>("bookings").findOne({ correlationId });
}

export async function generateReferenceId(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MC-${timestamp}-${random}`;
}
