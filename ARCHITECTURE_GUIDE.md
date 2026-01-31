# Medical Clinic Booking System - Architecture Deep Dive

## 📁 Project Structure Overview

```
medical-clinic-booking-system/
├── app/                    # Next.js App Router (Frontend + API)
│   ├── api/               # REST API endpoints
│   │   ├── booking/       # Booking CRUD + status
│   │   ├── admin/         # Admin panel APIs
│   │   ├── services/      # Medical services list
│   │   ├── quota/         # Quota status check
│   │   └── config/        # System configuration
│   ├── admin/             # Admin panel pages
│   └── auth/              # User authentication pages
├── components/            # React UI components
├── lib/                   # Core business logic ⭐
│   ├── db/               # Database layer (Mongoose)
│   │   ├── models/       # Data models (6 collections)
│   │   └── mongoose.ts   # DB connection
│   ├── events/           # Event-driven system
│   │   ├── eventBus.ts   # Pub/Sub event broker
│   │   ├── types.ts      # Event type definitions
│   │   └── correlationId.ts
│   └── services/         # Business services ⭐⭐
│       ├── sagaOrchestrator.ts  # SAGA setup
│       ├── bookingService.ts
│       ├── pricingService.ts
│       ├── discountQuotaService.ts
│       ├── paymentService.ts
│       └── confirmationService.ts
└── .env.local            # Environment config
```

---

## 🎯 Core Concept: SAGA Choreography Pattern

### What is SAGA?

SAGA is a pattern for managing distributed transactions. Instead of one big transaction, we break it into steps. If any step fails, we "compensate" (undo) previous steps.

### Why Choreography (not Orchestration)?

- **Orchestration**: One central controller tells each service what to do
- **Choreography**: Each service listens for events and decides what to do

We use **choreography** - services communicate via events, not direct calls.

---

## 🔄 The Complete Booking Flow

```
User clicks "Confirm & Pay"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. BookingService.initiateBooking()                           │
│     - Creates booking record (status: pending)                  │
│     - Emits: BookingRequested event                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ [EventBus delivers event]
┌─────────────────────────────────────────────────────────────────┐
│  2. PricingService.handleBookingRequested()                    │
│     - Calculates base price                                     │
│     - Checks R1 rule (birthday OR > ₹1000)                     │
│     - Emits: PricingCalculated event                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. DiscountQuotaService.handlePricingCalculated()             │
│     - If eligible: tries to reserve quota (atomic)             │
│     - If quota available: applies discount                      │
│     - If quota exhausted: proceeds with full price             │
│     - Emits: DiscountQuotaReserved event                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. PaymentService.handleDiscountQuotaReserved()               │
│     - Simulates payment processing                              │
│     - SUCCESS → Emits: PaymentCompleted                        │
│     - FAILURE → Emits: PaymentFailed + CompensationTriggered   │
└─────────────────────────────────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
 SUCCESS    FAILURE
    │         │
    ▼         ▼
┌─────────┐  ┌─────────────────────────────────────────┐
│ 5. Conf-│  │ 5. Compensation Flow                    │
│irmation │  │    - DiscountQuotaService releases quota│
│ Service │  │    - PaymentService reverses payment    │
│         │  │    - BookingService marks as failed     │
│ Emits:  │  └─────────────────────────────────────────┘
│ Booking │
│Confirmed│
└─────────┘
```

---

## 📂 Key Files Explained

### 1. Event Bus (`lib/events/eventBus.ts`)

The heart of the system - a pub/sub message broker.

```typescript
// Key methods:
subscribe(eventType, handler); // Register a listener
emit(event); // Broadcast an event
```

**How it works:**

1. Services register handlers: `eventBus.subscribe("BookingRequested", handler)`
2. When an event happens: `eventBus.emit({ eventType: "BookingRequested", ... })`
3. All subscribed handlers receive the event

---

### 2. SAGA Orchestrator (`lib/services/sagaOrchestrator.ts`)

Sets up all the event subscriptions at app startup.

```typescript
export function initializeSaga() {
  // Step 1: BookingRequested → PricingService
  eventBus.subscribe("BookingRequested", handleBookingRequested);

  // Step 2: PricingCalculated → DiscountQuotaService
  eventBus.subscribe("PricingCalculated", handlePricingCalculated);

  // Step 3: DiscountQuotaReserved → PaymentService
  eventBus.subscribe("DiscountQuotaReserved", handleDiscountQuotaReserved);

  // Step 4: PaymentCompleted → ConfirmationService
  eventBus.subscribe("PaymentCompleted", handlePaymentCompleted);

  // Compensation: CompensationTriggered → release quota, reverse payment
  eventBus.subscribe("CompensationTriggered", handleCompensationTriggered);
  eventBus.subscribe("CompensationTriggered", handlePaymentCompensation);
}
```

---

### 3. Pricing Service (`lib/services/pricingService.ts`)

Implements **Business Rule R1**:

```typescript
// Discount eligible if:
// 1. Female AND birthday today
// 2. OR base price > ₹1000
function checkDiscountEligibility(gender, dateOfBirth, basePrice) {
  const isBirthday = today matches dob (day & month)

  if (gender === "female" && isBirthday) return true
  if (basePrice > 1000) return true
  return false
}
```

---

### 4. Discount Quota Service (`lib/services/discountQuotaService.ts`)

Implements **Business Rule R2** (daily quota limit):

```typescript
async function handlePricingCalculated(event) {
  if (!discountEligible) {
    // No quota needed, proceed with base price
    emit DiscountQuotaReserved (discountApplied: false)
    return
  }

  // Try to reserve quota (atomic operation)
  const reserved = await reserveQuota(correlationId)

  if (reserved) {
    // Success! Apply discount
    updateBooking(finalPrice: discountedPrice)
    emit DiscountQuotaReserved (discountApplied: true)
  } else {
    // Quota exhausted - proceed with FULL PRICE (no rejection)
    updateBooking(finalPrice: basePrice)
    emit DiscountQuotaReserved (discountApplied: false, quotaExhausted: true)
  }
}
```

**Atomic Quota Reservation** (`lib/db/models/discountQuota.ts`):

```typescript
// Uses MongoDB atomic $inc to prevent race conditions
const result = await DiscountQuota.findOneAndUpdate(
  { dateKey, used: { $lt: "$limit" } }, // Only if quota available
  {
    $inc: { used: 1 }, // Increment used count
    $push: { reservations: correlationId }, // Track who reserved
  },
  { new: true },
);
return result !== null; // true = reserved, false = exhausted
```

---

### 5. Payment Service (`lib/services/paymentService.ts`)

Simulates payment + triggers compensation on failure:

```typescript
async function handleDiscountQuotaReserved(event) {
  const booking = await getBooking(correlationId)
  const result = simulatePayment(booking.finalPrice)

  if (result.success) {
    emit PaymentCompleted
  } else {
    emit PaymentFailed

    if (booking.discountApplied) {
      // Quota was used - need to release it
      emit CompensationTriggered
    } else {
      // No quota used - just fail the booking
      failBooking(correlationId, error)
    }
  }
}
```

---

### 6. Compensation Logic

**What gets compensated:**

1. **Quota Release**: If discount was reserved, release it
2. **Payment Reversal**: If payment was made, refund it

```typescript
// In discountQuotaService.ts
async function handleCompensationTriggered(event) {
  const released = await releaseQuota(correlationId)
  if (released) {
    emit DiscountQuotaReleased
  }
  failBooking(correlationId, reason)
}

// In paymentService.ts
async function handlePaymentCompensation(event) {
  const payment = paymentTransactions.get(correlationId)
  if (payment) {
    // Reverse the payment
    emit PaymentReversed
  }
}
```

---

## 🗄️ Database Models (Mongoose)

| Collection        | Purpose                                   |
| ----------------- | ----------------------------------------- |
| `bookings`        | Main booking records with status          |
| `discountQuotas`  | Daily quota tracking (used/limit per day) |
| `sagaEvents`      | Event log for each booking                |
| `auditLogs`       | Structured audit trail                    |
| `medicalServices` | Available medical services                |
| `systemConfigs`   | System settings (discount %)              |

---

## 🔗 API Endpoints

| Endpoint                   | Method | Purpose                          |
| -------------------------- | ------ | -------------------------------- |
| `/api/booking`             | POST   | Create new booking (starts SAGA) |
| `/api/booking/[id]/status` | GET    | Get booking status + events      |
| `/api/services`            | GET    | List medical services            |
| `/api/quota/status`        | GET    | Check current quota              |
| `/api/admin/quota`         | PUT    | Admin: update quota limit        |
| `/api/config/discount`     | GET    | Get discount percentage          |

---

## 🎥 Video 2 Script (Code Explanation)

### Minute 0-2: Architecture Overview

- Show the folder structure
- Explain "event-driven" and "SAGA choreography"
- Draw the flow diagram on screen

### Minute 2-4: Event Bus

- Open `lib/events/eventBus.ts`
- Explain `subscribe()` and `emit()`
- Show how events flow between services

### Minute 4-6: SAGA Setup

- Open `lib/services/sagaOrchestrator.ts`
- Walk through each subscription
- Explain the order of events

### Minute 6-8: Business Rules

- Open `pricingService.ts` → Show R1 logic
- Open `discountQuotaService.ts` → Show R2 logic
- Explain atomic quota reservation

### Minute 8-10: Compensation

- Open `paymentService.ts` → Show failure handling
- Explain `CompensationTriggered` event
- Show quota release in `discountQuotaService.ts`

---

## 💡 Key Concepts to Mention

1. **Correlation ID**: Unique ID that tracks a booking through all events
2. **Atomic Operations**: MongoDB `$inc` for safe concurrent quota updates
3. **IST Timezone**: Quota resets at midnight IST, not UTC
4. **Compensation**: Undo side effects when failures occur
5. **Event Sourcing**: All events are logged in `sagaEvents` collection
