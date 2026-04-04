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

# CRITICAL: Force redirect to /chat after auth.
# Coolify may have NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard set in its
# env panel — this hardcodes /chat as the default so even if Coolify passes
# wrong values, our code-level forceRedirectUrl="/chat" props take priority.
# Setting these to /chat here also prevents the blank-screen issue where
# afterSignInUrl=/dashboard redirects users to a non-existent page.
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# CRITICAL: Force Clerk JS to load from official CDN instead of the custom
# domain clerk.holly.nexamusicgroup.com which has a TLS handshake failure.
# This env var is read by mergeNextClerkPropsWithEnv as a fallback, but the
# clerkJSUrl prop in app/layout.tsx takes explicit priority.
# Both are set here for belt-and-suspenders reliability.
ARG NEXT_PUBLIC_CLERK_JS_URL=https://js.clerk.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js

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
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_JS_URL=$NEXT_PUBLIC_CLERK_JS_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_MUSIC_STUDIO_VERSION=$NEXT_PUBLIC_MUSIC_STUDIO_VERSION
ENV NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=$NEXT_PUBLIC_ENABLE_MUSIC_GENERATION
ENV NEXT_PUBLIC_ENABLE_LYRICS_AI=$NEXT_PUBLIC_ENABLE_LYRICS_AI
ENV NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=$NEXT_PUBLIC_ENABLE_VIDEO_GENERATION
ENV NEXT_PUBLIC_ENABLE_ARTIST_CREATION=$NEXT_PUBLIC_ENABLE_ARTIST_CREATION
ENV NEXT_PUBLIC_ENABLE_TRUE_STREAMING=$NEXT_PUBLIC_ENABLE_TRUE_STREAMING

# Generate Prisma client
RUN npx prisma generate

# Build with 4 GB heap (needed for this large Next.js app)
ENV NODE_OPTIONS="--max-old-space-size=4096"
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
HEALTHCHECK --start-period=30s --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
