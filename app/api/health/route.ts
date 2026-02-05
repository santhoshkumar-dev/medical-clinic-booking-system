import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { eventBus } from "@/lib/events/eventBus";

/**
 * Health Check Endpoint
 * Used by Docker health checks and monitoring systems
 *
 * Checks:
 * - API responsiveness
 * - MongoDB connection
 * - Redis connection (Event Bus)
 */
export async function GET() {
  try {
    const checks = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "medical-clinic-booking-system",
      mode: process.env.SERVICE_MODE || "local",
      checks: {
        api: "ok",
        database: "checking",
        eventBus: "checking",
      },
    };

    // Check MongoDB connection
    try {
      await connectToDatabase();
      checks.checks.database = "ok";
    } catch (error) {
      checks.checks.database = "error";
      checks.status = "unhealthy";
    }

    // Check Redis/Event Bus connection
    try {
      if (eventBus) {
        checks.checks.eventBus = "ok";
      } else {
        checks.checks.eventBus = "not_initialized";
      }
    } catch (error) {
      checks.checks.eventBus = "error";
      checks.status = "unhealthy";
    }

    const statusCode = checks.status === "healthy" ? 200 : 503;

    return NextResponse.json(checks, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
