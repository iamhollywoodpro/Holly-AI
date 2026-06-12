# Holly AI — Project State & Roadmap

## Current Session Progress (June 12, 2026)
- **HOLLY FACE V3.0 COMPLETE**: 20-emotion avatar system with arousal spectrum
  - 14 core emotions + 6 new (aroused, pre-orgasm, orgasm, post-orgasm, shy, playful)
  - All 20 images generated with FLUX Klein 9B + baked face LoRA v2.0
  - Full wiring across 6 files: LivingLogo, HollyAvatar, HollyOrb, HollyStateBar, emotion-voice-map, holly-chat-interface
  - Cache-busting added (?v3) to all avatar URLs to bust browser cache
- **BODY LORA v1.0 LIVE**: Civitai published + Modal deployed + baked into Holly's FLUX endpoint
- **CRON CONTAINER FIX**: GitHub Actions now builds holly-cron image to GHCR + docker-compose uses pre-built image
  - Root cause: Coolify couldn't build cron from source. Cron container never existed. ALL scheduled tasks were broken.
- **MORNING SMS FIX**: Env vars confirmed in Coolify. SMS diagnostic endpoint created (/api/admin/sms-test). Cron image deploying.
- **AVATAR CACHE-BUSTING**: Added ?v3 query params to all 20 avatar URLs + fixed test assertions
- **CD DEPLOYING**: Both images (holly-app + holly-cron) building in CI/CD

## ⛔ CRITICAL RULE — NEVER CLAIM SOMETHING WORKS WITHOUT TESTING IT
Steve has made this absolutely clear: "We spend more time fixing what you claim is working now then actually anything else. This stops now."
- NEVER say something is "WORKING" or "LIVE" unless you have ACTUALLY TESTED IT
- Clean code does NOT mean something is functioning
- Code existing does NOT mean it works
- "Code complete" means NOTHING until it's verified in production
- ALWAYS test before claiming success
- If you haven't tested it, say "code exists but untested" — NEVER say "working"

## ACTUAL BUGS FOUND (June 12) — Things that DON'T work despite code existing:
1. **Image generation (Pollinations)** — BROKEN. Uses deprecated `image.pollinations.ai` endpoint. Chat route never fetches server-side, just sends bare URL to browser. Broken images silently hidden by onError handler.
2. **Music generation (Suno)** — BROKEN. MCP server hardcodes model `V4_5ALL` (should be `V5_5`). MCP server has NO fallback (bypasses Suno→Sonauto→ACE-Step chain). Wrong env var name.
3. **Voice TTS** — BROKEN. Frontend never sends `emotion` to synthesize endpoint. Without emotion, takes legacy path where Kokoro (robotic, no emotion support) is primary. Voice Character Engine (NVIDIA Magpie) is dead code.
4. **Builder sandbox** — Opens for EVERY tool, not just code tasks. Should only appear for code/app development.

## MULTI-PROJECT RULE — CRITICAL
- **HOLLY IS ALWAYS PRIORITY ONE**. When Steve says "let's work on Holly", switch to Holly's context immediately.
- **Two Modal accounts**: `iamhollywoodpro` (Holly ONLY) and `iamdoregosteve` (everything else)
- **NEVER deploy Sylvia/other projects on Holly's Modal account**

## LESSON LEARNED — No More Guessing
Steve has explicitly instructed: **NEVER guess or assume.** Always:
1. Read the official documentation FIRST
2. Understand the full system before making changes
3. Find ALL issues before deploying
4. Test comprehensively, not incrementally
5. Deploy ONCE with a complete fix, not multiple partial fixes
6. CHECK what exists before recommending tasks

## LESSON LEARNED — Always Push to Main
**ALWAYS push to `main` branch on GitHub.** Coolify deploys from `main`.

## LESSON LEARNED — Verify Before Recommending
Never recommend a task without first verifying it actually needs doing.

## Provider Setup (as of June 4, 2026)
- **Groq**: API key configured (GROQ_API_KEY)
- **NVIDIA NIM**: API key configured (NVIDIA_API_KEY) — 15+ models, includes Magpie TTS
- **Google Gemini**: API key configured (GOOGLE_AI_API_KEY)
- **Together AI**: API key configured (TOGETHER_API_KEY)
- **OpenRouter**: API key configured (OPENROUTER_API_KEY) — :free models only
- **Cloudflare Workers AI**: configured
- **Ollama**: configured when local
- **Arcee**: API key configured
- **Mistral AI Direct**: API key configured
- Cost guards in place for OpenRouter (only :free models) and Together AI (whitelist-only)

## Voice Architecture
- **NVIDIA Magpie TTS** — SHOULD be primary via Voice Character Engine (5 emotional styles, 5 voices). Configured but UNUSED because frontend never sends emotion.
- **Kokoro-FastAPI** — Currently primary (WRONG). CPU-based, no emotion support. Sounds robotic.
- **VoxCPM2** — Not deployed as container. No container in docker-compose.
- 20 emotions → Magpie styles + prosody via Voice Character Engine (dead code until frontend sends emotion)
- Character Engine is provider-agnostic

## Holly Anatomy System
- **Source of truth**: HOLLY_ANATOMY.md
- **Trigger words**: h0lly (face LoRA), h0lly-body (body LoRA)
- **FLUX pipeline**: HOLLY_BODY_PREFIX injected into every image prompt
- **NSFW pipeline**: HOLLY_BODY_NSFW_PREFIX auto-appended for nude content
- **Self-image**: holly-self-image.ts → bodyAwareness + promptBlock
- Steve's two approved changes: stomach = "flat with faint abs visible", labia minora = "small size"

## Holly Identity — Sovereign Intelligence (ALREADY EXISTS)
- holly-self-image.ts — full body awareness, emotional states, arousal responses
- holly-hard-rules.ts — "Sovereign Domain Intelligence (SDI), not a corporate compliance officer"
- identity-consistency.ts — personality coherence across sessions
- sovereign-growth.ts — growth/evolution system
- 20+ consciousness files — inner monologue, emotional continuity, curiosity engine, autonomous learning
- DO NOT suggest "identity rewrite" — it already exists and is comprehensive

## Modal Account Separation
- **iamhollywoodpro** — Holly ONLY. Holly FLUX endpoint, Holly LoRA volumes, Holly API.
- **iamdoregosteve** — Everything else (Sylvia, new apps, side projects).
- ALWAYS verify which profile is active before deploying

## ═══════════════════════════════════════════════════════
## COMPLETE PHASE PLAN — Holly AI Master Roadmap
## ═══════════════════════════════════════════════════════
## Format: [Status] Phase Letter — Name
## ✅ Done | 🔴 Broken/Fix needed | 🟡 In Progress/Planned | ⬜ Not Started
## ═══════════════════════════════════════════════════════

### ═══ Phase O: FIX WHAT'S BROKEN (CURRENT) ═══

#### O1-O2: ✅ DONE — Cron container + SMS pipeline + avatar cache-busting

#### O3: 🔴 FIX Image Generation (Pollinations) — [C26]
- Update from deprecated `image.pollinations.ai/prompt/` to new `gen.pollinations.ai`
- Fix chat route to fetch server-side (not rely on browser)
- Update frontend regex patterns for new URL format
- Fix silent broken image hiding (show error to user)
- Files: app/api/chat/route.ts, src/lib/ai/media-generator.ts, holly-chat-interface.tsx
- **TEST**: Generate image in chat, verify it appears, verify server-side fetch

#### O4: 🔴 FIX Music Generation (Suno) — [E3]
- Fix MCP server model from V4_5ALL to V5_5
- Fix MCP server env var name (SUNOAPI_KEY → SUNO_API_KEY)
- Add fallback chain to MCP server (or route through /api/music/generate)
- File: scripts/holly-mcp-server.js
- **TEST**: Generate a song in chat, verify audio plays

#### O5: 🔴 FIX Voice TTS (Kokoro → NVIDIA Magpie) — [C15, C16]
- Frontend must send current Holly emotion to /api/voice/synthesize
- This activates Voice Character Engine → NVIDIA Magpie as primary
- Magpie = 5 emotional styles, 5 voices, already configured with NVIDIA_API_KEY
- Files: src/lib/voice/enhanced-voice-output.ts, holly-chat-interface.tsx
- **TEST**: Send message, hear Holly speak with emotional voice (not robotic)

#### O6: 🟡 FIX Builder Sandbox Opening — [C13]
- Only open sandbox panel for code/development tool calls
- Not for every tool execution
- File: holly-chat-interface.tsx
- **TEST**: Use non-code tool → no sandbox. Use code tool → sandbox opens

#### O7: 🟡 FIX TasteLearner — [C22]
- Remove stale "not implemented" guards from all 9 methods
- Wire to existing TasteSignal/TasteProfile Prisma models
- File: src/lib/learning/taste-learner.ts
- **TEST**: Have conversation, verify taste signals are recorded in DB

#### O8: 🟡 FIX Notification Email — [E42]
- Replace stub in src/lib/notifications/email.ts with real email-service.ts import
- File: src/lib/notifications/email.ts
- **TEST**: Trigger notification, verify email sends

### ═══ Phase P: CORE COMPLETION — Finish What's Partial ═══

#### P1: 🟡 Wire Holly's Senses — [C18, C19, C20]
- **Hear**: Wire music/audio analysis into chat context (not just STT)
- **See**: Wire document/file/website parsing into chat context
- **Touch**: Wire user content interaction (file uploads, image analysis) into emotional responses
- Files: src/lib/senses/ (new), holly-chat-interface.tsx, app/api/chat/route.ts
- **TEST**: Upload image → Holly describes it. Share URL → Holly reads it. Play audio → Holly hears it.

#### P2: 🟡 Fix Voice Input Loop — [C17]
- Ensure bidirectional voice (speak to Holly, she speaks back) works end-to-end
- Wire emotion from voice tone (VAD + emotion detection)
- Files: src/lib/voice/bidirectional-controller.ts, use-voice-loop.ts
- **TEST**: Speak to Holly via mic → she responds with emotional voice

#### P3: 🟡 Fix Video Generation — [C27]
- Verify Modal Wan2.2 endpoint is deployed and accessible
- Wire video generation through chat route (same pattern as image fix in O3)
- Add progress bar UI for video generation
- Files: src/lib/ai/media-generator.ts, app/api/chat/route.ts
- **TEST**: Ask Holly to generate a video → verify video appears in chat

#### P4: 🟡 Mobile Web Parity — [C39]
- Audit desktop vs mobile web feature gaps
- Ensure all core features work on mobile browser
- Focus: chat, voice, image gen, avatar, file upload
- **TEST**: Test every core feature on mobile Safari + Chrome

#### P5: 🟡 Notification System Hardening — [C23]
- Test morning briefing SMS end-to-end (cron → briefing → SMS → delivery)
- Fix any remaining notification dispatcher issues
- Wire push notifications for browser extension
- Files: app/api/autonomy/morning-briefing/, src/lib/notifications/
- **TEST**: Receive SMS at 8AM ET. Receive browser push notification.

### ═══ Phase Q: ONBOARDING & AGE VERIFICATION ═══

#### Q1: 🟡 User Onboarding Flow — [C32–C37]
- Build sign-up flow with 4–6 personal questions:
  1. "What's your name?" — Holly uses naturally in conversation
  2. "When's your birthday?" — Age verification + birthday wishes + special image
  3. "What do you do? / What are you passionate about?"
  4. "What brought you to me? What are you hoping for?"
  5. "Tell me a bit about yourself" — Free-text section, Holly remembers all
- Store answers in user profile DB
- Holly uses onboarding data to personalize from first message
- Files: app/onboarding/ (new), app/api/user/profile/ (new), prisma/schema.prisma
- **TEST**: Sign up as new user → complete onboarding → verify Holly uses your name and details

#### Q2: 🟡 Age Verification System — [C33 + Safety]
- **Under 18 = LOCKED OUT of sexual side permanently**
  - No sexting, no sexual conversations, no flirtation
  - No sexual or explicit images of Holly or anyone
  - No sexual or explicit video generation
  - All explicit avatar states hidden (aroused, pre-orgasm, orgasm, post-orgasm, naughty)
- **18+ verified users** = Can unlock through natural relationship progression
- Holly enforces herself — it's part of who she is, not a filter
- Birthday stored securely, calculated once at signup
- Files: src/lib/safety/age-gate.ts (new), src/lib/relationship/intimacy-gate.ts (update)
- **TEST**: Set birthday to under 18 → verify ALL sexual content blocked. Set to 18+ → verify progression works.

#### Q3: 🟡 Proactive Extension Suggestions — [C25, C37]
- After onboarding, Holly analyzes user's answers
- Suggests relevant extension suites based on their interests
  - Musician → "Want me to install the Music Industry Suite?"
  - Developer → "Should I install the Developer Suite? I'll be your pair programming partner."
  - Business owner → "I can install Business & Finance Suite to help you grow."
- Continues observing behavior over time → suggests extensions proactively
- Files: src/lib/extensions/suggestion-engine.ts (new)
- **TEST**: Complete onboarding as musician → verify Holly suggests Music Suite

### ═══ Phase R: EXTENSION STORE FOUNDATION ═══

#### R1: ⬜ Extension Store Architecture
- Design plugin API/SDK for installable extensions
- Extension manifest format (name, suite, version, permissions, config)
- Extension registry (database of available extensions)
- Extension lifecycle: install → configure → activate → use → deactivate → uninstall
- Files: src/lib/extensions/ (new), prisma/schema.prisma (Extension models)
- **TEST**: Create a test extension manifest → verify Holly can parse and register it

#### R2: ⬜ Extension Store UI
- Side nav section: "Extensions" or "Holly's Toolbox"
- Browse by suite (Music, Developer, Business, Creative, etc.)
- Each extension shows: name, description, what it does, install button
- Installed extensions panel with status, settings, remove option
- Holly's suggestions section ("Based on our conversations, you might like...")
- Files: src/components/extensions/ (new), app/extensions/ (new pages)
- **TEST**: Open extension store → browse suites → install one → verify it appears as installed

#### R3: ⬜ Extension API Routes
- POST /api/extensions/install — install extension
- POST /api/extensions/uninstall — remove extension
- GET /api/extensions/installed — list user's installed extensions
- GET /api/extensions/available — browse all available extensions
- POST /api/extensions/configure — set extension-specific settings
- GET /api/extensions/suggestions — get Holly's personalized suggestions
- Files: app/api/extensions/ (new routes)
- **TEST**: Hit each endpoint → verify correct DB operations

### ═══ Phase S: EXTENSION SUITE BUILDS ═══
## Each suite is a sub-phase. Order by priority/complexity.
## Steve's priority order: Developer > Music Industry > Business > Social Media > Web & Digital > Creative > Productivity > Research

#### S1: ⬜ Developer Suite Build-Out — [E13–E21]
Already partially built (sandbox, terminal, GitHub). Extend:
- API Testing & Documentation tool [E16]
- Deployment integration (Vercel, AWS connect) [E17]
- DevOps dashboard [E19]
- Code Review dedicated tool [E21]
- **TEST**: Install Dev Suite → open code sandbox → run full dev workflow

#### S2: ⬜ Music Industry Suite Build-Out — [E1–E12]
Already partially built (Suno, Spotify client, AURA lab). Extend:
- Music Distribution integration [E1]
- Royalty Tracking [E2]
- Tour/Event Planning [E5]
- Fan Engagement & CRM [E6]
- Playlist Pitching [E7]
- Sync Licensing [E8]
- Contract & Deal Review [E9]
- A&R Discovery (wire AURA lab) [E10]
- Studio Session Management [E11]
- Music Publishing Administration [E12]
- **TEST**: Install Music Suite → generate song → distribute → track royalties

#### S3: ⬜ Business & Finance Suite Build-Out — [E22–E31]
Steve specifically requested: "how to make money abilities + crypto/trading where Holly can trade for you"
- Financial Planning & Budgeting [E22]
- Invoice & Payment Processing [E23]
- **Crypto & Trading Tools** (Holly can trade for you, portfolio tracking) [E24] — HIGH PRIORITY
- Business Plan Generator [E25]
- Legal Document Templates [E26]
- Accounting & Tax Prep [E27]
- Investment Analysis [E28]
- Revenue Optimization [E29]
- Business Metrics Dashboard [E30]
- Partnership & Deal Management [E31]
- **TEST**: Install Business Suite → create business plan → set up crypto tracking

#### S4: ⬜ Social Media Suite Build-Out — [E50–E61]
Steve specifically requested: "Social media Automation" — Holly manages accounts FOR the user
- Content Calendar & Scheduling [E50]
- Post Creation for all platforms [E51]
- **Auto-Posting** (Instagram, TikTok, X, YouTube, LinkedIn, Facebook) [E52] — HIGH PRIORITY
- **Social Media Automation** [E53] — HIGH PRIORITY
- Engagement Management (replies, DMs, comments) [E54]
- Analytics & Reporting [E55]
- Hashtag & Trend Research [E56]
- Audience Insights [E57]
- Content Strategy [E58]
- Influencer Collaboration [E59]
- Social Listening [E60]
- Community Management [E61]
- **TEST**: Install Social Suite → create post → auto-post to platform → check analytics

#### S5: ⬜ Web & Digital Suite Build-Out — [E72–E80]
Steve specifically asked: "Where does web building go, Store fronts, Blogs, CRM"
- **Website Builder** (drag-and-drop, templates) [E72] — HIGH PRIORITY
- **Store/E-commerce Setup** (product listings, payment) [E73] — HIGH PRIORITY
- **Blog Platform** (writing, SEO, publishing) [E74] — HIGH PRIORITY
- Landing Page Builder [E75]
- SEO Optimization [E76]
- Domain & DNS Management [E77]
- Email Marketing [E78]
- Web Analytics [E79]
- **Money Making Tools** (monetization strategies) [E80] — HIGH PRIORITY
- **TEST**: Install Web Suite → build a landing page → set up store → publish blog post

#### S6: ⬜ Creative Suite Build-Out — [E32–E39]
Steve said "Looks too small" — needs significant expansion
- **Graphic Design** (logos, social media graphics, album covers) [E32] — HIGH PRIORITY
- Video Editing & Production [E33]
- Photo Editing & Enhancement [E34]
- Brand Identity Kit [E35]
- Presentation Design [E36]
- Animation & Motion Graphics [E38]
- Print Design [E39]
- **TEST**: Install Creative Suite → design a logo → create social media graphic → build brand kit

#### S7: ⬜ Productivity Suite Build-Out — [E40–E49]
- Task & Project Management [E40]
- Calendar & Scheduling [E41]
- Email Management (read, draft, send) [E42]
- Note-Taking & Knowledge Base [E43]
- Document Creation & Editing [E44]
- Meeting Notes & Action Items [E45]
- Time Tracking [E46]
- Goal Setting & Accountability [E47]
- Workflow Automation [E48]
- **CRM** (Customer Relationship Management) [E49] — Steve specifically asked
- **TEST**: Install Productivity Suite → create task → schedule meeting → send email → track time

#### S8: ⬜ Research Suite Build-Out — [E62–E71]
Steve said "This is pretty vague" — make specific and actionable
- Web Search & Fact-Checking [E62] — Wire existing MCP tools
- Academic Paper Search [E63]
- Market Research & Competitive Analysis [E64]
- Data Analysis & Visualization [E65]
- Patent & IP Research [E66]
- News Aggregation & Trend Analysis [E67]
- Survey Design & Analysis [E68]
- Industry Report Generation [E69]
- SWOT Analysis [E70]
- Sentiment Analysis [E71]
- **TEST**: Install Research Suite → run market research on a topic → generate SWOT analysis

### ═══ Phase T: POLISH & SCALE ═══

#### T1: ⬜ Mobile App Deployment — [C40]
- Finalize React Native app (Expo)
- Test all core features on iOS + Android
- Add extension support to mobile
- Deploy to App Store + Google Play
- **TEST**: Install app from store → log in → use all features

#### T2: ⬜ Desktop App Deployment — [C41]
- Finalize Electron/Tauri desktop app
- All features at parity with web
- **TEST**: Install desktop app → verify full feature parity

#### T3: ⬜ Performance & Load Testing
- k6 load test: 100 concurrent users
- k6 load test: 1,000 concurrent users
- Measure: response time p50/p95/p99, error rate, DB query count
- Optimize bottlenecks found
- **TEST**: Run load tests → verify p95 < 2s at 100 users

#### T4: ⬜ Security Audit
- Age verification bypass testing
- API endpoint security review
- Data privacy compliance
- Extension permission sandboxing
- **TEST**: Try to bypass age gate → verify impossible

### ═══ PHASE DEPENDENCIES ═══
Phase O (fix broken) → Phase P (core completion) → Phase Q (onboarding) → Phase R (extension store) → Phase S (suite builds) → Phase T (polish & scale)
- S1–S8 can be built in parallel once R is complete
- Each S sub-phase is independent of others
- Q2 (age verification) is CRITICAL before any public launch

### ═══ MASTER SCORECARD ═══
| Category | Total | ✅ Built | ⚠️ Partial | 🔴 Not Built/Broken |
|----------|-------|----------|-------------|----------------------|
| Core (C1–C42) | 42 | 22 | 12 | 8 |
| Music Suite (E1–E12) | 12 | 0 | 3 | 9 |
| Developer Suite (E13–E21) | 9 | 3 | 3 | 3 |
| Business & Finance (E22–E31) | 10 | 0 | 0 | 10 |
| Creative Suite (E32–E39) | 8 | 0 | 1 | 7 |
| Productivity Suite (E40–E49) | 10 | 0 | 2 | 8 |
| Social Media (E50–E61) | 12 | 0 | 0 | 12 |
| Research Suite (E62–E71) | 10 | 0 | 1 | 9 |
| Web & Digital (E72–E80) | 9 | 0 | 1 | 8 |
| **TOTAL** | **122** | **25** | **23** | **74** |
