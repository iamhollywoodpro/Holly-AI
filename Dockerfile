# ─────────────────────────────────────────────────────────────────────────────
# HOLLY AI — Production Dockerfile
# Single-stage build (optimized for Coolify ARG injection limits)
#
# WHY SINGLE-STAGE: Coolify v4 injects ARG declarations for EVERY environment
# variable into EACH build stage. With ~110 env vars × N stages, the modified
# Dockerfile exceeds Linux MAX_ARG_STRLEN (128KB) when Coolify passes it via
# base64 → "Argument list too long" error. Single stage = 1× multiplier.
#
# Trade-off: Final image is larger because it includes build tools and
# devDependencies. But this is the ONLY reliable way to deploy with 100+
# env vars through Coolify's build system.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine
RUN apk add --no-cache libc6-compat openssl python3 make g++ curl bash ffmpeg
WORKDIR /app

# Copy prisma schema + package files
COPY prisma ./prisma
COPY package.json package-lock.json* ./

# Skip binary downloads during npm install
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV TRANSFORMERS_OFFLINE=1
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

# Install ALL dependencies (including devDependencies for build).
# NODE_ENV=development ensures npm doesn't skip devDeps.
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

# Generate Prisma + rebuild native addons + build Next.js (single RUN)
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
RUN npx prisma@5.22.0 generate && \
    npm rebuild node-pty --build-from-source 2>&1 || echo '[WARN] node-pty rebuild failed — WS terminal will fall back to REST mode' && \
    npm run build

# ── Post-build: set up standalone server structure ────────────────────────────
# holly-server.js wraps the standalone server.js. Copy it from the standalone
# output to /app/ so holly-server.js can find it at ./server.js.
# Keep full node_modules (prisma, node-pty, ws, etc.) — don't use standalone's
# minimal deps since we need runtime packages beyond Next.js.
RUN if [ -f .next/standalone/server.js ]; then \
      cp .next/standalone/server.js ./server.js; \
    fi

# ── Production runtime ────────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Copy startup script
COPY docker/startup.sh ./startup.sh
RUN chmod +x ./startup.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --start-period=180s --interval=15s --timeout=10s --retries=5 \
  CMD curl -sf http://localhost:3000/api/health || exit 1

CMD ["./startup.sh"]
