/**
 * Next.js Instrumentation
 *
 * This file runs once when the server starts.
 *
 * SERVICE_MODE determines how SAGA services are run:
 * - 'local': SAGA services run in the same process (development)
 * - 'production': SAGA services run in a separate Docker container
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const serviceMode = process.env.SERVICE_MODE || "local";

    console.log(`[Instrumentation] Service Mode: ${serviceMode}`);

    if (serviceMode === "local") {
      // In local mode, run SAGA services in the same process
      const { initializeSaga } =
        await import("./lib/services/sagaOrchestrator");

      console.log("[Instrumentation] Initializing SAGA in local mode...");
      await initializeSaga();
      console.log("[Instrumentation] SAGA initialized successfully");
    } else {
      // In production mode, SAGA services run in a separate container
      console.log(
        "[Instrumentation] Production mode - SAGA services running in separate container",
      );
      console.log(
        "[Instrumentation] Next.js app will communicate via Redis Event Bus",
      );
    }
  }
}
