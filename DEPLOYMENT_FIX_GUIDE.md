# DEPLOYMENT FIX GUIDE - HOLLY AI

**Status:** Ready for Deployment
**Date:** May 11, 2026
**Issue:** Build failed during npm install with exit code 255 (likely OOM)

---

## 🔧 WHAT WAS FIXED

### 1. Dockerfile Optimizations (Complete)

**Memory Usage Reduction:**
- Reduced Node.js heap size during npm install from 3GB to **1.5GB**
- Reduced npm maxsockets from default (50) to **3** (limits concurrent connections)
- Added npm fetch timeout: **180 seconds** (prevents network timeouts)
- Added npm fetch retry configuration (3 retries with exponential backoff)

**Key Changes:**
```dockerfile
# Before:
RUN npm ci --ignore-scripts

# After:
RUN npm config set maxsockets 3 && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 180000 && \
    NODE_ENV=development NODE_OPTIONS="--max-old-space-size=1536" \
    npm install --production=false --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

**Why This Helps:**
1. **1.5GB heap** vs 3GB reduces memory pressure during dependency installation
2. **3 maxsockets** limits concurrent network requests, reducing memory usage
3. **180s timeout** prevents hanging on slow npm registry responses
4. **Legacy peer deps** avoids dependency conflicts that can cause crashes

### 2. Database Schema (Already Synced)
- ✅ Goal and GoalExecution models added
- ✅ Prisma client generated
- ✅ Database schema pushed successfully

---

## 🚀 DEPLOYMENT INSTRUCTIONS (COOLIFY)

### Step 1: Update Environment Variables

In Coolify, navigate to your application → **Environment Variables** and ensure these are set:

**Required Build-Time Variables (Available at Buildtime = TRUE):**
```bash
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_PROXY_URL=https://holly.nexamusicgroup.com/api/clerk

# App Configuration
NEXT_PUBLIC_APP_URL=https://holly.nexamusicgroup.com
NEXT_PUBLIC_APP_NAME=HOLLY
NEXT_PUBLIC_APP_VERSION=2.5.0
NEXT_PUBLIC_MUSIC_STUDIO_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_ENABLE_MUSIC_GENERATION=true
NEXT_PUBLIC_ENABLE_LYRICS_AI=true
NEXT_PUBLIC_ENABLE_VIDEO_GENERATION=true
NEXT_PUBLIC_ENABLE_ARTIST_CREATION=true
NEXT_PUBLIC_ENABLE_TRUE_STREAMING=true

# Build Configuration
NODE_ENV=production  # Available at Buildtime: FALSE (Runtime only)
NEXT_TELEMETRY_DISABLED=1
DOCKER_BUILD=true
```

**Runtime Variables (Available at Buildtime = FALSE):**
```bash
# Database
DATABASE_URL=postgresql://...

# API Keys (Runtime only - NOT baked into image)
CLERK_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...

# Other secrets...
```

### Step 2: Increase Docker Resource Limits

In Coolify, navigate to your application → **Advanced Settings** and update:

```yaml
Memory Limit: 6144  # 6GB (increase from current)
CPU Limit: 2.5      # 2.5 cores (increase from current)
```

**Why:** The build process needs more memory to handle npm install without OOM kills.

### Step 3: Clear Docker Build Cache

Before redeploying, clear the build cache:

1. Go to Coolify → Your Application
2. Click **Settings** → **Danger Zone**
3. Click **Clear Build Cache**
4. Confirm

### Step 4: Redeploy

1. Go to Coolify → Your Application
2. Click **Deploy**
3. Wait for the build to complete
4. Monitor the deployment logs

---

## 📊 EXPECTED BEHAVIOR

### During Build:

**Stage 1 (deps):**
- Downloads and installs ~2-3GB of node_modules
- Should take 3-5 minutes (not 16+ minutes)
- Memory usage should stay under 4GB
- No exit code 255 errors

**Stage 2 (builder):**
- Generates Prisma client
- Rebuilds node-pty
- Builds Next.js app
- Memory usage may spike to 5-6GB (normal)
- Should take 5-8 minutes

**Stage 3 (runner):**
- Creates minimal production image
- Should take 1-2 minutes

**Total Build Time:** ~10-15 minutes (was failing before)

### After Deployment:

- ✅ Container starts successfully
- ✅ Health check passes within 3 minutes
- ✅ All API endpoints respond
- ✅ Database connections work
- ✅ Autonomous features are available

---

## 🔍 TROUBLESHOOTING

### If Build Fails Again:

**1. Check Build Logs for:**
```
# Memory error:
Error: JavaScript heap out of memory
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed

# Network error:
npm ERR! network timeout
npm ERR! fetch failed

# OOM Killer:
Container killed by OOM killer
```

**2. If Memory Error:**
- Increase `HOLLY_DOCKER_MEM` to 8192 (8GB)
- Check server has enough RAM (need at least 12GB total)

**3. If Network Error:**
- Check npm registry connectivity
- Try increasing `fetch-timeout` to 300000 (5 minutes)
- Check Coolify server internet connection

**4. If Still Failing:**
- Test build locally: `docker build -t holly-test .`
- If local build works, issue is with Coolify resources
- If local build fails, issue is with dependencies

### If Container Won't Start:

**1. Check Health Check:**
```bash
# In container logs, look for:
Health check failed: curl: (7) Failed to connect to localhost port 3000
```

**2. Check Database Connection:**
```bash
# In container logs, look for:
Can't reach database server at `ep-morning-unit...`
```

**3. Check Environment Variables:**
- Verify DATABASE_URL is correct
- Verify CLERK_SECRET_KEY is set
- Verify all API keys are present

---

## 📈 MONITORING AFTER DEPLOYMENT

### Check These Endpoints:

1. **Health Check:**
   ```bash
   curl https://holly.nexamusicgroup.com/api/health
   # Expected: {"status":"healthy","timestamp":"..."}
   ```

2. **Autonomous Stats:**
   ```bash
   curl https://holly.nexamusicgroup.com/api/autonomous/stats
   # Expected: {"totalGoals":0,"activeGoals":0,...}
   ```

3. **Status Endpoint:**
   ```bash
   curl https://holly.nexamusicgroup.com/api/status
   # Expected: {"status":"operational",...}
   ```

### Monitor in Coolify:

- **Resource Usage:** Memory should be ~1-2GB in production
- **Health Status:** Should show "Healthy" after 3 minutes
- **Logs:** No error messages after startup
- **Uptime:** Should stay at 100%

---

## 🎯 SUCCESS CRITERIA

### Deployment is Successful When:

- ✅ Build completes without errors
- ✅ Container starts and health check passes
- ✅ All API endpoints respond correctly
- ✅ Autonomous features are accessible
- ✅ No error logs in container
- ✅ Memory usage is stable (~1-2GB)
- ✅ Database migrations applied successfully

### Deployment is Failed When:

- ❌ Build exits with code 255
- ❌ Container crashes on startup
- ❌ Health check fails repeatedly
- ❌ API endpoints return 500 errors
- ❌ Database connection fails
- ❌ Memory usage exceeds limits

---

## 📞 IF DEPLOYMENT STILL FAILS

### Additional Debugging Steps:

**1. Enable Detailed Logging:**
```bash
# In Coolify, add to Runtime Environment Variables:
DEBUG=*
NODE_ENV=development  # Temporary for debugging
```

**2. Check Server Resources:**
```bash
# On Coolify server:
free -h              # Check available RAM
df -h                # Check disk space
docker stats         # Check running containers
```

**3. Check Network:**
```bash
# Test npm registry connectivity:
curl -I https://registry.npmjs.org/

# Test database connectivity:
nc -zv ep-morning-unit... 5432
```

**4. Review Previous Successful Build:**
- Check git history for last working commit
- Compare package.json with working version
- Check if any dependencies were updated recently

---

## 🚀 NEXT STEPS AFTER SUCCESSFUL DEPLOYMENT

Once deployment succeeds, proceed to:

1. **Phase 5.1.2:** Self-Directed Learning Pipeline
2. **Phase 5.1.3:** Autonomous Resource Management
3. **Phase 5.1.4:** Multi-Agent Coordination

These will bring HOLLY's scores from current 6/10 autonomy to 8/10.

---

## 📝 SUMMARY

**Changes Made:**
- ✅ Optimized Dockerfile for reduced memory usage
- ✅ Reduced npm install heap size to 1.5GB
- ✅ Added npm timeout and retry configuration
- ✅ Limited concurrent network connections
- ✅ Database schema synced (Goal, GoalExecution models)

**Actions Required:**
1. Set HOLLY_DOCKER_MEM=6144 (6GB)
2. Set HOLLY_DOCKER_CPU_QUOTA=2.5
3. Clear build cache in Coolify
4. Redeploy application

**Expected Outcome:**
- Build completes in 10-15 minutes
- No exit code 255 errors
- Container starts successfully
- All features working

**Status:** READY FOR DEPLOYMENT 🚀

---

*Last Updated: May 11, 2026*
*Document Version: 1.0*