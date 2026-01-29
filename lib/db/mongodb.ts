import { MongoClient, Db } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/medical-clinic";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db();

  cachedClient = client;
  cachedDb = db;

  // Create indexes for performance
  await createIndexes(db);

  return { client, db };
}

async function createIndexes(db: Db): Promise<void> {
  // Bookings indexes
  await db
    .collection("bookings")
    .createIndex({ correlationId: 1 }, { unique: true });
  await db.collection("bookings").createIndex({ status: 1 });
  await db.collection("bookings").createIndex({ createdAt: -1 });

  // Saga events indexes
  await db.collection("sagaEvents").createIndex({ correlationId: 1 });
  await db.collection("sagaEvents").createIndex({ eventType: 1 });
  await db.collection("sagaEvents").createIndex({ timestamp: -1 });

  // Discount quota indexes
  await db
    .collection("discountQuota")
    .createIndex({ dateKey: 1 }, { unique: true });

  // Audit logs indexes
  await db.collection("auditLogs").createIndex({ correlationId: 1 });
  await db.collection("auditLogs").createIndex({ timestamp: -1 });
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
