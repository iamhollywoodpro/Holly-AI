# ─────────────────────────────────────────────────────────────────────────────
# HOLLY AI — Production Dockerfile
# 2-stage build: build → runner
# Target: Coolify / any Docker host (ARM64 + AMD64)
# Node: 20 LTS Alpine (small, fast, secure)
# ─────────────────────────────────────────────────────────────────────────────
#
# ⚠️  COOLIFY DEPLOYMENT NOTE (IMPORTANT — READ IF DEPLOYMENT FAILS):
# Coolify v4 auto-injects ARG declarations for EVERY environment variable into
# EACH build stage, plus --mount=type=secret flags on every RUN command.
# With ~110 env vars × 3 stages = ~330 ARGs + ~770 mount flags → the modified
# Dockerfile exceeds Linux MAX_ARG_STRLEN (128KB) when Coolify passes it via
# base64 → "Argument list too long" error.
#
# This Dockerfile uses ONLY 2 STAGES and CONSOLIDATED RUN commands to minimize
# the total size of Coolify's modifications. If deployment still fails:
# 1. Delete unused env vars from Coolify (reduce total count)
# 2. Or switch to pre-built image via GHCR (see docs/COOLIFY_ARG_FIX.md)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build (deps + compile combined) ──────────────────────────────────
FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

# Copy prisma schema + package files for npm install
COPY prisma ./prisma
COPY package.json package-lock.json* ./

# Skip binary downloads during npm install
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV TRANSFORMERS_OFFLINE=1
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Install ALL dependencies (including devDependencies for build).
# NODE_ENV=development override ensures npm doesn't skip devDeps.
RUN npm config set maxsockets 3 && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 180000 && \
    NODE_ENV=development NODE_OPTIONS="--max-old-space-size=1536" \
    npm install --production=false --legacy-peer-deps --ignore-scripts --no-audit --no-fund

# Copy source code
COPY . .

# ── Build-time ARGs (NEXT_PUBLIC_* only) ──────────────────────────────────────
# These MUST be declared as ARG + ENV so Next.js bakes them into the client
# bundle at build time. Runtime secrets (CLERK_SECRET_KEY etc.) are NOT here.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat
ARG NEXT_PUBLIC_CLERK_PROXY_URL=https://holly.nexamusicgroup.com/api/clerk
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME=HOLLY
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_MUSIC_STUDIO_VERSION
ARG NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
ARG NEXT_PUBLIC_ENABLE_LYRICS_AI=true
ARG NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
ARG NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
ARG NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true

# Expose ARGs as ENV for the build process
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

# Generate Prisma client + rebuild native addons + build Next.js
# Combined into a single RUN to minimize Coolify's --mount=type=secret injections.
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
RUN npx prisma@5.22.0 generate && \
    npm rebuild node-pty --build-from-source 2>&1 || echo '[WARN] node-pty rebuild failed — WS terminal will fall back to REST mode' && \
    npm run build

# ── Stage 2: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
# Consolidate all system setup into a single RUN to minimize Coolify mount injections
RUN apk add --no-cache libc6-compat openssl curl bash && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built output from build stage
COPY --from=build /app/public                    ./public
COPY --from=build /app/.next/standalone          ./
COPY --from=build /app/.next/static              ./.next/static
COPY --from=build /app/prisma                    ./prisma
COPY --from=build /app/node_modules/.prisma      ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma      ./node_modules/@prisma
# Prisma CLI — needed by startup.sh for `npx prisma db push`
COPY --from=build /app/node_modules/prisma       ./node_modules/prisma
# node-pty native bindings — compiled in build stage
COPY --from=build /app/node_modules/node-pty     ./node_modules/node-pty
# ws — runtime dependency of holly-server.js
COPY --from=build /app/node_modules/ws           ./node_modules/ws
# Custom server (WS wrapper)
COPY --from=build /app/holly-server.js           ./holly-server.js
# Startup script
COPY docker/startup.sh ./startup.sh

# Consolidate permissions into a single RUN
RUN chmod +x ./startup.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# HEALTHCHECK — Traefik routes traffic only after first successful check
HEALTHCHECK --start-period=180s --interval=15s --timeout=10s --retries=5 \
  CMD curl -sf http://localhost:3000/api/health || exit 1

# startup.sh: polls DB → prisma db push → starts holly-server.js
CMD ["./startup.sh"]
