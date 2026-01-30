import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import {
  getAllServices,
  updateServicePrice as updateServicePriceDb,
  seedServicesIfEmpty,
} from "@/lib/db/models/medicalService";
import {
  getDiscountPercentage,
  setDiscountPercentage,
} from "@/lib/db/models/serviceConfig";
import { logAdminAction } from "@/lib/services/adminService";
import { initializeSaga } from "@/lib/services/sagaOrchestrator";

// Initialize SAGA for event handling
initializeSaga();

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Ensure services are seeded
    await seedServicesIfEmpty();

    // Get current config
    const discountPercentage = await getDiscountPercentage();
    const dbServices = await getAllServices();

    // Build service list for admin view
    const services = dbServices.map((service) => ({
      id: service.id,
      name: service.name,
      gender: service.gender,
      description: service.description,
      price: service.price,
      currentPrice: service.price,
      isActive: service.isActive,
    }));

    return NextResponse.json({
      success: true,
      discountPercentage,
      services,
    });
  } catch (error) {
    console.error("Error fetching service config:", error);
    return NextResponse.json(
      { error: "Failed to fetch service config" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; role?: string };
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { discountPercentage, serviceId, price } = body;

    // Update discount percentage if provided
    if (discountPercentage !== undefined) {
      if (
        typeof discountPercentage !== "number" ||
        discountPercentage < 0 ||
        discountPercentage > 100
      ) {
        return NextResponse.json(
          { error: "Discount percentage must be between 0 and 100" },
          { status: 400 },
        );
      }

      await setDiscountPercentage(discountPercentage, user.id);

      await logAdminAction(
        user.id || "unknown",
        "UPDATE_DISCOUNT_PERCENTAGE",
        "systemConfig",
        { discountPercentage },
      );

      return NextResponse.json({
        success: true,
        message: `Discount percentage updated to ${discountPercentage}%`,
      });
    }

    // Update service price if provided
    if (serviceId && price !== undefined) {
      if (typeof price !== "number" || price < 0) {
        return NextResponse.json(
          { error: "Price must be a positive number" },
          { status: 400 },
        );
      }

      const updated = await updateServicePriceDb(serviceId, price);

      if (!updated) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 },
        );
      }

      await logAdminAction(
        user.id || "unknown",
        "UPDATE_SERVICE_PRICE",
        `service:${serviceId}`,
        { serviceId, price },
      );

      return NextResponse.json({
        success: true,
        message: `Service ${serviceId} price updated to ₹${price}`,
      });
    }

    return NextResponse.json(
      { error: "No valid update parameters provided" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error updating service config:", error);
    return NextResponse.json(
      { error: "Failed to update service config" },
      { status: 500 },
    );
  }
}
