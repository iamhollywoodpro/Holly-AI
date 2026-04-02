# HOLLY — Complete Coolify Environment Variables
## Full Vercel → Coolify Migration List

> **Server**: Oracle ARM `40.233.70.207` | **Platform**: Coolify v4  
> **Last updated**: 2026-04-02  
> Cross-referenced: Vercel screenshots + full codebase scan + .env.example

---

## HOW TO ADD IN COOLIFY
1. Coolify Dashboard → holly-ai service → **Environment Variables** tab  
2. Add each variable one by one (Key / Value fields)  
3. Click **Save** → then **Redeploy**

---

## 🔴 GROUP 1 — CRITICAL (Holly will NOT start without these)

```env
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=HOLLY
NEXT_PUBLIC_APP_URL=http://40.233.70.207:3000

DATABASE_URL=postgresql://neondb_owner:npg_8vybX2qBuDEe@ep-morning-unit-ad2ywa27-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

INTERNAL_API_SECRET=← RUN: openssl rand -hex 32
CRON_SECRET=← RUN: openssl rand -hex 32
```

---

## 🔴 GROUP 2 — CLERK AUTH (copy exactly from Vercel)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

> **After deploy**: Go to Clerk Dashboard → Domains → add `40.233.70.207`  
> Also update the webhook endpoint URL to: `http://40.233.70.207:3000/api/webhooks/clerk`

---

## 🟠 GROUP 3 — AI / LLM PROVIDERS (copy from Vercel — all are free tier)

```env
# PRIMARY — Fast chat (Llama 3.3 70B, 14,400 req/day free)
GROQ_API_KEY=gsk_...

# SECONDARY — Creative writing, vision, model fallback
OPENROUTER_API_KEY=sk-or-v1-...

# REASONING — Qwen3 235B, DeepSeek R1 (free)
NVIDIA_API_KEY=nvapi-...

# CLOUDFLARE WORKERS AI — Coding/agent (free 10k req/day)
# Format is: accountId|apiToken  (pipe character between them, no spaces)
CF_ACCOUNT_ID_CF_AI_TOKEN=your_account_id|your_cf_api_token

# HUGGINGFACE — Vision models fallback (free with key)
HUGGINGFACE_API_KEY=hf_...

# OPENAI — Only needed for GPT-4 Vision (optional, OpenRouter can replace)
OPENAI_API_KEY=sk-proj-...

# LOCAL OLLAMA — Disabled by default on server
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## 🟠 GROUP 4 — VOICE / TTS (copy from Vercel)

```env
# ⚠️  WARNING: The sandbox.novita.ai URL below WILL EXPIRE
# Permanent fix = add kokoro-tts container to docker-compose.yml
# then change this to: http://kokoro-tts:8880
KOKORO_TTS_URL=https://8880-i15zr19pqhr00nepi3nir-ea026bf9.sandbox.novita.ai
KOKORO_VOICE=af_heart

HOLLY_VOICE_DESCRIPTION=Female voice in her 30s with an American accent. Confident, intelligent, warm tone with clear diction. Professional yet friendly, conversational pacing with emotional depth.

# Optional secondary TTS
CHATTERBOX_TTS_URL=
HOLLY_TTS_API_KEY=
```

---

## 🟠 GROUP 5 — MUSIC GENERATION (copy from Vercel)

```env
SUNO_API_KEY=...
SUNO_BASE_URL=https://api.sunoapi.org/api/v1
```

---

## 🟠 GROUP 6 — IMAGE & VIDEO GENERATION (copy from Vercel)

```env
# Fal.ai — images + video (free starter credits)
FAL_KEY=...

# Replicate — stem separation / Demucs audio splitting
REPLICATE_API_KEY=r8_...

# Runway — premium video generation
RUNWAY_API_KEY=key_...

# Advanced video providers (optional — leave blank if not used)
HAILUO_API_KEY=
KLING_API_KEY=
LUMA_API_KEY=
PIKA_API_KEY=
```

---

## 🟠 GROUP 7 — SEARCH / RESEARCH (copy from Vercel)

```env
# Serper.dev — Google Search API (2,500 free req/mo)
SERPER_API_KEY=...
```

---

## 🟡 GROUP 8 — STORAGE (copy from Vercel)

```env
# Vercel Blob — file/image storage (keep using it, works outside Vercel too)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Upstash Redis — rate limiting & caching (optional)
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
```

---

## 🟡 GROUP 9 — GITHUB INTEGRATION (copy from Vercel)

```env
# Personal Access Token (for Holly's self-code awareness + repo tools)
GITHUB_TOKEN=ghp_...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Holly's own repo self-awareness
HOLLY_GITHUB_TOKEN=ghp_...
HOLLY_GITHUB_OWNER=iamhollywoodpro
HOLLY_GITHUB_REPO=Holly-AI
```

---

## 🟡 GROUP 10 — HOLLY INTERNAL KEYS (copy from Vercel or generate fresh)

```env
# Tool Hub master key (used by /api/hub/* routes)
HOLLY_HUB_API_KEY=...

# Aura Worker (optional — only if you have Railway Aura service running)
AURA_WORKER_URL=https://your-aura-worker.railway.app
AURA_WORKER_TOKEN=...
```

---

## 🟢 GROUP 11 — SPOTIFY INTEGRATION (copy from Vercel — optional)

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://40.233.70.207:3000/api/spotify/callback
```

> **Important**: After setting a real domain, update this in Spotify Developer Dashboard too.

---

## 🟢 GROUP 12 — YOUTUBE / GOOGLE INTEGRATION (copy from Vercel — optional)

```env
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=http://40.233.70.207:3000/api/youtube/callback
```

---

## 🟢 GROUP 13 — SOUNDCLOUD INTEGRATION (copy from Vercel — optional)

```env
SOUNDCLOUD_CLIENT_ID=...
SOUNDCLOUD_CLIENT_SECRET=...
SOUNDCLOUD_REDIRECT_URI=http://40.233.70.207:3000/api/soundcloud/callback
```

---

## 🟢 GROUP 14 — NOTION INTEGRATION (copy from Vercel — optional)

```env
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://40.233.70.207:3000/api/notion/callback
```

---

## 🟢 GROUP 15 — CANVA INTEGRATION (copy from Vercel — optional)

```env
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...
CANVA_REDIRECT_URI=http://40.233.70.207:3000/api/canva/callback
```

---

## 🟢 GROUP 16 — NOTIFICATIONS (copy from Vercel — optional)

```env
# Email via Resend (3,000/mo free — https://resend.com)
RESEND_API_KEY=re_...

# Slack / Discord alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 🟢 GROUP 17 — FEATURE FLAGS (set these exactly as shown)

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

## 🟢 GROUP 18 — RATE LIMITS (optional — defaults work fine)

```env
RATE_LIMIT_MUSIC_GENERATION=10
RATE_LIMIT_ARTIST_GENERATION=20
RATE_LIMIT_LYRICS_GENERATION=30
```

---

## 🟢 GROUP 19 — AUTONOMOUS BEHAVIOR TUNING (optional)

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

## ❌ DO NOT COPY — These are Vercel-only or removed

| Variable | Why NOT to copy |
|---|---|
| `VERCEL_API_TOKEN` | Vercel platform management — not needed on Coolify |
| `VERCEL_TEAM_ID` | Vercel platform — not applicable |
| `VERCEL_PROJECT_ID` | Vercel platform — not applicable |
| `VERCEL_TOKEN` | Vercel platform — not applicable |
| `VERCEL_URL` | Auto-set by Vercel; on Coolify use `NEXT_PUBLIC_APP_URL` |
| `BRAVE_API_KEY` | **Removed from codebase** — replaced by Serper + DuckDuckGo |
| `NEXTAUTH_URL` | Holly uses Clerk auth, not NextAuth |
| `HOLLY_MAYA` | Legacy — Maya1 TTS has been replaced by Kokoro |
| `MAYA` | Legacy variable — no longer used |
| `MAYA1_VOICE_DESCRIPTION` | Legacy — replaced by `HOLLY_VOICE_DESCRIPTION` |
| `HOLLY_MAYA1_TTS_URL` | Legacy — replaced by `KOKORO_TTS_URL` |
| `HOLLY_VOICE_REFERENCE_PATH` | Filesystem path — doesn't work in Docker container |
| `CODEBASE_ROOT` | Filesystem path — not applicable in Docker |
| `GITHUB_REPOS_DIR` | Filesystem path — not applicable in Docker |
| `CREATOR_USER_ID` | One-time setup only — not a runtime variable |
| `IP_SALT` | Not actively used in production routes |
| `GITHUB_EMAIL` | Not used in production routes |
| `GITHUB_USERNAME` | Not used in production routes |
| `GITHUB_PAT` | Duplicate of `GITHUB_TOKEN` |
| `NEXTAUTH_URL` | Holly uses Clerk, not NextAuth |

---

## 🔑 GENERATE YOUR SECRETS NOW

Open your Mac terminal and run these — paste each output into Coolify:

```bash
# Generate INTERNAL_API_SECRET
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32

# Generate HOLLY_HUB_API_KEY (if you don't have one in Vercel)
openssl rand -hex 32
```

---

## ✅ MINIMUM TO GET HOLLY RUNNING — Day 1 Checklist

Copy these from Vercel + generate the secrets. Holly will boot and chat:

- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_URL=http://40.233.70.207:3000`
- [ ] `NEXT_PUBLIC_APP_NAME=HOLLY`
- [ ] `DATABASE_URL` (already known — use Neon URL)
- [ ] `INTERNAL_API_SECRET` (generate fresh)
- [ ] `CRON_SECRET` (generate fresh)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET`
- [ ] `GROQ_API_KEY`
- [ ] `NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true`
- [ ] `KOKORO_TTS_URL`
- [ ] `KOKORO_VOICE=af_heart`

---

## ✅ FULL HOLLY EXPERIENCE — Complete Checklist

Everything above PLUS:

- [ ] `OPENROUTER_API_KEY`
- [ ] `NVIDIA_API_KEY`
- [ ] `CF_ACCOUNT_ID_CF_AI_TOKEN`
- [ ] `HUGGINGFACE_API_KEY`
- [ ] `SERPER_API_KEY`
- [ ] `BLOB_READ_WRITE_TOKEN`
- [ ] `SUNO_API_KEY` + `SUNO_BASE_URL`
- [ ] `FAL_KEY`
- [ ] `REPLICATE_API_KEY`
- [ ] `GITHUB_TOKEN`
- [ ] `HOLLY_GITHUB_TOKEN`
- [ ] `HOLLY_HUB_API_KEY`
- [ ] All feature flags (Group 17)
- [ ] `ENABLE_AUTONOMOUS_GOALS=true`
- [ ] `ENABLE_PERSONALITY_EVOLUTION=true`
- [ ] `ENABLE_MEMORY_STREAM=true`

---

## 🌐 AFTER YOU GET A DOMAIN — Update These

When you point a real domain (e.g. `holly.yourdomain.com`) to `40.233.70.207`:

1. Change `NEXT_PUBLIC_APP_URL` → `https://holly.yourdomain.com`
2. Update ALL `*_REDIRECT_URI` variables to use your domain
3. Update each OAuth app dashboard (Spotify, YouTube, Notion, Canva, GitHub) with new redirect URI
4. Update Clerk Dashboard → Domains → add your domain
5. Update Clerk webhook URL → `https://holly.yourdomain.com/api/webhooks/clerk`
6. Coolify → Domains → add domain + enable SSL (Coolify handles Let's Encrypt automatically)

---

*Cross-referenced: Vercel env screenshots + `.env.example` + full codebase `process.env.*` scan | 2026-04-02*
