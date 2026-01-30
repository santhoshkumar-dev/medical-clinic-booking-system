# Assumptions

This document lists all assumptions made during the implementation of the Medical Clinic Booking System.

---

## Business Logic Assumptions

### A1 - Birthday Discount Eligibility

- **Assumption**: Birthday discount only checks month and day, ignoring the year.
- **Rationale**: Users should receive the discount on their birthday regardless of birth year.
- **Implementation**: `pricingService.ts` compares `today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth()`.

### A2 - Discount Application Order

- **Assumption**: The 12% discount is applied only once, regardless of how many eligibility criteria are met (birthday OR high-value).
- **Rationale**: Stacking discounts was not specified in requirements.

### A3 - Quota Applies Only to Discount-Eligible Requests

- **Assumption**: Requests that don't qualify for a discount (male, non-birthday, base price ≤ ₹1000) proceed without quota checks.
- **Rationale**: The requirement states "applies only to requests that would qualify for the R1 discount."

### A4 - Price Threshold

- **Assumption**: "Base price > ₹1000" means strictly greater than, not ≥.
- **Implementation**: `if (basePrice > 1000)` in pricing service.

---

## Technical Assumptions

### A5 - IST Timezone for Quota Reset

- **Assumption**: Daily quota uses `Asia/Kolkata` timezone (UTC+5:30) for midnight reset.
- **Implementation**: `new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })` generates date keys.

### A6 - Simulated Payment Gateway

- **Assumption**: Payment processing is simulated since no real payment gateway was specified.
- **Modes**:
  - `PAYMENT_SIMULATION_MODE=success` - Always succeeds
  - `PAYMENT_SIMULATION_MODE=fail` - Always fails (for testing compensation)
  - `PAYMENT_SIMULATION_MODE=random` - 10% random failure rate

### A7 - In-Memory Event Subscriptions

- **Assumption**: Event bus subscriptions are stored in memory and re-initialized on each server start.
- **Trade-off**: Simplicity over durability. Events are persisted to MongoDB but subscriptions are runtime-only.

### A8 - Polling for Real-Time Updates

- **Assumption**: WebSocket/SSE not required; periodic polling (300ms intervals) is acceptable for real-time status updates.
- **Rationale**: Simpler implementation for demo purposes.

### A9 - MongoDB as Event Store

- **Assumption**: MongoDB is sufficient for event sourcing in this demo context.
- **Production Note**: A dedicated message queue (Kafka, RabbitMQ) would be preferred for true microservices.

---

## User Flow Assumptions

### A10 - Gender-Specific Services

- **Assumption**: Some medical services are gender-specific (e.g., mammography for female, prostate exam for male).
- **Implementation**: Services have a `gender` field with values: `"male"`, `"female"`, or `"all"`.

### A11 - Single Booking Session

- **Assumption**: Each booking submission creates an independent transaction; no multi-booking basket.
- **Rationale**: Keeps SAGA complexity manageable.

### A12 - No Appointment Scheduling

- **Assumption**: System handles booking confirmation only, not appointment time slot selection.
- **Rationale**: Not specified in requirements; focus is on transaction workflow.

---

## Authentication Assumptions

### A13 - Demo/CLI Mode Bypass

- **Assumption**: For demo and CLI testing purposes, an unauthenticated endpoint is acceptable.
- **Implementation**: `/api/booking/demo` allows unauthenticated submissions for CLI testing.
- **Production Note**: Must be disabled or secured in production.

### A14 - Role Separation

- **Assumption**: Admins and users are distinct accounts; an admin cannot book as themselves.
- **Rationale**: Prevents privilege confusion and ensures audit trail clarity.

---

## Error Handling Assumptions

### A15 - Compensation is Best-Effort

- **Assumption**: If a compensation action fails (e.g., network error during quota release), we log the error but don't retry automatically.
- **Production Note**: Dead-letter queues and manual intervention would be needed.

### A16 - Correlation ID Uniqueness

- **Assumption**: UUID v4 provides sufficient uniqueness for correlation IDs across the system.
- **Implementation**: `uuid.v4()` generates IDs like `a1b2c3d4-e5f6-...`.
