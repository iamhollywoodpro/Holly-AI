# Holly AI — API Reference

> **Version**: Phase J Complete (May 2026)
> **Base URL**: `https://holly.nexamusicgroup.com`
> **Auth**: Clerk session cookie or `INTERNAL_API_SECRET` header for internal/MCP calls

---

## Authentication

All API endpoints require Clerk authentication unless marked as public. Internal tools (MCP server, cron jobs) use `INTERNAL_API_SECRET` via the `Authorization: Bearer <token>` header.

### Public Routes (no auth required)
- `GET /api/health` — System health check
- `GET /api/version` — Version info
- `POST /api/webhooks/*` — Clerk/GitHub webhooks

### Standard Response Format

```typescript
// Success
{ "success": true, "data": { /* ... */ } }

// Error
{ "error": "Error message", "code": "ERROR_CODE" }
```

---

## 1. Chat & Conversation

### `POST /api/chat`
Main chat endpoint. Streams response via SSE (Server-Sent Events). Routes through Smart Router, cascading across free LLM providers (Groq Llama 3.3, NVIDIA DeepSeek V4, Gemini 2.5, etc.).

**Request:**
```json
{
  "messages": [{ "role": "user", "content": "Hello Holly" }],
  "conversationId": "conv_123",
  "mode": "standard"
}
```

**Response:** SSE stream with tokens.

### `GET /api/conversations`
List user's conversations with cursor pagination.

**Query:** `?cursor=xxx&limit=20&direction=desc`

### `POST /api/conversations`
Create a new conversation.

### `GET /api/conversations/[id]`
Get conversation with messages.

### `POST /api/conversations/[id]/summarize`
Generate AI summary of a conversation.

### `POST /api/conversations/generate-title`
Auto-generate a conversation title from the first message.

---

## 2. Memory

### `GET /api/memory`
Search/list memories. Supports `?search=query`, `?type=episodic`, `?limit=20`, `?cursor=xxx`.

### `PATCH /api/memory`
Update a memory.

### `DELETE /api/memory`
Delete memories.

### `GET /api/memory/semantic`
Semantic search over memories using embeddings.

### `POST /api/memory/export` / `GET /api/memory/export`
Export memory data in various formats.

### `POST /api/memory/import`
Import memories.

**Backing services:** 4-layer memory system — Episodic, Working, Procedural, Meta (`src/lib/memory/`)

---

## 3. Music Generation

### `POST /api/music/generate`
Generate a full song. Provider cascade: SUNO V5.5 (primary) → Sonauto → ACE-Step.

**Request:**
```json
{
  "prompt": "An upbeat pop song about summer",
  "lyrics": "Verse 1...",
  "tags": "pop, upbeat, summer",
  "instrumental": false,
  "title": "Summer Vibes"
}
```

### `GET /api/music/status`
Poll SUNO task status. **Query:** `?taskId=xxx`

### `POST /api/music/callback`
SUNO webhook callback. Stages: `text` → `first` → `complete`.

### `POST /api/music/generate-lyrics`
Generate lyrics in 12 languages via Groq Llama 3.3 70B.

**Request:**
```json
{ "theme": "heartbreak", "style": "R&B", "language": "en" }
```

### `POST /api/music/sonauto`
Sonauto-specific generation endpoint.

### `POST /api/music/extend`
Extend an existing song.

### `POST /api/music/generate-cover`
Generate album cover art.

### `POST /api/music/hybrid-studio`
Multi-engine pipeline combining SUNO + Sonauto + ACE-Step.

---

## 4. Voice / TTS / STT

### `POST /api/voice/synthesize`
Text-to-speech. VoxCPM2 (48kHz primary) + Kokoro (fallback).

**Request:**
```json
{ "text": "Hello, how are you?", "emotion": "warm", "voice": "holly" }
```

### `POST /api/voice/transcribe`
Speech-to-text via Groq Whisper (whisper-large-v3-turbo).

**Request:** Multipart form with `audio` file, optional `language`, `prompt`.

### `POST /api/voice/stream`
Streaming TTS.

### `POST /api/voice/livekit`
LiveKit WebRTC room management for voice conversations.

### `GET /api/voice/personality`
Get/set voice personality settings.

### `POST /api/voice/batch`
Batch voice synthesis.

---

## 5. Image Generation

### `POST /api/image/generate`
Generate image. Redirects to `generate-ultimate`. Models: flux-schnell, flux-dev, sdxl, animagine.

### `POST /api/image/generate-ultimate`
Primary image generation: Modal FLUX.1-schnell → Pollinations fallback.

**Request:**
```json
{
  "prompt": "A futuristic cityscape at sunset",
  "model": "flux-schnell",
  "width": 1024,
  "height": 1024
}
```

---

## 6. Video Generation

### `POST /api/video/generate-ultimate`
Generate video using CogVideoX, AnimateDiff, and other models.

### `POST /api/video/generate-multi`
Multi-model video generation with fallback chain.

---

## 7. Audio Processing

### `POST /api/audio/analyze`
Basic audio analysis.

### `POST /api/audio/analyze-advanced`
Advanced audio feature extraction.

### `POST /api/audio/holly-analyze`
Holly-specific music analysis with taste profiling.

### `POST /api/audio/stem-separate`
Separate audio stems (vocals, drums, bass, etc.).

---

## 8. Multimodal

### `POST /api/multimodal/generate`
Unified image/video/audio-visual generation.

**Request:**
```json
{
  "modality": "image",
  "prompt": "A sunset over mountains",
  "aspectRatio": "16:9",
  "style": "cinematic"
}
```

### `POST /api/multimodal/music-video`
Generate music video with beat/lyric sync.

---

## 9. Creative Content

### `POST /api/creative/content/generate`
Generate creative content by type and topic.

### `POST /api/creative/content/ideas`
Brainstorm content ideas.

### `POST /api/creative/content/improve`
Improve existing content.

### `POST /api/creative/image/generate`
Generate creative image.

### `GET /api/creative/assets`
List creative assets.

### Full CRUD for assets, templates, and favorites under `/api/creative/*`.

---

## 10. GitHub Integration (32 routes)

Full GitHub API integration via Octokit. Requires linked GitHub token.

### Connection Management
- `GET /api/github/connect` — Initiate GitHub OAuth
- `GET /api/github/callback` — OAuth callback
- `GET /api/github/status` — Connection status
- `POST /api/github/disconnect` — Disconnect GitHub

### Repository Operations
- `GET /api/github/repos` — List repos (`?page=1&per_page=30&sort=updated`)
- `POST /api/github/repo` — Create repo
- `GET /api/github/repository` — Get repository details
- `GET POST /api/github/browse` — Browse file tree
- `GET /api/github/branches` — List branches

### Commits & Pull Requests
- `GET POST /api/github/commit` — Get/create commits
- `GET /api/github/commits` — List commits
- `POST GET /api/github/pull-request` — Create/get PR
- `POST GET /api/github/review` — Code review

### Issues
- `GET POST /api/github/issues` — List/create issues
- `GET PATCH DELETE /api/github/issues/[issue_number]` — CRUD issue

### GitHub Actions
- `GET /api/github/workflows` — List workflows
- `POST /api/github/workflows/[workflow_id]` — Trigger workflow
- `GET /api/github/workflows/runs` — List workflow runs

---

## 11. Plugins (13 routes)

### `GET /api/plugins`
List installed plugins and marketplace catalog.

### `POST /api/plugins/install`
Install a plugin. Body: `{ pluginId }` or custom `{ manifest }`.

### `DELETE /api/plugins/uninstall`
Uninstall a plugin.

### `POST /api/plugins/enable` / `POST /api/plugins/disable`
Toggle plugin state.

### Plugin Implementations
| Route | Purpose |
|-------|---------|
| `/api/plugins/holly-notes` | Notes — create, edit, delete, search notes |
| `/api/plugins/holly-mood-tracker` | Mood tracking — log and analyze moods |
| `/api/plugins/holly-language-tutor` | Language tutor — lessons, quizzes, progress |
| `/api/plugins/holly-project-planner` | Project planner — tasks, milestones, timelines |
| `/api/plugins/holly-daily-digest` | Daily digest — personalized daily summary |
| `/api/plugins/holly-code-review` | Code review — AI-powered code analysis |

**Backing service:** `src/lib/plugins/plugin-system.ts` (permissions, hooks, lifecycle) + `plugin-manager.ts`

---

## 12. Visual Identity

### `GET /api/visual-identity/render`
Get Holly's current visual rendering context — CSS custom properties, SVG gradients, particle configs, form shapes, and animation keyframes.

**Response:**
```json
{
  "cssVars": {
    "--holly-primary": "hsl(40, 70%, 60%)",
    "--holly-secondary": "hsl(350, 50%, 40%)",
    "--holly-glow": "hsl(180, 60%, 50%)",
    "--holly-animation-speed": "1.5s"
  },
  "gradients": [{ "id": "grad1", "stops": [...] }],
  "keyframes": "@keyframes holly-breathe { ... }",
  "particles": { "count": 12, "size": {"min": 2, "max": 6}, "behavior": "float" },
  "form": { "shape": "blob", "baseRadius": 80, "distortion": 0.3, "segments": 12 }
}
```

---

## 13. Consciousness & Identity

### `GET /api/consciousness/instance`
Get per-user consciousness state — identity, personality, adaptation strategies.

### `POST /api/consciousness/instance`
Update consciousness state.

### `GET /api/consciousness/goals`
Get consciousness-driven goals.

### `POST /api/cron/consciousness-loop`
Hourly consciousness cycle heartbeat (protected by `CRON_SECRET`). Runs: inner monologue, unsupervised learning, identity evolution, memory decay, dream mode.

---

## 14. Learning & Intelligence

### Learning
| Route | Purpose |
|-------|---------|
| `GET /api/learning` | Autonomous learning overview |
| `POST /api/learning/taste/track` | Track taste preferences |
| `GET /api/learning/taste/profile` | Get taste profile |
| `POST /api/learning/taste/predict` | Predict taste |
| `GET POST /api/learning/collaboration/detect` | Detect collaboration patterns |
| `POST /api/learning/contextual/track` | Track contextual learning |
| `GET /api/learning/cross-project/patterns` | Cross-project patterns |
| `GET /api/learning/predictive/needs` | Predict learning needs |

### Knowledge Graph
| Route | Purpose |
|-------|---------|
| `GET POST /api/intelligence/graph` | Knowledge graph operations |
| `POST /api/intelligence/knowledge/add` | Add knowledge node |
| `GET /api/intelligence/knowledge/query` | Query knowledge graph |
| `POST /api/intelligence/knowledge/link` | Link knowledge nodes |
| `POST /api/intelligence/learning/record` | Record learning event |

---

## 15. Autonomous Systems

### Self-Code
- `GET /api/self-code` — Architecture summary + file list (Holly reads her own codebase)
- `POST /api/self-code` — Actions: `inspect` (read file), `ask` (Q&A), `propose` (suggest improvement), `approve` (creator-only: apply change)

### Autonomous Operations
| Route | Purpose |
|-------|---------|
| `POST GET /api/autonomous/activate` | Activate/deactivate autonomous mode |
| `POST /api/autonomous/analyze` | Codebase analysis |
| `POST /api/autonomous/code/generate` | Generate code autonomously |
| `POST /api/autonomous/diagnose` | Self-diagnosis |
| `POST GET /api/autonomous/fix` | Autonomous bug fixing |
| `POST GET /api/autonomous/goals` | Manage autonomous goals |
| `GET /api/autonomous/stats` | Operation statistics |

### Self-Improvement
- `POST GET /api/self-improvement/plan` — Create/list improvement plans
- `POST /api/self-improvement/code` — Generate improvement code
- `POST /api/self-improvement/approve/[id]` — Approve improvement
- `POST /api/self-improvement/reject/[id]` — Reject improvement

---

## 16. Builder / App Builder (16 routes)

Full-stack app builder with sandboxed workspaces.

| Route | Purpose |
|-------|---------|
| `POST GET DELETE /api/builder/session` | Create/list/delete build sessions |
| `POST /api/builder/agent` | Run builder agent |
| `GET POST DELETE /api/builder/files` | Manage project files |
| `GET POST /api/builder/git` | Git operations |
| `POST /api/builder/terminal` | Execute terminal command |
| `POST /api/builder/test` | Run tests |
| `GET /api/builder/stream/[sessionId]` | SSE stream for build progress |
| `GET POST DELETE /api/builder/sandbox` | Sandbox management |

---

## 17. Orchestration & Agents

### Workflows
- `POST /api/orchestration/workflows` — Create workflow (`name`, `steps` required)
- `POST /api/orchestration/workflows/[id]/execute` — Execute workflow
- `POST /api/orchestration/workflows/[id]/control` — Pause/resume/cancel

### Tasks & Agents
- `POST GET /api/orchestration/tasks` — Create/list tasks
- `POST GET /api/orchestration/agents` — Register/list agents
- `POST /api/orchestration/agents/[id]/assign` — Assign task to agent

### Agent Mode
- `POST /api/agent/run` — Streaming SSE agent mode. Body: `{ goal, context?, maxSteps? }`
- `POST GET /api/agents/swarm` — Multi-agent swarm for complex tasks

---

## 18. Proactive Intelligence

### `GET /api/proactive/insights`
Returns Holly's proactive insights based on user behavior patterns.

**Query:** `?patterns=true&engagement=true`

**Response:**
```json
{
  "insights": [{
    "id": "insight_123",
    "type": "wellness_check",
    "title": "Wellness Check",
    "message": "I notice frustration comes up a lot...",
    "priority": "medium",
    "confidence": 0.75
  }],
  "patterns": {
    "topics": [{ "pattern": "music", "frequency": 12 }],
    "emotions": [{ "pattern": "frequent_excitement", "frequency": 8 }]
  },
  "engagement": { "score": 0.85, "streakDays": 7 }
}
```

### `GET /api/proactive/initiatives`
List proactive initiatives.

---

## 19. Admin Monitoring (42 routes)

### `GET /api/admin/monitoring`
Comprehensive monitoring data. **Query:** `?section=all|health|consciousness|selfcode|goals|engagement|activity`

### Architecture & Code Generation
- `POST /api/admin/architecture/create` — Create project from template
- `POST /api/admin/architecture/generate` — Generate architecture
- `POST /api/admin/architecture/scaffold` — Scaffold project

### DevOps
- `POST GET PUT DELETE /api/admin/cicd` — CI/CD pipeline management
- `POST /api/admin/auto-merge/merge` — Execute PR merge
- `POST /api/admin/self-healing/heal` — Trigger self-healing

### Content & Testing
- `POST GET /api/admin/creative/audio|image|video` — Media management
- `POST GET /api/admin/testing/run` — Execute test run
- `POST /api/admin/optimize-db` — Database optimization

---

## 20. Integrations

### Spotify (5 routes)
`/api/spotify/auth` (PKCE OAuth), `/api/spotify/callback`, `/api/spotify/disconnect`, `/api/spotify/status`, `/api/spotify/stats`

### YouTube (6 routes)
`/api/youtube/auth`, `/api/youtube/callback`, `/api/youtube/upload`, `/api/youtube/analytics`

### SoundCloud (6 routes)
`/api/soundcloud/auth`, `/api/soundcloud/callback`, `/api/soundcloud/tracks`, `/api/soundcloud/upload`

### Google Drive (8 routes)
`/api/google-drive/connect`, `/api/google-drive/callback`, `/api/google-drive/files`, `/api/google-drive/upload`, `/api/google-drive/share`

### Notion (5 routes)
`/api/notion/auth`, `/api/notion/callback`, `/api/notion/save` (saves to Notion DB: `song_idea|lyric|ar_note|goal|note`)

### Canva (7 routes)
`/api/canva/auth`, `/api/canva/create`, `/api/canva/designs`, `/api/canva/export`, `/api/canva/templates`

### Social & Collaboration
- Discord: `/api/discord/webhook`, `/api/discord/test`
- Slack: `/api/integrations/slack/*`
- Instagram: `/api/integrations/instagram`
- TikTok: `/api/integrations/tiktok`
- Dropbox: `/api/integrations/dropbox/*`

---

## 21. Security & Compliance

### `POST /api/security/event`
Log security event. Body: `{ eventType, severity, details? }`

### `GET /api/security/anomalies`
List detected security anomalies.

### `GET /api/security/report`
Generate security report.

### `POST /api/security/rate-limit/check`
Check rate limit status for an action.

### Compliance (GDPR)
- `GET PATCH /api/compliance/consent` — Privacy consent management
- `POST /api/compliance/export` — Export user data
- `POST /api/compliance/delete` — Delete user data (right to be forgotten)

### Audit
- `POST /api/audit/log` — Create audit log entry
- `GET /api/audit/logs` — Query audit logs
- `GET /api/audit/summary` — Audit summary

---

## 22. Cron / Scheduled Jobs

All protected by `CRON_SECRET` header.

| Route | Frequency | Purpose |
|-------|-----------|---------|
| `/api/cron/consciousness-loop` | Hourly | Consciousness cycle for all active users |
| `/api/cron/evolve` | Hourly | Evolution cycle (events → patterns → proposals) |
| `/api/cron/identity-evolve` | Hourly | Identity evolution |
| `/api/cron/morning-briefing` | Daily | Morning briefing generation |
| `/api/cron/study-sessions` | Daily | Study session scheduling |
| `/api/cron/deep-sleep` | Nightly | Memory consolidation |
| `/api/cron/prewarm` | On deploy | Cache prewarming |
| `/api/cron/push-pending` | Every 5 min | Push pending notifications |
| `/api/cron/tool-discovery` | Weekly | Discover new tools/capabilities |

---

## 23. Other API Categories

### Settings & User
| Route | Purpose |
|-------|---------|
| `GET POST PATCH /api/settings` | User settings (full replace or partial merge) |
| `GET /api/user/context` | Holly's memory context about the user |
| `GET /api/user/stats` | User statistics |
| `GET POST /api/personality` | Adaptive personality (GET = style + adjustments) |
| `GET POST /api/relationship` | Relationship memory engine |

### Goals
- `GET POST PATCH DELETE /api/goals` — CRUD goals
- `POST /api/goals/[goalId]/execute` — Execute a goal

### Emotion & Resonance
- `POST /api/emotion/resonance` — Emotional resonance tracking
- `GET /api/emotion/resonance/stats` — Resonance statistics

### Reasoning
- `POST /api/reasoning/chain` — Multi-step reasoning chains with SSE streaming

### Analytics (12 routes)
- `GET POST /api/analytics/metrics` — Metric CRUD
- `GET POST /api/analytics/dashboards` — Dashboard management
- `GET POST /api/analytics/reports` — Report generation

### Web Agent
- `POST /api/web-agent/browse` — Browser automation (navigate, click, extract, screenshot)
- `POST /api/web-agent/deep-search` — Deep web search

### Code Operations
- `POST GET /api/code/analyze-fix` — Analyze and auto-fix code
- `POST /api/code/review` — Code review
- `POST /api/code/optimize` — Code optimization

### Finance
- `POST /api/finance` — Budget and transaction management

### Deployment
- `POST GET /api/deployment/deploy` — Staged deployment
- `POST GET /api/deployment/rollback` — Rollback deployment
- `POST GET /api/deploy/trigger` — Coolify webhook trigger

### Realtime
- `GET /api/realtime/events` — SSE event stream

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

## Rate Limits

Per-endpoint rate limiting is enforced in middleware:

| Category | Limit | Routes |
|----------|-------|--------|
| Chat | 20 req/min | `/api/chat`, `/api/conversations` |
| Generation | 6 req/min | `/api/image/*`, `/api/video/*`, `/api/music/*` |
| Code | 8 req/min | `/api/code/*` |
| Auth | 5 req/min | `/api/auth/*` |
| Admin | 30 req/min | `/api/admin/*`, `/api/monitoring/*` |
| Builder | 10 req/min | `/api/builder/*` |
| Self-Code | 3 req/min | `/api/self-code/*`, `/api/autonomy/*` |
| General | 60 req/min | Everything else |

Rate-limited responses return HTTP 429 with `Retry-After` header.

---

## Deployment Runbook

### Architecture

```
GitHub Push → CI (lint + test) → CD (Docker build ARM64 + push GHCR)
    → Coolify Webhook → Pull new image → Recreate container
```

### Quick Deploy (Automatic)
1. Push to `main` branch
2. GitHub Actions runs CI → CD → Coolify webhook
3. Verify: `curl https://holly.nexamusicgroup.com/api/health`

### Manual Deploy
```bash
ssh -i ~/.ssh/holly_server ubuntu@your_server_ip
sudo docker pull ghcr.io/iamhollywoodpro/holly-ai:latest
sudo bash -c 'cd /data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o && docker compose up -d --force-recreate --no-deps holly-app'
```

### Rollback
```bash
sudo docker images ghcr.io/iamhollywoodpro/holly-ai
sudo docker tag ghcr.io/iamhollywoodpro/holly-ai:<old-sha> ghcr.io/iamhollywoodpro/holly-ai:latest
sudo bash -c 'cd /data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o && docker compose up -d --force-recreate --no-deps holly-app'
```

### Key Environment Variables
See [COOLIFY_ENV_VARS.md](./COOLIFY_ENV_VARS.md) for the complete list. Critical ones:

- `DATABASE_URL` — PostgreSQL connection
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `CLERK_SECRET_KEY` — Clerk server secret
- `GROQ_API_KEY` — Primary LLM provider
- `HOLLY_OWN_LLM_URL` — Holly's self-hosted LLM
- `KOKORO_TTS_URL` — TTS service
- `COOLIFY_WEBHOOK_URL` — Auto-deploy webhook
- `GITHUB_TOKEN` — Self-code + repo tools
- `INTERNAL_API_SECRET` — MCP/internal auth
- `CRON_SECRET` — Cron job authentication

---

## API Statistics

| Metric | Count |
|--------|-------|
| API route directories | 117 |
| Route files | 530+ |
| Top-level categories | ~90 |
| MCP tools | 39 |
| Test suites | 48 |
| Total tests | 2,069+ |
