# Docker Quick Reference

Quick commands for common Docker operations.

## 🚀 Local Development

```bash
# Start all services
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f redis

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Restart a specific service
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build
```

## 🏗️ Building

```bash
# Build Docker image
docker build -t medical-clinic-app .

# Build with no cache
docker build --no-cache -t medical-clinic-app .

# Build for specific platform (M1 Mac)
docker build --platform linux/amd64 -t medical-clinic-app .
```

## 🔍 Debugging

```bash
# Check running containers
docker-compose ps

# Execute command in running container
docker exec -it medical-clinic-app sh

# Check MongoDB
docker exec -it medical-clinic-mongodb mongosh

# Check Redis
docker exec -it medical-clinic-redis redis-cli

# View container resource usage
docker stats

# Inspect container
docker inspect medical-clinic-app
```

## 🧹 Cleanup

```bash
# Remove stopped containers
docker-compose rm

# Remove all unused images
docker image prune -a

# Remove all unused volumes
docker volume prune

# Nuclear option (remove everything)
docker system prune -a --volumes
```

## 🌐 Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production stack
docker-compose -f docker-compose.prod.yml down
```

## ☁️ Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/medical-clinic-app

# Deploy to Cloud Run
gcloud run deploy medical-clinic-app \
  --image gcr.io/PROJECT_ID/medical-clinic-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# View logs
gcloud run logs read medical-clinic-app --region us-central1

# Update environment variable
gcloud run services update medical-clinic-app \
  --region us-central1 \
  --set-env-vars KEY=VALUE
```

## 🔐 Environment Variables

```bash
# Load from .env file
docker run --env-file .env.local medical-clinic-app

# Set individual variables
docker run -e SERVICE_MODE=production medical-clinic-app

# View environment in running container
docker exec medical-clinic-app env
```

## 📊 Health Checks

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Pretty print JSON
curl http://localhost:3000/api/health | jq

# Check from inside container
docker exec medical-clinic-app wget -qO- http://localhost:3000/api/health
```

## 💾 Database Operations

```bash
# MongoDB backup
docker exec medical-clinic-mongodb mongodump --out /backup

# MongoDB restore
docker exec medical-clinic-mongodb mongorestore /backup

# Redis backup
docker exec medical-clinic-redis redis-cli SAVE

# Copy backup out of container
docker cp medical-clinic-mongodb:/backup ./backup
```

## 🔄 Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or with production
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📝 Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Docker Compose shortcuts
alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias dcr='docker-compose restart'

# Docker shortcuts
alias dps='docker ps'
alias dimg='docker images'
alias dex='docker exec -it'
alias dlogs='docker logs -f'

# Project specific
alias mc-up='docker-compose up -d'
alias mc-down='docker-compose down'
alias mc-logs='docker-compose logs -f app'
alias mc-health='curl http://localhost:3000/api/health | jq'
```
