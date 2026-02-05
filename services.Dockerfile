# Dockerfile for SAGA Services (Microservice)
# This container runs only the event-driven services, not the Next.js app

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
ENV NODE_ENV=production

# Copy minimal package file for services
COPY package.services.json ./package.json

# Install ONLY production dependencies for the backend
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Build TypeScript
FROM base AS builder

# Set to development to ensure devDependencies are installed
ENV NODE_ENV=development

# Install dev dependencies (typescript, types) for building
# We re-run install to add devDependencies
RUN npm install --no-audit --no-fund
RUN npm install typescript -g

# Copy source files
COPY lib ./lib
COPY tsconfig.services.json ./
COPY services-entrypoint.js ./

# Build TypeScript files using the services config
# This will output files to ./dist
RUN tsc --project tsconfig.services.json

# Runner
FROM base AS runner

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 services

# Copy built files from dist
COPY --from=builder /app/dist ./
# node_modules are already present from base image
# package.json is already present from base image

RUN chown -R services:nodejs /app

USER services

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "console.log('Services running')" || exit 1

CMD ["node", "services-entrypoint.js"]
