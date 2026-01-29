import { v4 as uuidv4 } from "uuid";

/**
 * Generates a unique correlation ID for distributed tracing
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Creates a short, readable correlation ID for reference IDs
 */
export function generateShortId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${timestamp}-${random}`;
}
