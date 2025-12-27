# Best FREE Open-Source TTS Models for HOLLY (2026)

**Source:** BentoML "The Best Open-Source Text-to-Speech Models in 2026"  
**Date:** December 11, 2025

## Top FREE Options

### 1. **Kokoro** ⭐ BEST FOR HOLLY
- **Size:** 82M parameters (VERY LIGHTWEIGHT!)
- **Speed:** FAST - no encoder/diffusion, rapid synthesis
- **Quality:** High quality despite small size
- **License:** Apache 2.0 (fully open-source, commercial use OK)
- **Architecture:** StyleTTS2 + ISTFTNet (decoder-only)
- **Hardware:** Runs on modest hardware, even CPU
- **Perfect for:** Real-time applications, cost-sensitive deployments

**Why Best for HOLLY:**
- Smallest model (82M) = fastest generation
- High quality despite size
- Apache 2.0 license = no restrictions
- Can run on CPU efficiently
- Built for speed

---

### 2. **VibeVoice-Realtime-0.5B**
- **Size:** 500M parameters
- **Speed:** ~300ms latency (VERY FAST)
- **Quality:** Excellent
- **License:** Research-grade (check license)
- **Features:** Streaming text input, real-time narration
- **Languages:** English and Chinese only
- **Developer:** Microsoft

**Pros:**
- Extremely low latency (300ms)
- Streaming support
- Single-speaker focused

**Cons:**
- Research-grade (may have restrictions)
- English/Chinese only
- Larger than Kokoro

---

### 3. **MeloTTS**
- **Size:** Lightweight
- **Speed:** Fast
- **Quality:** Good
- **License:** Open-source
- **Developer:** MyShell.ai
- **Popularity:** One of most downloaded TTS models on HuggingFace

**Good for:**
- General purpose TTS
- Well-tested and popular
- Active community

---

### 4. **XTTS-v2** (Coqui)
- **Size:** Large
- **Speed:** SLOW (20+ seconds on RTX 3060)
- **Quality:** Excellent
- **License:** Coqui Public Model License (restrictive)
- **Features:** Voice cloning, multilingual
- **Status:** Company shut down in 2024, code still available

**Pros:**
- Best quality
- Voice cloning
- Most downloaded TTS model

**Cons:**
- TOO SLOW for real-time (20+ seconds)
- Restrictive license
- Company no longer exists
- NOT suitable for HOLLY

---

### 5. **ChatTTS**
- **Size:** Medium
- **Speed:** Good
- **Quality:** Good
- **License:** Open-source
- **Features:** Conversational TTS

---

### 6. **Chatterbox** (Resemble AI)
- **Size:** 500M parameters
- **Quality:** Wins blind tests against ElevenLabs
- **License:** Open-source
- **Features:** Voice cloning from 5 seconds

---

## RECOMMENDATION FOR HOLLY

### **KOKORO is the clear winner!** ✅

**Why:**
1. **Smallest** (82M params) = Fastest generation
2. **Apache 2.0 license** = No restrictions, commercial use OK
3. **High quality** despite small size
4. **CPU-friendly** = Can run without GPU
5. **Built for speed** = Perfect for real-time chat
6. **Fully open-source** = No vendor lock-in

**Next Steps:**
1. Install Kokoro locally
2. Test generation speed and quality
3. Create simple API wrapper
4. Integrate into HOLLY

---

## Alternative: Piper TTS

From Reddit discussions, **Piper** is also mentioned as extremely fast:
- Generates 2-3 paragraphs in seconds (vs 20 seconds for XTTS)
- Very lightweight
- Good quality
- Popular in local LLM community

Should also test Piper as backup option.

---

## Models to AVOID for HOLLY

1. **XTTS-v2** - Too slow (20+ seconds)
2. **Bark** - Too slow (60+ seconds on bytez.com)
3. **Tortoise** - Too slow, overkill for chat

---

## Implementation Plan

1. **Install Kokoro** on this sandbox
2. **Test generation** with HOLLY's voice profile
3. **Measure speed** (should be <2 seconds)
4. **Create FastAPI wrapper** 
5. **Deploy to HuggingFace Space** or **Render.com** (free tier)
6. **Integrate into HOLLY frontend**

Let's start with Kokoro!
