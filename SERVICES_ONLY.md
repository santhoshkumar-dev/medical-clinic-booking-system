# Running SAGA Services Only

This guide is for when you **already have MongoDB and Redis running** and only need to dockerize the SAGA services.

## 🎯 Use Case

- MongoDB is already running (locally or managed service like MongoDB Atlas)
- Redis is already running (locally or managed service like Redis Cloud)
- You only want to run the SAGA services in a Docker container

---

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# 1. Set your MongoDB and Redis URLs
export MONGODB_URI="mongodb://localhost:27017/medical-clinic"
export REDIS_URL="redis://localhost:6379"

# 2. Start SAGA services container
docker-compose -f docker-compose.prod.yml up -d --build

# 3. View logs
docker-compose -f docker-compose.prod.yml logs -f saga-services
```

### Option 2: Using PowerShell Script (Windows)

```powershell
# 1. Set environment variables (optional)
$env:MONGODB_URI = "mongodb://localhost:27017/medical-clinic"
$env:REDIS_URL = "redis://localhost:6379"

# 2. Run the script
.\run-services.ps1
```

### Option 3: Using Bash Script (Linux/Mac)

```bash
# 1. Set environment variables (optional)
export MONGODB_URI="mongodb://localhost:27017/medical-clinic"
export REDIS_URL="redis://localhost:6379"

# 2. Run the script
chmod +x run-services.sh
./run-services.sh
```

### Option 4: Manual Docker Commands

```bash
# 1. Build the image
docker build -f services.Dockerfile -t medical-clinic-saga-services .

# 2. Run the container
docker run -d \
  --name medical-clinic-saga-services \
  --restart unless-stopped \
  --add-host host.docker.internal:host-gateway \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/medical-clinic" \
  -e REDIS_URL="redis://host.docker.internal:6379" \
  -e NODE_ENV=production \
  medical-clinic-saga-services

# 3. View logs
docker logs -f medical-clinic-saga-services
```

---

## 🔧 Configuration

### Connecting to Local Services

If MongoDB and Redis are running on your **host machine** (not in Docker), use `host.docker.internal`:

```bash
MONGODB_URI=mongodb://host.docker.internal:27017/medical-clinic
REDIS_URL=redis://host.docker.internal:6379
```

### Connecting to Remote Services

If using managed services (MongoDB Atlas, Redis Cloud, etc.):

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical-clinic
REDIS_URL=redis://username:password@redis-host:6379
```

### Connecting to Other Docker Containers

If MongoDB and Redis are in Docker containers on the same network:

```bash
MONGODB_URI=mongodb://mongodb:27017/medical-clinic
REDIS_URL=redis://redis:6379
```

---

## ✅ Verify It's Working

### 1. Check Container Status

```bash
docker ps | grep saga-services
```

Expected output:

```
CONTAINER ID   IMAGE                          STATUS
abc123...      medical-clinic-saga-services   Up 2 minutes
```

### 2. Check Logs

```bash
docker logs medical-clinic-saga-services
```

Expected output:

```
[Services] Starting SAGA Services container...
[Services] Environment: production
[Services] MongoDB URI: Set
[Services] Redis URL: Set
[Services] Initializing SAGA choreography...
[AdminService] Admin event subscriptions initialized
[Redis Subscriber] Connected
[EventBus] Redis subscriber initialized
[SAGA] Choreography initialized with Redis Pub/Sub
[Services] SAGA services initialized successfully
[Services] Listening for events on Redis...
```

### 3. Test Event Processing

Create a booking through your Next.js app and watch the services logs:

```bash
docker logs -f medical-clinic-saga-services
```

You should see:

```
[PricingService] Handling BookingRequested...
[DiscountQuotaService] Handling PricingCalculated...
[PaymentService] Handling DiscountQuotaReserved...
[ConfirmationService] Handling PaymentCompleted...
```

---

## 🛠️ Management Commands

### Start Services

```bash
docker start medical-clinic-saga-services
```

### Stop Services

```bash
docker stop medical-clinic-saga-services
```

### Restart Services

```bash
docker restart medical-clinic-saga-services
```

### View Logs

```bash
# Follow logs
docker logs -f medical-clinic-saga-services

# Last 100 lines
docker logs --tail 100 medical-clinic-saga-services

# Since 10 minutes ago
docker logs --since 10m medical-clinic-saga-services
```

### Remove Container

```bash
docker stop medical-clinic-saga-services
docker rm medical-clinic-saga-services
```

### Rebuild and Restart

```bash
# Using Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build saga-services

# Using manual commands
docker stop medical-clinic-saga-services
docker rm medical-clinic-saga-services
docker build -f services.Dockerfile -t medical-clinic-saga-services .
docker run -d --name medical-clinic-saga-services ... (see above)
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Check 1**: Verify MongoDB is running

```bash
# If local MongoDB
mongosh

# If remote MongoDB
mongosh "mongodb+srv://..."
```

**Check 2**: Verify connection string

```bash
docker exec medical-clinic-saga-services env | grep MONGODB_URI
```

**Check 3**: Test connectivity from container

```bash
docker exec -it medical-clinic-saga-services sh
# Inside container:
ping host.docker.internal
```

### Issue: "Cannot connect to Redis"

**Check 1**: Verify Redis is running

```bash
# If local Redis
redis-cli ping

# If remote Redis
redis-cli -h hostname -p port ping
```

**Check 2**: Verify connection string

```bash
docker exec medical-clinic-saga-services env | grep REDIS_URL
```

### Issue: "Events not being processed"

**Check 1**: Verify services are listening

```bash
docker logs medical-clinic-saga-services | grep "Listening for events"
```

**Check 2**: Verify Redis connection

```bash
docker logs medical-clinic-saga-services | grep "Redis Subscriber"
# Should show: [Redis Subscriber] Connected
```

**Check 3**: Verify events are being published

- Check your Next.js app is running with `SERVICE_MODE=production`
- Check Next.js app can connect to Redis

---

## 📊 Architecture

```
┌─────────────────────────────────────────────┐
│   Your Existing Infrastructure              │
│                                             │
│   ┌──────────────┐      ┌──────────────┐   │
│   │   MongoDB    │      │    Redis     │   │
│   │ (Local/Cloud)│      │ (Local/Cloud)│   │
│   └──────┬───────┘      └──────┬───────┘   │
│          │                     │           │
└──────────┼─────────────────────┼───────────┘
           │                     │
           │    ┌────────────────┘
           │    │
    ┌──────▼────▼──────────────────────┐
    │   Docker Container               │
    │                                  │
    │   ┌──────────────────────────┐   │
    │   │  SAGA Services           │   │
    │   │  - PricingService        │   │
    │   │  - DiscountQuotaService  │   │
    │   │  - PaymentService        │   │
    │   │  - ConfirmationService   │   │
    │   └──────────────────────────┘   │
    │                                  │
    └──────────────────────────────────┘
```

---

## 🌐 Production Deployment

### Deploy to Cloud Server

1. **Copy files to server**:

```bash
scp services.Dockerfile user@server:/path/to/app/
scp services-entrypoint.js user@server:/path/to/app/
scp -r lib user@server:/path/to/app/
scp package.json user@server:/path/to/app/
```

2. **SSH into server and run**:

```bash
ssh user@server
cd /path/to/app

# Set environment variables
export MONGODB_URI="your-mongodb-uri"
export REDIS_URL="your-redis-uri"

# Build and run
docker build -f services.Dockerfile -t medical-clinic-saga-services .
docker run -d \
  --name medical-clinic-saga-services \
  --restart always \
  -e MONGODB_URI="$MONGODB_URI" \
  -e REDIS_URL="$REDIS_URL" \
  -e NODE_ENV=production \
  medical-clinic-saga-services
```

### Deploy to Cloud Run (Background Service)

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/saga-services \
  --dockerfile services.Dockerfile

# Deploy (no public access needed)
gcloud run deploy saga-services \
  --image gcr.io/PROJECT_ID/saga-services \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars MONGODB_URI="..." \
  --set-env-vars REDIS_URL="..." \
  --set-env-vars NODE_ENV=production
```

---

## 📝 Summary

You now have **three ways** to run SAGA services:

1. **Docker Compose**: `docker-compose -f docker-compose.prod.yml up -d`
2. **PowerShell Script**: `.\run-services.ps1`
3. **Bash Script**: `./run-services.sh`

All methods:

- ✅ Only run SAGA services (no MongoDB/Redis)
- ✅ Connect to your existing MongoDB and Redis
- ✅ Auto-restart on failure
- ✅ Production-ready

**Next Steps**:

1. Ensure MongoDB and Redis are running
2. Choose your preferred method above
3. Verify logs show successful initialization
4. Test by creating a booking in your Next.js app

---

**Happy Deploying! 🚀**
