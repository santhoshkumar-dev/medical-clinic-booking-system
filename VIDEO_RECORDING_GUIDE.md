# Video Recording Guide - Terminal Demo

## Recording Setup

### Tools Needed

- **Screen Recorder**: OBS Studio (free) or Windows Game Bar (Win+G)
- **Terminal**: Keep `npm run dev` running
- **Browser**: Chrome/Edge with DevTools open (Console tab)
- **MongoDB Compass**: (Optional) To show database changes

### Resolution

- Record at **1920x1080** for clarity
- Keep font size large enough to read

---

## Video 1: Terminal Demo (Max 8 minutes)

### Script & Scenarios

---

### 🎬 INTRO (30 seconds)

**Say**: "This is the terminal demo for the Medical Clinic Booking System. I'll demonstrate 3 test scenarios including 1 positive and 2 negative cases with compensation logic."

**Show**:

1. Terminal running `npm run dev`
2. Browser at `http://localhost:3000`

---

### 📗 SCENARIO 1: Positive Case - Successful Booking with Discount (2 minutes)

**Setup**: Ensure quota is available (check Admin Panel → Quota Status: Available < Limit)

**Steps**:

1. **Navigate** to `http://localhost:3000`
2. **Fill form**:
   - Name: `Priya Sharma`
   - Gender: `Female`
   - Date of Birth: `[TODAY'S DATE]` (to trigger birthday discount)
   - OR use any date with order > ₹1000
3. **Select Services**: Pick services totaling > ₹1000
4. **Show Booking Summary**: Point out the discount calculation
5. **Click**: "Confirm & Pay"
6. **Watch**: Real-time status updates in the Saga Status component
7. **Show**: Success message with Reference ID and discounted price

**Say**: "The booking succeeded. You can see the 12% birthday discount was applied, quota was reserved, payment processed, and booking confirmed with reference ID."

**DevTools Console**: Show the event flow logs

---

### 📕 SCENARIO 2: Negative Case - Payment Failure with Compensation (2.5 minutes)

**Setup**:

1. Set environment variable to simulate payment failure
2. Edit `.env.local`: Add `PAYMENT_SIMULATION_MODE=fail`
3. Restart dev server

**Steps**:

1. **Fill form**:
   - Name: `Rahul Kumar`
   - Gender: `Male`
   - Date of Birth: `1990-05-15`
2. **Select Services**: > ₹1000 to qualify for discount
3. **Click**: "Confirm & Pay"
4. **Watch**:
   - ✅ Booking Requested
   - ✅ Pricing Calculated
   - ✅ Discount Quota Reserved
   - ❌ Payment Failed
   - 🔄 Compensation Triggered
   - ↩️ Quota Released (compensation)
   - ❌ Booking Failed
5. **Show**: Error message "Payment declined"

**Say**: "Payment failed, but notice the compensation logic kicked in. The system automatically released the quota that was reserved, demonstrating the SAGA compensation pattern."

**Terminal Logs**: Show the structured JSON logs showing compensation flow

---

### 📕 SCENARIO 3: Negative Case - Quota Exhausted (2.5 minutes)

**Setup**:

1. Revert payment mode: `PAYMENT_SIMULATION_MODE=success`
2. Go to Admin Panel: `http://localhost:3000/admin`
3. Login as admin
4. Set Quota Limit to `0` (to simulate exhausted quota)

**Steps**:

1. **Show Admin Panel**: Quota = 0/0 (exhausted)
2. **Navigate** to booking page
3. **Fill form** with discount-eligible user
4. **Click**: "Confirm & Pay"
5. **Watch**:
   - Booking Summary shows "Quota Exhausted" warning
   - Booking proceeds with FULL PRICE (no discount)
6. **Show**: Booking succeeds but at full price

**Say**: "When quota is exhausted, the system proceeds with full price instead of rejecting. This provides a better user experience while respecting the daily limit."

---

### 🎬 OUTRO (30 seconds)

**Say**: "This concludes the terminal demo showing all 3 scenarios. The positive case demonstrated successful discount flow, and the two negative cases showed compensation logic for payment failure and graceful handling of quota exhaustion."

---

## Video 2: Code Explanation (Max 10 minutes)

### Structure to Cover

1. **Architecture Overview** (2 min)
   - Show folder structure
   - Explain event-driven design

2. **SAGA Orchestrator** (2 min)
   - `lib/services/sagaOrchestrator.ts`
   - Event subscriptions and flow

3. **Event Flow** (3 min)
   - `lib/events/eventBus.ts`
   - Event types and correlation ID

4. **Compensation Logic** (2 min)
   - `lib/services/discountQuotaService.ts` - `handleCompensationTriggered`
   - `lib/services/paymentService.ts` - `handlePaymentCompensation`

5. **Quota Management** (1 min)
   - Atomic reservation with `$inc`
   - IST timezone handling

---

## Video 3: DevOps Logs (Max 5 minutes)

### What to Show

1. **Terminal Logs** (2 min)
   - Run positive scenario
   - Point out structured JSON logs with correlation ID

2. **Database Changes** (1.5 min)
   - MongoDB Compass showing:
     - `bookings` collection
     - `sagaEvents` collection
     - `auditLogs` collection
     - `discountQuotas` collection

3. **Compensation Logs** (1.5 min)
   - Trigger payment failure scenario
   - Show logs with:
     - `CompensationTriggered` event
     - `DiscountQuotaReleased` event
     - Status changes in booking document

---

## Quick Environment Setup Commands

```bash
# Start dev server
npm run dev

# Simulate payment failure (add to .env.local)
PAYMENT_SIMULATION_MODE=fail

# Normal mode
PAYMENT_SIMULATION_MODE=success

# Random 10% failure
PAYMENT_SIMULATION_MODE=random
```

---

## Recording Tips

1. **Practice** each scenario 2-3 times before recording
2. **Clear browser cache** before recording
3. **Reset database** if needed for clean demo
4. **Speak clearly** and explain what you're clicking
5. **Pause briefly** at key moments (status updates, errors)
6. **Keep it under time** - use a timer
