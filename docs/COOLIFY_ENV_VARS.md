# HOLLY — Coolify Environment Variables Master Reference

> **Generated**: 2026-04-02  
> **Server**: Oracle ARM VM.Standard.A1.Flex · `40.233.70.207`  
> **Platform**: Coolify v4 (self-hosted)  
> **Cross-referenced against**: Vercel env screenshots + full codebase scan

---

## How to Add Variables in Coolify

1. Coolify Dashboard → your **holly-ai** service  
2. Click **Environment Variables** tab  
3. Paste each variable as `KEY=value`  
4. Click **Save** → then **Deploy**

---

## 🔴 CRITICAL — Holly WILL NOT START without these

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://40.233.70.207:3000
NEXT_PUBLIC_APP_NAME=HOLLY
DATABASE_URL=postgresql://neondb_owner:npg_8vybX2qBuDEe@ep-morning-unit-ad2ywa27-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Generate both with: openssl rand -hex 32
INTERNAL_API_SECRET=<generate-64-char-hex>
CRON_SECRET=<generate-64-char-hex>

# ── Clerk Auth (get from https://dashboard.clerk.com) ──────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## 🟠 LLM PROVIDERS — Core intelligence (add all you have)

```env
# Primary (free, fast) — REQUIRED for chat to work
GROQ_API_KEY=gsk_...

# Secondary cascade providers
OPENROUTER_API_KEY=sk-or-v1-...
NVIDIA_API_KEY=nvapi-...
HUGGINGFACE_API_KEY=hf_...

# Cloudflare Workers AI (free 10k req/day)
# Format: accountId|apiToken
CF_ACCOUNT_ID_CF_AI_TOKEN=your_account_id|your_cf_api_token

# Optional — only needed if you want GPT-4 Vision/image features
OPENAI_API_KEY=sk-proj-...

# Gemini (optional, currently removed from routing but kept for image gen)
# GEMINI_API_KEY=AIza...

# Local Ollama (leave disabled on Oracle server unless you install it)
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

> **Note**: Holly's AI router priority: Groq → OpenRouter → NVIDIA → Cloudflare AI → HuggingFace.  
> If `GROQ_API_KEY` is missing, Holly falls back to the next available provider.

---

## 🟠 VOICE / TTS — Holly's voice

```env
# Kokoro TTS — self-hosted on Novita.ai sandbox (free tier)
# WARNING: The sandbox URL below EXPIRES — you'll need a permanent one
# Best option: add kokoro-tts to your docker-compose.yml (self-hosted free)
KOKORO_TTS_URL=https://8880-i15zr19pqhr00nepi3nir-ea026bf9.sandbox.novita.ai
KOKORO_VOICE=af_heart
HOLLY_VOICE_DESCRIPTION=Female voice in her 30s with an American accent. Confident, intelligent, warm tone with clear diction. Professional yet friendly, conversational pacing with emotional depth.

# Optional: Chatterbox TTS (alternative)
CHATTERBOX_TTS_URL=

# Optional: ElevenLabs or custom TTS API key
HOLLY_TTS_API_KEY=
```

> **⚠️ Kokoro TTS Warning**: The `sandbox.novita.ai` URL is temporary and will expire.  
> **Permanent fix**: Add `kokoro-tts` container to `docker-compose.yml`:
> ```yaml
> kokoro-tts:
>   image: ghcr.io/remsky/kokoro-fastapi-cpu:v0.2.2
>   restart: unless-stopped
>   ports: ["8880:8880"]
> ```
> Then set `KOKORO_TTS_URL=http://kokoro-tts:8880`

---

## 🟡 SEARCH / RESEARCH — Holly's background learning

```env
# Serper.dev (Google Search API — free 2,500/mo)
# Get key: https://serper.dev
SERPER_API_KEY=...

# NOTE: BRAVE_API_KEY has been REMOVED — replaced by Serper + DuckDuckGo fallback
# Do NOT add BRAVE_API_KEY — it is no longer used in the codebase
```

---

## 🟡 STORAGE — Files, uploads, blobs

```env
# Vercel Blob (current) — works on Coolify too, keep using it
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Optional: Upstash Redis KV (used for caching/rate-limiting)
KV_REST_API_URL=https://your-kv.upstash.io
KV_REST_API_TOKEN=AX...
```

> **Long-term**: Migrate from Vercel Blob to Cloudflare R2 (10 GB free forever).  
> See `DEPLOY.md` → Storage section for R2 setup.

---

## 🟡 MUSIC GENERATION

```env
# Suno AI (music generation — paid API)
SUNO_API_KEY=...
SUNO_BASE_URL=https://api.sunoapi.org/api/v1
```

---

## 🟡 IMAGE / VIDEO GENERATION

```env
# Fal.ai — image generation (paid)
FAL_KEY=...

# Replicate — stem separation / Demucs (paid)
REPLICATE_API_KEY=r8_...

# Runway — video generation (paid)
RUNWAY_API_KEY=key_...

# Hailuo, Kling, Luma, Pika — advanced video (paid, optional)
HAILUO_API_KEY=
KLING_API_KEY=
LUMA_API_KEY=
PIKA_API_KEY=
```

> **Free alternatives being implemented**:
> - Image: Pollinations.ai (free, no key needed)
> - Video: CogVideoX via HuggingFace (free)
> - Stem separation: Self-hosted Demucs

---

## 🟡 GITHUB — Holly's self-awareness / code tools

```env
# Personal Access Token (for Holly's self-code feature)
GITHUB_TOKEN=ghp_...
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Holly's own repo awareness
HOLLY_GITHUB_TOKEN=ghp_...
HOLLY_GITHUB_OWNER=iamhollywoodpro
HOLLY_GITHUB_REPO=Holly-AI
```

---

## 🟢 SOCIAL / OAUTH INTEGRATIONS (optional — Holly works without these)

```env
# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://40.233.70.207:3000/api/spotify/callback

# YouTube / Google
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://40.233.70.207:3000/api/youtube/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://40.233.70.207:3000/api/auth/google/callback

# SoundCloud
SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=
SOUNDCLOUD_REDIRECT_URI=http://40.233.70.207:3000/api/soundcloud/callback

# Notion
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://40.233.70.207:3000/api/notion/callback

# Canva
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URI=http://40.233.70.207:3000/api/canva/callback
```

> **Note**: Update `40.233.70.207:3000` to your custom domain once DNS is configured.  
> You'll also need to update each OAuth app's redirect URI in their respective dashboards.

---

## 🟢 NOTIFICATIONS (optional)

```env
# Email via Resend (free 3,000/mo — https://resend.com)
RESEND_API_KEY=re_...

# Slack / Discord webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 🟢 HOLLY HUB / AURA WORKER (optional)

```env
# Holly Tool Hub master key (internal API gateway)
HOLLY_HUB_API_KEY=

# Aura Worker (separate Railway service — only if deployed)
AURA_WORKER_URL=https://your-aura-worker.railway.app
AURA_WORKER_TOKEN=
```

---

## 🟢 FEATURE FLAGS — Already set correctly

```env
NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true
NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
NEXT_PUBLIC_ENABLE_LYRICS_AI=true
NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_MUSIC_STUDIO_VERSION=1.0.0
```

---

## 🟢 RATE LIMITS (optional, defaults are fine)

```env
RATE_LIMIT_MUSIC_GENERATION=10
RATE_LIMIT_ARTIST_GENERATION=20
RATE_LIMIT_LYRICS_GENERATION=30
```

---

## 🟢 AUTONOMOUS BEHAVIOR TUNING (optional)

```env
ENABLE_AUTONOMOUS_GOALS=true
ENABLE_EMOTIONAL_IMPACT_SCORING=true
ENABLE_MEMORY_STREAM=true
ENABLE_PERSONALITY_EVOLUTION=true
MEMORY_CONSOLIDATION_THRESHOLD=0.7
PERSONALITY_TRAIT_LEARNING_RATE=0.1
GOAL_PATTERN_DETECTION_MIN_OCCURRENCES=3
```

---

## ❌ DO NOT ADD — Removed / Vercel-only / Unused

| Variable | Reason |
|---|---|
| `BRAVE_API_KEY` | Removed — replaced by Serper + DuckDuckGo |
| `VERCEL_API_TOKEN` | Vercel-only — not needed on Coolify |
| `VERCEL_TEAM_ID` | Vercel-only |
| `VERCEL_PROJECT_ID` | Vercel-only |
| `VERCEL_TOKEN` | Vercel-only |
| `VERCEL_URL` | Auto-set by Vercel, not applicable |
| `NEXTAUTH_URL` | Holly uses Clerk, not NextAuth |
| `IP_SALT` | Not actively used in production routes |
| `CREATOR_USER_ID` | One-time setup variable, not needed at runtime |
| `GITHUB_REPOS_DIR` | Server filesystem path — not applicable |
| `CODEBASE_ROOT` | Server filesystem path — not applicable |
| `HOLLY_MAYA` | Legacy variable — Maya1 TTS replaced by Kokoro |
| `MAYA` | Legacy variable |
| `HOLLY_VOICE_REFERENCE_PATH` | Filesystem path — not applicable in Docker |
| `HOLLY_GITHUB_EMAIL` | Not used in production routes |
| `GITHUB_USERNAME` | Not used in production routes |
| `GITHUB_EMAIL` | Not used in production routes |
| `GITHUB_PAT` | Duplicate of `GITHUB_TOKEN` |

---

## 🚀 Deployment Checklist

### Minimum to get Holly running (Day 1)

- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `DATABASE_URL` (Neon)
- [ ] `INTERNAL_API_SECRET` (generate fresh)
- [ ] `CRON_SECRET` (generate fresh)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET`
- [ ] `GROQ_API_KEY`
- [ ] `NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true`

### To get full Holly experience

- [ ] `OPENROUTER_API_KEY`
- [ ] `NVIDIA_API_KEY`
- [ ] `CF_ACCOUNT_ID_CF_AI_TOKEN`
- [ ] `HUGGINGFACE_API_KEY`
- [ ] `KOKORO_TTS_URL` (or add kokoro-tts to docker-compose)
- [ ] `SERPER_API_KEY`
- [ ] `BLOB_READ_WRITE_TOKEN`
- [ ] `SUNO_API_KEY`

### To get Holly's autonomous features working (all 7 crons)

All cron jobs are already configured in `docker/cron/crontab` and will run automatically via the `holly-cron` container. They only need `CRON_SECRET` and `NEXT_PUBLIC_APP_URL` to be set.

---

## 🔑 How to Generate Secrets

Run these commands in your terminal and paste the output:

```bash
# Generate INTERNAL_API_SECRET
openssl rand -hex 32

# Generate CRON_SECRET  
openssl rand -hex 32
```

---

## 🌐 Domain Setup (when ready)

Once you have a domain pointing to `40.233.70.207`, update:

1. `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
2. All `REDIRECT_URI` variables (Spotify, YouTube, etc.)
3. Clerk Dashboard → Domains → add your domain
4. Coolify → Domains → add your domain + enable SSL

---

*Last updated: 2026-04-02 | Cross-referenced with Vercel screenshot audit + full codebase scan*
