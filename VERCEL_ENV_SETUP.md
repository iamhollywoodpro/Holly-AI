# Vercel Environment Variables - Quick Setup

## 🎯 **Current Status**

Your Hugging Face credentials are stored in `.env.credentials` (local only, not committed):
- ✅ **HUGGINGFACE_API_KEY**: See `.env.credentials`
- ✅ **HUGGINGFACE_DEPLOYMENT_TOKEN**: See `.env.credentials` (HOLLY Deployment)

---

## ⚡ **Quick Add to Vercel** (If Not Already Added)

### **Step 1: Go to Vercel Dashboard**
1. Open: https://vercel.com/dashboard
2. Select: **Holly-AI** project
3. Click: **Settings** → **Environment Variables**

### **Step 2: Add HuggingFace API Key**
- **Key**: `HUGGINGFACE_API_KEY`
- **Value**: Get from `.env.credentials` file (starts with `hf_`)
- **Environments**: Select all (Production, Preview, Development)
- Click: **Save**

### **Step 3: Add HuggingFace Deployment Token** (Optional)
- **Key**: `HUGGINGFACE_DEPLOYMENT_TOKEN`
- **Value**: Get from `.env.credentials` file (starts with `hf_`)
- **Environments**: Select all
- Click: **Save**

### **Step 4: Redeploy**
- Go to: **Deployments** tab
- Click: **...** (three dots) on latest deployment
- Select: **Redeploy**
- Wait ~3-4 minutes

---

## 🎯 **What This Does**

### **With HUGGINGFACE_API_KEY**:
- ✅ Vision models get **10x higher rate limits**
- ✅ ~1000 requests/hour (instead of ~100)
- ✅ Faster model loading
- ✅ Priority access during high traffic

### **Without HUGGINGFACE_API_KEY**:
- ⚠️ Vision still works (FREE models)
- ⚠️ Lower rate limit (~100 requests/hour)
- ⚠️ Slower during peak times
- ⚠️ May hit rate limits with heavy use

---

## ✅ **Verify Setup**

After deployment, check browser console when uploading an image:

### **With API Key** (Good ✅):
```
[Vision] 🆓 Using FREE Hugging Face models
[Vision] Rate limit: ~1000 requests/hour
[Upload] ✅ Vision analysis complete
```

### **Without API Key** (Still Works ⚠️):
```
[Vision] 🆓 Using FREE Hugging Face models
[Vision] Rate limit: ~100 requests/hour
[Upload] ✅ Vision analysis complete
```

---

## 📋 **Other Environment Variables (Already Set)**

These are already configured in your Vercel project:

- ✅ `CLERK_SECRET_KEY` - Authentication
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Auth public key
- ✅ `DATABASE_URL` - Neon PostgreSQL
- ✅ `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage

**Don't touch these unless something breaks!**

---

## 🚨 **IMPORTANT: Don't Commit Credentials**

- ❌ **Never commit** `.env.credentials` to git
- ❌ **Never share** API keys in public repos
- ❌ **Never hardcode** credentials in code

✅ Always use environment variables via Vercel dashboard

---

## 📞 **Need Help?**

If vision isn't working:
1. Check Vercel logs for errors
2. Verify `HUGGINGFACE_API_KEY` is set
3. Redeploy to apply changes
4. Test with image upload

---

**Your credentials are stored in `.env.credentials` (NOT committed to git)**
