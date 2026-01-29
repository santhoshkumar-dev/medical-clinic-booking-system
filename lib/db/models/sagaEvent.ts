import { ObjectId } from "mongodb";
import { getDb } from "../mongodb";
import { SagaEventType } from "../../events/types";

export interface SagaEvent {
  _id?: ObjectId;
  correlationId: string;
  eventType: SagaEventType;
  service: string;
  status: "success" | "failure" | "compensation";
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Appends a new event to the saga event log (append-only)
 */
export async function appendSagaEvent(
  event: Omit<SagaEvent, "_id" | "timestamp">,
): Promise<SagaEvent> {
  const db = await getDb();

  const doc: SagaEvent = {
    ...event,
    timestamp: new Date(),
  };

  const result = await db.collection<SagaEvent>("sagaEvents").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Gets all events for a saga by correlation ID, ordered by timestamp
 */
export async function getSagaEvents(
  correlationId: string,
): Promise<SagaEvent[]> {
  const db = await getDb();

  return db
    .collection<SagaEvent>("sagaEvents")
    .find({ correlationId })
    .sort({ timestamp: 1 })
    .toArray();
}

/**
 * Gets the latest event for a saga
 */
export async function getLatestSagaEvent(
  correlationId: string,
): Promise<SagaEvent | null> {
  const db = await getDb();

  const events = await db
    .collection<SagaEvent>("sagaEvents")
    .find({ correlationId })
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();

  return events[0] || null;
}

/**
 * Checks if a saga has reached a terminal state
 */
export async function isSagaComplete(correlationId: string): Promise<boolean> {
  const db = await getDb();

  const terminalEvent = await db.collection<SagaEvent>("sagaEvents").findOne({
    correlationId,
    eventType: { $in: ["BookingConfirmed", "BookingFailed"] },
  });

  return terminalEvent !== null;
}
