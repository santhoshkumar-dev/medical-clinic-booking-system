import { eventBus } from "../events/eventBus";
import { handleBookingRequested } from "./pricingService";
import {
  handlePricingCalculated,
  handleCompensationTriggered,
} from "./discountQuotaService";
import {
  handleDiscountQuotaReserved,
  handlePaymentCompensation,
} from "./paymentService";
import { handlePaymentCompleted } from "./confirmationService";
import { handleBookingFailed } from "./bookingService";
import { registerAuditLogHandlers } from "./auditLogService";
import { initializeAdminSubscriptions } from "./adminService";

let initialized = false;

/**
 * Initializes the SAGA choreography by registering all event subscriptions
 * This sets up the event-driven workflow where each service reacts to events
 */
export function initializeSaga(): void {
  if (initialized) {
    return;
  }

  // Register audit log handlers first (observability)
  registerAuditLogHandlers();

  // SAGA Event Flow:
  // 1. BookingRequested -> PricingService calculates price
  eventBus.subscribe("BookingRequested", handleBookingRequested);

  // 2. PricingCalculated -> DiscountQuotaService reserves quota
  eventBus.subscribe("PricingCalculated", handlePricingCalculated);

  // 3. DiscountQuotaReserved -> PaymentService processes payment
  eventBus.subscribe("DiscountQuotaReserved", handleDiscountQuotaReserved);

  // 4. PaymentCompleted -> ConfirmationService confirms booking
  eventBus.subscribe("PaymentCompleted", handlePaymentCompleted);

  // 5. BookingFailed -> BookingService handles failure
  eventBus.subscribe("BookingFailed", handleBookingFailed);

  // Compensation handlers:
  // CompensationTriggered -> DiscountQuotaService releases quota
  eventBus.subscribe("CompensationTriggered", handleCompensationTriggered);

  // CompensationTriggered -> PaymentService reverses payment (if any)
  eventBus.subscribe("CompensationTriggered", handlePaymentCompensation);

  // Initialize admin event handlers
  initializeAdminSubscriptions();

  initialized = true;
  console.log("[SAGA] Choreography initialized with all event subscriptions");
}

/**
 * Check if SAGA is initialized
 */
export function isSagaInitialized(): boolean {
  return initialized;
}
