#!/bin/bash
# Build and Run SAGA Services Container
# This script builds and runs only the SAGA services container
# Assumes MongoDB and Redis are already running

set -e

echo "Building SAGA services image..."
docker build -f services.Dockerfile -t medical-clinic-saga-services .

echo "Build successful!"

# Stop and remove existing container if it exists
echo "Removing existing container (if any)..."
docker stop medical-clinic-saga-services 2>/dev/null || true
docker rm medical-clinic-saga-services 2>/dev/null || true

# Run the container
echo "Starting SAGA services container..."

# Get environment variables or use defaults
MONGODB_URI=${MONGODB_URI:-"mongodb://host.docker.internal:27017/medical-clinic"}
REDIS_URL=${REDIS_URL:-"redis://host.docker.internal:6379"}

docker run -d \
    --name medical-clinic-saga-services \
    --restart unless-stopped \
    --add-host host.docker.internal:host-gateway \
    -e MONGODB_URI="$MONGODB_URI" \
    -e REDIS_URL="$REDIS_URL" \
    -e NODE_ENV=production \
    medical-clinic-saga-services

echo ""
echo "SAGA services container started successfully!"
echo ""
echo "View logs with: docker logs -f medical-clinic-saga-services"
echo "Stop with: docker stop medical-clinic-saga-services"

# Show logs
echo ""
echo "Showing logs (Ctrl+C to exit)..."
docker logs -f medical-clinic-saga-services
