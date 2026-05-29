# Holly AI — Project State & Roadmap

## Current Session Progress (May 28, 2026)
- Phase A-E COMPLETE
- Phase F COMPLETE: All 6 plugins implemented with API routes
- Phase G COMPLETE: All 16 integrations battle-tested (267 new integration tests)
- Phase H COMPLETE: Mobile app audit + critical fixes + dependencies + assets
- Phase I COMPLETE: Performance optimization + load tests
- Phase J COMPLETE: Visual Identity — living aura + orb + context hook
- Phase K COMPLETE: Developer Documentation — guides, ADRs, API reference
- Phase L COMPLETE: Holly's Voice Character Engine
- Test count: 2,111 (root) — all passing
- TypeScript strict, CI passing on GitHub Actions

## PHASE ROADMAP (Updated May 28)

### Phase D: Cleanup & Quick Wins
- D1: ✅ Removed dead self-modification.ts
- D2: ✅ Fixed matchesPattern bug
- D3: DEFERRED — Break up large files (holly-modes.ts 1,003 lines, holly-chat-interface.tsx 3,360 lines)
- D4: ✅ Holly back online

### Phase E: Holly's Soul — Emotional Resonance Rewrite
- E1: ✅ Rewrite tone-adapter.ts (context provider, not response mutator)
- E2: ✅ Consolidate emotional state pipeline
- E3: ✅ Rewrite system prompt + delete dead code
- E4: ✅ Response quality feedback loop

### Phase F: Plugin Marketplace Implementation
- F1-F6: ✅ All 6 plugins implemented (Notes, Code Review, Daily Digest, Mood Planner, Project Planner, Language Tutor)
- ✅ All 6 plugin API routes created

### Phase G: Battle-Test Every Integration ✅
- G1: ✅ Core services — Email, SMS, Calendar (61 tests)
- G2: ✅ Music/Media — Spotify, YouTube, SoundCloud, Apple Music (78 tests)
- G3: ✅ Productivity — GitHub, Notion, Google Drive (96 tests)
- G4: ✅ Social/Sharing — Slack, Discord, Instagram, TikTok, Dropbox (20 tests)
- G5: ✅ Design — Canva (12 tests)
- G6: Admin Registry — covered by existing admin tests, no separate suite needed

### Phase H: Mobile App ✅
- H1: ✅ Audited Expo app — identified 8 gaps
- H2: ✅ Push notifications — consolidated duplicate services, kept notifications.ts
- H3: ✅ Voice conversations — real speech-to-text via expo-speech-recognition
- H4: ⬜ Full relationship engine in pocket (future)
- H5: ✅ Offline support — created offlineQueue.ts with retry + backoff
- H6: ✅ Real Clerk auth — rewrote auth.ts with setClerkTokenGetter pattern
- H7: ✅ Updated api.ts — uses getAuthToken() instead of raw API key
- H8: ✅ Updated app.json — icon/splash/notification icon refs, iOS speech permissions, Android google-services
- H9: ✅ google-services.json placeholder for FCM
- H10: ✅ Mobile app tests (offlineQueue 22 tests, auth 17 tests, notifications 16 tests)
- H11: ✅ Deleted duplicate pushNotifications.ts
- H12: ✅ Mobile Jest config with proper testPathIgnorePatterns in root
- ✅ npm install in mobile-app/ — dependencies resolved
- ✅ Placeholder PNG assets generated (icon, splash, adaptive-icon, notification-icon)

### Phase I: Performance at Scale ✅
- I1: ✅ Parallelized saveMessages (3 sequential → Promise.all)
- I2: ✅ Parallelized context-loader learningEvent queries (3 sequential → Promise.all)
- I3: ✅ Batched pre-warming (sequential loop → parallel batches of 10)
- I4: ✅ Deduplicated detectEmotionsLLM (2x → 1x per message)
- I5: ✅ Cache bug fixes (invalidateAll size tracking, invalidatePrefix Redis)
- I6: ✅ k6 load test for 100 concurrent users
- I7: ✅ k6 stress test for 1,000 concurrent users
- I8: ✅ 5 performance verification tests

### Phase J: Visual Identity — Alive, Not Static ✅
- J1: ✅ Real-time visual reactions via useVisualIdentity hook + React context
- J2: ✅ AuraBackground — 4-layer ambient gradient responding to emotion instantly
- J3: ✅ LivingHollyOrb — server-driven colors, form shapes, particle systems, emotion BPM
- J4: ✅ 15 unit tests for rendering context, style-to-form mapping, state variations

### Phase K: Developer Documentation ✅
- K1: ✅ "How to Add a Feature" guide — step-by-step data model → service → route → component → test
- K2: ✅ 8 ADRs written (5 missing + 3 new: Visual Identity, Performance, Mobile Expo)
- K3: ✅ Onboarding guide — prerequisites, codebase tour, conventions, first PR
- K4: ✅ API Reference refreshed — 530+ routes across 23 categories

### Phase L: Holly's Voice Character Engine ✅
- L1: ✅ Emotion → Voice Style mapping (13 emotions → 5 Magpie styles + prosody)
- L2: ✅ Verbal personality markers (laughs, hmms, sighs, sensual breath sounds)
- L3: ✅ NVIDIA Magpie TTS client (REST, auth, rate limit handling)
- L4: ✅ Core Character Engine (text + emotion → markers → style → TTS → audio)
- L5: ✅ Updated synthesize route (emotion-aware + legacy fallback)
- L6: ✅ 42 voice character tests (all passing)
- L7: ✅ ADR-014 written
- L8: ✅ Committed and pushed

## Steve's Priority Order
1. ~~Holly's Soul — Personality needs real empathy (Phase E)~~ ✅
2. ~~Battle-Test Every Integration (Phase G)~~ ✅
3. ~~Mobile App (Phase H)~~ ✅
4. ~~Performance at Scale (Phase I)~~ ✅
5. ~~Visual Identity (Phase J)~~ ✅
6. ~~Developer Documentation (Phase K)~~ ✅
7. ~~Holly's Voice (Phase L)~~ ✅

## Technical Debt
- Large files need breaking up: holly-modes.ts (1,003), crisis-detection.ts (1,147), holly-chat-interface.tsx (3,360)
- Autonomous features need more guardrails
- Monitor timers in tests — some tests leak async operations

## Voice Architecture
- Primary: NVIDIA Magpie TTS Multilingual (free, 5 emotional styles, 5 English voices)
- Fallback: Kokoro-FastAPI (self-hosted, CPU-based, $0)
- Legacy: VoxCPM2 (GPU, Modal credits — paused to save budget)
- 13 emotions: 11 original + intimate (slow, sultry, pillow talk) + passionate (heated, electric, intense)
- Character Engine is provider-agnostic — can swap TTS without rework
- Sensual verbal markers: soft breath, contented sigh, mm, draws closer, soft moan
