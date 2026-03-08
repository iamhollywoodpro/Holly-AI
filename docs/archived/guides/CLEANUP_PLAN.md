# HOLLY v2.0.0 - Complete File Structure Cleanup Plan

## Issues Found:

### 1. Middleware Configuration ❌ CRITICAL
**Problem:** Middleware is redirecting ALL non-public routes to sign-in, including API routes
**Location:** `/middleware.ts` lines 11-16
**Impact:** All API calls return 307 redirects → HTML sign-in page → "Unexpected token '<'" JSON errors
**Fix:** Add `/api/*` to public routes OR make middleware skip protection for API routes that handle their own auth

### 2. Duplicate Middleware Files
**Problem:** 
- `/middleware.ts` (CORRECT - Next.js reads this)
- `/src/middleware.ts` (WRONG - ignored by Next.js but causes confusion)
**Fix:** Delete `/src/middleware.ts`

### 3. Duplicate App Directory Files
**Problem:** Both `/app/` and `/src/app/` exist with conflicting files:
- `/app/layout.tsx` vs `/src/app/layout.tsx`
- `/app/page.tsx` vs `/src/app/page.tsx`
- `/app/chat/page.tsx` vs `/src/app/chat/page.tsx`
**Impact:** Potential build conflicts and confusion
**Fix:** Delete `/src/app/` entirely (all API routes are in `/app/api/`)

### 4. Development Clerk Keys in Production
**Problem:** Using `pk_test_` and `sk_test_` keys
**Impact:** Browser warning, rate limits, not production-ready
**Fix:** Get production keys from Clerk dashboard (user needs to do this)

### 5. Old/Backup Files
**Files to check:**
- `src/components/conversation-sidebar.tsx.old`
- Any other `*.old`, `*.backup`, `*_OLD` files

## Execution Plan:

### Step 1: Fix Middleware (CRITICAL - Fixes 307 redirects)
```typescript
// Option A: Make API routes public
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',  // ← ADD THIS
  '/api/webhooks(.*)',
])

// Option B: Skip auth check for API routes (they handle it internally)
if (!isPublicRoute(request) && !request.nextUrl.pathname.startsWith('/api/')) {
  if (!userId) {
    return NextResponse.redirect(signInUrl)
  }
}
```

### Step 2: Delete Duplicate/Obsolete Files
```bash
rm -rf src/app/
rm src/middleware.ts
rm src/components/conversation-sidebar.tsx.old
```

### Step 3: Verify File Structure
```
/Holly-AI/
├── app/                    # ✅ ACTIVE (Next.js uses this)
│   ├── api/               # ✅ All API routes here
│   ├── page.tsx           # ✅ Main page
│   └── layout.tsx         # ✅ Root layout
├── src/                    # ✅ KEEP (for components/lib/utils)
│   ├── components/        # ✅ All React components
│   ├── lib/               # ✅ Utilities and helpers
│   └── NO app/ folder     # ✅ DELETED
├── middleware.ts           # ✅ ONLY ONE (in root)
└── prisma/                # ✅ Database schema
```

### Step 4: Update Production Clerk Keys (User Task)
1. Go to Clerk Dashboard → Settings → API Keys
2. Create Production instance keys
3. Replace in Vercel:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

## Priority Order:
1. 🔴 **CRITICAL:** Fix middleware (307 redirects killing all API calls)
2. 🟡 **HIGH:** Delete duplicate files (clean structure)
3. 🟢 **MEDIUM:** Production Clerk keys (user task)
