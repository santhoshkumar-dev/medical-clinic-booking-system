/**
 * Admin User Seed Script
 *
 * Run with: npx ts-node scripts/seed-admin.ts
 *
 * Creates an initial admin user for the system.
 */

import { MongoClient } from "mongodb";
import * as crypto from "crypto";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/medical-clinic";

// Default admin credentials (change in production!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@clinic.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = "System Admin";

async function hashPassword(password: string): Promise<string> {
  // Better Auth uses bcrypt-like hashing, but for seeding we'll use a simple hash
  // The actual password will be set through the auth API
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seedAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Check if admin already exists
    const existingAdmin = await db
      .collection("user")
      .findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);

      // Update role if not admin
      if (existingAdmin.role !== "admin") {
        await db
          .collection("user")
          .updateOne({ email: ADMIN_EMAIL }, { $set: { role: "admin" } });
        console.log("Updated user role to admin");
      }

      return;
    }

    // Create admin user
    const now = new Date();
    const adminUser = {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "admin",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("user").insertOne(adminUser);
    console.log(`Admin user created with ID: ${result.insertedId}`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(
      `\nIMPORTANT: Sign up through the app with email "${ADMIN_EMAIL}" to set your password.`,
    );
    console.log("The user has been pre-created with admin role.");
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedAdmin();
