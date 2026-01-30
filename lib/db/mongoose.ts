import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/medical-clinic";

// Global cache for connection
let cached = global as typeof global & {
  mongooseConn: typeof mongoose | null;
  mongoosePromise: Promise<typeof mongoose> | null;
};

if (!cached.mongooseConn) {
  cached.mongooseConn = null;
  cached.mongoosePromise = null;
}

/**
 * Connect to MongoDB using Mongoose
 * Uses connection caching for serverless environments
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.mongooseConn) {
    return cached.mongooseConn;
  }

  if (!cached.mongoosePromise) {
    const opts = {
      bufferCommands: false,
    };

    cached.mongoosePromise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.mongooseConn = await cached.mongoosePromise;
  } catch (e) {
    cached.mongoosePromise = null;
    throw e;
  }

  return cached.mongooseConn;
}

/**
 * Ensure connection before database operations
 */
export async function ensureConnection(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    await connectToDatabase();
  }
}
