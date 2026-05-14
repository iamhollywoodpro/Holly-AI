# 🔧 FIX: Coolify "Argument list too long" Deployment Failure

## Problem

Coolify deployment fails with:

```
proc_open(): posix_spawn() failed: Argument list too long
```

**Root Cause**: Coolify v4 auto-injects an `ARG` declaration for **every environment variable** marked as "Available at Buildtime" into **every build stage** of the Dockerfile. With ~330 env vars × 3 build stages = ~990 ARG declarations. Each `RUN` command then gets ~330 `--mount=type=secret` flags, exceeding the Linux `ARG_MAX` limit (~2MB).

Coolify's deployment log confirms this:
```
Added 330 ARG declarations to Dockerfile for service holly-app (multi-stage build, added to 3 stages)
```

## Solution: Mark Non-Build Variables as "Runtime Only"

Only `NEXT_PUBLIC_*` variables need to be build-time ARGs (Next.js bakes them into the client bundle at build time). **All other variables** (API keys, secrets, URLs, config) are only needed at container runtime and should be marked as "Runtime Only" in Coolify.

---

## Step-by-Step Fix (5 minutes)

### Step 1: Open Coolify Environment Variables

1. Go to your Coolify dashboard
2. Navigate to: **Project → holly-ai → Environment Variables** tab
3. You'll see a list of all ~330 environment variables

### Step 2: Identify Variables That MUST Stay as Build-Time

These **17 variables** must keep "Available at Buildtime" ✅ checked:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_PROXY_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_VERSION
NEXT_PUBLIC_MUSIC_STUDIO_VERSION
NEXT_PUBLIC_ENABLE_MUSIC_GENERATION
NEXT_PUBLIC_ENABLE_LYRICS_AI
NEXT_PUBLIC_ENABLE_VIDEO_GENERATION
NEXT_PUBLIC_ENABLE_ARTIST_CREATION
NEXT_PUBLIC_ENABLE_TRUE_STREAMING
```

> **Rule of thumb**: Only variables starting with `NEXT_PUBLIC_` need to be build-time. Everything else is runtime-only.

### Step 3: Uncheck "Available at Buildtime" for ALL Other Variables

For every variable **NOT** in the list above:

1. Click the variable to edit it
2. **Uncheck** ❌ "Available at Buildtime" (also labeled "Is Build Variable" in some Coolify versions)
3. **Keep** ✅ "Available at Runtime" checked
4. Save

**Variables that MUST be Runtime Only** (uncheck build-time):

```
# Auth secrets (NEVER bake into image)
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET

# Database (runtime only)
DATABASE_URL

# All API keys (runtime only)
GROQ_API_KEY
OPENROUTER_API_KEY
NVIDIA_API_KEY
CF_ACCOUNT_ID_CF_AI_TOKEN
HUGGINGFACE_API_KEY
OPENAI_API_KEY
GOOGLE_AI_API_KEY
ARCEE_API_KEY
ARCEE_BASE_URL

# Voice/TTS (runtime only)
VOXCPM2_TTS_URL
VOXCPM2_STYLE_GUIDANCE
HOLLY_VOICE_DESCRIPTION
HOLLY_TTS_API_KEY
KOKORO_TTS_URL
KOKORO_VOICE

# Music (runtime only)
SUNO_API_KEY
SUNO_BASE_URL
SONAUTO_API_KEY
ACESTEP_MUSIC_URL

# Storage (runtime only)
BLOB_READ_WRITE_TOKEN
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL

# Search (runtime only)
SERPER_API_KEY

# Social OAuth (runtime only)
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REDIRECT_URI
SOUNDCLOUD_CLIENT_ID
SOUNDCLOUD_CLIENT_SECRET
SOUNDCLOUD_REDIRECT_URI

# GitHub (runtime only)
GITHUB_TOKEN
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_OWNER
GITHUB_REPO
HOLLY_GITHUB_TOKEN
HOLLY_GITHUB_OWNER
HOLLY_GITHUB_REPO

# Internal (runtime only)
INTERNAL_API_SECRET
CRON_SECRET
HOLLY_HUB_API_KEY
INTERNAL_APP_URL
NODE_ENV

# LiveKit (runtime only)
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_URL
LIVEKIT_NODE_IP

# Feature flags / Builder (runtime only)
SANDBOX_PROVIDER
HOLLY_DOCKER_IMAGE
HOLLY_DOCKER_MEM
HOLLY_DOCKER_CPU_QUOTA
HOLLY_DOCKER_PIDS
TERMINAL_TRANSPORT
PREVIEW_PROXY_ENABLED
GITHUB_INTEGRATION_ENABLED
FIX_LOOP_MAX_ATTEMPTS
FILE_SYNC_ENABLED

# Image/Video generation (runtime only)
MODAL_IMAGE_URL
MODAL_VIDEO_URL
FAL_KEY
REPLICATE_API_KEY
RUNWAY_API_KEY

# Canva (runtime only)
CANVA_CLIENT_ID
CANVA_CLIENT_SECRET
CANVA_REDIRECT_URI

# Notion (runtime only)
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_REDIRECT_URI

# Notifications (runtime only)
SLACK_WEBHOOK_URL
DISCORD_WEBHOOK_URL

# Rate limiting (runtime only)
RATE_LIMIT_MUSIC_GENERATION
RATE_LIMIT_ARTIST_GENERATION
RATE_LIMIT_LYRICS_GENERATION

# Creator identification (runtime only)
CREATOR_EMAILS
CREATOR_CLERK_IDS
CREATOR_NAME_FRAGMENTS

# Ollama (runtime only)
OLLAMA_ENABLED
OLLAMA_BASE_URL
OLLAMA_MODEL

# HF (runtime only)
HF_INFERENCE_ENABLED
HF_SPENDING_SAFE

# Upstash Redis (runtime only)
KV_REST_API_URL
KV_REST_API_TOKEN

# Aura Worker (runtime only)
AURA_WORKER_URL
AURA_WORKER_TOKEN
```

### Step 4: Save and Redeploy

1. Click **Save** at the bottom of the Environment Variables page
2. Go to **Deployments** tab
3. Click **Redeploy** (or push a new commit to trigger automatic deployment)

---

## Why This Works

| Before | After |
|--------|-------|
| 330 ARGs × 3 stages = 990 declarations | 17 ARGs × 3 stages = 51 declarations |
| Each RUN gets 330 `--mount=type=secret` flags | Each RUN gets 17 `--mount=type=secret` flags |
| Command line ≈ 3MB → exceeds `ARG_MAX` | Command line ≈ 50KB → well within limits |

## Verification

After redeploying, check the Coolify deployment log. You should see:
```
Added 17 ARG declarations to Dockerfile for service holly-app (multi-stage build, added to 3 stages)
```

Instead of the previous:
```
Added 330 ARG declarations to Dockerfile for service holly-app (multi-stage build, added to 3 stages)
```

---

## Alternative: Bulk Edit via Coolify API

If you have many variables, you can use Coolify's API to bulk-update them:

```bash
# List all environment variables for the service
curl -s http://localhost:8000/api/v1/applications/{uuid}/env-vars \
  -H "Authorization: Bearer YOUR_COOLIFY_TOKEN" | jq .

# Update each variable to set is_buildtime=false (except NEXT_PUBLIC_*)
# This requires individual PATCH requests per variable
```

Or use the Coolify web UI's bulk edit feature if available in your version.

---

## FAQ

**Q: Will my app still work if API keys aren't build-time ARGs?**
**A:** Yes. API keys, secrets, and all non-`NEXT_PUBLIC_*` variables are only needed at container runtime. They're injected as environment variables when the container starts, not during the Docker build. Only `NEXT_PUBLIC_*` variables need to be available during build because Next.js embeds them into the client-side JavaScript bundle at compile time.

**Q: What if I add a new `NEXT_PUBLIC_*` variable?**
**A:** Make sure to check "Available at Buildtime" for any new `NEXT_PUBLIC_*` variable you add. Also declare it as an `ARG` + `ENV` in the Dockerfile's builder stage.

**Q: Can I just delete unused variables from Coolify?**
**A:** Yes! Removing unused/empty variables also helps. But the critical fix is unchecking "Available at Buildtime" for non-build variables.
