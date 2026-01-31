import Redis, { RedisOptions } from "ioredis";

// Parse Redis URL using WHATWG URL API (avoids url.parse() deprecation)
function parseRedisUrl(redisUrl: string): RedisOptions {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
      tls: url.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    // Fallback to localhost if URL parsing fails
    return {
      host: "localhost",
      port: 6379,
    };
  }
}

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redisOptions = parseRedisUrl(REDIS_URL);

// Create Redis clients (need separate clients for pub and sub)
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

/**
 * Get Redis publisher client (singleton)
 */
export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis({
      ...redisOptions,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    publisher.on("error", (err) => {
      console.error("[Redis Publisher] Error:", err.message);
    });

    publisher.on("connect", () => {
      console.log("[Redis Publisher] Connected");
    });
  }
  return publisher;
}

/**
 * Get Redis subscriber client (singleton)
 */
export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis({
      ...redisOptions,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    subscriber.on("error", (err) => {
      console.error("[Redis Subscriber] Error:", err.message);
    });

    subscriber.on("connect", () => {
      console.log("[Redis Subscriber] Connected");
    });
  }
  return subscriber;
}

/**
 * Close Redis connections gracefully
 */
export async function closeRedisConnections(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}
