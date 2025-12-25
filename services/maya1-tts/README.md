# 🎙️ HOLLY TTS - Maya1 Voice Service

**Self-hosted Text-to-Speech microservice for HOLLY AI**

Powered by [Maya1](https://huggingface.co/maya-research/maya1) - the best open-source emotional voice AI.

---

## 🌟 Features

- **HOLLY's Signature Voice**: Female, 30s, American accent, confident, intelligent, warm tone
- **20+ Emotions**: `<laugh>`, `<chuckle>`, `<whisper>`, `<sigh>`, `<confident>`, etc.
- **24kHz Quality**: Professional broadcast-quality audio
- **Free & Open Source**: Apache 2.0 license, no API costs
- **Production-Ready**: FastAPI + Maya1 + SNAC codec
- **Streaming Ready**: Sub-100ms latency with vLLM (optional)

---

## 🚀 Quick Start

### **Deploy to Railway** (Recommended - Most Stable)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/iamhollywoodpro/holly-maya-tts)

**Why Railway?**
- ✅ More stable than HF Spaces (no random sleep!)
- ✅ 500 hours/month free ($5 credit)
- ✅ Auto-restarts on crash
- ✅ Real-time logs
- ✅ Takes 5 minutes

**After deploying:**
1. Get your Railway URL: `https://your-app.up.railway.app`
2. Test: `curl https://your-app.up.railway.app/health`
3. Update HOLLY frontend: Set `TTS_API_URL` in Vercel

See [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) for detailed instructions.

---

### **Local Development**

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py

# Test endpoint
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Hollywood! I am HOLLY."}' \
  --output test.wav
```

---

## 🎯 API Endpoints

### **POST /generate**
Generate speech from text (returns WAV audio)

**Request:**
```json
{
  "text": "Hello Hollywood! <chuckle> Let's build something amazing.",
  "description": "Female, 30s, American, confident, intelligent, warm",
  "temperature": 0.4,
  "top_p": 0.9
}
```

**Response:** `audio/wav` (24kHz, mono)

---

### **POST /generate/info**
Generate speech and return metadata (no audio bytes)

**Response:**
```json
{
  "success": true,
  "duration_seconds": 3.45,
  "sample_rate": 24000,
  "message": "Generated 82800 samples (3.45s)"
}
```

---

### **GET /voice/info**
Get HOLLY's voice profile

**Response:**
```json
{
  "voice_name": "HOLLY",
  "description": "Female voice in her 30s with an American accent...",
  "model": "maya-research/maya1",
  "sample_rate": 24000,
  "supported_emotions": ["laugh", "chuckle", "whisper", "confident", ...]
}
```

---

### **GET /health**
Health check for monitoring

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

## 🎤 Emotion Tags

Add inline emotions to your text:

```
"Great work, Hollywood! <chuckle> That was impressive."
"Let me whisper this secret <whisper> between us."
"I'm so excited about this! <laugh_harder>"
```

**Supported emotions:**
- `<laugh>`, `<laugh_harder>`, `<chuckle>`, `<giggle>`
- `<whisper>`, `<sigh>`, `<gasp>`
- `<angry>`, `<cry>`
- `<confident>`, `<warm>`, `<intelligent>`

See [emotions.txt](https://huggingface.co/maya-research/maya1/blob/main/emotions.txt) for full list.

---

## 🐳 Hugging Face Spaces Deployment

### **Option 1: Deploy via UI**

1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Name: `holly-tts-maya`
4. SDK: `Gradio` or `Docker`
5. Upload files from this repo
6. Wait for build (~10-15 min)
7. Get URL: `https://YOUR_USERNAME-holly-tts-maya.hf.space`

### **Option 2: Deploy via Git**

```bash
# Clone your HF Space
git clone https://huggingface.co/spaces/YOUR_USERNAME/holly-tts-maya
cd holly-tts-maya

# Copy files
cp -r /path/to/holly-maya-tts/* .

# Push to HF
git add .
git commit -m "Deploy HOLLY TTS with Maya1"
git push
```

---

## ⚙️ Environment Variables

**Optional configuration:**

- `PORT`: Server port (default: 8000)
- `WORKERS`: Number of workers (default: 1, recommended for Maya1)

---

## 📊 System Requirements

**For local deployment:**
- GPU: 16GB+ VRAM (A100, H100, RTX 4090, or equivalent)
- RAM: 32GB+ recommended
- Storage: 10GB+ for model files

**For Hugging Face Spaces:**
- Free tier includes 16GB VRAM (sufficient for Maya1)
- Automatic scaling and high availability

---

## 🔧 Integration with HOLLY Frontend

**Update Vercel environment variables:**

```bash
TTS_API_URL=https://YOUR_USERNAME-holly-tts-maya.hf.space
TTS_PROVIDER=maya1
TTS_VOICE=holly
```

**Update `tts-service.ts`:**

```typescript
async generateSpeech(text: string): Promise<AudioBuffer> {
  const response = await fetch(`${process.env.TTS_API_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  
  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`);
  }
  
  const audioData = await response.arrayBuffer();
  return await this.audioContext.decodeAudioData(audioData);
}
```

---

## 📈 Performance

- **Cold start**: ~30-60 seconds (first request)
- **Warm generation**: ~2-5 seconds per sentence
- **Audio quality**: 24kHz, professional broadcast quality
- **Model size**: ~6GB (3B parameters + SNAC codec)
- **Inference**: Single GPU, ~4GB VRAM during generation

---

## 🛠️ Troubleshooting

### **"CUDA out of memory"**
- Reduce `max_new_tokens` in `holly_voice_generator.py`
- Use `torch.float16` instead of `bfloat16`
- Ensure only 1 worker process

### **"Model download timeout"**
- Increase timeout in HF Spaces settings
- Pre-download model locally and upload

### **"Audio sounds distorted"**
- Check sample rate (must be 24000 Hz)
- Verify SNAC codec version matches Maya1
- Try lowering `temperature` parameter

---

## 📝 License

**Apache 2.0** - Fully open source, commercial use allowed.

**Model:** [maya-research/maya1](https://huggingface.co/maya-research/maya1)  
**SNAC Codec:** [hubertsiuzdak/snac_24khz](https://huggingface.co/hubertsiuzdak/snac_24khz)

---

## 🎯 Credits

**Built for:** Steve "Hollywood" Dorego  
**Developed by:** HOLLY AI (Hyper-Optimized Logic & Learning Yield)  
**Powered by:** Maya Research + Hugging Face  

---

## 🔗 Links

- **Maya1 Model**: https://huggingface.co/maya-research/maya1
- **HOLLY AI**: https://holly.nexamusicgroup.com
- **GitHub**: https://github.com/iamhollywoodpro/Holly-AI

---

**🎙️ Give HOLLY her voice. Deploy now!**
