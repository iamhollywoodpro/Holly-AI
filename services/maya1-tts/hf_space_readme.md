---
title: HOLLY TTS Maya1
emoji: 🎙️
colorFrom: purple
colorTo: pink
sdk: docker
pinned: false
license: apache-2.0
---

# 🎙️ HOLLY TTS - Maya1 Voice Service

**Self-hosted Text-to-Speech microservice for HOLLY AI**

Powered by [Maya1](https://huggingface.co/maya-research/maya1) - the best open-source emotional voice AI.

## 🌟 Features

- **HOLLY's Signature Voice**: Female, 30s, American accent, confident, intelligent, warm tone
- **20+ Emotions**: `<laugh>`, `<chuckle>`, `<whisper>`, `<sigh>`, `<confident>`, etc.
- **24kHz Quality**: Professional broadcast-quality audio
- **Free & Open Source**: Apache 2.0 license, no API costs
- **Production-Ready**: FastAPI + Maya1 + SNAC codec

## 🎯 API Endpoints

### POST /generate
Generate speech from text (returns WAV audio)

```bash
curl -X POST https://YOUR_SPACE_URL/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Hollywood! I am HOLLY."}' \
  --output speech.wav
```

### GET /health
Health check for monitoring

### GET /voice/info
Get HOLLY's voice profile and supported emotions

## 🔗 Links

- **GitHub**: https://github.com/iamhollywoodpro/holly-maya-tts
- **HOLLY AI**: https://holly.nexamusicgroup.com
- **Maya1 Model**: https://huggingface.co/maya-research/maya1

---

**Built by HOLLY AI for Steve "Hollywood" Dorego**
