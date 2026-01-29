import { ObjectId } from "mongodb";
import { getDb } from "../mongodb";

export interface ServicePrice {
  serviceId: string;
  price: number;
}

export interface SystemConfig {
  _id?: ObjectId;
  key: string;
  value: unknown;
  updatedAt: Date;
  updatedBy?: string;
}

const DEFAULT_DISCOUNT_PERCENTAGE = 12;

/**
 * Get a system configuration value
 */
export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDb();

  const config = await db
    .collection<SystemConfig>("systemConfig")
    .findOne({ key });

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
  const db = await getDb();

  await db.collection<SystemConfig>("systemConfig").updateOne(
    { key },
    {
      $set: {
        value,
        updatedAt: new Date(),
        updatedBy,
      },
    },
    { upsert: true },
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
