import { ObjectId } from "mongodb";
import { getDb } from "../mongodb";

export interface MedicalService {
  _id?: ObjectId;
  id: string;
  name: string;
  price: number;
  gender: "male" | "female" | "common";
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default services to seed the database
 */
export const DEFAULT_SERVICES: Omit<
  MedicalService,
  "_id" | "createdAt" | "updatedAt"
>[] = [
  // Common services
  {
    id: "general-consultation",
    name: "General Consultation",
    price: 500,
    gender: "common",
    description: "Comprehensive health check-up with a general physician",
    isActive: true,
  },
  {
    id: "blood-test",
    name: "Blood Test Panel",
    price: 300,
    gender: "common",
    description: "Complete blood count and basic metabolic panel",
    isActive: true,
  },
  {
    id: "x-ray",
    name: "X-Ray Imaging",
    price: 800,
    gender: "common",
    description: "Digital X-ray imaging for diagnostic purposes",
    isActive: true,
  },
  {
    id: "ecg",
    name: "ECG/EKG Test",
    price: 400,
    gender: "common",
    description: "Electrocardiogram for heart rhythm analysis",
    isActive: true,
  },
  {
    id: "ultrasound",
    name: "Ultrasound Scan",
    price: 1000,
    gender: "common",
    description: "Non-invasive ultrasound imaging",
    isActive: true,
  },
  // Female-specific
  {
    id: "mammography",
    name: "Mammography Screening",
    price: 1200,
    gender: "female",
    description: "Breast cancer screening with digital mammography",
    isActive: true,
  },
  {
    id: "gynecology",
    name: "Gynecology Consultation",
    price: 700,
    gender: "female",
    description: "Comprehensive gynecological examination",
    isActive: true,
  },
  {
    id: "pap-smear",
    name: "Pap Smear Test",
    price: 550,
    gender: "female",
    description: "Cervical cancer screening test",
    isActive: true,
  },
  {
    id: "bone-density-female",
    name: "Bone Density Scan",
    price: 900,
    gender: "female",
    description: "DEXA scan for osteoporosis screening",
    isActive: true,
  },
  // Male-specific
  {
    id: "prostate-exam",
    name: "Prostate Examination",
    price: 600,
    gender: "male",
    description: "Prostate health check with PSA test",
    isActive: true,
  },
  {
    id: "testosterone-test",
    name: "Testosterone Level Test",
    price: 450,
    gender: "male",
    description: "Hormone level assessment",
    isActive: true,
  },
  {
    id: "cardiac-stress",
    name: "Cardiac Stress Test",
    price: 1100,
    gender: "male",
    description: "Treadmill stress test for heart health",
    isActive: true,
  },
];

/**
 * Get all active services
 */
export async function getAllServices(): Promise<MedicalService[]> {
  const db = await getDb();
  return db
    .collection<MedicalService>("services")
    .find({ isActive: true })
    .sort({ gender: 1, name: 1 })
    .toArray();
}

/**
 * Get services by gender (includes common services)
 */
export async function getServicesForGender(
  gender: "male" | "female",
): Promise<MedicalService[]> {
  const db = await getDb();
  return db
    .collection<MedicalService>("services")
    .find({
      isActive: true,
      $or: [{ gender: "common" }, { gender }],
    })
    .sort({ gender: 1, name: 1 })
    .toArray();
}

/**
 * Get service by ID
 */
export async function getServiceById(
  serviceId: string,
): Promise<MedicalService | null> {
  const db = await getDb();
  return db.collection<MedicalService>("services").findOne({ id: serviceId });
}

/**
 * Get multiple services by IDs
 */
export async function getServicesByIds(
  serviceIds: string[],
): Promise<MedicalService[]> {
  const db = await getDb();
  return db
    .collection<MedicalService>("services")
    .find({ id: { $in: serviceIds }, isActive: true })
    .toArray();
}

/**
 * Update service price
 */
export async function updateServicePrice(
  serviceId: string,
  price: number,
  updatedBy?: string,
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<MedicalService>("services").updateOne(
    { id: serviceId },
    {
      $set: {
        price,
        updatedAt: new Date(),
      },
    },
  );
  return result.modifiedCount > 0;
}

/**
 * Create or update a service
 */
export async function upsertService(
  service: Omit<MedicalService, "_id" | "createdAt" | "updatedAt">,
): Promise<void> {
  const db = await getDb();
  const now = new Date();

  await db.collection<MedicalService>("services").updateOne(
    { id: service.id },
    {
      $set: {
        ...service,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

/**
 * Seed default services if none exist
 */
export async function seedServicesIfEmpty(): Promise<boolean> {
  const db = await getDb();
  const count = await db
    .collection<MedicalService>("services")
    .countDocuments();

  if (count === 0) {
    const now = new Date();
    const docs = DEFAULT_SERVICES.map((s) => ({
      ...s,
      createdAt: now,
      updatedAt: now,
    }));

    await db.collection<MedicalService>("services").insertMany(docs);
    console.log(`[Services] Seeded ${docs.length} default services`);
    return true;
  }

  return false;
}
