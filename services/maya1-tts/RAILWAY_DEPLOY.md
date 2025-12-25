# 🚂 HOLLY Maya1 TTS - Railway Deployment Guide

## Quick Deploy to Railway

### Option 1: One-Click Deploy (Easiest)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/iamhollywoodpro/holly-maya-tts)

### Option 2: Manual Deploy (Recommended for existing Railway account)

1. **Login to Railway**
   - Visit: https://railway.app
   - Login with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose: `iamhollywoodpro/holly-maya-tts`

3. **Configure Settings**
   - Railway will auto-detect Python app
   - No environment variables needed (all defaults work)
   - Port: Railway auto-assigns via `$PORT` variable

4. **Deploy**
   - Click "Deploy"
   - Wait ~3-5 minutes for build
   - Railway will provide a public URL: `https://your-app.up.railway.app`

5. **Update HOLLY Frontend**
   - Copy your Railway URL
   - Set in Vercel: `TTS_API_URL=https://your-app.up.railway.app`

---

## What Gets Deployed

- ✅ Maya1 TTS (3B parameter model)
- ✅ 20+ emotion tags support
- ✅ Voice caching system
- ✅ FastAPI server
- ✅ Health check endpoint
- ✅ Cache statistics endpoint

---

## Railway Free Tier Limits

- ✅ **500 hours/month** ($5 credit)
- ✅ **512 MB RAM** (enough for Maya1)
- ✅ **1 GB disk** (enough for model + cache)
- ✅ **No sleep** (stays awake unlike HF Spaces!)

**Note:** Maya1 model will download on first start (~600MB). This takes ~2-3 minutes.

---

## Endpoints

Once deployed, your Railway app will have:

- `GET /` - Service info
- `GET /health` - Health check (model loaded status)
- `POST /generate` - Generate TTS
  ```json
  {
    "text": "Hello Hollywood! <excited>I'm HOLLY!</excited>",
    "description": "Female voice in her 30s...",
    "temperature": 0.4,
    "top_p": 0.9
  }
  ```
- `GET /cache/stats` - Cache statistics
- `POST /cache/clear` - Clear voice cache

---

## Testing Your Deployment

```bash
# Check health
curl https://your-app.up.railway.app/health

# Generate voice (returns WAV file)
curl -X POST https://your-app.up.railway.app/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Hollywood! I am HOLLY, your AI assistant!"}' \
  --output holly_test.wav

# Check cache stats
curl https://your-app.up.railway.app/cache/stats
```

---

## Troubleshooting

### Build fails with "Out of memory"
- Railway free tier has 512MB RAM
- Maya1 needs ~400MB to load
- Solution: Upgrade to Hobby plan ($5/month) for 8GB RAM

### Model download times out
- First deployment downloads ~600MB model
- May take 5-10 minutes
- Check Railway logs: "Model loaded successfully"

### App keeps restarting
- Check Railway logs for errors
- Ensure Python 3.11 is being used
- Verify all requirements.txt packages installed

### "Model not found" error
- Hugging Face API might be rate-limiting
- Wait 5 minutes and retry
- Check Railway logs for download progress

---

## Monitoring

Railway provides:
- ✅ **Real-time logs** (see model loading, generation, errors)
- ✅ **Resource usage** (CPU, RAM, bandwidth)
- ✅ **Deployment history** (rollback if needed)
- ✅ **Auto-restart** (if app crashes)

---

## Cost Estimate

With Railway free tier ($5/month credit = 500 hours):

- **Average usage**: 100 hours/month = **FREE**
- **Heavy usage**: 500 hours/month = **FREE**
- **Over limit**: $0.01/hour = ~$7.20/month for 24/7

**Recommendation:** Start with free tier, upgrade if needed.

---

## Advantages Over HF Spaces

| Feature | Railway | HF Spaces Free |
|---------|---------|----------------|
| **Uptime** | 24/7 awake | Sleeps after 48h |
| **Restart** | Auto-restart | Manual restart |
| **Speed** | Consistent | Variable (cold start) |
| **Logs** | Real-time | Limited |
| **Custom domain** | ✅ Yes | ❌ No |
| **RAM** | 512MB-8GB | 2GB (sleeps) |

---

## Next Steps After Deployment

1. ✅ Get your Railway URL: `https://your-app.up.railway.app`
2. ✅ Test health endpoint: `/health`
3. ✅ Update Vercel env: `TTS_API_URL=https://your-app.up.railway.app`
4. ✅ Test HOLLY's voice at: `https://holly.nexamusicgroup.com`
5. ✅ Pre-cache common phrases (optional): `curl -X POST .../generate -d '{"text":"Hello Hollywood!"}'`

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- HOLLY Issues: https://github.com/iamhollywoodpro/holly-maya-tts/issues

---

**Deployed with ❤️ for HOLLY AI** 🎤
