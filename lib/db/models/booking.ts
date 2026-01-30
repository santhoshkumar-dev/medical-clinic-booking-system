import mongoose, { Schema, Document, Model } from "mongoose";
import { ensureConnection } from "../mongoose";

// Status types
export type BookingStatus =
  | "pending"
  | "pricing_calculated"
  | "quota_reserved"
  | "quota_rejected"
  | "payment_completed"
  | "payment_failed"
  | "confirmed"
  | "failed";

// Service item subdocument interface
export interface IServiceItem {
  id: string;
  name: string;
  price: number;
}

// Booking document interface
export interface IBooking extends Document {
  correlationId: string;
  userId?: string;
  customerName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  services: IServiceItem[];
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

// Service item schema
const ServiceItemSchema = new Schema<IServiceItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

// Booking schema
const BookingSchema = new Schema<IBooking>(
  {
    correlationId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    customerName: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    dateOfBirth: { type: String, required: true },
    services: { type: [ServiceItemSchema], required: true },
    basePrice: { type: Number, required: true },
    discountEligible: { type: Boolean, default: false },
    discountApplied: { type: Boolean, default: false },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "pricing_calculated",
        "quota_reserved",
        "quota_rejected",
        "payment_completed",
        "payment_failed",
        "confirmed",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    referenceId: { type: String },
    errorMessage: { type: String },
  },
  { timestamps: true, collection: "bookings" },
);

// Get or create model
function getBookingModel(): Model<IBooking> {
  return (
    mongoose.models.Booking ||
    mongoose.model<IBooking>("Booking", BookingSchema)
  );
}

// Helper type for creating bookings
export type CreateBookingInput = Omit<
  IBooking,
  "_id" | "createdAt" | "updatedAt" | keyof Document
>;

/**
 * Create a new booking
 */
export async function createBooking(
  booking: CreateBookingInput,
): Promise<IBooking> {
  await ensureConnection();
  const Booking = getBookingModel();
  const doc = new Booking(booking);
  return doc.save();
}

/**
 * Update a booking by correlationId
 */
export async function updateBooking(
  correlationId: string,
  updates: Partial<IBooking>,
): Promise<IBooking | null> {
  await ensureConnection();
  const Booking = getBookingModel();
  return Booking.findOneAndUpdate(
    { correlationId },
    { $set: updates },
    { new: true },
  );
}

/**
 * Get booking by correlationId
 */
export async function getBookingByCorrelationId(
  correlationId: string,
): Promise<IBooking | null> {
  await ensureConnection();
  const Booking = getBookingModel();
  return Booking.findOne({ correlationId });
}

/**
 * Get bookings by userId
 */
export async function getBookingsByUserId(userId: string): Promise<IBooking[]> {
  await ensureConnection();
  const Booking = getBookingModel();
  return Booking.find({ userId }).sort({ createdAt: -1 });
}

/**
 * Get all bookings with optional filters
 */
export async function getBookings(filters?: {
  status?: BookingStatus;
  limit?: number;
}): Promise<IBooking[]> {
  await ensureConnection();
  const Booking = getBookingModel();
  const query = filters?.status ? { status: filters.status } : {};
  return Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(filters?.limit || 100);
}

/**
 * Generate a unique reference ID
 */
export async function generateReferenceId(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MC-${timestamp}-${random}`;
}

// Export for backward compatibility
export type Booking = IBooking;
export type ServiceItem = IServiceItem;
