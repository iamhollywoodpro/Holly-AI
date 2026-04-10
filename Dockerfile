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

# ── Skip ALL binary/model downloads during npm ci ────────────────────────────
# @prisma/engines downloads a ~50MB query-engine binary per platform.
# sharp downloads a prebuilt libvips binary (~10MB).
# playwright downloads browser binaries (~300MB) — test-only, not needed here.
# @xenova/transformers has a heavy postinstall.
#
# Solution: install with --ignore-scripts, then run ONLY prisma generate in
# the builder stage (after COPY . . so schema.prisma is available).
# This eliminates ALL network fetches during npm ci → build is fast + reliable.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV TRANSFORMERS_OFFLINE=1
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

RUN npm ci --ignore-scripts

# ── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ── Build-time ARGs ───────────────────────────────────────────────────────────
# NEXT_PUBLIC_* variables MUST be declared as ARG + ENV here so Next.js bakes
# them into the client bundle at build time. Without this Docker silently
# ignores --build-arg values → Clerk throws "Missing Publishable Key" → crash.
#
# CLERK_SECRET_KEY is a runtime secret — set it in Coolify's Environment panel.
# It is intentionally NOT declared here so it's never baked into the image.

# ── Clerk Auth ────────────────────────────────────────────────────────────────
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# CRITICAL: Force redirect to /chat after auth — Clerk v5 syntax.
# NEXT_PUBLIC_CLERK_AFTER_SIGN_IN/UP_URL are deprecated in Clerk v5 and cause
# warnings. Use FORCE_REDIRECT_URL (enforced) + FALLBACK_REDIRECT_URL (default).
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat

# CRITICAL: Route ALL Clerk traffic (API + JS bundle) through Holly's proxy.
# With proxyUrl set, @clerk/nextjs v5 automatically builds the clerk-js script URL as:
#   https://holly.nexamusicgroup.com/api/clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js
# The proxy follows the 307 redirect from clerk.clerk.com and serves the correct v5 bundle.
# DO NOT set NEXT_PUBLIC_CLERK_JS_URL — it overrides this and can serve a wrong version.
ARG NEXT_PUBLIC_CLERK_PROXY_URL=https://holly.nexamusicgroup.com/api/clerk

# ── App config ────────────────────────────────────────────────────────────────
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME=HOLLY
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_MUSIC_STUDIO_VERSION

# ── Feature flags (all on by default) ────────────────────────────────────────
ARG NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
ARG NEXT_PUBLIC_ENABLE_LYRICS_AI=true
ARG NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
ARG NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
ARG NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true

# ── Expose ARGs as ENV for the build process ─────────────────────────────────
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_PROXY_URL=$NEXT_PUBLIC_CLERK_PROXY_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_MUSIC_STUDIO_VERSION=$NEXT_PUBLIC_MUSIC_STUDIO_VERSION
ENV NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=$NEXT_PUBLIC_ENABLE_MUSIC_GENERATION
ENV NEXT_PUBLIC_ENABLE_LYRICS_AI=$NEXT_PUBLIC_ENABLE_LYRICS_AI
ENV NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=$NEXT_PUBLIC_ENABLE_VIDEO_GENERATION
ENV NEXT_PUBLIC_ENABLE_ARTIST_CREATION=$NEXT_PUBLIC_ENABLE_ARTIST_CREATION
ENV NEXT_PUBLIC_ENABLE_TRUE_STREAMING=$NEXT_PUBLIC_ENABLE_TRUE_STREAMING

# The clerk-js bundle is served via /api/clerk/npm/... proxy path.
# No static files in public/ needed — proxy fetches from clerk.clerk.com.

# Generate Prisma client
# PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 prevents checksum failures if the
# platform-specific engine binary wasn't pre-downloaded during npm ci --ignore-scripts.
# Prisma generate only needs the schema-engine (CLI tool), not the query engine.
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate

# Build with 2 GB heap.
# NOTE: 4096 MB was causing OOM kills (exit 255) on the Coolify ARM64 server
# because Next.js page generation workers + docker overhead exceeded available RAM.
# With workerThreads:false + cpus:1 in next.config.js, 2GB heap is sufficient.
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_TELEMETRY_DISABLED=1
# Triggers output:'standalone' in next.config.js
ENV DOCKER_BUILD=true

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
# curl is required for the HEALTHCHECK
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy built output from builder stage
COPY --from=builder /app/public                    ./public
COPY --from=builder /app/.next/standalone          ./
COPY --from=builder /app/.next/static              ./.next/static
COPY --from=builder /app/prisma                    ./prisma
COPY --from=builder /app/node_modules/.prisma      ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma      ./node_modules/@prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# ── HEALTHCHECK ───────────────────────────────────────────────────────────────
# --start-period=30s  App gets 30s to boot before any failures count
# --interval=10s      Check every 10 seconds
# --timeout=5s        Fail if no response in 5 seconds
# --retries=3         3 consecutive failures = unhealthy
#
# Traefik only routes traffic to this container AFTER the first successful
# health check, preventing Gateway Timeout on cold starts.
HEALTHCHECK --start-period=180s --interval=15s --timeout=10s --retries=5 \
  CMD curl -sf http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
