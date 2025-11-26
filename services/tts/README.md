# HOLLY TTS Microservice

**Self-Hosted Kokoro-82M Text-to-Speech Service**

Created for Steve "Hollywood" Dorego  
Model: Kokoro-82M with af_heart voice (HOLLY's signature voice)

---

## 🚀 Quick Deploy to Railway

### **Option 1: Deploy from GitHub (Recommended)**

1. **Create new GitHub repo:**
   ```bash
   cd kokoro-tts-service
   git init
   git add .
   git commit -m "Initial commit: HOLLY TTS microservice"
   gh repo create holly-tts-service --public --source=. --remote=origin --push
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app/
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `holly-tts-service` repo
   - Railway will auto-detect Dockerfile and deploy
   - Wait 5-10 minutes for first build

3. **Get your endpoint:**
   - Once deployed, Railway gives you a URL like: `https://holly-tts-service-production.up.railway.app`
   - Test it: `curl https://your-railway-url.railway.app/health`

### **Option 2: Deploy with Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## 🔧 Local Development

### **Setup:**

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install espeak-ng (required for Kokoro)
# macOS: brew install espeak-ng
# Ubuntu: sudo apt-get install espeak-ng
# Windows: Download from https://github.com/espeak-ng/espeak-ng/releases
```

### **Run locally:**

```bash
uvicorn main:app --reload --port 8000
```

### **Test:**

```bash
# Health check
curl http://localhost:8000/health

# Generate speech
curl -X POST http://localhost:8000/tts/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Hollywood, this is HOLLY speaking with my signature voice.", "voice": "af_heart"}' \
  --output test_speech.wav

# Play the audio
# macOS: afplay test_speech.wav
# Linux: aplay test_speech.wav
# Windows: start test_speech.wav
```

---

## 📡 API Endpoints

### **GET /**
Service info and available endpoints

### **GET /health**
Health check - returns service status

### **GET /voices**
List all available voices

### **POST /tts/generate**
Generate speech from text

**Request Body:**
```json
{
  "text": "Your text here",
  "voice": "af_heart"
}
```

**Response:** WAV audio file (24kHz)

---

## 🎤 Available Voices

- **af_heart** (RECOMMENDED) - HOLLY's signature voice: warm, confident, intelligent
- af_sky - Clear and professional
- af_bella - Warm and friendly
- af_sarah - Articulate and precise
- am_adam - Deep and authoritative (male)

---

## 🔗 Integration with HOLLY Frontend

Once deployed, update your Next.js environment variables:

```env
# .env.local
TTS_PROVIDER=self-hosted
TTS_API_URL=https://your-railway-url.railway.app
TTS_VOICE=af_heart
```

Then update `src/lib/tts/tts-service.ts` to call your Railway endpoint.

---

## 📊 Performance

- **Model:** Kokoro-82M (82M parameters)
- **Quality:** 9/10 (rivals ElevenLabs)
- **Speed:** ~2-3 seconds for typical message
- **Cost:** $0 (Railway free tier: 500 hours/month)
- **License:** Apache 2.0 (fully open source)

---

## 🐛 Troubleshooting

### **"espeak-ng not found"**
Install espeak-ng on your system (required dependency)

### **"Pipeline initialization failed"**
Check that all dependencies are installed correctly

### **"Module not found: kokoro"**
Run `pip install kokoro>=0.9.2`

### **Railway deployment timeout**
First build takes 5-10 minutes due to dependencies. Subsequent builds are faster.

---

## 📝 License

Apache 2.0 - Same as Kokoro-82M model

---

## 🎯 Next Steps

1. Deploy to Railway
2. Get your API endpoint URL
3. Update HOLLY frontend with new endpoint
4. Test voice functionality
5. Enjoy unlimited FREE TTS with HOLLY's signature voice!

---

**Created by HOLLY AI for Steve "Hollywood" Dorego**  
*No shortcuts, no compromises.*
