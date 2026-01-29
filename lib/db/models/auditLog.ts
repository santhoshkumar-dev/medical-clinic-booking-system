import { ObjectId } from "mongodb";
import { getDb } from "../mongodb";
import { EventType } from "../../events/types";

export type ActorType = "system" | "user" | "admin";
export type ActionSource = "saga" | "admin-panel" | "cli" | "api";

export interface AuditLog {
  _id?: ObjectId;
  correlationId: string;
  event: EventType;
  service: string;
  status: "success" | "failure" | "compensation";
  timestamp: string; // ISO string
  data?: Record<string, unknown>;
  // New fields for actor tracking
  actorType: ActorType;
  actorId?: string;
  actionSource: ActionSource;
}

/**
 * Creates a structured audit log entry
 */
export async function createAuditLog(
  log: Omit<AuditLog, "_id" | "timestamp">,
): Promise<AuditLog> {
  const db = await getDb();

  const doc: AuditLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };

  const result = await db.collection<AuditLog>("auditLogs").insertOne(doc);

  // Also log to console in structured JSON format
  console.log(
    JSON.stringify({
      correlationId: doc.correlationId,
      event: doc.event,
      service: doc.service,
      status: doc.status,
      timestamp: doc.timestamp,
      actorType: doc.actorType,
      ...(doc.actorId && { actorId: doc.actorId }),
      actionSource: doc.actionSource,
      ...(doc.data && { data: doc.data }),
    }),
  );

  return { ...doc, _id: result.insertedId };
}

/**
 * Gets all audit logs for a correlation ID
 */
export async function getAuditLogs(correlationId: string): Promise<AuditLog[]> {
  const db = await getDb();

  return db
    .collection<AuditLog>("auditLogs")
    .find({ correlationId })
    .sort({ timestamp: 1 })
    .toArray();
}

/**
 * Gets recent audit logs with optional filtering
 */
export async function getRecentAuditLogs(options: {
  limit?: number;
  actorType?: ActorType;
  actionSource?: ActionSource;
  fromDate?: Date;
}): Promise<AuditLog[]> {
  const db = await getDb();
  const { limit = 100, actorType, actionSource, fromDate } = options;

  const query: Record<string, unknown> = {};

  if (actorType) {
    query.actorType = actorType;
  }

  if (actionSource) {
    query.actionSource = actionSource;
  }

  if (fromDate) {
    query.timestamp = { $gte: fromDate.toISOString() };
  }

  return db
    .collection<AuditLog>("auditLogs")
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Gets admin action logs
 */
export async function getAdminAuditLogs(
  limit: number = 50,
): Promise<AuditLog[]> {
  return getRecentAuditLogs({
    limit,
    actorType: "admin",
    actionSource: "admin-panel",
  });
}
