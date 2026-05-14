# Coolify "Argument list too long" Fix Guide

## The Problem

Coolify v4 auto-injects ARG declarations for **every environment variable** into **each build stage** of the Dockerfile, plus `--mount=type=secret` flags on every RUN command. It then passes the modified Dockerfile as a base64-encoded string in a single command argument.

With ~110 env vars × 3 stages = **~330 ARGs + ~770 mount flags** → the base64 string exceeds Linux `MAX_ARG_STRLEN` (128KB) → deployment fails with:

```
proc_open(): posix_spawn() failed: Argument list too long
```

## What We've Already Done (Code-Side)

### Commit f28771e — Prisma + CI fixes
- `docker/startup.sh`: Added `--skip-generate` to `prisma db push`
- `app/api/admin/setup-db/route.ts`: Same prisma flag fix
- `Dockerfile`: Copy prisma CLI to runner stage
- `.github/workflows/ci.yml`: npm ci fallback + PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING

### Commit a78bcb9 — Coolify ARG documentation
- Added Dockerfile header warning about Coolify ARG injection
- Created this fix guide

### Latest commit — Dockerfile stage consolidation
- **Merged 3 stages → 2 stages** (deps+builder → build, runner stays)
- **Consolidated RUN commands** from 7 → 4 (minimizes mount flag injections)
- This reduces Coolify's ARG injections from ~330 → ~220 and mount flags from ~770 → ~440
- The base64-encoded Dockerfile should now fit under the 128KB limit

## What YOU Need To Do (Coolify UI)

### Option A: Delete Unused Environment Variables (RECOMMENDED)

The most effective fix is to reduce the total number of env vars in Coolify. Each unused variable adds ARGs to every build stage.

**Steps:**
1. Go to your Coolify project → **holly-app** → **Environment Variables**
2. **DELETE every variable that has an empty value or you're not using**
3. Keep ONLY the variables listed below

**Variables to KEEP (copy these exactly):**

#### Critical (app won't start without these):
```
DATABASE_URL
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
CRON_SECRET
INTERNAL_APP_URL
NODE_ENV
```

#### Clerk Auth:
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_PROXY_URL=https://holly.nexamusicgroup.com/api/clerk
```

#### LLM Providers (only the ones you actually use):
```
GROQ_API_KEY
OPENROUTER_API_KEY
```
> Delete NVIDIA_API_KEY, CF_ACCOUNT_ID_CF_AI_TOKEN, HUGGINGFACE_API_KEY, OPENAI_API_KEY, ARCEE_API_KEY, ARCEE_BASE_URL if you're not using them.

#### Voice/TTS (only if you have these services running):
```
KOKORO_TTS_URL
KOKORO_VOICE
```
> Delete VOXCPM2_TTS_URL, VOXCPM2_STYLE_GUIDANCE, HOLLY_VOICE_DESCRIPTION, HOLLY_TTS_API_KEY if not using VoxCPM2.

#### Storage (only if using R2):
```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

#### Feature Flags:
```
NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
NEXT_PUBLIC_ENABLE_LYRICS_AI=true
NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true
```

#### App Config:
```
NEXT_PUBLIC_APP_NAME=HOLLY
NEXT_PUBLIC_APP_VERSION
NEXT_PUBLIC_MUSIC_STUDIO_VERSION
```

**Variables to DELETE (safe to remove — not used or optional):**
- Any variable with an empty value
- `BLOB_READ_WRITE_TOKEN` (legacy Vercel Blob)
- `SUNO_API_KEY`, `SUNO_BASE_URL` (if not using Suno)
- `SONAUTO_API_KEY` (if not using Sonauto)
- `SERPER_API_KEY` (if not using search)
- `SPOTIFY_*` (if not using Spotify integration)
- `YOUTUBE_*` (if not using YouTube integration)
- `SOUNDCLOUD_*` (if not using SoundCloud integration)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (if not using GitHub OAuth)
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` (if not using GitHub integration)
- `LIVEKIT_*` (if not using LiveKit voice)
- `SANDBOX_PROVIDER`, `HOLLY_DOCKER_*` (if not using HOLLY Builder)
- `INTERNAL_API_SECRET` (if not using internal API)
- Any `COOLIFY_*` variables that Coolify auto-added
- Any Upstash/Redis variables
- Any Slack/Discord webhook variables
- Any Notion/Canva integration variables

**Target: Get under 40-50 total env vars.** With 50 vars × 2 stages = 100 ARGs, the deployment will succeed.

### Option B: Switch to Pre-Built Image (BULLETPROOF)

If reducing env vars doesn't work, switch Coolify to pull a pre-built image instead of building from source. This completely bypasses Coolify's Dockerfile modification.

**How it works:**
1. GitHub Actions builds the Docker image and pushes to GitHub Container Registry (ghcr.io)
2. Coolify pulls the pre-built image — no Dockerfile modification needed
3. All env vars are injected at runtime only (no build-time injection)

**Steps:**
1. Ensure your GitHub repo is public (GHCR is free for public repos)
2. In Coolify, create a **new service** using "Pre-built Image" (or "Docker Image")
3. Set the image to: `ghcr.io/iamhollywoodpro/holly-ai:latest`
4. Add all runtime env vars in Coolify's Environment tab
5. Deploy — Coolify just pulls and runs, no build step

**Alternative: Modify docker-compose.yml for Coolify**
Create a `docker-compose.coolify.yml` that uses the pre-built image:

```yaml
services:
  holly-app:
    image: ghcr.io/iamhollywoodpro/holly-ai:latest
    # ... rest of config same as docker-compose.yml but without build: section
```

Then in Coolify, point to `docker-compose.coolify.yml` instead of `docker-compose.yml`.

### Option C: Increase Server ARG_MAX (Quick Server Fix)

If you have SSH access to the Oracle Cloud server:

```bash
# Check current limit
cat /proc/sys/kernel/argsmax
# or
getconf ARG_MAX

# Temporarily increase (until reboot)
sudo sysctl -w kernel.argsmax=4194304

# Permanently increase
echo "kernel.argsmax=4194304" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

> Note: On newer kernels, `argsmax` may not be directly tunable. The relevant limits are:
> - `ARG_MAX` — total size of all arguments + environment
> - `MAX_ARG_STRLEN` — max size of a single argument (128KB default, NOT tunable on most kernels)
>
> If `MAX_ARG_STRLEN` is the bottleneck (which it likely is), the only fix is Options A or B.

## Troubleshooting

### "I unchecked 'Available at Buildtime' but it still fails"
The "Available at Buildtime" toggle in Coolify v4 does NOT prevent ARG injection into the Dockerfile. Coolify injects ARGs for ALL variables regardless of this setting. The toggle only controls whether `--build-arg` values are passed during the build. You MUST reduce the total number of env vars (Option A) or switch to pre-built image (Option B).

### "How do I know how many env vars Coolify is injecting?"
Check the deployment logs for: `"Added N ARG declarations to Dockerfile for service holly-app"`
- N = (number of env vars) × (number of build stages)
- If N > 200, deployment will likely fail
- Target: N < 100

### "Can I just increase Docker's memory?"
No. This is an OS-level limit on command argument length, not a Docker memory issue.
