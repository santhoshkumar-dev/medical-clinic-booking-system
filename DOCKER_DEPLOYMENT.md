# Docker Deployment Guide

This guide covers deploying the Medical Clinic Booking System using Docker for local development, Cloud Run, Coolify, or any container platform.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Cloud Run Deployment](#cloud-run-deployment)
- [Coolify Deployment](#coolify-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git

### Local Development (with Docker Compose)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd medical-clinic-booking-system

# 2. Copy environment template
cp .env.template .env.local

# 3. Start all services (MongoDB, Redis, App)
docker-compose up -d

# 4. View logs
docker-compose logs -f app

# 5. Access the application
# http://localhost:3000
```

---

## ⚙️ Environment Configuration

The application uses the `SERVICE_MODE` environment variable to distinguish between local and production deployments.

### SERVICE_MODE Values

- **`local`**: For local development (uses localhost URLs)
- **`production`**: For production deployments (uses managed services)

### Environment Files

| File                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `.env.template`            | Template for local development              |
| `.env.production.template` | Template for production deployment          |
| `.env.local`               | Your local development config (git-ignored) |

### Key Environment Variables

```bash
# Service Mode
SERVICE_MODE=local  # or 'production'

# Database
MONGODB_URI=mongodb://localhost:27017/medical-clinic

# Redis (Event Bus)
REDIS_URL=redis://localhost:6379

# Business Rules
DAILY_DISCOUNT_QUOTA=100
PAYMENT_SIMULATION_MODE=success

# Authentication
BETTER_AUTH_SECRET=your-secure-random-string-32-chars
BETTER_AUTH_URL=http://localhost:3000
```

---

## 🏠 Local Development

### Option 1: Docker Compose (Recommended)

This starts MongoDB, Redis, and the Next.js app in containers.

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

**Services:**

- **App**: http://localhost:3000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Option 2: Hybrid (External DB + Docker App)

If you prefer to run MongoDB and Redis natively:

```bash
# 1. Start MongoDB and Redis locally
# (Install via Homebrew, apt, or Windows installer)

# 2. Update .env.local
SERVICE_MODE=local
MONGODB_URI=mongodb://localhost:27017/medical-clinic
REDIS_URL=redis://localhost:6379

# 3. Build and run only the app
docker build -t medical-clinic-app .
docker run -p 3000:3000 --env-file .env.local medical-clinic-app
```

### Health Check

```bash
# Check if all services are healthy
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "medical-clinic-booking-system",
  "mode": "local",
  "checks": {
    "api": "ok",
    "database": "ok",
    "eventBus": "ok"
  }
}
```

---

## 🌐 Production Deployment

### Option 1: Self-Hosted (Docker Compose)

For VPS or dedicated servers:

```bash
# 1. Copy production environment template
cp .env.production.template .env.production

# 2. Edit .env.production with your values
nano .env.production

# 3. Start production stack
docker-compose -f docker-compose.prod.yml up -d

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Important Production Settings:**

```bash
# .env.production
SERVICE_MODE=production

# Use managed MongoDB (MongoDB Atlas recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical-clinic

# Use managed Redis (Redis Cloud, AWS ElastiCache, etc.)
REDIS_URL=redis://username:password@redis-host:6379

# Generate secure secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Your production domain
BETTER_AUTH_URL=https://your-domain.com
```

### Option 2: Standalone Docker Image

Build and run the app container only (use external managed services):

```bash
# Build production image
docker build -t medical-clinic-app:latest .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e SERVICE_MODE=production \
  -e MONGODB_URI=mongodb+srv://... \
  -e REDIS_URL=redis://... \
  -e BETTER_AUTH_SECRET=... \
  -e BETTER_AUTH_URL=https://your-domain.com \
  medical-clinic-app:latest
```

---

## ☁️ Cloud Run Deployment

Google Cloud Run is a serverless container platform.

### Prerequisites

- Google Cloud account
- `gcloud` CLI installed
- MongoDB Atlas account (for managed MongoDB)
- Redis Cloud account (for managed Redis)

### Step 1: Prepare Environment

```bash
# 1. Create MongoDB Atlas cluster
# https://www.mongodb.com/cloud/atlas

# 2. Create Redis Cloud instance
# https://redis.com/try-free/

# 3. Note your connection strings
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical-clinic
REDIS_URL=redis://username:password@redis-host:6379
```

### Step 2: Build and Push Image

```bash
# 1. Set your project ID
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

# 2. Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 3. Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/medical-clinic-app

# OR use Artifact Registry (recommended)
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/medical-clinic/app
```

### Step 3: Deploy to Cloud Run

```bash
# Deploy with environment variables
gcloud run deploy medical-clinic-app \
  --image gcr.io/$PROJECT_ID/medical-clinic-app \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars SERVICE_MODE=production \
  --set-env-vars MONGODB_URI="mongodb+srv://..." \
  --set-env-vars REDIS_URL="redis://..." \
  --set-env-vars BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  --set-env-vars BETTER_AUTH_URL="https://medical-clinic-app-xxx.run.app" \
  --set-env-vars DAILY_DISCOUNT_QUOTA=100 \
  --set-env-vars PAYMENT_SIMULATION_MODE=success \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

### Step 4: Update BETTER_AUTH_URL

After deployment, Cloud Run will give you a URL. Update the environment variable:

```bash
# Get the service URL
gcloud run services describe medical-clinic-app --region $REGION --format 'value(status.url)'

# Update BETTER_AUTH_URL
gcloud run services update medical-clinic-app \
  --region $REGION \
  --set-env-vars BETTER_AUTH_URL="https://your-actual-url.run.app"
```

### Cloud Run Tips

- **Cold Starts**: First request may be slow. Consider using minimum instances.
- **Secrets**: Use Google Secret Manager for sensitive data:
  ```bash
  gcloud run services update medical-clinic-app \
    --update-secrets BETTER_AUTH_SECRET=better-auth-secret:latest
  ```
- **Custom Domain**: Map a custom domain in Cloud Run console

---

## 🚢 Coolify Deployment

Coolify is a self-hosted Heroku/Netlify alternative.

### Prerequisites

- Coolify instance running
- MongoDB and Redis (can be deployed via Coolify or external)

### Step 1: Add New Resource

1. Log in to Coolify dashboard
2. Click **+ New Resource**
3. Select **Docker Compose** or **Dockerfile**

### Step 2: Configure Application

**If using Dockerfile:**

1. Connect your Git repository
2. Coolify will auto-detect the `Dockerfile`
3. Set build context to `/`

**If using Docker Compose:**

1. Select `docker-compose.prod.yml`
2. Coolify will deploy all services (MongoDB, Redis, App)

### Step 3: Set Environment Variables

In Coolify dashboard, add these environment variables:

```bash
SERVICE_MODE=production
MONGODB_URI=mongodb://mongodb:27017/medical-clinic  # If using Coolify MongoDB
REDIS_URL=redis://redis:6379  # If using Coolify Redis
DAILY_DISCOUNT_QUOTA=100
PAYMENT_SIMULATION_MODE=success
BETTER_AUTH_SECRET=<generate-secure-random-string>
BETTER_AUTH_URL=https://your-coolify-domain.com
```

### Step 4: Deploy

1. Click **Deploy**
2. Coolify will build and deploy your application
3. Access via the provided URL

### Coolify Tips

- **Persistent Volumes**: Ensure MongoDB and Redis have persistent volumes
- **Networking**: Services in the same project can communicate via service names
- **SSL**: Coolify auto-provisions SSL certificates via Let's Encrypt
- **Logs**: View real-time logs in the Coolify dashboard

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Solution:**

```bash
# Check MongoDB is running
docker-compose ps

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker exec -it medical-clinic-mongodb mongosh
```

### Issue: "Redis connection failed"

**Solution:**

```bash
# Check Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs redis

# Test connection
docker exec -it medical-clinic-redis redis-cli ping
```

### Issue: "App container keeps restarting"

**Solution:**

```bash
# View app logs
docker-compose logs app

# Common causes:
# 1. Missing environment variables
# 2. MongoDB/Redis not ready (wait for health checks)
# 3. Build errors (check Dockerfile)
```

### Issue: "Health check failing"

**Solution:**

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# If database check fails:
# - Verify MONGODB_URI is correct
# - Ensure MongoDB is accessible

# If eventBus check fails:
# - Verify REDIS_URL is correct
# - Ensure Redis is accessible
```

### Issue: "Build fails on Cloud Run"

**Solution:**

```bash
# Test build locally first
docker build -t test-build .

# Check for:
# 1. Large files in .dockerignore
# 2. Missing dependencies in package.json
# 3. TypeScript errors
```

---

## 📊 Resource Requirements

### Minimum (Development)

- **CPU**: 1 core
- **RAM**: 512 MB
- **Disk**: 2 GB

### Recommended (Production)

- **CPU**: 2 cores
- **RAM**: 1 GB
- **Disk**: 10 GB (for MongoDB data)

### Cloud Run Pricing Estimate

- **Memory**: 512 MB
- **CPU**: 1
- **Requests**: ~10,000/month
- **Estimated Cost**: ~$5-10/month

---

## 🔐 Security Best Practices

1. **Never commit `.env.local` or `.env.production`**
2. **Use strong secrets**: `openssl rand -base64 32`
3. **Enable MongoDB authentication** in production
4. **Use Redis password** in production
5. **Enable HTTPS** (automatic with Cloud Run/Coolify)
6. **Restrict network access** (firewall rules)
7. **Regular backups** of MongoDB data

---

## 📚 Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Coolify Documentation](https://coolify.io/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Redis Cloud](https://redis.com/try-free/)

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs: `docker-compose logs -f`
3. Verify environment variables are set correctly
4. Test health endpoint: `curl http://localhost:3000/api/health`

---

**Happy Deploying! 🚀**
