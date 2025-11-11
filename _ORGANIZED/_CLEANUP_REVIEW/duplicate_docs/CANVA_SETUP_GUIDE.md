# 🎨 CANVA + HOLLY INTEGRATION GUIDE

**Hollywood, you're at this page:** https://www.canva.com/developers/app/AAG3mx4ema4/version/1/code-upload

**Let me guide you through the complete setup!** 🔥

---

## 🎯 WHAT YOU'RE BUILDING

**HOLLY + Canva = Automated Design Powerhouse**

HOLLY will be able to:
- ✅ Create Instagram posts automatically
- ✅ Generate YouTube thumbnails
- ✅ Build presentations
- ✅ Design marketing materials
- ✅ Apply your brand kit
- ✅ Export to PNG/PDF/MP4
- ✅ Use your premium Canva subscription (premium templates unlocked!)

**All with simple commands like:**
```
"HOLLY, create an Instagram post for my new track"
"HOLLY, make a YouTube thumbnail with [title]"
"HOLLY, design a presentation for my pitch deck"
```

---

## 📋 STEP-BY-STEP SETUP

### **STEP 1: COMPLETE CANVA APP SETUP**

You're currently at the "Code Upload" page. **SKIP THIS PAGE** for now - we'll come back to it.

#### **Navigate to Authentication:**

1. **Look for tabs at the top of the page:**
   - Home
   - Versions
   - **Authentication** ← Click this!
   - Distribution
   - Analytics

2. **Click "Authentication" tab**

---

### **STEP 2: CONFIGURE AUTHENTICATION**

On the Authentication page:

#### **A. OAuth Settings:**

1. **Redirect URLs:**
   - Click "Add redirect URL"
   - Add: `http://localhost:3000/api/auth/canva/callback`
   - Click "Add redirect URL" again
   - Add: `https://holly-ai.vercel.app/api/auth/canva/callback` (your production URL)
   - Click **Save**

2. **Scopes (Permissions):**
   - Check these boxes:
     - ✅ `design:content:read` - Read designs
     - ✅ `design:content:write` - Create/edit designs
     - ✅ `asset:read` - Read assets (templates, images)
     - ✅ `asset:write` - Upload images
     - ✅ `folder:read` - Read folders (optional)
     - ✅ `folder:write` - Create folders (optional)
   - Click **Save**

---

### **STEP 3: GET YOUR API CREDENTIALS**

#### **A. Find Your Credentials:**

1. **Look for "App credentials" section** (usually on the left sidebar or top)
2. You should see:
   - **Client ID** (looks like: `OC-A...`)
   - **Client Secret** (looks like: `secret_...`)

3. **Copy both** - you'll need these!

#### **B. Example:**
```
Client ID: OC-AQxxx_xxxxx
Client Secret: secret_xxxxxxxxxxxxxxxxxx
```

---

### **STEP 4: ADD CREDENTIALS TO HOLLY**

#### **A. Open your `.env.local` file**

Add these lines:

```bash
# ============================================
# CANVA INTEGRATION
# ============================================
# Canva API for automated design creation
# Get credentials: https://www.canva.com/developers/apps

CANVA_CLIENT_ID=OC-AQxxx_xxxxx  # Replace with your Client ID
CANVA_CLIENT_SECRET=secret_xxxxxxxxxxxxxxxxxx  # Replace with your Client Secret
CANVA_REDIRECT_URI=http://localhost:3000/api/auth/canva/callback

# Production redirect URI (after deployment)
# CANVA_REDIRECT_URI=https://holly-ai.vercel.app/api/auth/canva/callback
```

#### **B. Replace with your actual values:**
- Copy your **Client ID** from Canva
- Copy your **Client Secret** from Canva
- Keep the redirect URI as shown

---

### **STEP 5: WHAT ABOUT "CODE UPLOAD"?**

**You can skip the "Code Upload" page!**

**Why:**
- Code Upload is for Canva Apps that run INSIDE Canva
- HOLLY is an external app that TALKS TO Canva via API
- We use OAuth authentication (what we just set up)
- No code upload needed

**If Canva asks you to upload code:**
- Just ignore it
- OAuth authentication is all we need
- HOLLY will connect via API

---

### **STEP 6: TEST THE CONNECTION**

After adding credentials to `.env.local`:

```bash
# In your HOLLY project:
npm run dev
```

Then visit: `http://localhost:3000/api/auth/canva/authorize`

**What happens:**
1. You'll be redirected to Canva
2. Canva asks: "Allow HOLLY to access your designs?"
3. Click **"Allow"**
4. You'll be redirected back to HOLLY
5. HOLLY is now connected! ✅

---

### **STEP 7: START USING HOLLY + CANVA**

Once connected, HOLLY can:

#### **A. Create Instagram Post**
```typescript
// User: "HOLLY, create an Instagram post for my new track"
HOLLY:
1. Searches your Canva templates
2. Finds best music post template
3. Adds your track artwork
4. Applies your brand colors
5. Exports PNG (1080x1080)
Result: Ready to post in 10 seconds!
```

#### **B. Create YouTube Thumbnail**
```typescript
// User: "HOLLY, make a thumbnail for 'How to Make Beats'"
HOLLY:
1. Finds high-CTR thumbnail template
2. Adds title text: "How to Make Beats"
3. Applies your brand style
4. Exports PNG (1280x720)
Result: Professional thumbnail in 10 seconds!
```

#### **C. Create Presentation**
```typescript
// User: "HOLLY, build a pitch deck for SoundStream"
HOLLY:
1. Uses professional template
2. Adds your brand kit
3. Populates slides with content
4. Exports PDF
Result: Investor-ready deck in 2 minutes!
```

---

## 🎯 CANVA APP CONFIGURATION CHECKLIST

### **✅ WHAT YOU NEED TO DO:**

- ✅ **Create Canva App** (Done - you already have one!)
- ✅ **Go to Authentication tab** (not Code Upload)
- ✅ **Add Redirect URLs:**
  - `http://localhost:3000/api/auth/canva/callback`
  - `https://holly-ai.vercel.app/api/auth/canva/callback`
- ✅ **Enable Scopes:**
  - `design:content:read`
  - `design:content:write`
  - `asset:read`
  - `asset:write`
- ✅ **Copy Client ID** (from Canva dashboard)
- ✅ **Copy Client Secret** (from Canva dashboard)
- ✅ **Add to `.env.local`** (in HOLLY project)
- ✅ **Test connection** (visit authorize URL)

### **❌ WHAT YOU DON'T NEED:**

- ❌ **Code Upload** - Skip this (we use OAuth)
- ❌ **Canva SDK** - Not needed (we use REST API)
- ❌ **App Extension** - Not needed (external app)

---

## 🔧 TROUBLESHOOTING

### **Q: "I can't find the Authentication tab"**

**A:** Try these:
1. Refresh the page
2. Look for "Settings" or "Configuration"
3. Check sidebar navigation
4. Contact Canva support if still missing

### **Q: "OAuth redirect mismatch error"**

**A:** Make sure redirect URLs EXACTLY match:
- In Canva: `http://localhost:3000/api/auth/canva/callback`
- In `.env.local`: `CANVA_REDIRECT_URI=http://localhost:3000/api/auth/canva/callback`
- No trailing slashes
- Exact protocol (http vs https)

### **Q: "Scope not enabled"**

**A:** Go back to Authentication tab and check ALL required scopes:
- `design:content:read`
- `design:content:write`
- `asset:read`
- `asset:write`

### **Q: "Do I need to publish the app?"**

**A:** Not for personal use!
- Development mode works fine
- Only publish if you want others to use it
- HOLLY just needs your authorization

---

## 📊 COST BREAKDOWN

| Service | What HOLLY Does | Cost |
|---------|----------------|------|
| **Canva API** | Connects to your account | $0 (FREE) |
| **Your Subscription** | Unlocks premium templates | $12.99/mo (you already have this) |
| **HOLLY Automation** | Creates designs automatically | $0 (included) |
| **Exports** | PNG/PDF/MP4 downloads | $0 (unlimited) |

**Total Extra Cost:** $0 (you already have Canva subscription)

---

## 🎨 WHAT HOLLY CAN CREATE

### **Social Media:**
- Instagram Posts (1080x1080)
- Instagram Stories (1080x1920)
- Twitter Posts (1200x675)
- LinkedIn Posts (1200x627)
- Facebook Posts (940x788)

### **YouTube:**
- Thumbnails (1280x720)
- Channel Art (2560x1440)
- End Screens (1920x1080)

### **Business:**
- Presentations (16:9 slides)
- Flyers (8.5x11)
- Business Cards (3.5x2)
- Brochures (tri-fold)
- Posters (various sizes)

### **Marketing:**
- Email Headers
- Ad Banners
- Infographics
- Logos (with your brand)
- Marketing Materials

**All automatically created by HOLLY using your Canva subscription!** 🔥

---

## 🚀 NEXT STEPS

### **1. Complete Canva Setup:**
- ✅ Go to Authentication tab (not Code Upload)
- ✅ Add redirect URLs
- ✅ Enable scopes
- ✅ Copy Client ID & Secret

### **2. Add to HOLLY:**
- ✅ Add credentials to `.env.local`
- ✅ Deploy updated HOLLY

### **3. Authorize:**
- ✅ Visit authorize URL
- ✅ Click "Allow" in Canva
- ✅ HOLLY is connected!

### **4. Start Creating:**
- ✅ "HOLLY, create an Instagram post..."
- ✅ "HOLLY, make a YouTube thumbnail..."
- ✅ "HOLLY, design a presentation..."

---

## 🔥 FINAL SUMMARY

**Where You Are:** Code Upload page (skip this)  
**Where You Need to Go:** Authentication tab  
**What You Need:** Client ID + Client Secret  
**Where to Add Them:** `.env.local` file  
**Cost:** $0 extra (use your existing subscription)  
**Result:** HOLLY creates designs automatically!

---

**Any questions, Hollywood?** 

Just tell me:
1. "I found the Authentication tab" (and I'll guide you through it)
2. "I have my Client ID and Secret" (and I'll help you add them)
3. "I'm stuck at [specific step]" (and I'll troubleshoot)

**Let's lock in this Canva integration!** 🎨🔥