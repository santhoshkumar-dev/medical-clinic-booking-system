# Build and Run SAGA Services Container
# This script builds and runs only the SAGA services container
# Assumes MongoDB and Redis are already running

# Build the services image
Write-Host "Building SAGA services image..." -ForegroundColor Cyan
docker build -f services.Dockerfile -t medical-clinic-saga-services .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Stop and remove existing container if it exists
Write-Host "Removing existing container (if any)..." -ForegroundColor Cyan
docker stop medical-clinic-saga-services 2>$null
docker rm medical-clinic-saga-services 2>$null

# Run the container
Write-Host "Starting SAGA services container..." -ForegroundColor Cyan

# Get environment variables or use defaults
$MONGODB_URI = if ($env:MONGODB_URI) { $env:MONGODB_URI } else { "mongodb://host.docker.internal:27017/medical-clinic" }
$REDIS_URL = if ($env:REDIS_URL) { $env:REDIS_URL } else { "redis://host.docker.internal:6379" }

docker run -d `
    --name medical-clinic-saga-services `
    --restart unless-stopped `
    --add-host host.docker.internal:host-gateway `
    -e MONGODB_URI="$MONGODB_URI" `
    -e REDIS_URL="$REDIS_URL" `
    -e NODE_ENV=production `
    medical-clinic-saga-services

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start container!" -ForegroundColor Red
    exit 1
}

Write-Host "`nSAGA services container started successfully!" -ForegroundColor Green
Write-Host "`nView logs with: docker logs -f medical-clinic-saga-services" -ForegroundColor Yellow
Write-Host "Stop with: docker stop medical-clinic-saga-services" -ForegroundColor Yellow

# Show logs
Write-Host "`nShowing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
docker logs -f medical-clinic-saga-services
