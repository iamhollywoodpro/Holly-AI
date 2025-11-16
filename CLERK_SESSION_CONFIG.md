# Clerk Session Configuration

## 🎯 Session Persistence Settings

To make users stay logged in for 30 days (unless they manually log out or are inactive for 30+ days), you need to configure session settings in Clerk Dashboard.

---

## 📋 Steps to Configure in Clerk Dashboard:

### Step 1: Go to Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Select your **HOLLY** application (the Production instance for `holly.nexamusicgroup.com`)

### Step 2: Navigate to Session Settings
1. Click **"Sessions"** in the left sidebar (under "Session management" section)
2. Or click **"Configure"** at the top → **"Sessions"**

### Step 3: Configure Session Lifetime
Set these values:

**Session token lifetime:**
- Set to: **30 days** (or 720 hours)
- This controls how long a user stays logged in

**Inactive session lifetime:**
- Set to: **30 days** (or 720 hours)
- This logs out users who haven't used the app for 30 days

**Multi-session handling:**
- Set to: **Allow multiple sessions** (recommended)
- Lets users be logged in on multiple devices

### Step 4: Configure "Remember Me"
1. In the same Sessions settings page
2. Look for **"Remember me"** option
3. Enable it and set duration to **30 days**

### Step 5: Save Settings
Click **"Save"** or **"Update"** button

---

## ✅ What This Does:

- ✅ Users stay logged in for **30 days** after last activity
- ✅ Users can close browser and come back - still logged in
- ✅ Sessions persist across devices (if multi-session enabled)
- ✅ Only logs out if:
  - User manually clicks "Sign Out"
  - User is inactive for 30+ days
  - User clears browser cookies

---

## 🔐 Security Note:

30-day sessions are secure because:
- Session tokens are still validated on every request
- Tokens are stored in secure HTTP-only cookies
- Clerk handles token rotation automatically
- User can still sign out manually anytime

---

## Alternative: Environment Variable Method

If you prefer to set this via code (not recommended, dashboard is better), you can add to Vercel environment variables:

```
CLERK_SESSION_MAX_AGE_IN_SECONDS=2592000  # 30 days in seconds
```

But the Dashboard method is preferred and more reliable.
