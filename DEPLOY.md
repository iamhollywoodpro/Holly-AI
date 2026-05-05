# HOLLY AI — Coolify Deployment Guide

> **Goal:** Move from Vercel (limited free tier) to Coolify on your own server —  
> completely free forever with zero limits on crons, storage, function timeouts, or bandwidth.

---

## Why Coolify?

| Feature | Vercel Hobby | Coolify (self-hosted) |
|---|---|---|
| **Cron jobs** | 2 max | ✅ Unlimited |
| **Function timeout** | 10s (hobby) | ✅ Unlimited |
| **Blob storage** | 512 MB free | ✅ Unlimited (your disk) |
| **Bandwidth** | 100 GB/mo | ✅ Unlimited |
| **Cost** | Free → $20/mo+ | ✅ Free forever |
| **Auto SSL** | ✅ | ✅ (via Caddy) |
| **Auto-deploy from GitHub** | ✅ | ✅ |
| **Docker Compose support** | ❌ | ✅ |
| **Built-in DB management UI** | ❌ | ✅ PostgreSQL, Redis |
| **Real-time monitoring** | Basic | ✅ CPU, RAM, logs |
| **Automated backups** | ❌ | ✅ S3-compatible |
| **Community** | — | ✅ 40k+ stars, very active |

---

## Step 1: Get a Free Server

### Option A — Oracle Cloud ARM (BEST: completely free forever)
- Go to **https://cloud.oracle.com/free**
- Sign up (requires credit card for verification — never charged)
- Create an **Ampere A1** instance:
  - Shape: `VM.Standard.A1.Flex`
  - **4 OCPUs + 24 GB RAM** — always free
  - OS: Ubuntu 22.04
  - Storage: 150 GB boot volume

> ⚠️ **"Out of host capacity" errors are common** — Oracle capacity is heavily contested.  
> See **[ORACLE_ARM_GUIDE.md](./ORACLE_ARM_GUIDE.md)** for 5 strategies to get it.  
> **Quick fix**: Upgrade Oracle account to Pay As You Go (still free, just needs card on file) —  
> PAYG users get capacity priority and most succeed within 24–48 hours.

### Option B — DigitalOcean ($200 free credit for 60 days)
- **https://digitalocean.com** — use referral for credit
- Droplet: 4 GB RAM, 2 vCPU — $24/month after credit

---

## Step 2: Open Firewall Ports on Your Server

### Oracle Cloud — OCI Security List
OCI Console → Networking → Virtual Cloud Networks → your VCN  
→ Security Lists → Default Security List → **Add Ingress Rules**:

| Source CIDR | Protocol | Port | Purpose |
|-------------|----------|------|---------|
| `0.0.0.0/0` | TCP | 22 | SSH |
| `0.0.0.0/0` | TCP | 80 | HTTP |
| `0.0.0.0/0` | TCP | 443 | HTTPS |
| `0.0.0.0/0` | TCP | 8000 | Coolify dashboard |

### Also open OS firewall inside the server (run after SSH in):
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## Step 3: Install Coolify on Your Server

SSH into your server:
```bash
ssh ubuntu@YOUR_SERVER_IP
```

Run the **one-line installer**:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Coolify installs Docker, Caddy (reverse proxy + auto SSL), and the Coolify dashboard.

**Access the dashboard:**
```
http://YOUR_SERVER_IP:8000
```

Set up your admin account on first visit.

---

## Step 4: Connect GitHub to Coolify

1. Coolify Dashboard → **Sources** → **Add** → **GitHub App**
2. Follow the OAuth flow to connect your GitHub account
3. Install the Coolify GitHub App on the `iamhollywoodpro/Holly-AI` repository

---

## Step 5: Add Your Domain (Optional but Recommended)

In your DNS provider (Cloudflare recommended — free):
```
A  holly.yourdomain.com  →  YOUR_SERVER_IP
```

In Coolify → Settings → you can configure your domain.  
Caddy auto-generates an SSL certificate via Let's Encrypt automatically.

---

## Step 6: Deploy Holly on Coolify

### 6a. Create a New Project
1. Coolify Dashboard → **Projects** → **+ New Project**
2. Name it `holly-ai`

### 6b. Add a Docker Compose Service
1. Inside the project → **+ New Resource** → **Docker Compose**
2. **Source**: GitHub → select `iamhollywoodpro/Holly-AI`
3. **Branch**: `main`
4. **Docker Compose file path**: `docker-compose.yml`
5. **Watch paths**: leave default (deploys on every push to main)

### 6c. Set Environment Variables
In Coolify → Your service → **Environment Variables** tab, add ALL of these:

```env
# ── Core ────────────────────────────────────────────────────────────────────
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://holly.yourdomain.com
NEXT_PUBLIC_APP_NAME=HOLLY
INTERNAL_API_SECRET=generate-a-random-64-char-string-here

# ── CRITICAL: Cron auth (must match in both services) ───────────────────────
CRON_SECRET=generate-another-random-64-char-string-here

# ── Database (Neon — free tier) ──────────────────────────────────────────────
DATABASE_URL=postgresql://...your-neon-url...

# ── Auth (Clerk) ─────────────────────────────────────────────────────────────
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# ── LLM (all free tiers) ─────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
NVIDIA_API_KEY=nvapi-...
CF_ACCOUNT_ID_CF_AI_TOKEN=accountId|token
HUGGINGFACE_API_KEY=hf_...

# ── Voice ────────────────────────────────────────────────────────────────────
KOKORO_TTS_URL=http://kokoro-tts:8880
KOKORO_VOICE=af_heart

# ── Search (free) ────────────────────────────────────────────────────────────
SERPER_API_KEY=...

# ── Music / Media (optional — add keys when ready) ───────────────────────────
SUNO_API_KEY=
FAL_KEY=
REPLICATE_API_KEY=
RUNWAY_API_TOKEN=

# ── Storage ──────────────────────────────────────────────────────────────────
BLOB_READ_WRITE_TOKEN=
# Cloudflare R2 (free 10GB — replaces Vercel Blob when ready)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=holly-media
R2_PUBLIC_URL=

# ── Social OAuth (add when ready) ────────────────────────────────────────────
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=
GITHUB_TOKEN=
```

**Generate secure secrets:**
```bash
openssl rand -hex 32
```

### 6d. Configure Domain in Coolify
1. Service → **Domains** tab
2. Add `holly.yourdomain.com`
3. Enable **HTTPS** (Caddy handles cert automatically)
4. Set **Port**: `3000`

### 6e. Deploy
Click **Deploy**. Coolify will:
1. Clone your repo from GitHub
2. Build the Docker image (takes ~3–5 min first time)
3. Start `holly-app` (Next.js) and `holly-cron` (all 7 crons)
4. Wire up SSL and your domain via Caddy

---

## Step 7: Update Clerk Callback URLs

In your **Clerk Dashboard** → Configure → Domains:
```
https://holly.yourdomain.com
```

Update all OAuth redirect URIs (Spotify, YouTube, GitHub, etc.) to use your new domain.

---

## Cron Jobs — All 7 Running on Coolify

On Vercel Hobby you had **7 crons but only 2 ran**. On Coolify **all 7 run** via the `holly-cron` Alpine container:

| Cron | Schedule | What it does |
|------|----------|--------------|
| Architecture generation | `0 3 * * *` (3 AM) | Generates system architecture diagrams |
| Self-heal | `0 0 * * *` (midnight) | Checks and repairs broken systems |
| Evolution cycle | `0 2 * * *` (2 AM) | Processes learning → evolution proposals |
| Identity evolution | `0 4 * * *` (4 AM) | Nudges Holly's personality traits |
| Initiative | `0 9 * * *` (9 AM) | Holly proactively plans the day |
| Background learning | `0 */2 * * *` | Real web search study session every 2 hours |
| Background learning | `30 */2 * * *` | Staggered session (30 min offset) |

View cron logs in Coolify → Services → `holly-cron` → **Logs** tab.

---

## Adding Kokoro TTS (Free Self-Hosted Voice)

Instead of paying Novita.ai for GPU TTS, run Kokoro locally on your server.  
Add this to `docker-compose.yml` under `services:`:

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

Then set env var:
```
KOKORO_TTS_URL=http://kokoro-tts:8880
```

**Result:** Holly's voice synthesis runs free on your own server.

---

## Upgrading Storage to Cloudflare R2 (Replaces Vercel Blob)

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

---

## Monitoring Holly with Coolify

Coolify gives you real-time visibility into Holly's health:

- **Coolify Dashboard** → Services → `holly-app` → **Metrics** tab
  - CPU usage, RAM usage, network I/O
- **Logs** tab — real-time Next.js application logs
- **holly-cron** → Logs — see every cron job firing and HTTP response codes
- **Health checks** — Coolify monitors `/api/health` every 30 seconds

---

## Keep-Alive (Prevents Oracle Idle Reclamation)

Oracle may reclaim Always Free instances with <10% CPU for 7 days.  
Holly's crons (every 2 hours) keep it active naturally, but as extra safety:

```bash
# Run on the server — add to crontab
echo "*/30 * * * * curl -s http://localhost:3000/api/health > /dev/null 2>&1" | crontab -
```

---

## Troubleshooting

### Build fails with OOM
On Oracle free tier (24 GB RAM), OOM during build won't happen.  
For smaller servers: Coolify → Service → Settings → increase build memory limit.

### Cron jobs not firing
Check `holly-cron` logs in Coolify. The cron container waits for `holly-app` to be healthy before starting.

### App not accessible
1. Check Caddy logs in Coolify → Settings → Logs
2. Ensure ports 80/443/8000 are open in OCI Security List AND OS firewall
3. Check DNS propagation: `dig holly.yourdomain.com`

### Database connection errors
Your `DATABASE_URL` must allow connections from your server's IP.  
In Neon: Dashboard → Settings → add your server IP to the allowlist  
(or use `0.0.0.0/0` for simplicity during setup).

---

## Cost Summary After Full Migration

| Service | Before | After |
|---------|--------|-------|
| Hosting | Vercel (free, limited) | Oracle Cloud ARM (free forever) |
| Platform | Vercel | Coolify (free, self-hosted) |
| Crons | 2/7 working | ✅ All 7 working |
| Storage | Vercel Blob 512 MB | Cloudflare R2 10 GB (free) |
| Database | Neon free | Neon free (unchanged) |
| Auth | Clerk free | Clerk free (unchanged) |
| LLMs | Groq/OpenRouter free | Same (unchanged) |
| TTS | Novita.ai (paid GPU) | Self-hosted Kokoro (free) |
| **Total** | **$0 + risk of bills** | **$0 forever, no limits** |
