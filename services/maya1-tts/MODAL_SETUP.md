# HOLLY Maya1 TTS — Modal.com Deployment Guide

## Why Modal.com?

- ✅ **$30/month FREE compute credits** (your free tier)
- ✅ **A10G GPU (24GB VRAM)** — perfect for Maya1's 16GB requirement
- ✅ **Serverless** — GPU only runs during requests, idle = $0
- ✅ **Auto-scales** — handles bursts without configuration
- ✅ **~$0.001–0.003 per TTS request** → $30 = 10,000–30,000 free requests/month
- ✅ **Maya1 Apache 2.0** — fully commercial use, no per-second fees

---

## Quick Setup (5 minutes)

### Step 1 — Install Modal CLI

```bash
pip install modal
```

### Step 2 — Authenticate with your Modal account

```bash
modal token new
# Opens browser → log in to modal.com/apps/iamhollywoodpro/main
# Token is saved automatically
```

### Step 3 — Create a Modal Secret (optional API key protection)

In [Modal Dashboard → Secrets](https://modal.com/secrets):
1. Click **Create new secret**
2. Name it: `holly-tts-secret`
3. Add key: `HOLLY_TTS_API_KEY` = any secret string (e.g. `holly-secret-2026`)
4. This key will be required in request headers for security

### Step 4 — Deploy to Modal

```bash
cd services/maya1-tts
modal deploy modal_deploy.py
```

**First deployment takes ~5–10 minutes** (downloading Maya1 3B model).
Subsequent cold starts take ~10–20 seconds (model loads from cached volume).

### Step 5 — Endpoints (Already Deployed ✅)

HOLLY's voice is **already live**! Your endpoints:

| Endpoint | URL |
|----------|-----|
| 🎤 **Generate (TTS)** | `https://iamhollywoodpro--generate.modal.run` |
| ❤️ **Health Check** | `https://iamhollywoodpro--health.modal.run` |
| 🎵 **Voice Info** | `https://iamhollywoodpro--voices.modal.run` |
| 📊 **Dashboard** | https://modal.com/apps/iamhollywoodpro/main/deployed/holly-maya1-tts |

> **Re-deploying** only needed if you change `modal_deploy.py`.

### Step 6 — Add to Vercel Environment Variables

In your Vercel dashboard → HOLLY project → Settings → Environment Variables:

```
HOLLY_MAYA1_TTS_URL = https://iamhollywoodpro--generate.modal.run
HOLLY_TTS_API_KEY   = (your secret key from Step 3, or leave blank)
```

**That's it! HOLLY will automatically use Maya1 for all voice responses.**

---

## Testing

### Test locally (before deploy)
```bash
modal run modal_deploy.py
```

### Test the deployed endpoint
```bash
curl -X POST https://iamhollywoodpro--generate.modal.run \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Hollywood! Ready to build something amazing?"}' \
  --output holly_test.wav
```

### Test with emotions
```bash
curl -X POST https://iamhollywoodpro--generate.modal.run \
  -H "Content-Type: application/json" \
  -d '{"text": "Great news! <laugh> The feature you wanted just shipped!", "temperature": 0.4}' \
  --output holly_emotion.wav
```

### Quick health check
```bash
curl https://iamhollywoodpro--health.modal.run
# → {"status":"healthy","model":"maya-research/maya1","voice":"HOLLY"}
```

---

## API Reference

### POST /generate

Generate HOLLY's voice from text.

**Request body:**
```json
{
  "text": "Hello Hollywood! <chuckle> Ready to build?",
  "description": "Female voice in her 30s with an American accent...",
  "temperature": 0.4,
  "top_p": 0.9
}
```

**Response:** `audio/wav` binary (24kHz mono)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | required | Text to speak (max 5000 chars) |
| `description` | string | HOLLY's voice | Custom voice description |
| `temperature` | float | 0.4 | Lower = more consistent voice |
| `top_p` | float | 0.9 | Nucleus sampling threshold |

### Emotion Tags

Insert these inline in your text:

| Tag | Effect |
|-----|--------|
| `<laugh>` | Natural laugh |
| `<laugh_harder>` | Louder laugh |
| `<chuckle>` | Soft chuckle |
| `<giggle>` | Light giggle |
| `<whisper>` | Lower voice |
| `<sigh>` | Soft sigh |
| `<gasp>` | Surprised gasp |
| `<cry>` | Emotional cry |
| `<angry>` | Stern/angry tone |
| `<excited>` | Enthusiastic delivery |
| `<snort>` | Snort laugh |
| `<scream>` | Intense scream |

**Examples:**
```
"Great news! <laugh> We just shipped the feature you asked for."
"I've been thinking... <sigh> this is more complex than I expected."
"Oh my goodness <gasp> that's absolutely brilliant, Hollywood!"
"Just between us <whisper> I think this is the best code yet</whisper>."
```

---

## Cost Estimation

| Scenario | GPU Time | Cost | Monthly Free Budget |
|----------|----------|------|---------------------|
| Short reply (5s audio) | ~0.3s GPU | ~$0.00005 | ~600,000 requests |
| Medium reply (15s audio) | ~0.8s GPU | ~$0.00013 | ~230,000 requests |
| Long reply (30s audio) | ~1.5s GPU | ~$0.00025 | ~120,000 requests |

**A10G rate: ~$0.59/hr = $0.000164/sec**

Your $30/month free tier comfortably covers **tens of thousands of voice responses**.

---

## Updating the Deployment

```bash
# Redeploy after changes
modal deploy modal_deploy.py

# View logs
modal app logs holly-maya1-tts

# Check usage/cost
# → modal.com/apps/iamhollywoodpro/main → holly-maya1-tts
```

---

## Troubleshooting

**Cold start too slow?**
- First request after idle takes 10–20s (model loading)
- Keep-warm is set to 5 min idle timeout
- Consider increasing `container_idle_timeout` in `modal_deploy.py`

**Out of VRAM?**
- A10G has 24GB — should be plenty for Maya1 (needs ~16GB)
- If issues arise, switch to `gpu="A100"` in modal_deploy.py

**Audio quality issues?**
- Lower `temperature` (try 0.2–0.3) for more consistent voice
- Higher temperature adds variability but may sound less polished

**Model not found in cache?**
- The first deployment downloads the full 3B model (~6GB)
- Subsequent deploys load from the persistent Volume cache
- Check volume: `modal volume ls holly-maya1-weights`
