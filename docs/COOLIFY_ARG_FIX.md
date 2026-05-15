# Coolify Deployment — Final Fix Guide

## Current Status (commit f1a0b5e)

✅ **FIXED**: Coolify ARG injection (330→17 ARGs)
✅ **FIXED**: LIVEKIT_KEYS required variable error
✅ **FIXED**: Single-stage Dockerfile passes ARG_MAX

❌ **CURRENT ISSUE**: Build killed during `npm install` (exit code 255)
   - The npm install process is killed by the OS, likely OOM (Out of Memory)
   - The build needs ~3-4GB RAM for npm install + Next.js build

## Quick Fix: Add Swap Space on Server

SSH into your Oracle Cloud server and run:

```bash
# Check current memory
free -h

# Create 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent (survives reboot)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

Then redeploy in Coolify. The build should now have enough virtual memory.

## Permanent Fix: Pre-built Image via GHCR

Instead of building on the server (which needs lots of RAM), GitHub Actions builds the image and pushes to GitHub Container Registry. Coolify just pulls the pre-built image.

### Step 1: Enable GHCR (one-time setup)

Your repo `iamhollywoodpro/Holly-AI` needs to have GitHub Packages enabled:

1. Go to https://github.com/iamhollywoodpro/Holly-AI/settings
2. Scroll to "Danger Zone" → "Change repository visibility"
3. Make sure the repo is **Public** (GHCR is free for public repos)
   - Or if private, you'll need to set up a Personal Access Token with `write:packages` scope

### Step 2: Change Coolify to use pre-built image

In Coolify UI:

1. Go to your **holly-app** service
2. Change the **Source** from "GitHub" to "Docker Image" (or "Pre-built Image")
3. Set the image to: `ghcr.io/iamhollywoodpro/holly-ai:latest`
4. Keep all your environment variables as-is (they're injected at runtime)
5. Deploy — Coolify just pulls the image, no build needed

### Alternative: Use docker-compose.coolify.yml

If Coolify doesn't support switching to pre-built image easily, create a separate compose file:

```yaml
# docker-compose.coolify.yml — for Coolify deployment
# Uses pre-built image from GHCR instead of building from source
services:
  holly-app:
    image: ghcr.io/iamhollywoodpro/holly-ai:latest
    container_name: holly-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # All env vars are injected by Coolify at runtime
      NODE_ENV: production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:3000/api/health || exit 1"]
      start_period: 180s
      interval: 15s
      timeout: 10s
      retries: 5
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.holly-app.loadbalancer.healthcheck.path=/api/health"
      - "traefik.http.services.holly-app.loadbalancer.healthcheck.interval=15s"
      - "traefik.http.services.holly-app.loadbalancer.healthcheck.timeout=10s"
      - "traefik.docker.network=coolify"
    networks:
      - coolify

  holly-cron:
    build:
      context: ./docker/cron
      dockerfile: Dockerfile.cron
    container_name: holly-cron
    restart: unless-stopped
    depends_on:
      holly-app:
        condition: service_started
    environment:
      CRON_SECRET: ${CRON_SECRET}
      APP_URL: http://holly-app:3000
    networks:
      - coolify

  livekit:
    image: livekit/livekit-server:latest
    container_name: holly-livekit
    restart: unless-stopped
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    environment:
      LIVEKIT_KEYS: "${LIVEKIT_API_KEY:-devkey}: ${LIVEKIT_API_SECRET:-devsecret}"
    command: >
      --node-ip ${LIVEKIT_NODE_IP:-127.0.0.1}
      --port 7880
      --bind 0.0.0.0
    networks:
      - coolify

networks:
  coolify:
    external: true
```

Then in Coolify, point to `docker-compose.coolify.yml` instead of `docker-compose.yml`.

## How the GHCR Pipeline Works

The `.github/workflows/deploy.yml` is already configured to:
1. Build the Docker image on GitHub Actions (7GB+ RAM, no server limits)
2. Push to `ghcr.io/iamhollywoodpro/holly-ai:latest`
3. Push tagged versions with commit SHA and timestamp

Every push to `main` triggers:
- CI workflow → tests + type checking
- CD workflow → build image + push to GHCR

Then Coolify pulls the latest image on deploy.
