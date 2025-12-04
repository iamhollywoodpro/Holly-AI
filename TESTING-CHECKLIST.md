# HOLLY Testing Checklist

**MANDATORY: Run this BEFORE every deployment**

## 🚨 Pre-Deployment Verification

### 1. Middleware Check
- [ ] New public pages added to `middleware.ts` public routes list
- [ ] API routes properly authenticated
- [ ] No infinite redirect loops

### 2. Authentication
- [ ] Sign-in works
- [ ] Sign-up works
- [ ] Protected routes require auth
- [ ] Public routes accessible without auth

### 3. Core Features
- [ ] Chat interface loads
- [ ] Messages send/receive
- [ ] HOLLY responds (no 500 errors)
- [ ] No blank errors in console

### 4. Tool Execution
- [ ] Image generation (try: "Generate an image of a robot")
- [ ] Code generation (try: "Generate a React button component")
- [ ] GitHub integration (if connected)

### 5. New Features (if added this deployment)
- [ ] Feature works as intended
- [ ] Feature accessible (not blocked by middleware)
- [ ] Error handling tested
- [ ] Logs are clear and helpful

### 6. System Health
- [ ] `/api/health` returns 200 OK
- [ ] `/status` page loads without auth
- [ ] No missing environment variables
- [ ] Database connection works

### 7. Error Scenarios
- [ ] Invalid input handled gracefully
- [ ] API failures don't crash HOLLY
- [ ] Error messages are user-friendly
- [ ] Errors logged for debugging

---

## 🔍 Post-Deployment Verification

After deploying to Vercel:

1. **Wait for build to complete** (~3-4 minutes)
2. **Clear browser cache** (Ctrl+Shift+R / Cmd+Shift+R)
3. **Test in production:**
   - Visit `https://holly-ai-agent.vercel.app/status`
   - Visit `https://holly-ai-agent.vercel.app/test-image-gen`
   - Chat with HOLLY
   - Try tool execution

4. **Check Vercel logs** for errors:
   - https://vercel.com/iamhollywoodpros-projects/holly-ai-agent/logs

5. **If errors occur:**
   - Screenshot the error
   - Check server logs
   - Check browser console
   - **DON'T deploy another "fix" until root cause is understood**

---

## ❌ NEVER Deploy Without:

1. Testing locally first
2. Checking middleware for new routes
3. Verifying authentication requirements
4. Testing error scenarios
5. Confirming no breaking changes

---

## 🎯 Hollywood's Rule:

**"If I can't access it or it doesn't work, then it's not fixed."**

Build it, test it, THEN deploy it.
