# HOLLY Infrastructure Audit

**Date:** December 26, 2025  
**Purpose:** Understand what services we're using and why

---

## 🎯 **CURRENT SERVICES & PURPOSE**

### **1. Vercel (Hosting & Deployment)**
**What:** Frontend hosting and serverless functions  
**Why:** Hosts holly.nexamusicgroup.com  
**Cost:** Free tier (Hobby plan)  
**Usage:**
- Hosts Next.js application
- Serverless API routes (/api/chat, /api/conversations, etc.)
- Automatic deployments from GitHub
- Preview deployments for each commit

**Status:** ✅ Essential - This is where HOLLY lives

---

### **2. Neon (PostgreSQL Database)**
**What:** Serverless Postgres database  
**Why:** Stores all HOLLY's data  
**Cost:** Free tier (100 CU-hours/month, currently at 80%)  
**Usage:**
- User accounts (Clerk authentication)
- Conversations and messages
- File upload metadata
- User preferences
- Memory/context data

**Status:** ✅ Essential - All data storage  
**Action Needed:** Optimize connection pooling to reduce compute usage

---

### **3. Clerk (Authentication)**
**What:** User authentication and management  
**Why:** Handles user login, signup, sessions  
**Cost:** Free tier (10,000 monthly active users)  
**Usage:**
- User authentication
- Session management
- User profiles

**Status:** ✅ Essential - Security and user management

---

### **4. Groq (AI/LLM)**
**What:** Fast LLM inference API  
**Why:** Powers HOLLY's brain (llama-3.3-70b-versatile)  
**Cost:** FREE (14,400 requests/day, 6,000 tokens/minute)  
**Usage:**
- Chat responses
- HOLLY's personality
- Conversation generation

**Status:** ✅ Essential - HOLLY's intelligence

---

### **5. Vercel Blob (File Storage)**
**What:** S3-compatible object storage  
**Why:** Stores uploaded files  
**Cost:** Free tier (included with Vercel)  
**Usage:**
- File uploads from users
- Image storage
- Document storage

**Status:** ✅ Essential - File management

---

### **6. GitHub (Code Repository)**
**What:** Source code hosting  
**Why:** Version control and deployment source  
**Cost:** Free  
**Usage:**
- Code repository (Holly-AI)
- Triggers Vercel deployments
- Version history
- Collaboration

**Status:** ✅ Essential - Development workflow

---

### **7. Railway (Attempted TTS Deployment)**
**What:** Cloud hosting platform  
**Why:** Attempted to deploy MAYA1 TTS  
**Cost:** $5 credit/month free tier  
**Usage:** Currently NONE (deployment failed, no GPU available)

**Status:** ❌ Not in use - Can be removed

---

### **8. Hugging Face Spaces (TTS Deployment)**
**What:** ML model hosting  
**Why:** Deploying MAYA1 voice service  
**Cost:** Free (with GPU)  
**Usage:** Currently building (mrleaf81/holly-maya-tts)

**Status:** ⏳ Pending - Still building

---

### **9. Oracle (Unknown)**
**What:** You mentioned this - need clarification  
**Why:** ???  
**Cost:** ???  
**Usage:** ???

**Status:** ❓ Unknown - Need to investigate what this is for

---

## 🎤 **TTS (VOICE) OPTIONS FOUND**

### **Top Candidates from HuggingFace:**

1. **microsoft/VibeVoice-Realtime-0.5B** ⭐ BEST OPTION
   - 264k downloads
   - Real-time capable
   - 0.5B parameters (fast)
   - Updated 14 days ago
   - Has inference API available

2. **YatharthS/MiraTTS**
   - 2.41k downloads
   - 0.5B parameters
   - Updated 2 days ago
   - Good quality

3. **hexgrad/Kokoro-82M**
   - 3.29M downloads
   - 82M parameters (very fast!)
   - 5.47k likes
   - Popular choice

4. **coqui/XTTS-v2**
   - 6M downloads
   - Voice cloning capable
   - Well-established
   - Might be what you used before!

---

## 🎯 **RECOMMENDED TTS SOLUTION**

**Use Coqui XTTS-v2 via HuggingFace Inference API**

**Why:**
- ✅ FREE (HF Inference API)
- ✅ No deployment needed (instant)
- ✅ Voice cloning (can match HOLLY's personality)
- ✅ 6M downloads (proven, stable)
- ✅ This might be what you had before!

**Implementation:** 5-10 minutes (just API calls, no deployment)

---

## 📋 **CLEANUP RECOMMENDATIONS**

### **Remove:**
- ❌ Railway account (not being used)
- ❌ Any Oracle services if not needed

### **Optimize:**
- 🔧 Neon database connection pooling
- 🔧 Vercel environment variables cleanup
- 🔧 Remove unused API keys

### **Keep:**
- ✅ Vercel (hosting)
- ✅ Neon (database)
- ✅ Clerk (auth)
- ✅ Groq (AI)
- ✅ Vercel Blob (storage)
- ✅ GitHub (code)

---

## 🚀 **NEXT STEPS**

1. **Implement Coqui XTTS-v2 TTS** (10 min) - Better than browser voice, works NOW
2. **Complete Phases 2-4** (4-6 hours) - Memory, Polish, Files
3. **Optimize Neon** (30 min) - Reduce compute usage
4. **Audit & cleanup** (1 hour) - Remove unused services
5. **Check MAYA1 Space** (tomorrow) - See if it finished building

---

## 💰 **MONTHLY COSTS**

**Current:** $0/month (all free tiers)  
**Projected (if we hit limits):**
- Neon: $19/mo (if over 100 CU-hours)
- Vercel: $20/mo (if over bandwidth/function limits)
- **Total:** $0-39/mo depending on usage

**Recommendation:** Stay on free tiers, optimize usage
