import mongoose, { Schema, Document, Model } from "mongoose";
import { ensureConnection } from "../mongoose";

// Service price type
export interface ServicePrice {
  serviceId: string;
  price: number;
}

// System config document interface
export interface ISystemConfig extends Document {
  key: string;
  value: unknown;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// System config schema
const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: "systemConfigs" },
);

// Get or create model
function getSystemConfigModel(): Model<ISystemConfig> {
  return (
    mongoose.models.SystemConfig ||
    mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema)
  );
}

const DEFAULT_DISCOUNT_PERCENTAGE = 12;

/**
 * Get a system configuration value
 */
export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  await ensureConnection();
  const SystemConfig = getSystemConfigModel();
  const config = await SystemConfig.findOne({ key });

  if (!config) {
    return defaultValue;
  }

  return config.value as T;
}

/**
 * Set a system configuration value
 */
export async function setConfig<T>(
  key: string,
  value: T,
  updatedBy?: string,
): Promise<void> {
  await ensureConnection();
  const SystemConfig = getSystemConfigModel();

  await SystemConfig.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy } },
    { upsert: true, new: true },
  );
}

/**
 * Get the current discount percentage (R1 rule)
 */
export async function getDiscountPercentage(): Promise<number> {
  return getConfig("discountPercentage", DEFAULT_DISCOUNT_PERCENTAGE);
}

/**
 * Set the discount percentage
 */
export async function setDiscountPercentage(
  percentage: number,
  adminId?: string,
): Promise<void> {
  await setConfig("discountPercentage", percentage, adminId);
}

/**
 * Get custom service price (if set)
 */
export async function getServicePrice(
  serviceId: string,
  defaultPrice: number,
): Promise<number> {
  const prices = await getConfig<ServicePrice[]>("servicePrices", []);
  const customPrice = prices.find((p) => p.serviceId === serviceId);
  return customPrice?.price ?? defaultPrice;
}

/**
 * Get all custom service prices
 */
export async function getAllServicePrices(): Promise<ServicePrice[]> {
  return getConfig<ServicePrice[]>("servicePrices", []);
}

/**
 * Set service prices
 */
export async function setServicePrices(
  prices: ServicePrice[],
  adminId?: string,
): Promise<void> {
  await setConfig("servicePrices", prices, adminId);
}

/**
 * Update a single service price
 */
export async function updateServicePrice(
  serviceId: string,
  price: number,
  adminId?: string,
): Promise<void> {
  const prices = await getAllServicePrices();
  const existingIndex = prices.findIndex((p) => p.serviceId === serviceId);

  if (existingIndex >= 0) {
    prices[existingIndex].price = price;
  } else {
    prices.push({ serviceId, price });
  }

  await setServicePrices(prices, adminId);
}

// Export for backward compatibility
export type SystemConfig = ISystemConfig;
