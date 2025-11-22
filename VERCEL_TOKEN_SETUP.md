# 🔑 Vercel Token Setup Guide

## ✅ Token Added to Local Environment

Your Vercel API token has been successfully added to `.env.local`:

```bash
VERCEL_API_TOKEN=2J6oCY1sGTAEtuJs1DuOzA8j
```

This will work for **local development and testing**.

---

## 🚀 Add Token to Vercel Production Environment

To enable the `/deploy` feature in production, you need to add this environment variable to Vercel:

### **Method 1: Vercel Dashboard (Recommended)**

1. **Go to your project settings:**
   - Visit: https://vercel.com/iamhollywoodpro/holly-ai/settings/environment-variables
   - Or: Dashboard → Select Project → Settings → Environment Variables

2. **Add new environment variable:**
   - **Key**: `VERCEL_API_TOKEN`
   - **Value**: `2J6oCY1sGTAEtuJs1DuOzA8j`
   - **Environment**: Select all (Production, Preview, Development)

3. **Save changes**

4. **Redeploy your project:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Select "Redeploy"
   - Or just push a new commit to GitHub

---

### **Method 2: Vercel CLI (Alternative)**

If you have Vercel CLI installed:

```bash
cd /home/user/Holly-AI
vercel env add VERCEL_API_TOKEN production
# Paste value: 2J6oCY1sGTAEtuJs1DuOzA8j

vercel env add VERCEL_API_TOKEN preview
# Paste value: 2J6oCY1sGTAEtuJs1DuOzA8j
```

---

## ✅ Verification

After adding the token to Vercel:

1. **Test locally first:**
   ```bash
   cd /home/user/Holly-AI
   npm run dev
   # Open http://localhost:3000
   # Try /deploy command
   ```

2. **Deploy to production:**
   ```bash
   git add .
   git commit -m "Configure Vercel token"
   git push origin main
   ```

3. **Test in production:**
   - Visit: https://holly.nexamusicgroup.com
   - Type `/deploy` in chat
   - Verify deployment triggers successfully

---

## 🔒 Security Notes

- ✅ `.env.local` is gitignored (not committed to GitHub)
- ✅ Token is only stored locally and in Vercel
- ✅ Token has proper permissions (Full Access for deployments)
- ⚠️ Never share this token publicly
- ⚠️ Regenerate token if compromised

---

## 🐛 Troubleshooting

### **Deploy command returns "Vercel API token not configured"**
- Check token is added to Vercel dashboard
- Verify spelling: `VERCEL_API_TOKEN` (exact match)
- Redeploy after adding token

### **Deploy command returns "Unauthorized"**
- Token might be invalid or expired
- Generate new token from https://vercel.com/account/tokens
- Update in both `.env.local` and Vercel dashboard

### **Local development works but production doesn't**
- Token is in `.env.local` but not in Vercel dashboard
- Follow Method 1 above to add to production

---

## 📋 Current Status

- ✅ Token generated: `2J6oCY1sGTAEtuJs1DuOzA8j`
- ✅ Added to `.env.local` (local development)
- ⏸️ **Pending**: Add to Vercel dashboard (production)

---

## 🎯 Next Steps

1. **Add token to Vercel dashboard** (5 minutes)
2. **Redeploy** (or wait for next commit)
3. **Test `/deploy` command** in production
4. **Enjoy one-click deployments!** 🚀

---

**Built by HOLLY** 🤖💜  
**For: Steve "Hollywood" Dorego**  
**Date: November 22, 2025**
