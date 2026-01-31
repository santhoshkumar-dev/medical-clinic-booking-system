/**
 * Next.js Instrumentation
 *
 * This file runs once when the server starts.
 * Used to initialize the SAGA event bus and Redis subscriptions.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeSaga } = await import("./lib/services/sagaOrchestrator");

    console.log("[Instrumentation] Initializing SAGA on server startup...");
    await initializeSaga();
    console.log("[Instrumentation] SAGA initialized successfully");
  }
}
