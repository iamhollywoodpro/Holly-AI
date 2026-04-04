# ─────────────────────────────────────────────────────────────────────────────
# HOLLY AI — Production Dockerfile
# Multi-stage build: deps → builder → runner
# Target: Coolify / any Docker host (ARM64 + AMD64)
# Node: 20 LTS Alpine (small, fast, secure)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

# Copy prisma schema BEFORE npm ci so the postinstall
# "prisma generate" can find schema.prisma at install time
COPY prisma ./prisma
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ── Build-time ARGs (Coolify passes these via --build-arg) ───────────────────
# NEXT_PUBLIC_* variables MUST be declared as ARG here so Next.js can bake
# them into the client bundle during `npm run build`. Without ARG declarations,
# Docker silently ignores --build-arg values and the vars are empty at build
# time → Clerk throws "Missing Publishable Key" → server crashes on startup.

# Auth (Clerk) — CRITICAL: client bundle needs the publishable key baked in
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is baked into the client bundle at build time
# CLERK_SECRET_KEY is a runtime secret — set it in Coolify's Environment Variables
# panel (not as a build arg). It is NOT baked into the image for security.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME=HOLLY

# Feature flags
ARG NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
ARG NEXT_PUBLIC_ENABLE_LYRICS_AI=true
ARG NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
ARG NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
ARG NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true

# Misc public vars
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_MUSIC_STUDIO_VERSION
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
# After-sign-in/up must go to /chat (not /dashboard — that route does not exist)
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Expose the ARGs as ENV so Next.js build process sees them
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=$NEXT_PUBLIC_ENABLE_MUSIC_GENERATION
ENV NEXT_PUBLIC_ENABLE_LYRICS_AI=$NEXT_PUBLIC_ENABLE_LYRICS_AI
ENV NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=$NEXT_PUBLIC_ENABLE_VIDEO_GENERATION
ENV NEXT_PUBLIC_ENABLE_ARTIST_CREATION=$NEXT_PUBLIC_ENABLE_ARTIST_CREATION
ENV NEXT_PUBLIC_ENABLE_TRUE_STREAMING=$NEXT_PUBLIC_ENABLE_TRUE_STREAMING
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_MUSIC_STUDIO_VERSION=$NEXT_PUBLIC_MUSIC_STUDIO_VERSION
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

# Generate Prisma client
RUN npx prisma generate

# Build with 4 GB heap (needed for large Next.js apps)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
# Enable standalone output mode (outputs to .next/standalone)
ENV DOCKER_BUILD=true

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
# curl is required for the HEALTHCHECK below
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Port the app listens on (Coolify will map this)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public                    ./public
COPY --from=builder /app/.next/standalone          ./
COPY --from=builder /app/.next/static              ./.next/static
COPY --from=builder /app/prisma                    ./prisma
COPY --from=builder /app/node_modules/.prisma      ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma      ./node_modules/@prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# ── HEALTHCHECK ───────────────────────────────────────────────────────────────
# Purpose: Tell Docker (and Coolify) when the app is actually ready to serve
# traffic. Without this, Docker marks the container "healthy" the moment the
# process starts — before Next.js has finished initializing — causing Traefik
# to route requests to an unready server → Gateway Timeout.
#
# Parameters explained:
#   --start-period=30s  Give the app 30 s to boot before failing counts start.
#                       Coolify/Traefik won't route traffic until the FIRST
#                       successful check AFTER the start-period.
#   --interval=10s      Check every 10 s (fast enough to detect crashes quickly)
#   --timeout=5s        Consider the check failed if it takes > 5 s to respond
#   --retries=3         Mark unhealthy only after 3 consecutive failures
#
# NOTE: Coolify has its own "Health check" config (separate from Docker). Make
# sure Coolify's health check path is set to /api/health as well.
HEALTHCHECK --start-period=30s --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
