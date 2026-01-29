import { NextResponse } from "next/server";
import { getDiscountPercentage } from "@/lib/db/models/serviceConfig";

export async function GET() {
  try {
    const discountPercentage = await getDiscountPercentage();

    return NextResponse.json({
      discountPercentage,
    });
  } catch (error) {
    console.error("Error fetching discount config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config", discountPercentage: 12 },
      { status: 500 },
    );
  }
}
