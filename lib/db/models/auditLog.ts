import mongoose, { Schema, Document, Model } from "mongoose";
import { ensureConnection } from "../mongoose";
import { EventType } from "../../events/types";

// Actor and action types
export type ActorType = "system" | "user" | "admin";
export type ActionSource = "saga" | "admin-panel" | "cli" | "api";

// Audit log document interface
export interface IAuditLog extends Document {
  correlationId: string;
  event: EventType;
  service: string;
  status: "success" | "failure" | "compensation";
  timestamp: string; // ISO string
  data?: Record<string, unknown>;
  actorType: ActorType;
  actorId?: string;
  actionSource: ActionSource;
}

// Audit log schema
const AuditLogSchema = new Schema<IAuditLog>(
  {
    correlationId: { type: String, required: true, index: true },
    event: { type: String, required: true },
    service: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "failure", "compensation"],
      required: true,
    },
    timestamp: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed },
    actorType: {
      type: String,
      enum: ["system", "user", "admin"],
      required: true,
    },
    actorId: { type: String },
    actionSource: {
      type: String,
      enum: ["saga", "admin-panel", "cli", "api"],
      required: true,
    },
  },
  { timestamps: false, collection: "auditLogs" }, // Explicit camelCase collection name
);

// Get or create model
function getAuditLogModel(): Model<IAuditLog> {
  return (
    mongoose.models.AuditLog ||
    mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)
  );
}

/**
 * Creates a structured audit log entry
 */
export async function createAuditLog(
  log: Omit<IAuditLog, "_id" | "timestamp" | keyof Document>,
): Promise<IAuditLog> {
  await ensureConnection();
  const AuditLog = getAuditLogModel();

  const doc = new AuditLog({
    ...log,
    timestamp: new Date().toISOString(),
  });

  await doc.save();

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

  return doc;
}

/**
 * Gets all audit logs for a correlation ID
 */
export async function getAuditLogs(
  correlationId: string,
): Promise<IAuditLog[]> {
  await ensureConnection();
  const AuditLog = getAuditLogModel();
  return AuditLog.find({ correlationId }).sort({ timestamp: 1 });
}

/**
 * Gets recent audit logs with optional filtering
 */
export async function getRecentAuditLogs(options: {
  limit?: number;
  actorType?: ActorType;
  actionSource?: ActionSource;
  fromDate?: Date;
}): Promise<IAuditLog[]> {
  await ensureConnection();
  const AuditLog = getAuditLogModel();
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

  return AuditLog.find(query).sort({ timestamp: -1 }).limit(limit);
}

/**
 * Gets admin action logs
 */
export async function getAdminAuditLogs(
  limit: number = 50,
): Promise<IAuditLog[]> {
  return getRecentAuditLogs({
    limit,
    actorType: "admin",
    actionSource: "admin-panel",
  });
}

// Export for backward compatibility
export type AuditLog = IAuditLog;
