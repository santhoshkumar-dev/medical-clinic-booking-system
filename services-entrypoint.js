/**
 * Services Entrypoint
 *
 * This is a standalone Node.js process that runs the SAGA services
 * independently from the Next.js application.
 *
 * In production mode, this runs in a separate Docker container.
 */

console.log("[Services] Starting SAGA Services container...");
console.log("[Services] Environment:", process.env.NODE_ENV);
console.log(
  "[Services] MongoDB URI:",
  process.env.MONGODB_URI ? "Set" : "Not set",
);
console.log("[Services] Redis URL:", process.env.REDIS_URL ? "Set" : "Not set");

// Import and initialize SAGA
async function startServices() {
  try {
    // USE REQUIRE FOR COMMONJS COMPATIBILITY
    // The build process compiles .ts to .js in ./dist
    const { initializeSaga } = require("./lib/services/sagaOrchestrator");

    console.log("[Services] Initializing SAGA choreography...");
    await initializeSaga();
    console.log("[Services] SAGA services initialized successfully");
    console.log("[Services] Listening for events on Redis...");

    // Keep the process alive
    process.on("SIGTERM", () => {
      console.log("[Services] Received SIGTERM, shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("[Services] Received SIGINT, shutting down gracefully...");
      process.exit(0);
    });
  } catch (error) {
    console.error("[Services] Failed to initialize SAGA:", error);
    process.exit(1);
  }
}

startServices();
