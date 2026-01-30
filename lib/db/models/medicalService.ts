import mongoose, { Schema, Document, Model } from "mongoose";
import { ensureConnection } from "../mongoose";

// Medical service document interface
export interface IMedicalService extends Document {
  id: string;
  name: string;
  price: number;
  gender: "male" | "female" | "common";
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Medical service schema
const MedicalServiceSchema = new Schema<IMedicalService>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "common"],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "medicalServices" },
);

// Get or create model
function getMedicalServiceModel(): Model<IMedicalService> {
  return (
    mongoose.models.MedicalService ||
    mongoose.model<IMedicalService>("MedicalService", MedicalServiceSchema)
  );
}

/**
 * Default services to seed the database
 */
export const DEFAULT_SERVICES: Omit<
  IMedicalService,
  "_id" | "createdAt" | "updatedAt" | keyof Document
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
export async function getAllServices(): Promise<IMedicalService[]> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  return MedicalService.find({ isActive: true }).sort({ gender: 1, name: 1 });
}

/**
 * Get services by gender (includes common services)
 */
export async function getServicesForGender(
  gender: "male" | "female",
): Promise<IMedicalService[]> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  return MedicalService.find({
    isActive: true,
    $or: [{ gender: "common" }, { gender }],
  }).sort({ gender: 1, name: 1 });
}

/**
 * Get service by ID
 */
export async function getServiceById(
  serviceId: string,
): Promise<IMedicalService | null> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  return MedicalService.findOne({ id: serviceId });
}

/**
 * Get multiple services by IDs
 */
export async function getServicesByIds(
  serviceIds: string[],
): Promise<IMedicalService[]> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  return MedicalService.find({ id: { $in: serviceIds }, isActive: true });
}

/**
 * Update service price
 */
export async function updateServicePrice(
  serviceId: string,
  price: number,
): Promise<boolean> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  const result = await MedicalService.updateOne(
    { id: serviceId },
    { $set: { price } },
  );
  return result.modifiedCount > 0;
}

/**
 * Create or update a service
 */
export async function upsertService(
  service: Omit<
    IMedicalService,
    "_id" | "createdAt" | "updatedAt" | keyof Document
  >,
): Promise<void> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  await MedicalService.findOneAndUpdate(
    { id: service.id },
    { $set: service },
    { upsert: true, new: true },
  );
}

/**
 * Seed default services if none exist
 */
export async function seedServicesIfEmpty(): Promise<boolean> {
  await ensureConnection();
  const MedicalService = getMedicalServiceModel();
  const count = await MedicalService.countDocuments();

  if (count === 0) {
    await MedicalService.insertMany(DEFAULT_SERVICES);
    console.log(
      `[Services] Seeded ${DEFAULT_SERVICES.length} default services`,
    );
    return true;
  }

  return false;
}

// Export for backward compatibility
export type MedicalService = IMedicalService;
