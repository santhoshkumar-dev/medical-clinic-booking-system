# Microservices Architecture Guide

## 🏗️ Architecture Overview

The Medical Clinic Booking System now supports **two deployment modes**:

### 1. **Local Mode** (Development)

- SAGA services run **in the same process** as the Next.js app
- Simpler setup, easier debugging
- Single container/process

### 2. **Production Mode** (Microservices)

- SAGA services run in a **separate Docker container**
- Better scalability and resource isolation
- Independent scaling of services
- Follows microservices best practices

---

## 🔄 How It Works

### Service Mode Configuration

The `SERVICE_MODE` environment variable controls the architecture:

```env
# Local Mode (Development)
SERVICE_MODE=local
# → SAGA services initialize in Next.js process

# Production Mode (Microservices)
SERVICE_MODE=production
# → SAGA services run in separate container
```

### Communication Flow

Both modes use **Redis Pub/Sub** for event-driven communication:

```
┌─────────────────────────────────────────────────────────┐
│                    Redis Event Bus                      │
│              (Pub/Sub for all events)                   │
└──────────┬────────────────────────────┬─────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   Next.js App        │    │   SAGA Services          │
│   (API + Frontend)   │    │   (Event Handlers)       │
│                      │    │                          │
│   - Booking API      │    │   - PricingService       │
│   - Admin API        │    │   - DiscountQuotaService │
│   - User Interface   │    │   - PaymentService       │
│   - Health Checks    │    │   - ConfirmationService  │
└──────────────────────┘    └──────────────────────────┘
```

**Key Point**: The Next.js app **publishes** events to Redis, and the SAGA services **subscribe** to those events. They communicate **only through Redis**, making them truly decoupled.

---

## 📁 New Files

### 1. `services.Dockerfile`

Dockerfile specifically for the SAGA services container.

```dockerfile
FROM node:20-alpine
# Builds only the services, not the full Next.js app
# Runs services-entrypoint.js
```

### 2. `services-entrypoint.js`

Standalone Node.js process that initializes SAGA services.

```javascript
// Imports sagaOrchestrator and starts listening for events
await initializeSaga();
```

### 3. Updated `instrumentation.ts`

Conditionally initializes SAGA based on `SERVICE_MODE`.

```typescript
if (serviceMode === "local") {
  // Run SAGA in same process
  await initializeSaga();
} else {
  // SAGA runs in separate container
  console.log("Production mode - services in separate container");
}
```

---

## 🚀 Deployment

### Local Development

```bash
# Uses docker-compose.yml
# SERVICE_MODE=local (SAGA in Next.js process)

docker-compose up -d

# Services:
# - MongoDB (port 27017)
# - Redis (port 6379)
# - Next.js App (port 3000) ← SAGA runs here
```

### Production Deployment

```bash
# Uses docker-compose.prod.yml
# SERVICE_MODE=production (SAGA in separate container)

docker-compose -f docker-compose.prod.yml up -d

# Services:
# - MongoDB (port 27017)
# - Redis (port 6379)
# - SAGA Services (background) ← Separate container
# - Next.js App (port 3000)
```

---

## 🔍 Containers in Production

### Container 1: MongoDB

```yaml
mongodb:
  image: mongo:7.0
  ports: ["27017:27017"]
```

### Container 2: Redis

```yaml
redis:
  image: redis:7-alpine
  ports: ["6379:6379"]
```

### Container 3: SAGA Services ⭐ NEW

```yaml
services:
  build:
    dockerfile: services.Dockerfile
  # Runs: node services-entrypoint.js
  # Listens for events on Redis
```

### Container 4: Next.js App

```yaml
app:
  build:
    dockerfile: Dockerfile
  ports: ["3000:3000"]
  environment:
    SERVICE_MODE: production
```

---

## 🎯 Benefits of Microservices Mode

### 1. **Independent Scaling**

```bash
# Scale only the services container
docker-compose -f docker-compose.prod.yml up -d --scale services=3
```

### 2. **Resource Isolation**

- Next.js app gets dedicated CPU/memory
- SAGA services get dedicated CPU/memory
- No resource contention

### 3. **Fault Isolation**

- If SAGA services crash, Next.js app continues serving UI
- If Next.js app crashes, SAGA services continue processing events

### 4. **Independent Deployment**

```bash
# Deploy only services (no downtime for frontend)
docker-compose -f docker-compose.prod.yml up -d --no-deps services

# Deploy only app
docker-compose -f docker-compose.prod.yml up -d --no-deps app
```

### 5. **Better Monitoring**

- Separate logs for each service
- Separate health checks
- Easier to identify bottlenecks

---

## 📊 Comparison

| Aspect             | Local Mode                     | Production Mode                   |
| ------------------ | ------------------------------ | --------------------------------- |
| **Containers**     | 3 (MongoDB, Redis, App)        | 4 (MongoDB, Redis, Services, App) |
| **SAGA Location**  | Inside Next.js process         | Separate container                |
| **Scaling**        | Scale entire app               | Scale services independently      |
| **Resource Usage** | Lower (1 Node.js process)      | Higher (2 Node.js processes)      |
| **Complexity**     | Simple                         | Moderate                          |
| **Best For**       | Development, small deployments | Production, high traffic          |

---

## 🧪 Testing

### Test Local Mode

```bash
# 1. Set local mode
echo "SERVICE_MODE=local" >> .env.local

# 2. Start dev server
npm run dev

# 3. Check logs
# Should see: "[Instrumentation] Initializing SAGA in local mode..."
```

### Test Production Mode

```bash
# 1. Start production stack
docker-compose -f docker-compose.prod.yml up -d

# 2. Check services container logs
docker logs medical-clinic-services-prod

# Should see:
# [Services] Starting SAGA Services container...
# [Services] SAGA services initialized successfully

# 3. Check app container logs
docker logs medical-clinic-app-prod

# Should see:
# [Instrumentation] Production mode - SAGA services running in separate container
```

### Test Event Communication

```bash
# 1. Create a booking (triggers events)
curl -X POST http://localhost:3000/api/booking \
  -H "Content-Type: application/json" \
  -d '{...}'

# 2. Watch services logs
docker logs -f medical-clinic-services-prod

# Should see event processing:
# [PricingService] Handling BookingRequested...
# [DiscountQuotaService] Handling PricingCalculated...
# [PaymentService] Handling DiscountQuotaReserved...
```

---

## 🔧 Troubleshooting

### Issue: "Services not processing events"

**Check 1**: Verify services container is running

```bash
docker ps | grep services
```

**Check 2**: Check Redis connection

```bash
docker logs medical-clinic-services-prod | grep Redis
# Should see: [Redis Subscriber] Connected
```

**Check 3**: Verify SERVICE_MODE

```bash
docker exec medical-clinic-app-prod env | grep SERVICE_MODE
# Should show: SERVICE_MODE=production
```

### Issue: "Events processed twice"

**Cause**: Both app and services containers are running SAGA

**Solution**: Ensure `SERVICE_MODE=production` in app container

```bash
docker exec medical-clinic-app-prod env | grep SERVICE_MODE
```

### Issue: "Cannot connect to MongoDB from services"

**Check**: Network connectivity

```bash
docker exec medical-clinic-services-prod ping mongodb
```

---

## 🚀 Cloud Deployment

### Cloud Run (Google Cloud)

For Cloud Run, you'll deploy **two services**:

#### 1. Deploy SAGA Services

```bash
# Build services image
gcloud builds submit --tag gcr.io/PROJECT_ID/medical-clinic-services \
  --dockerfile services.Dockerfile

# Deploy as background service (no public access)
gcloud run deploy medical-clinic-services \
  --image gcr.io/PROJECT_ID/medical-clinic-services \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars MONGODB_URI="..." \
  --set-env-vars REDIS_URL="..."
```

#### 2. Deploy Next.js App

```bash
# Build app image
gcloud builds submit --tag gcr.io/PROJECT_ID/medical-clinic-app

# Deploy with public access
gcloud run deploy medical-clinic-app \
  --image gcr.io/PROJECT_ID/medical-clinic-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SERVICE_MODE=production \
  --set-env-vars MONGODB_URI="..." \
  --set-env-vars REDIS_URL="..."
```

### Coolify

In Coolify, create **two separate applications**:

1. **medical-clinic-services**
   - Dockerfile: `services.Dockerfile`
   - No public port
   - Environment: `SERVICE_MODE=production`

2. **medical-clinic-app**
   - Dockerfile: `Dockerfile`
   - Public port: 3000
   - Environment: `SERVICE_MODE=production`

---

## 📈 Monitoring

### Health Checks

**App Health**: `http://localhost:3000/api/health`

```json
{
  "status": "healthy",
  "mode": "production",
  "checks": {
    "api": "ok",
    "database": "ok",
    "eventBus": "ok"
  }
}
```

**Services Health**: Check logs

```bash
docker logs medical-clinic-services-prod | grep "SAGA services initialized"
```

### Metrics to Monitor

1. **Event Processing Rate** (in services container)
2. **API Response Time** (in app container)
3. **Redis Pub/Sub Lag**
4. **MongoDB Connection Pool**

---

## 🎉 Summary

You now have a **flexible microservices architecture**:

- **Development**: Simple, single-process (`SERVICE_MODE=local`)
- **Production**: Scalable, multi-container (`SERVICE_MODE=production`)
- **Communication**: Decoupled via Redis Event Bus
- **Deployment**: Works with Docker Compose, Cloud Run, Coolify, etc.

The beauty of this architecture is that **the code doesn't change** - only the deployment configuration!
