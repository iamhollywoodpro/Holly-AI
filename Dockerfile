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

# ── CRITICAL: always install devDependencies regardless of NODE_ENV ──────────
# Coolify injects NODE_ENV=production as a build-arg, which causes npm to skip
# devDependencies (tailwind, postcss, autoprefixer, typescript, etc.).
# Without them, webpack cannot compile CSS → enters error recovery → OOM kill.
# We override NODE_ENV=development for THIS STEP ONLY so all deps are installed.
# The runner stage sets NODE_ENV=production for the actual container runtime.
#
# OPTIMIZATION: Use npm install with reduced memory usage:
# - --legacy-peer-deps: avoid dependency conflicts
# - --ignore-scripts: skip postinstall hooks (we run prisma generate separately)
# - --no-audit --no-fund: skip audit and funding messages (saves memory/time)
# - NODE_OPTIONS: reduce heap size to 1.5GB during install (build uses 3GB)
# - npm config: reduce npm cache and maxsockets to limit memory
# - npm config: increase timeout for slow network connections
RUN npm config set maxsockets 3 && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 180000 && \
    NODE_ENV=development NODE_OPTIONS="--max-old-space-size=1536" \
    npm install --production=false --legacy-peer-deps --ignore-scripts --no-audit --no-fund

# ── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM node:20-alpine AS builder
# python3 + make + g++ are required to rebuild native addons (node-pty) after
# npm ci --ignore-scripts skipped the postinstall step in Stage 1.
RUN apk add --no-cache libc6-compat openssl python3 make g++
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
RUN npx prisma@5.22.0 generate

# Rebuild node-pty native bindings for the current platform.
# npm ci used --ignore-scripts which skipped the node-gyp compile step.
# We must rebuild here (after COPY . .) so the .node binary matches the runner OS.
RUN npm rebuild node-pty --build-from-source 2>&1 || echo '[WARN] node-pty rebuild failed — WS terminal will fall back to REST mode'

# Build with 3 GB heap.
# npm run build = compile-server (tsc) + prisma generate + next build
# No need for separate tsc/prisma steps — the build script handles everything.
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NEXT_TELEMETRY_DISABLED=1
# Triggers output:'standalone' in next.config.js
ENV DOCKER_BUILD=true

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
# curl is required for the HEALTHCHECK
# python3 + make + g++ removed from runner — only needed at build time.
# libc6-compat + openssl required by Prisma / OpenSSL bindings at runtime.
# bash required by node-pty PTY shell spawning (/bin/bash).
# netcat (nc) used by startup.sh to poll DB port before running prisma
RUN apk add --no-cache libc6-compat openssl curl bash
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
# ── Prisma CLI ────────────────────────────────────────────────────────────────
# The startup.sh script runs `npx prisma db push` and `npx prisma db execute`
# at container start. Without the prisma CLI package in node_modules, npx must
# download it on every cold start (~30MB), which can fail in restricted networks
# or cause health-check timeouts. Copy it from the builder stage instead.
COPY --from=builder /app/node_modules/prisma       ./node_modules/prisma
# ── node-pty native bindings ──────────────────────────────────────────────────
# node-pty compiles a platform-specific .node binary during npm rebuild.
# The standalone output doesn't bundle native addons automatically, so we copy
# the entire node-pty package (JS + prebuilt .node) from the builder stage.
COPY --from=builder /app/node_modules/node-pty    ./node_modules/node-pty
# ── ws (WebSocket library for custom server) ───────────────────────────────
# ws is a runtime dependency of server.js; it is not bundled by Next.js
# standalone output so we must copy it explicitly.
COPY --from=builder /app/node_modules/ws             ./node_modules/ws
# ── Custom server (WS wrapper) compiled from TypeScript ───────────────────
# holly-server.js was compiled from holly-server.ts in the builder stage.
# It monkey-patches http.createServer, attaches WebSocket upgrade handling,
# and delegates all HTTP to the standalone Next.js server (server.js).
COPY --from=builder /app/holly-server.js             ./holly-server.js
# ── Resilient startup script ──────────────────────────────────────────────
COPY docker/startup.sh ./startup.sh
RUN chmod +x ./startup.sh

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

# ── STARTUP SEQUENCE ──────────────────────────────────────────────────────────
# startup.sh:
#   1. Polls the database until it's ready (max 120s, non-crashing)
#   2. Runs prisma db push (logs failure but does NOT crash the container)
#   3. Starts holly-server.js
# This prevents the crash-loop caused by db push failing on cold start.
CMD ["./startup.sh"]