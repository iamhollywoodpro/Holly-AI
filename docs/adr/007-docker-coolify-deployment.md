# ADR-007: Docker Deployment with Coolify

**Date:** 2025-03-15
**Status:** ACCEPTED

## Context

Holly AI needs a deployment infrastructure that:
- Runs on affordable ARM64 hardware (Oracle Cloud Free Tier)
- Supports automatic deployment on git push
- Provides container orchestration and health monitoring
- Allows easy rollback on failure
- Supports multiple services (Next.js app, Kokoro TTS, Modal media)

## Decision

Deploy using Docker containers managed by Coolify on Oracle Cloud ARM64. Architecture:

- **Next.js app**: Standalone Docker build (`output: 'standalone'` in next.config.js)
- **Kokoro TTS**: Separate FastAPI container
- **Modal**: Serverless media generation
- **Coolify**: PaaS layer managing containers, SSL, domains

Deployment pipeline:
```
GitHub Push → CI (lint + test) → CD (Docker build ARM64 + push GHCR)
    → Coolify Webhook → Pull new image → Recreate container
```

## Consequences

- `Dockerfile` builds the standalone Next.js output
- `docker-compose.coolify.yml` defines multi-service architecture
- Next.js config limits build resources: `workerThreads: false`, `cpus: 1` (prevents OOM on ARM64)
- `typescript.ignoreBuildErrors: true` avoids build OOM (types checked in CI instead)
- Coolify webhook URL triggers redeployment via `/api/deploy/trigger`
- Rollback: pull previous image from GHCR, recreate container
- Domain: `holly.nexamusicgroup.com` via Cloudflare DNS
