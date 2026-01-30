import mongoose, { Schema, Document, Model } from "mongoose";
import { ensureConnection } from "../mongoose";
import { SagaEventType } from "../../events/types";

// Saga event document interface
export interface ISagaEvent extends Document {
  correlationId: string;
  eventType: SagaEventType;
  service: string;
  status: "success" | "failure" | "compensation";
  data: Record<string, unknown>;
  timestamp: Date;
}

// Saga event schema
const SagaEventSchema = new Schema<ISagaEvent>(
  {
    correlationId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    service: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "failure", "compensation"],
      required: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, collection: "sagaEvents" },
);

// Get or create model
function getSagaEventModel(): Model<ISagaEvent> {
  return (
    mongoose.models.SagaEvent ||
    mongoose.model<ISagaEvent>("SagaEvent", SagaEventSchema)
  );
}

/**
 * Appends a new saga event (append-only log)
 */
export async function appendSagaEvent(event: {
  correlationId: string;
  eventType: SagaEventType;
  service: string;
  status: "success" | "failure" | "compensation";
  data: Record<string, unknown>;
}): Promise<ISagaEvent> {
  await ensureConnection();
  const SagaEvent = getSagaEventModel();

  const doc = new SagaEvent({
    ...event,
    timestamp: new Date(),
  });

  return doc.save();
}

/**
 * Gets all saga events for a correlation ID
 */
export async function getSagaEvents(
  correlationId: string,
): Promise<ISagaEvent[]> {
  await ensureConnection();
  const SagaEvent = getSagaEventModel();
  return SagaEvent.find({ correlationId }).sort({ timestamp: 1 });
}

/**
 * Gets recent saga events
 */
export async function getRecentSagaEvents(
  limit: number = 100,
): Promise<ISagaEvent[]> {
  await ensureConnection();
  const SagaEvent = getSagaEventModel();
  return SagaEvent.find().sort({ timestamp: -1 }).limit(limit);
}

// Export for backward compatibility
export type SagaEvent = ISagaEvent;
