# Aura AI Worker - Railway Deployment Guide

## Quick Start

### 1. Deploy to Railway

```bash
# From the Holly-AI root directory
cd worker
railway up
```

Or use the Railway Dashboard:
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `iamhollywoodpro/Holly-AI`
5. Set root directory to `/worker`
6. Railway will auto-detect and deploy

### 2. Get Your Service URL

After deployment, Railway will provide a URL like:
```
https://aura-worker-production.up.railway.app
```

### 3. Update Holly AI Environment Variables

Add to your Vercel environment variables:
```
AURA_WORKER_URL=https://your-railway-url.up.railway.app
```

### 4. Update the Aura API

Edit `/app/api/aura-analyze/route.ts` and replace the mock analysis with:

```typescript
// Call the deployed Python worker
const response = await fetch(`${process.env.AURA_WORKER_URL}/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    audioUrl: audioUrl,
    lyrics: lyrics,
    referenceTrack: referenceTrack
  })
});

const data = await response.json();

if (!data.success) {
  throw new Error(data.error || 'Analysis failed');
}

return NextResponse.json({
  success: true,
  analysis: data.analysis
});
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "aura-ai-worker",
  "version": "2.1.0"
}
```

### Analyze Track
```bash
POST /analyze
Content-Type: application/json

{
  "audioUrl": "https://example.com/track.mp3",
  "lyrics": "optional lyrics text",
  "referenceTrack": "optional reference URL"
}
```

Response:
```json
{
  "success": true,
  "analysis": {
    "hit_factor": 78,
    "scores": {
      "audio": 82,
      "lyrics": 75,
      "brand": 78,
      "market": 76
    },
    "recommendations": [...],
    "similar_hits": [...],
    "features": {...},
    "model_version": "AURA-v2.1"
  }
}
```

## Files

- `api.py` - Flask API wrapper
- `aura_analyzer.py` - Core analysis engine
- `requirements.txt` - Python dependencies
- `Procfile` - Railway process definition
- `railway.json` - Railway configuration

## Environment Variables (Optional)

None required! The worker runs standalone.

## Monitoring

Railway provides built-in monitoring:
- Logs: View real-time logs in Railway dashboard
- Metrics: CPU, memory, network usage
- Health checks: Automatic health monitoring at `/health`

## Troubleshooting

### Build fails
- Check `requirements.txt` for version conflicts
- Ensure all dependencies are compatible with Python 3.11+

### Analysis fails
- Check audio URL is accessible
- Ensure audio format is supported (MP3, WAV, FLAC)
- Check Railway logs for detailed error messages

### Timeout errors
- Increase timeout in `railway.json` (currently 300s)
- Consider using async processing for very long tracks

## Cost

Railway free tier includes:
- 500 hours/month
- 512 MB RAM
- 1 GB disk

This is sufficient for moderate usage. Upgrade to Pro ($5/month) for:
- Unlimited hours
- 8 GB RAM
- 100 GB disk

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Get service URL
3. ✅ Update Vercel environment variables
4. ✅ Update Aura API to call worker
5. ✅ Test with real audio files
6. ✅ Monitor logs and performance

---

**Questions?** Check Railway docs: https://docs.railway.app
