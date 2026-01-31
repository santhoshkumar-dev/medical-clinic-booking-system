# 🏥 Medical Clinic Booking System

A production-quality medical clinic booking system demonstrating **SAGA Choreography** pattern with event-driven architecture, compensation logic, and real-time status tracking.

## 🌐 Live Demo

**Production URL:** [https://medical-clinic-booking-system.vercel.app/](https://medical-clinic-booking-system.vercel.app/)

## 📹 Video Demonstrations

| Video                | Description                            | Link                                                                                        |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Terminal Demo**    | 3 test scenarios with real-time status | [Watch](https://drive.google.com/file/d/1KiNvUh7cLHFciR_Wb-AZQTIhtKxXoQ6C/view?usp=sharing) |
| **Code Explanation** | Architecture walkthrough               | [Watch](https://drive.google.com/file/d/1SkIJh2uBRtlE6WUy0bFzBqkhN1UrbTKt/view?usp=sharing) |
| **DevOps Logs**      | Backend logs & compensation flow       | [Watch](https://drive.google.com/file/d/1QhqoYJpeXQzEoeeDLVNVzLtfIZ_3zWM8/view?usp=sharing) |

---

## 🎯 Architecture Overview

This system implements a **cloud-style event-driven backend** using:

- **SAGA Choreography** with Redis Pub/Sub
- **Compensation logic** for failure handling
- **Structured logging** with correlation IDs
- **Real-time status updates** via polling
- **Role-based Authentication** via Better Auth

```mermaid
graph LR
    subgraph Frontend
        UI[Booking UI]
    end

    subgraph API
        API["/api/booking"]
    end

    subgraph "Redis Pub/Sub"
        EB[(Event Bus)]
    end

    subgraph Services
        BS[BookingService]
        PS[PricingService]
        DQS[DiscountQuotaService]
        PAY[PaymentService]
        CS[ConfirmationService]
    end

    UI --> API --> BS --> EB
    EB --> PS --> EB
    EB --> DQS --> EB
    EB --> PAY --> EB
    EB --> CS
```

---

## 📋 Business Rules

### R1 - Discount Eligibility

Apply 12% discount if:

- User is **female** AND today is her **birthday**
- OR total **base price > ₹1,000**

### R2 - Daily Discount Quota

- System-wide limit (configurable, default: 100)
- Resets at **midnight IST**
- When exhausted → proceeds with **full price** (no rejection)

---

## ⚡ Event Flow

### Happy Path

```
BookingRequested → PricingCalculated → DiscountQuotaReserved → PaymentCompleted → BookingConfirmed
```

### Compensation Path (Payment Failure with Discount)

```
BookingRequested → PricingCalculated → DiscountQuotaReserved → PaymentFailed → CompensationTriggered → DiscountQuotaReleased → BookingFailed
```

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | Next.js 16 (App Router) + shadcn/ui |
| Backend    | Next.js API Routes                  |
| Event Bus  | **Redis Pub/Sub**                   |
| Database   | MongoDB                             |
| Auth       | Better Auth                         |
| Deployment | Vercel + MongoDB Atlas              |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/medical-clinic

# Redis (for Event Bus)
REDIS_URL=redis://localhost:6379

# Payment Simulation
PAYMENT_SIMULATION_MODE=success  # success, fail, or random

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Seed Admin Account (Optional)

```bash
npx ts-node scripts/seed-admin.ts
```

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── booking/        # SAGA initiation & status
│   │   ├── admin/          # Admin APIs (quota, services)
│   │   └── auth/           # Better Auth endpoints
│   ├── admin/              # Admin dashboard
│   └── history/            # User booking history
├── components/             # React UI components
├── lib/
│   ├── db/
│   │   ├── models/         # Mongoose schemas
│   │   ├── mongoose.ts     # MongoDB connection
│   │   └── redis.ts        # Redis connection
│   ├── events/
│   │   ├── eventBus.ts     # Redis Pub/Sub implementation
│   │   └── types.ts        # Event type definitions
│   └── services/           # SAGA participants
│       ├── sagaOrchestrator.ts
│       ├── pricingService.ts
│       ├── discountQuotaService.ts
│       ├── paymentService.ts
│       └── confirmationService.ts
├── cli/                    # Terminal client (excluded from build)
└── instrumentation.ts      # Server startup initialization
```

---

## 🧪 Test Scenarios

### 1. Positive Case ✅

Female user with birthday discount, payment succeeds → Booking confirmed

### 2. Negative Case #1 ❌

Payment fails WITH discount applied → Compensation releases quota

### 3. Negative Case #2 ❌

Daily quota exhausted → Proceeds with full price (no discount)

---

## 📚 Documentation

| Document                                         | Description                     |
| ------------------------------------------------ | ------------------------------- |
| [ASSUMPTIONS.md](./ASSUMPTIONS.md)               | Design decisions & assumptions  |
| [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)         | Detailed test case descriptions |
| [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) | Code architecture deep dive     |

---

## 📄 License

MIT
