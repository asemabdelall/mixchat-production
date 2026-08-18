# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# 1. Base Stage: Official Lightweight Node.js 22 Alpine
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# -----------------------------------------------------------------------------
# 2. Dependencies Stage: Install all dependencies (production + dev)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# 3. Builder Stage: Generate Prisma Client & Compile NestJS
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client for Linux Alpine
RUN npx prisma generate
# Build NestJS distribution bundle
RUN npm run build

# -----------------------------------------------------------------------------
# 4. Production Runner Stage: Minimal & Secure Non-root Runtime
# -----------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

# Create non-root system user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy essential runtime files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Grant execution rights and assign ownership
RUN chmod +x ./docker-entrypoint.sh && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
