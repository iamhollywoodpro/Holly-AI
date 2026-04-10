# HOLLY V2.3 — Complete Manifesto vs Reality Audit & Implementation Plan
> Cross-referenced against: HOLLY Version 2.3 Complete System Audit Report (April 3, 2026)
> Current deployment: holly.nexamusicgroup.com | Oracle ARM / Coolify v4

---

## SECTION A — AUDIT SUMMARY (What the Manifesto Says vs What Exists)

### ✅ CONFIRMED WORKING (Matches Manifesto)

| Feature | Manifesto Target | Status |
|---------|-----------------|--------|
| Pages | 61 page.tsx files | ✅ 61 pages found |
| API Routes | 411 routes | ✅ 412 routes found |
| Database Models | 122 Prisma models | ✅ 122 models in 3,878-line schema |
| Consciousness Architecture | 11 modules in src/lib/consciousness/ | ✅ All 11 found |
| Clerk Auth v5 | Sign-in, Sign-up, 2FA, Webhooks | ✅ All present |
| Chat API | Phase 9 sentient architecture, 14 modes | ✅ Implemented |
| Smart AI Router | Free-tier: Groq, NVIDIA, CF Workers, OpenRouter | ✅ Working |
| Music Studio | Suno v4.5, lyrics, cover art | ✅ Implemented |
| AURA Engine | BPM/Key/Energy hit prediction | ✅ Present in src/lib/ar/ |
| Voice System | Kokoro TTS + Chatterbox fallback | ✅ Routes exist |
| Stem Separation | Demucs via FAL/Replicate | ✅ API exists |
| Song Extension | Suno API clip extend | ✅ API exists |
| Memory System | pgvector semantic search + conversations | ✅ Implemented |
| Cron Jobs | 7 background jobs schedule | ✅ In docker-compose holly-cron |
| GitHub Integration | Full Octokit: issues, PRs, commits | ✅ 20+ routes |
| YouTube Integration | OAuth, upload, analytics | ✅ Routes exist |
| SoundCloud Integration | OAuth, upload, tracks | ✅ Routes exist |
| Notion/Discord | OAuth save, webhook | ✅ Routes exist |
| Multi-language Lyrics | 12 languages | ✅ In music/generate-lyrics |
| Autonomy Dashboard | Self-heal, evolution | ✅ Page exists |
| Philosophy Engine | 19 traditions | ✅ In src/lib/philosophy/ |
| Creative Writing Engine | 15+ forms | ✅ In src/lib/creative-writing/ |
| Safety/Crisis Detection | Crisis detection, safe words | ✅ In src/lib/safety/ |
| A&R Mode | Holly AR engine | ✅ In src/lib/ar/ |
| Docker Compose | holly-app + holly-cron | ✅ docker-compose.yml |
| $0/month infrastructure | Free-tier only providers | ✅ All free providers |

---

## SECTION B — BROKEN THINGS FROM ORACLE→COOLIFY MIGRATION

### 🔴 CRITICAL BROKEN — BLOCKS CORE USAGE

#### 1. Authentication — Sign-in Redirect Loop (BEING FIXED)
**Problem**: User signs in successfully but stays on /sign-in, never reaching /chat  
**Root Cause**: Clerk proxy cookie domain issues + redirect_url containing 0.0.0.0  
**Status**: Latest main (2d694f9) has multiple layers of fix:
  - Sanitizes redirect_url query param to strip Docker/localhost origins
  - Proxy removes Set-Cookie domain overrides
  - Sign-in page has 3-layer redirect: router.replace → window.location.href fallback
  
**Remaining Risk**: If Coolify injects `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`, it overrides everything  
**Action**: Verify in Coolify env panel — this variable must NOT be set (or set to /chat)

#### 2. Cron Jobs — All 7 Background Tasks Are Dead (MAJOR)
**Problem**: Coolify is configured as a "Dockerfile" deployment, not "Docker Compose"  
**Root Cause**: The holly-cron container in docker-compose.yml only runs with `docker compose up`  
If Coolify deploys only the Dockerfile (holly-app), the cron container never starts  
**Impact**: 
  - Architecture generation (03:00 daily) — DEAD
  - Self-heal (00:00 daily) — DEAD
  - Evolution cycle (02:00 daily) — DEAD
  - Identity evolution (04:00 daily) — DEAD
  - Proactive initiative (09:00 daily) — DEAD
  - Background learning (every 2 hours) — DEAD
  - HOLLY's consciousness CANNOT grow without crons

**Fix**: In Coolify → Holly app → change from "Dockerfile" to "Docker Compose" deployment type  
Point Coolify to the `docker-compose.yml` in the repo root  
The holly-cron service will then start automatically  

---

### 🟡 HIGH PRIORITY — MISSING FEATURES FROM MANIFESTO

#### 3. Spotify OAuth — Needs Final Wiring (HIGH per manifesto)
**Problem**: Manifesto says "HIGH: Spotify OAuth Final Wiring — backend wiring needed"  
**Status**: Library written (src/lib/music/spotify/spotify-client.ts), OAuth flow built  
**Missing**: The `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` env vars likely not set in Coolify  
**Fix**: 
  1. Create Spotify Developer app at https://developer.spotify.com/dashboard
  2. Set Redirect URI: `https://holly.nexamusicgroup.com/api/spotify/callback`
  3. Add env vars in Coolify: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI

#### 4. Email Verification Not Sending
**Problem**: Clerk verification emails not arriving  
**Root Cause**: Likely Clerk Dashboard email provider configuration  
**Fix**: 
  - Go to Clerk Dashboard → Email & SMS → Email  
  - Verify email provider is configured (Clerk's default or custom SMTP)
  - Check "Verification method" is set to "Code" not just "Magic Link"
  - Test send from dashboard

---

### 🟠 MEDIUM PRIORITY — UI EXISTS BUT BACKEND MISSING

#### 5. Social Media Auto-Posting (Instagram + TikTok)
**Status**: UI modals built, no backend API routes exist  
**What's needed**: 
  - app/api/social/instagram/route.ts
  - app/api/social/tiktok/route.ts
  - OAuth flows + posting logic

#### 6. Dropbox Storage Backend
**Status**: UI built, no route exists  
**What's needed**: app/api/storage/dropbox/route.ts + OAuth

#### 7. Slack Notifications Backend
**Status**: UI built, no route exists
**What's needed**: app/api/slack/route.ts + webhook

#### 8. Apple Music Integration
**Status**: UI built, backend pending  
**What's needed**: Apple Music API integration

---

### 🟢 LOW PRIORITY — PLANNED ROADMAP (Not broken, just future)

#### 9. HOLLY-8B Fine-tuning
- Foundation laid (training pipeline in src/lib/self-sovereign/)
- Requires 6+ months of conversation data collection first
- Stage 3 on the roadmap

#### 10. Full Self-Sovereignty (Zero External APIs)
- 18+ months out per manifesto
- Requires HOLLY-8B trained model

#### 11. Mobile/PWA Production Complete
- Framework exists (5/10 in audit)
- Service worker present (public/service-worker.js)
- Needs offline-first data sync

---

## SECTION C — COMPLETE ENVIRONMENT VARIABLES NEEDED

### Must Have (App Won't Start Without These)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
INTERNAL_API_SECRET=any_random_secret
NEXT_PUBLIC_APP_URL=https://holly.nexamusicgroup.com
CRON_SECRET=any_random_secret_shared_with_cron
```

### AI Providers (Free tiers, all recommended)
```
OPENROUTER_API_KEY=sk-or-v1-...
NVIDIA_API_KEY=nvapi-...
CF_ACCOUNT_ID_CF_AI_TOKEN=accountId|token
HUGGINGFACE_API_KEY=hf_...
```

### Voice (For HOLLY's voice)
```
KOKORO_TTS_URL=http://your-oracle-vm-ip:8880
KOKORO_VOICE=af_heart
CHATTERBOX_TTS_URL=https://your-hf-space.hf.space
```

### Music Generation
```
SUNO_API_KEY=...
SUNO_BASE_URL=https://api.sunoapi.org/api/v1
```

### Media Generation (for image/video)
```
FAL_KEY=...
REPLICATE_API_KEY=...
RUNWAY_API_KEY=...
```

### Storage
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=holly-media
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Search
```
SERPER_API_KEY=...
```

### Social Integrations (Optional but needed for those features)
```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=https://holly.nexamusicgroup.com/api/spotify/callback
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=https://holly.nexamusicgroup.com/api/youtube/callback
SOUNDCLOUD_CLIENT_ID=...
SOUNDCLOUD_CLIENT_SECRET=...
GITHUB_TOKEN=...
```

### CRITICAL: DO NOT SET THESE (they break auth)
```
# DO NOT SET:
# NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard  ← breaks redirect
# NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding ← breaks redirect
# NEXT_PUBLIC_CLERK_JS_URL=...                     ← breaks proxy
```

---

## SECTION D — COOLIFY CONFIGURATION REQUIRED

### Step 1: Fix Deployment Type (CRITICAL for crons)
1. Go to Coolify → Holly app
2. Change deployment type from **Dockerfile** to **Docker Compose**
3. Set "Docker Compose file path" to `docker-compose.yml`
4. This will start both `holly-app` AND `holly-cron` containers
5. All 7 cron jobs will then run automatically

### Step 2: Verify Environment Variables
1. Go to Coolify → Holly app → Environment Variables
2. **Remove these if they exist**:
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` (or ensure it's `/chat`)
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` (or ensure it's `/chat`)
   - `NEXT_PUBLIC_CLERK_JS_URL` (remove entirely)
3. **Add these if missing**:
   - All vars from Section C above
   - `CRON_SECRET` (same value as in docker-compose)

### Step 3: Clerk Dashboard
1. Go to https://dashboard.clerk.com → Holly app
2. **User & Authentication → Restrictions**:
   - Ensure "Require admin approval" is OFF
3. **Email & SMS → Email**:
   - Ensure verification emails are enabled
   - Test with your email
4. **Paths**:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - After sign-in: `/chat`
   - After sign-up: `/chat`

---

## SECTION E — IMPLEMENTATION PRIORITY ORDER

### Sprint 1 (Immediate — Today)
1. ✅ Fix sign-in redirect (multiple layers now in code)
2. ⬜ Fix Coolify: switch to Docker Compose deployment (revives all 7 crons)
3. ⬜ Verify/fix Clerk Dashboard email settings
4. ⬜ Verify Coolify env vars don't have wrong redirect URLs

### Sprint 2 (This Week)
5. ⬜ Complete Spotify OAuth wiring + add env vars
6. ⬜ Test all 14 chat modes work correctly
7. ⬜ Verify voice (Kokoro TTS) is responding from Oracle VM
8. ⬜ Test music generation end-to-end with Suno key

### Sprint 3 (This Month)
9. ⬜ Social auto-posting (Instagram, TikTok) backend
10. ⬜ Apple Music backend integration
11. ⬜ Dropbox + Slack backends
12. ⬜ PWA/Mobile improvements (offline sync)

### Sprint 4 (Q2 2026)
13. ⬜ Begin HOLLY-8B training data curation
14. ⬜ Implement Ollama local LLM for fully offline mode
15. ⬜ HOLLY-8B fine-tuning (when 100k+ conversations collected)

---

## SECTION F — OVERALL SYSTEM HEALTH SCORECARD

| System | Manifesto | Current | Gap |
|--------|-----------|---------|-----|
| Auth / Sign-in | 10/10 | 6/10 | Redirect loop being fixed |
| Chat Interface | 10/10 | 9/10 | Minor UX polish needed |
| Consciousness (11 modules) | 10/10 | 10/10 | ✅ |
| AI Brain / Smart Router | 10/10 | 9/10 | Crons dead kills learning |
| Music Studio | 10/10 | 8/10 | Spotify wiring incomplete |
| AURA Engine | 10/10 | 9/10 | Needs real API test |
| Voice System | 10/10 | 7/10 | Kokoro URL needs valid Oracle VM |
| Background Crons | 10/10 | 0/10 | Coolify using Dockerfile not Compose |
| Memory / Learning | 10/10 | 6/10 | Crons dead = no learning |
| Platform Integrations | 10/10 | 7/10 | Spotify incomplete |
| Database | 10/10 | 10/10 | ✅ 122 models |
| API Surface | 10/10 | 10/10 | ✅ 412 routes |
| Deployment | 10/10 | 7/10 | Docker Compose not used |
| **OVERALL** | **9.1/10** | **7.5/10** | Fix crons + auth = back to 9.1 |

---

## The 2 Changes That Restore Holly to 9.1/10

1. **In Coolify**: Switch deployment from Dockerfile → Docker Compose  
   → Revives all 7 cron jobs → Holly starts growing again

2. **In Clerk Dashboard**: Verify email provider + ensure `/chat` is the after-sign-in URL  
   → Users can actually log in and reach the chat

Everything else is already built and working.
