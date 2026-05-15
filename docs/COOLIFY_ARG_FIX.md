# Coolify Deployment — Final Fix Guide

## Current Status (commit 5afe55d)

✅ **FIXED**: Coolify ARG injection (330→17 ARGs) — single-stage Dockerfile
✅ **FIXED**: LIVEKIT_KEYS required variable error — changed `:?` to `:-`
✅ **FIXED**: Server OOM during build — using pre-built GHCR image
✅ **FIXED**: Deploy.yml now builds ARM64 image and pushes to GHCR

❌ **CURRENT ISSUE**: `error from registry: denied` when Coolify pulls the image

## Root Cause: GHCR Package is Private

By default, GitHub Container Registry packages are **private**. Your Coolify server
cannot pull `ghcr.io/iamhollywoodpro/holly-ai:latest` without authentication.

## Fix: Make the GHCR Package Public (2 minutes)

### Step 1: Verify the image exists

1. Go to https://github.com/iamhollywoodpro?tab=packages
2. You should see a package named `holly-ai`
3. If it's NOT there, the CD workflow hasn't run yet — see "Trigger the build" below

### Step 2: Make the package public

1. Go to https://github.com/iamhollywoodpro?tab=packages
2. Click on the **holly-ai** package
3. Click **Package settings** (on the right side)
4. Scroll down to **Danger Zone** → **Change package visibility**
5. Click **Change visibility** → select **Public**
6. Confirm the change

### Step 3: Redeploy in Coolify

1. Go to your Coolify dashboard
2. Click **Redeploy** on the holly-app service
3. Coolify should now be able to pull the image without authentication

## Trigger the Build (if image doesn't exist yet)

The CD workflow triggers automatically after CI passes on `main`. But you can also
trigger it manually:

1. Go to https://github.com/iamhollywoodpro/Holly-AI/actions/workflows/deploy.yml
2. Click **Run workflow** → **Run workflow**
3. Wait for the build to complete (~10-15 minutes for ARM64)
4. Then follow Step 2 above to make the package public

## Alternative: Keep Package Private + Add Auth to Coolify

If you want to keep the GHCR package private for security:

### Step 1: Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens?type=beta (fine-grained tokens)
2. Click **Generate new token**
3. Name it: `coolify-pull`
4. Repository access: **All repositories** (or just Holly-AI)
5. Permissions → **Packages** → **Read** access
6. Generate and copy the token

### Step 2: Log in on the server

SSH into your Oracle Cloud server:

```bash
echo "YOUR_PAT_TOKEN" | docker login ghcr.io -u iamhollywoodpro --password-stdin
```

### Step 3: Redeploy in Coolify

Coolify will now use the cached Docker login to pull the private image.

---

## How the GHCR Pipeline Works

```
Push to main
    ↓
HOLLY CI workflow (tests + type checking)
    ↓ (on success)
HOLLY CD workflow (deploy.yml)
    ↓
Build ARM64 Docker image on GitHub Actions (7GB+ RAM, no server limits)
    ↓
Push to ghcr.io/iamhollywoodpro/holly-ai:latest
    ↓
Coolify pulls the pre-built image (no build on server!)
    ↓
Holly is live 🎉
```

## Architecture: docker-compose.coolify.yml

| Service | Image | Notes |
|---------|-------|-------|
| holly-app | `ghcr.io/iamhollywoodpro/holly-ai:latest` | Pre-built, just pull & run |
| holly-cron | Built from `./docker/cron/Dockerfile.cron` | Tiny Alpine image, builds on server (no OOM risk) |
| livekit | `livekit/livekit-server:latest` | Official image, no build needed |

## Troubleshooting

### "error from registry: denied"
→ The GHCR package is private. Make it public (see Step 2 above) or add Docker auth.

### "manifest unknown"
→ The image tag doesn't exist yet. Trigger the CD workflow manually (see "Trigger the build").

### Build OOM (exit code 255)
→ This shouldn't happen anymore since we're using pre-built images. If holly-cron
   OOMs (unlikely — it's a tiny image), add swap space:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Coolify ARG injection error (proc_open / posix_spawn)
→ Resolved by using pre-built images. The `docker-compose.coolify.yml` doesn't trigger
   Coolify's ARG injection for holly-app since there's no `build:` directive.
