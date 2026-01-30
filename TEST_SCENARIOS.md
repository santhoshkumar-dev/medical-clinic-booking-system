# Test Scenarios

This document describes the three end-to-end test scenarios demonstrating the SAGA workflow.

---

## How to Run Tests

### Prerequisites

1. Start the backend: `npm run dev`
2. Navigate to CLI: `cd cli && npm install`

### Running Scenarios

```bash
# Interactive mode
npx ts-node index.ts

# Specific test scenario
npx ts-node index.ts --test happy
npx ts-node index.ts --test quota-exhausted
npx ts-node index.ts --test payment-failure
```

---

## Scenario 1: Happy Path - Birthday Discount ✅

**Type**: Positive Case

### Test Data

| Field         | Value                             |
| ------------- | --------------------------------- |
| Name          | Priya Sharma                      |
| Gender        | Female                            |
| Date of Birth | (Today's date, 1990)              |
| Services      | General Consultation, Mammography |

### Preconditions

- Quota is available (not exhausted)
- `PAYMENT_SIMULATION_MODE=success`

### Expected Event Flow

```
BookingRequested → PricingCalculated → DiscountQuotaReserved → PaymentCompleted → BookingConfirmed
```

### Expected Outcome

- **Status**: `confirmed`
- **Discount**: 12% applied (birthday discount eligibility)
- **Reference ID**: Generated (e.g., `MC-XXXXX-XXXX`)

### What This Tests

- Full happy path execution
- Birthday discount rule (R1)
- Quota reservation
- Payment processing
- Booking confirmation with reference ID generation

---

## Scenario 2: Quota Exhausted ❌

**Type**: Negative Case (No Compensation Needed)

### Test Data

| Field         | Value                            |
| ------------- | -------------------------------- |
| Name          | Anita Patel                      |
| Gender        | Female                           |
| Date of Birth | (Today's date, 1988)             |
| Services      | General Consultation, Gynecology |

### Preconditions

- Quota is **exhausted** (CLI sets `used = limit = 100`)
- Any payment mode (payment never reached)

### Setup Action

The CLI automatically calls `/api/test` with `action: "exhaust-quota"` before submitting.

### Expected Event Flow

```
BookingRequested → PricingCalculated → DiscountQuotaRejected → BookingFailed
```

### Expected Outcome

- **Status**: `failed`
- **Error Message**: "Daily discount quota reached. Please try again tomorrow."
- **Compensation**: None (no resources were committed)

### What This Tests

- Discount quota enforcement (R2)
- Early rejection without compensation
- Proper error messaging to user

---

## Scenario 3: Payment Failure with Compensation 🔄

**Type**: Negative Case (Compensation Required)

### Test Data

| Field         | Value                                   |
| ------------- | --------------------------------------- |
| Name          | Rahul Kumar                             |
| Gender        | Male                                    |
| Date of Birth | 1985-05-15                              |
| Services      | General Consultation, X-Ray, Ultrasound |

**Note**: Total exceeds ₹1000, triggering high-value discount eligibility.

### Preconditions

- Quota is **reset/available** (CLI resets quota before test)
- `PAYMENT_SIMULATION_MODE=fail` (⚠️ must set in `.env.local`)

### Setup Steps

1. Edit `.env.local`: Set `PAYMENT_SIMULATION_MODE=fail`
2. Restart Next.js server: `npm run dev`
3. Run: `npx ts-node index.ts --test payment-failure`

### Expected Event Flow

```
BookingRequested → PricingCalculated → DiscountQuotaReserved → PaymentFailed → CompensationTriggered → DiscountQuotaReleased → BookingFailed
```

### Expected Outcome

- **Status**: `failed`
- **Error Message**: "Payment declined by issuing bank (simulated failure)"
- **Compensation**: Quota released back to pool

### What This Tests

- **SAGA Compensation Pattern**: When payment fails after quota reservation, the system:
  1. Emits `CompensationTriggered` event
  2. `DiscountQuotaService` releases the reserved quota
  3. `PaymentService` reverses any payment (if applicable)
  4. Booking is marked as failed with compensation flag

---

## Event Types Reference

| Event                   | Description               | Terminal Icon |
| ----------------------- | ------------------------- | ------------- |
| `BookingRequested`      | SAGA initiated            | 📝            |
| `PricingCalculated`     | Price + discount computed | 💰            |
| `DiscountQuotaReserved` | Quota slot claimed        | 🎫            |
| `DiscountQuotaRejected` | Quota exhausted           | ❌            |
| `PaymentCompleted`      | Payment succeeded         | 💳            |
| `PaymentFailed`         | Payment declined          | ⚠️            |
| `CompensationTriggered` | Rollback started          | 🔄            |
| `DiscountQuotaReleased` | Quota refunded            | ↩️            |
| `PaymentReversed`       | Payment refunded          | ↩️            |
| `BookingConfirmed`      | Success!                  | ✅            |
| `BookingFailed`         | Terminal failure          | ❌            |

---

## Viewing Logs

### Console Logs

The server outputs structured JSON logs for every event:

```json
{
  "correlationId": "abc123...",
  "event": "PaymentFailed",
  "service": "PaymentService",
  "status": "failure",
  "timestamp": "2026-01-30T10:15:30.000Z"
}
```

### Admin Dashboard

Visit `http://localhost:3000/admin/bookings` to see:

- Real-time event timeline
- Filter by correlation ID
- Visual representation of compensation events

### MongoDB Collections

- `bookings` - Booking state snapshots
- `sagaEvents` - Append-only event log
- `auditLogs` - Full audit trail with actor info
- `discountQuota` - Daily quota tracking
