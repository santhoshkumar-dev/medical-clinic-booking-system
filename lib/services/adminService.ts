import { getDb } from "../db/mongodb";
import { emitEvent } from "../events/eventBus";
import { eventBus } from "../events/eventBus";
import {
  DiscountQuotaUpdatedEvent,
  AdminActionLoggedEvent,
} from "../events/types";
import { generateCorrelationId } from "../events/correlationId";
import { getQuotaStatus, getISTDateKey } from "../db/models/discountQuota";

const SERVICE_NAME = "AdminService";

/**
 * Updates the daily discount quota limit
 * Emits DiscountQuotaUpdated event instead of direct mutation
 */
export async function updateDiscountQuota(
  adminId: string,
  newLimit: number,
  reason?: string,
): Promise<{ success: boolean; message: string }> {
  const correlationId = generateCorrelationId();

  // Get current quota status
  const currentStatus = await getQuotaStatus();

  // Emit the quota update event
  await emitEvent<DiscountQuotaUpdatedEvent>(
    {
      correlationId,
      eventType: "DiscountQuotaUpdated",
      data: {
        adminId,
        previousLimit: currentStatus.limit,
        newLimit,
        reason,
      },
    },
    SERVICE_NAME,
    {
      actorType: "admin",
      actorId: adminId,
      actionSource: "admin-panel",
    },
  );

  return {
    success: true,
    message: `Quota update event emitted. Previous: ${currentStatus.limit}, New: ${newLimit}`,
  };
}

/**
 * Handles the DiscountQuotaUpdated event
 * This is where the actual DB mutation happens
 */
export async function handleDiscountQuotaUpdated(
  event: DiscountQuotaUpdatedEvent,
): Promise<void> {
  const db = await getDb();
  const dateKey = getISTDateKey();

  // Update the quota limit in MongoDB
  await db.collection("discountQuota").updateOne(
    { dateKey },
    {
      $set: { limit: event.data.newLimit },
      $setOnInsert: { used: 0, reservations: [] },
    },
    { upsert: true },
  );

  console.log(
    `[${SERVICE_NAME}] Quota updated: ${event.data.previousLimit} -> ${event.data.newLimit} by admin ${event.data.adminId}`,
  );
}

/**
 * Logs an admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  resource: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const correlationId = generateCorrelationId();

  await emitEvent<AdminActionLoggedEvent>(
    {
      correlationId,
      eventType: "AdminActionLogged",
      data: {
        adminId,
        action,
        resource,
        details,
      },
    },
    SERVICE_NAME,
    {
      actorType: "admin",
      actorId: adminId,
      actionSource: "admin-panel",
    },
  );
}

/**
 * Initialize admin event subscriptions
 */
export function initializeAdminSubscriptions(): void {
  eventBus.subscribe("DiscountQuotaUpdated", handleDiscountQuotaUpdated);
  console.log(`[${SERVICE_NAME}] Admin event subscriptions initialized`);
}
