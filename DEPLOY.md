# HOLLY AI — Dokploy Deployment Guide

> **Goal:** Move from Vercel (limited free tier) to Dokploy on your own server — completely free forever with zero limits on crons, storage, or bandwidth.

---

## Why Dokploy?

| Feature | Vercel Hobby | Dokploy (self-hosted) |
|---|---|---|
| **Cron jobs** | 2 max | ✅ Unlimited |
| **Function timeout** | 10s (hobby) | ✅ Unlimited |
| **Blob storage** | 512 MB free | ✅ Unlimited (your disk) |
| **Bandwidth** | 100 GB/mo | ✅ Unlimited |
| **Cost** | Free → $20/mo+ | ✅ Free forever |
| **Auto SSL** | ✅ | ✅ (via Traefik) |
| **Auto-deploy from GitHub** | ✅ | ✅ |
| **Docker Compose support** | ❌ | ✅ |

---

## Step 1: Get a Free Server

### Option A — Oracle Cloud (BEST: completely free forever)
- Go to **https://cloud.oracle.com/free**
- Sign up (requires credit card for verification — never charged)
- Create an **Ampere A1** instance:
  - Shape: `VM.Standard.A1.Flex`
  - **4 OCPUs + 24 GB RAM** — always free
  - OS: Ubuntu 22.04
  - Storage: 200 GB free
- Open ports 80, 443, 3000 in the security list

> ⚠️ **"Out of host capacity" errors are common** — Oracle capacity is heavily contested.  
> If you keep getting this error, see **[ORACLE_ARM_GUIDE.md](./ORACLE_ARM_GUIDE.md)** for  
> 5 strategies including an auto-retry script that grabs capacity the moment it appears.  
> **Quick fix**: Upgrade your Oracle account to Pay As You Go (still free, just needs card) —  
> PAYG users get capacity priority and most succeed within 24–48 hours.

### Option B — Hetzner VPS (cheapest paid: ~$4/month)
- Go to **https://hetzner.com/cloud**
- Create `CX21`: 2 vCPU, 4 GB RAM, 40 GB SSD — **€3.79/month**
- OS: Ubuntu 22.04

### Option C — DigitalOcean ($200 free credit for 60 days)
- **https://digitalocean.com** — use referral for credit
- Droplet: 2 GB RAM, 1 vCPU — $12/month after credit

---

## Step 2: Install Dokploy on Your Server

SSH into your server, then run the **one-line installer**:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

That's it. Dokploy installs Docker, Traefik (reverse proxy + auto SSL), and the Dokploy dashboard.

**Access the dashboard:**
```
http://YOUR_SERVER_IP:3000
```

Set up your admin account on first visit.

---

## Step 3: Add Your Domain (optional but recommended)

In your DNS provider (Cloudflare recommended — free):
```
A  holly.yourdomain.com  →  YOUR_SERVER_IP
A  *.holly.yourdomain.com  →  YOUR_SERVER_IP  (wildcard for subapps)
```

In Dokploy → Settings → Domains → Add your domain. Traefik auto-generates an SSL certificate via Let's Encrypt.

---

## Step 4: Deploy Holly on Dokploy

### 4a. Create a New Project
1. Dokploy Dashboard → **Projects** → **Create Project**
2. Name it `holly-ai`

### 4b. Add a Docker Compose Application
1. Inside the project → **Create Service** → **Docker Compose**
2. **Source**: Connect your GitHub repo (`Holly-AI`)
3. **Branch**: `main`
4. **Docker Compose file path**: `docker-compose.yml`
5. **Auto Deploy**: Enable (deploys on every push to main)

### 4c. Set Environment Variables
In Dokploy → Your service → **Environment** tab, paste ALL of these:

```env
# ── Core ────────────────────────────────────────────────────────────────────
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://holly.yourdomain.com
NEXT_PUBLIC_APP_NAME=HOLLY
INTERNAL_API_SECRET=generate-a-random-64-char-string-here

# ── CRITICAL: Cron auth (must match CRON_SECRET) ────────────────────────────
CRON_SECRET=generate-another-random-64-char-string-here

# ── Database (Neon — free tier) ──────────────────────────────────────────────
DATABASE_URL=postgresql://...your-neon-url...

# ── Auth (Clerk) ─────────────────────────────────────────────────────────────
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# ── LLM (all free) ───────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
NVIDIA_API_KEY=nvapi-...
CF_ACCOUNT_ID_CF_AI_TOKEN=accountId|token

# ── Voice (Kokoro self-hosted) ───────────────────────────────────────────────
KOKORO_TTS_URL=http://your-kokoro-url:8880
KOKORO_VOICE=af_heart

# ── Search (free) ────────────────────────────────────────────────────────────
SERPER_API_KEY=...

# ── Music ────────────────────────────────────────────────────────────────────
SUNO_API_KEY=...
```

**Generate secure secrets:**
```bash
openssl rand -hex 32
```

### 4d. Deploy
Click **Deploy**. Dokploy will:
1. Clone your repo
2. Build the Docker image (takes ~3-5 min first time)
3. Start `holly-app` (Next.js) and `holly-cron` (all 7 crons)
4. Wire up SSL and your domain via Traefik

---

## Step 5: Add Your Domain in Dokploy

1. Service → **Domains** tab
2. Add `holly.yourdomain.com`
3. Enable **HTTPS** (Traefik handles cert automatically)
4. Set **Port**: `3000`

---

## Step 6: Update Clerk Callback URLs

In your **Clerk Dashboard** → Configure → Domains:
```
https://holly.yourdomain.com
```

Update all OAuth redirect URIs (Spotify, YouTube, etc.) to use your new domain.

---

## Cron Jobs — How They Work on Dokploy

On Vercel Hobby you had **7 crons but only 2 ran**. On Dokploy, **all 7 run** via the `holly-cron` Alpine container:

| Cron | Schedule | What it does |
|------|----------|--------------|
| Architecture generation | `0 3 * * *` (3 AM) | Generates system architecture diagrams |
| Self-heal | `0 0 * * *` (midnight) | Checks and repairs any broken systems |
| Evolution cycle | `0 2 * * *` (2 AM) | Processes learning events → evolution proposals |
| Identity evolution | `0 4 * * *` (4 AM) | Nudges Holly's personality traits based on patterns |
| Initiative | `0 9 * * *` (9 AM) | Holly proactively plans the day |
| Background learning | `0 */2 * * *` | Real web search study session every 2 hours |
| Background learning | `30 */2 * * *` | Staggered session (30 min offset) |

View cron logs in Dokploy → Services → `holly-cron` → **Logs**.

---

## Running Kokoro TTS on the Same Server (Optional)

Instead of paying Novita.ai for GPU, run Kokoro locally on your Oracle/Hetzner server:

Add this to `docker-compose.yml` services section:

```yaml
  kokoro-tts:
    image: ghcr.io/remsky/kokoro-fastapi-cpu:v0.2.2
    container_name: kokoro-tts
    restart: unless-stopped
    ports:
      - "8880:8880"
    networks:
      - holly-network
```

Then set in env vars:
```
KOKORO_TTS_URL=http://kokoro-tts:8880
```

**Result:** Holly's voice synthesis runs for free on your own server, not Novita.ai.

---

## Upgrading to Cloudflare R2 Storage (replaces Vercel Blob)

Vercel Blob: 512 MB free. Cloudflare R2: **10 GB free forever, zero egress fees**.

1. Go to **https://dash.cloudflare.com** → R2 → Create Bucket → name it `holly-media`
2. Create an API Token with R2 read/write permissions
3. Add to env vars:
```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=holly-media
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

*(R2 uses the S3-compatible API — code migration guide coming in a future PR)*

---

## Troubleshooting

### Build fails with OOM
Increase Docker build memory. On Oracle free tier (24 GB RAM), this won't happen.

### Cron jobs not firing
Check `holly-cron` logs. The cron service waits for `holly-app` to be healthy before starting.

### App not accessible
1. Check Traefik logs: `docker logs traefik`
2. Ensure ports 80/443 are open in your server's firewall
3. Check DNS propagation: `dig holly.yourdomain.com`

### Database connection errors
Your `DATABASE_URL` must allow connections from your server's IP. In Neon: Dashboard → Settings → Connection pooling → add your IP to allowlist (or use `0.0.0.0/0` for simplicity).

---

## Cost Summary After Full Migration

| Service | Before | After |
|---------|--------|-------|
| Hosting | Vercel (free, limited) | Oracle Cloud ARM (free forever) |
| Crons | 2/7 working | ✅ All 7 working |
| Storage | Vercel Blob 512MB | Cloudflare R2 10GB (free) |
| Database | Neon free | Neon free (unchanged) |
| Auth | Clerk free | Clerk free (unchanged) |
| LLMs | Groq/OpenRouter free | Same (unchanged) |
| TTS | Novita.ai (paid GPU) | Self-hosted Kokoro (free) |
| **Total** | **$0 + risk of bills** | **$0 forever, no limits** |
