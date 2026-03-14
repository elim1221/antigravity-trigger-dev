# Multi-stage Dockerfile for Trigger.dev Framework
# Supports both development and production builds

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Development image
FROM base AS development
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Expose ports
# 3000 for web server
EXPOSE 3000

# Default command - web server only
CMD ["npm", "run", "dev:web"]

# Production builder
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Build TypeScript (if you add a build script later)
# RUN npm run build

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy dependencies (production only)
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 triggeruser && \
    chown -R triggeruser:nodejs /app

USER triggeruser

# Expose ports
EXPOSE 3000

# Default command
CMD ["npm", "run", "start:web"]
