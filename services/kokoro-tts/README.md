# 🎙️ HOLLY Kokoro TTS Service

**Free, Apache 2.0, OpenAI-compatible TTS — zero GPU credits, zero cold starts**

Powered by [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) wrapping the [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) model.

---

## ⚡ Quick Start (2 minutes)

### Option A — CPU (any machine, no GPU required)
```bash
cd services/kokoro-tts
docker compose up -d
```

### Option B — NVIDIA GPU (~50ms vs ~300ms on CPU)
```bash
cd services/kokoro-tts
docker compose -f docker-compose.gpu.yml up -d
```

### Then add to your `.env.local`:
```env
KOKORO_TTS_URL=http://localhost:8880
KOKORO_VOICE=af_heart
```

That's it. HOLLY will use Kokoro automatically. No API keys. No credits. No cold starts.

---

## 🎭 Available Voices

| Voice ID       | Style                              |
|----------------|------------------------------------|
| `af_heart`     | Warm, natural American female ⭐ (HOLLY default) |
| `af_bella`     | Expressive, bright American female |
| `af_sky`       | Clear, professional American female |
| `af_sarah`     | Calm, measured American female     |
| `af_nicole`    | Friendly, conversational female    |
| `af_alloy`     | Neutral, clean female              |
| `af_aoede`     | Rich, storytelling female          |
| `af_kore`      | Confident, assertive female        |
| `af_river`     | Soft, gentle female                |
| `bf_emma`      | British English female             |
| `bf_isabella`  | British English, warm female       |
| `am_adam`      | American male                      |
| `bm_lewis`     | British male                       |

### 🎛️ Voice Mixing
Mix voices for a custom HOLLY sound:
```env
# 67% af_heart warmth + 33% af_bella brightness
KOKORO_VOICE=af_heart(2)+af_bella(1)
```

---

## 🔧 Environment Variables

| Variable         | Default      | Description                              |
|------------------|--------------|------------------------------------------|
| `KOKORO_TTS_URL` | (not set)    | URL where Kokoro-FastAPI is running      |
| `KOKORO_VOICE`   | `af_heart`   | Default voice ID (can mix voices)        |
| `HOLLY_TTS_API_KEY` | (optional) | Shared secret for API auth              |

---

## 📊 Performance Benchmarks

| Hardware              | First Token Latency | Real-time Factor |
|-----------------------|---------------------|------------------|
| CPU (modern laptop)   | ~300ms              | ~5–10×           |
| CPU (older i7)        | ~1–2s               | ~3–5×            |
| NVIDIA GPU (any)      | ~50ms               | ~35–100×         |
| Apple M-series (CPU)  | ~200ms              | ~8–15×           |

> HOLLY's text is pre-chunked to ~180 chars before each API call, so you hear
> the first audio within one sentence's processing time.

---

## History

Kokoro replaced the previous Maya1 TTS service (Modal GPU-based, expensive, slow cold starts).
Kokoro runs on CPU with zero cold start and supports 9 languages.

---

## 🛑 Stopping the Service

```bash
docker compose down          # Stop
docker compose down -v       # Stop + remove cached models (frees ~500MB)
```

---

## 🔍 Check It's Running

```bash
# Health check
curl http://localhost:8880/health

# List voices
curl http://localhost:8880/v1/audio/voices

# Test audio (saves to test.wav)
curl -X POST http://localhost:8880/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model":"kokoro","input":"Hello, this is HOLLY!","voice":"af_heart","response_format":"wav"}' \
  --output test.wav
```

---

## 🌐 Deploying to a Server (always-on, free options)

### Railway.app (free tier, one-click)
1. Go to [railway.com/deploy/kokoro-tts-api](https://railway.com/deploy/kokoro-tts-api)
2. Deploy the pre-built Kokoro image
3. Copy the public URL → set as `KOKORO_TTS_URL` in Vercel

### Oracle Cloud Free Tier (ARM, always-free)
- 4 ARM cores + 24GB RAM — runs Kokoro CPU mode easily
- Deploy via Docker: `docker run -d -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest`
- Set `KOKORO_TTS_URL=https://your-oracle-ip:8880` in Vercel

### Hugging Face Spaces (free T4 GPU)
- Fork [Remsky/Kokoro-TTS-Zero](https://huggingface.co/spaces/Remsky/Kokoro-TTS-Zero)
- Enable persistent storage
- Set `KOKORO_TTS_URL=https://your-space.hf.space` in Vercel

---

## 📚 Further Reading
- [Kokoro-FastAPI GitHub](https://github.com/remsky/Kokoro-FastAPI)
- [Kokoro-82M Model](https://huggingface.co/hexgrad/Kokoro-82M)

