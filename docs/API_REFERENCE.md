# Holly AI — API Reference & Deployment Runbook

> **Version**: Phase 6-7 Complete  
> **Base URL**: `https://holly.nexamusicgroup.com`  
> **Auth**: Clerk (session cookie) or `INTERNAL_API_SECRET` header for internal/MCP calls

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [System APIs](#system-apis)
3. [Chat & Conversation](#chat--conversation)
4. [Proactive Intelligence](#proactive-intelligence)
5. [Admin Monitoring](#admin-monitoring)
6. [Self-Code](#self-code)
7. [Media Generation](#media-generation)
8. [Music Generation](#music-generation)
9. [Security](#security)
10. [Deployment Runbook](#deployment-runbook)

---

## Authentication

All API endpoints require Clerk authentication unless marked as public. Internal tools (MCP server, cron jobs) use `INTERNAL_API_SECRET` via the `Authorization: Bearer <token>` header.

### Public Routes (no auth required)
- `GET /api/health` — System health check
- `GET /api/version` — Version info
- `POST /api/webhooks/*` — Clerk webhooks
- `GET /api/v1/*` — Public API v1

---

## System APIs

### `GET /api/health`
Comprehensive system health check. Returns provider status, TTS availability, database connectivity.

**Response:**
```json
{
  "status": "healthy",
  "providers": {
    "groq": true,
    "holly_own": true,
    "kokoro_tts": "reachable"
  },
  "integrations": { ... },
  "version": "Phase 6-7",
  "uptime": 86400
}
```

### `GET /api/version`
Returns current Holly version and build info.

### `GET /api/deploy/trigger`
Triggers Coolify webhook for redeployment. Requires `COOLIFY_WEBHOOK_URL` env var.

---

## Chat & Conversation

### `POST /api/chat`
Main chat endpoint. Streams response using SSE (Server-Sent Events).

**Request:**
```json
{
  "messages": [{ "role": "user", "content": "Hello Holly" }],
  "conversationId": "conv_123",
  "model": "auto"
}
```

**Response:** SSE stream with tokens.

### `GET /api/conversations`
List user's conversations.

### `POST /api/conversations`
Create a new conversation.

### `GET /api/conversations/[id]`
Get conversation with messages.

### `POST /api/conversations/[id]/summarize`
Generate AI summary of a conversation.

---

## Proactive Intelligence

### `GET /api/proactive/insights`
Returns Holly's proactive insights based on user behavior patterns.

**Query Parameters:**
- `patterns=true` — Include detected behavioral patterns
- `engagement=true` — Include engagement metrics

**Response:**
```json
{
  "insights": [
    {
      "id": "insight_123",
      "type": "wellness_check",
      "title": "Wellness Check",
      "message": "I notice frustration comes up a lot...",
      "priority": "medium",
      "confidence": 0.75
    }
  ],
  "totalDetected": 5,
  "totalViable": 3,
  "patterns": {
    "topics": [{ "pattern": "music", "frequency": 12 }],
    "emotions": [{ "pattern": "frequent_excitement", "frequency": 8 }],
    "schedule": [{ "pattern": "active_evening", "confidence": 0.7 }]
  },
  "engagement": {
    "score": 0.85,
    "sessionsPerWeek": 5,
    "streakDays": 7,
    "preferredTime": "evening"
  }
}
```

### `POST /api/proactive/insights`
Manage proactive insight delivery.

**Actions:**
- `mark_delivered` — Mark insights as delivered
- `check_cooldown` — Check if proactive message can be sent
- `record_delivery` — Record a proactive message delivery

---

## Admin Monitoring

### `GET /api/admin/monitoring`
Comprehensive monitoring dashboard data.

**Query Parameters:**
- `section=all` (default) — All sections
- `section=health` — System health only
- `section=consciousness` — Consciousness activity
- `section=selfcode` — Self-code modifications
- `section=goals` — Active goals
- `section=engagement` — User engagement metrics
- `section=activity` — Autonomous action log

**Response includes:**
- **health**: Subsystem status, memory, alerts
- **consciousness**: Learning events, evolution proposals, identity snapshots
- **selfCode**: Modification stats, recent changes, files modified
- **goals**: Active goals with progress
- **engagement**: Message counts, session data, user stats
- **activity**: Autonomous action log with outcomes

### `GET /api/monitoring/status`
Lightweight monitoring status (no auth required for internal use).

### `GET /api/monitoring/health`
Health check focused on monitoring subsystems.

---

## Self-Code

### `GET /api/self-code`
Architecture overview — Holly's understanding of her own codebase.

**Response:**
```json
{
  "summary": "Next.js 15 app with AI providers...",
  "stats": { "totalFiles": 150, "totalLines": 45000, "byLanguage": { "TypeScript": 120 } },
  "keyFiles": [{ "path": "app/api/chat/route.ts", "language": "TypeScript", "lines": 486 }]
}
```

### `POST /api/self-code`
Execute self-code actions.

**Actions:**
- `inspect` — Read and explain a file (`filePath` required)
- `ask` — Ask about code (`question` required)
- `propose` — Propose an improvement (`filePath`, `proposalType`, `description` required)
- `approve` — Apply a proposal (`proposalId` required, **creator-only**)

---

## Media Generation

### `POST /api/image/generate`
Generate an image. Uses smart routing across Pollinations, HuggingFace, Modal.

### `POST /api/image/generate-ultimate`
Enhanced image generation with multiple provider fallback.

### `POST /api/video/generate`
Generate a video. Supports CogVideoX, Wan2.2, Modal.

### `POST /api/video/generate-ultimate`
Enhanced video generation with fallback chain.

### `POST /api/media/music-video`
Generate a music video combining audio + visuals.

---

## Music Generation

### `POST /api/music/generate`
Generate music from a prompt. Supports Suno, Sonauto, and local generation.

### `POST /api/music/hybrid-studio`
Advanced hybrid music production pipeline.

---

## Security

### `POST /api/security/rate-limit/check`
Check rate limit status for an action.

### `GET /api/security/anomalies`
List detected security anomalies.

### `POST /api/security/event`
Log a security event.

### `GET /api/security/report`
Generate security report.

---

## MCP Tools (39 tools)

Holly's MCP server exposes 39 tools for AI agent interaction:

| # | Tool | Description |
|---|------|-------------|
| 1-5 | GitHub tools | Create PR, issue, list repos, search code, get file |
| 6-8 | Web tools | Web search, fetch page, research |
| 9-11 | Evolution tools | Trigger evolution, check status, get proposals |
| 12-14 | Music tools | Generate music, hybrid studio, lyrics |
| 15-17 | Creative tools | Creative writing, philosophy, emotional analysis |
| 18-20 | NLP tools | Sentiment, summarize, extract |
| 21-23 | Sentinel tools | Analyze code, generate code, security scan |
| 24-26 | Diagnostic tools | System diagnostic, check env, performance |
| 27-29 | Mirror tools | Personality mirror, behavioral analysis |
| 30-32 | UI tools | Screenshot, analyze UI, music video |
| 33-36 | Memory + Deploy | Memory store, recall, search, trigger deploy |
| 37 | `self_code_apply` | Apply self-code modifications |
| 38 | `proactive_insights` | Get proactive intelligence insights |
| 39 | `admin_monitoring` | Get monitoring dashboard data |

---

## Deployment Runbook

### Architecture Overview

```
GitHub Push → HOLLY CI (lint/test) → HOLLY CD (Docker build ARM64 + push GHCR)
    → Coolify Webhook → Pull new image → Recreate container
```

### Environment

- **Server**: Oracle Cloud ARM64 (40.233.70.207)
- **SSH**: `ssh -i ~/.ssh/holly_server ubuntu@40.233.70.207`
- **Domain**: `holly.nexamusicgroup.com` (Cloudflare DNS → server IP)
- **Coolify**: `http://40.233.70.207:8000`
- **GHCR**: `ghcr.io/iamhollywoodpro/holly-ai:latest` (PUBLIC)

### Quick Deploy (Automatic)

1. Push to `main` branch
2. GitHub Actions runs CI → CD → Coolify webhook
3. Coolify pulls new image and redeploys
4. Verify: `curl https://holly.nexamusicgroup.com/api/health`

### Manual Deploy (if automatic fails)

```bash
# SSH into server
ssh -i ~/.ssh/holly_server ubuntu@40.233.70.207

# Pull latest image
sudo docker pull ghcr.io/iamhollywoodpro/holly-ai:latest

# Force recreate container
sudo bash -c 'cd /data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o && docker compose up -d --force-recreate --no-deps holly-app'

# Verify
curl http://localhost:3000/api/health
```

### Rollback

```bash
# List available images
sudo docker images ghcr.io/iamhollywoodpro/holly-ai

# Tag specific version
sudo docker tag ghcr.io/iamhollywoodpro/holly-ai:<old-sha> ghcr.io/iamhollywoodpro/holly-ai:latest

# Recreate with old image
sudo bash -c 'cd /data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o && docker compose up -d --force-recreate --no-deps holly-app'
```

### Health Check Verification

```bash
# External
curl -s https://holly.nexamusicgroup.com/api/health | jq .

# Expected: status=healthy, holly_own=true, kokoro_tts=reachable
```

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `holly_own: false` | Stale image | `sudo docker pull` + `--force-recreate` |
| GHCR pull denied | Package is private | GitHub → Packages → holly-ai → Make public |
| Coolify "Redeploy" doesn't update | Uses cached image | SSH + `docker pull` + `docker compose up --force-recreate` |
| TTS 404 | Wrong health check endpoint | Use `/docs` not `/` for FastAPI services |
| Build OOM (exit 255) | Memory limit | Ensure Docker has 4GB+ RAM |
| 422 Clerk redirect | Docker 0.0.0.0 URL | Middleware sanitizes redirect URLs |

### Key Environment Variables

See [COOLIFY_ENV_VARS.md](./COOLIFY_ENV_VARS.md) for the complete list. Critical ones:

- `DATABASE_URL` — PostgreSQL connection
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `CLERK_SECRET_KEY` — Clerk server secret
- `GROQ_API_KEY` — Primary LLM provider
- `HOLLY_OWN_LLM_URL` — Holly's self-hosted LLM
- `KOKORO_TTS_URL` — TTS service (http://kokoro-tts:8880)
- `COOLIFY_WEBHOOK_URL` — Auto-deploy webhook
- `GITHUB_TOKEN` — Self-code + repo tools
- `INTERNAL_API_SECRET` — MCP/internal auth

---

## Rate Limits

Per-endpoint rate limiting is enforced in middleware:

| Category | Limit | Routes |
|----------|-------|--------|
| Chat | 20 req/min | `/api/chat`, `/api/conversations` |
| Generation | 6 req/min | `/api/image/generate`, `/api/video/generate`, `/api/music/generate` |
| Code | 8 req/min | `/api/code/*` |
| Auth | 5 req/min | `/api/auth/*` |
| Admin | 30 req/min | `/api/admin/*`, `/api/monitoring/*` |
| Builder | 10 req/min | `/api/builder/*` |
| Self-Code | 3 req/min | `/api/self-code/*`, `/api/autonomy/*` |
| General | 60 req/min | Everything else |

Rate-limited responses return HTTP 429 with `Retry-After` header.
