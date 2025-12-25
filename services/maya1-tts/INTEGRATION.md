# MAYA1 TTS Integration for HOLLY

## 🎯 Overview

MAYA1 TTS is now integrated into HOLLY-AI. This document explains how to deploy and use it.

---

## 🚀 Deployment Options

### **Option 1: Railway (Recommended - Easiest)**

**Why Railway?**
- ✅ $5 free credit/month (500 hours)
- ✅ GPU support for Maya1
- ✅ Auto-deploy from GitHub
- ✅ 24/7 uptime
- ✅ Takes 5 minutes

**Steps:**

1. **Deploy to Railway:**
   - Go to: https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select: `iamhollywoodpro/holly-maya-tts`
   - Railway will auto-detect and deploy

2. **Get your Railway URL:**
   ```
   https://holly-maya-tts-production.up.railway.app
   ```

3. **Update HOLLY environment variables:**
   
   In Vercel (or `.env.local`):
   ```bash
   NEXT_PUBLIC_TTS_API_URL=https://holly-maya-tts-production.up.railway.app
   TTS_PROVIDER=maya1
   TTS_VOICE=holly
   ```

4. **Test:**
   ```bash
   curl https://holly-maya-tts-production.up.railway.app/health
   ```

**Done!** HOLLY now has her voice.

---

### **Option 2: Hugging Face Spaces (Free GPU)**

**Steps:**

1. **Create HF Space:**
   - Go to: https://huggingface.co/spaces
   - Click "Create new Space"
   - Name: `holly-tts-maya`
   - SDK: `Docker`
   - Hardware: `CPU basic` (free) or `GPU T4` ($0.60/hr)

2. **Upload files:**
   ```bash
   cd /home/ubuntu/Holly-AI/services/maya1-tts
   
   # Clone your HF Space
   git clone https://huggingface.co/spaces/YOUR_USERNAME/holly-tts-maya
   cd holly-tts-maya
   
   # Copy files
   cp -r ../maya1-tts/* .
   
   # Push
   git add .
   git commit -m "Deploy HOLLY TTS"
   git push
   ```

3. **Get URL:**
   ```
   https://YOUR_USERNAME-holly-tts-maya.hf.space
   ```

4. **Update HOLLY:**
   ```bash
   NEXT_PUBLIC_TTS_API_URL=https://YOUR_USERNAME-holly-tts-maya.hf.space
   ```

---

### **Option 3: Oracle Cloud (When You Get It)**

**Once you get your Oracle A1 Flex instance:**

1. **SSH into instance:**
   ```bash
   ssh -i ~/.ssh/id_rsa ubuntu@<your_oracle_ip>
   ```

2. **Install dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python 3.11
   sudo apt install python3.11 python3.11-venv python3-pip -y
   
   # Install CUDA (if using GPU)
   # Follow: https://developer.nvidia.com/cuda-downloads
   ```

3. **Clone and setup:**
   ```bash
   git clone https://github.com/iamhollywoodpro/holly-maya-tts.git
   cd holly-maya-tts
   
   # Create virtual environment
   python3.11 -m venv venv
   source venv/bin/activate
   
   # Install requirements
   pip install -r requirements.txt
   ```

4. **Run as service:**
   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/holly-tts.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=HOLLY TTS Service
   After=network.target
   
   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/holly-maya-tts
   Environment="PATH=/home/ubuntu/holly-maya-tts/venv/bin"
   ExecStart=/home/ubuntu/holly-maya-tts/venv/bin/python app.py
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Enable and start:
   ```bash
   sudo systemctl enable holly-tts
   sudo systemctl start holly-tts
   sudo systemctl status holly-tts
   ```

5. **Update HOLLY:**
   ```bash
   NEXT_PUBLIC_TTS_API_URL=http://<your_oracle_ip>:8000
   ```

---

## 🎤 Usage in HOLLY Frontend

### **Basic Usage:**

```typescript
import { maya1TTS } from '@/lib/tts/maya1-service';

// Initialize on user interaction (required for audio)
maya1TTS.initAudioContext();

// Generate and play speech
await maya1TTS.speak("Hello Hollywood! Let's build something amazing.");
```

### **With Emotions:**

```typescript
import { maya1TTS, TTSEmotions } from '@/lib/tts/maya1-service';

// Add emotions to text
const text = maya1TTS.addEmotion("That's impressive!", TTSEmotions.CHUCKLE);
await maya1TTS.speak(text);

// Or inline:
await maya1TTS.speak("I'm so excited! <laugh> This is amazing!");
```

### **Advanced Usage:**

```typescript
// Generate audio buffer (don't play yet)
const audioBuffer = await maya1TTS.generateSpeech(
  "Hello Hollywood!",
  {
    temperature: 0.4,  // Lower = more consistent
    top_p: 0.9,        // Nucleus sampling
  }
);

// Play later
await maya1TTS.playAudio(audioBuffer);
```

### **Health Check:**

```typescript
// Check if TTS service is available
const health = await maya1TTS.healthCheck();
console.log(health); // { status: "healthy", model_loaded: true }
```

### **Voice Info:**

```typescript
// Get HOLLY's voice profile
const voiceInfo = await maya1TTS.getVoiceInfo();
console.log(voiceInfo.supported_emotions);
// ["laugh", "chuckle", "whisper", "confident", ...]
```

---

## 🎭 Supported Emotions

Add these tags inline to your text:

- `<laugh>` - Full laugh
- `<laugh_harder>` - Harder laugh
- `<chuckle>` - Light chuckle
- `<giggle>` - Giggle
- `<whisper>` - Whisper tone
- `<sigh>` - Sigh
- `<gasp>` - Gasp
- `<angry>` - Angry tone
- `<cry>` - Crying tone
- `<confident>` - Confident tone
- `<warm>` - Warm tone
- `<intelligent>` - Intelligent tone

**Example:**
```typescript
await maya1TTS.speak("Great work! <chuckle> I'm impressed. <confident>");
```

---

## 🔧 Environment Variables

Add to `.env.local` or Vercel:

```bash
# TTS Service URL (required)
NEXT_PUBLIC_TTS_API_URL=https://your-tts-service.com

# TTS Provider (optional, for future multi-provider support)
TTS_PROVIDER=maya1

# TTS Voice (optional)
TTS_VOICE=holly
```

---

## 📊 Performance

- **Cold start**: ~30-60 seconds (first request)
- **Warm generation**: ~2-5 seconds per sentence
- **Audio quality**: 24kHz, professional broadcast quality
- **Model size**: ~6GB (3B parameters + SNAC codec)

---

## 🛠️ Troubleshooting

### **"TTS API error: 500"**

Check TTS service logs:
```bash
# Railway: Check logs in dashboard
# Oracle: sudo journalctl -u holly-tts -f
```

### **"Audio not playing"**

Make sure audio context is initialized on user interaction:
```typescript
// Add to a button click handler
maya1TTS.initAudioContext();
```

### **"CORS error"**

Update TTS service `app.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://holly.nexamusicgroup.com"],  # Your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🎯 Next Steps

1. ✅ Deploy MAYA1 TTS to Railway (5 mins)
2. ✅ Update HOLLY environment variables
3. ✅ Test voice generation
4. ✅ Integrate into chat interface
5. ✅ Add voice button to UI

**HOLLY will have her voice! 🎙️**
