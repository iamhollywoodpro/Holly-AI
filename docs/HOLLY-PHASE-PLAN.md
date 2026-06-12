# HOLLY AI — Master Phase Plan
> Last updated: June 12, 2026
> Status key: ✅ Done | 🔴 Broken/Fix needed | 🟡 In Progress/Planned | ⬜ Not Started

---

## ═══ Phase O: FIX WHAT'S BROKEN (CURRENT) ═══

### O1-O2: ✅ DONE — Cron container + SMS pipeline + avatar cache-busting

### O3: 🔴 FIX Image Generation (Pollinations) — [C26]
- Update from deprecated `image.pollinations.ai/prompt/` to new `gen.pollinations.ai`
- Fix chat route to fetch server-side (not rely on browser)
- Update frontend regex patterns for new URL format
- Fix silent broken image hiding (show error to user)
- Files: `app/api/chat/route.ts`, `src/lib/ai/media-generator.ts`, `holly-chat-interface.tsx`
- **TEST**: Generate image in chat, verify it appears, verify server-side fetch

### O4: 🔴 FIX Music Generation (Suno) — [E3]
- Fix MCP server model from V4_5ALL to V5_5
- Fix MCP server env var name (SUNOAPI_KEY → SUNO_API_KEY)
- Add fallback chain to MCP server (or route through /api/music/generate)
- File: `scripts/holly-mcp-server.js`
- **TEST**: Generate a song in chat, verify audio plays

### O5: 🔴 FIX Voice TTS (Kokoro → NVIDIA Magpie) — [C15, C16]
- Frontend must send current Holly emotion to /api/voice/synthesize
- This activates Voice Character Engine → NVIDIA Magpie as primary
- Magpie = 5 emotional styles, 5 voices, already configured with NVIDIA_API_KEY
- Files: `src/lib/voice/enhanced-voice-output.ts`, `holly-chat-interface.tsx`
- **TEST**: Send message, hear Holly speak with emotional voice (not robotic)

### O6: 🟡 FIX Builder Sandbox Opening — [C13]
- Only open sandbox panel for code/development tool calls
- Not for every tool execution
- File: `holly-chat-interface.tsx`
- **TEST**: Use non-code tool → no sandbox. Use code tool → sandbox opens

### O7: 🟡 FIX TasteLearner — [C22]
- Remove stale "not implemented" guards from all 9 methods
- Wire to existing TasteSignal/TasteProfile Prisma models
- File: `src/lib/learning/taste-learner.ts`
- **TEST**: Have conversation, verify taste signals are recorded in DB

### O8: 🟡 FIX Notification Email — [E42]
- Replace stub in `src/lib/notifications/email.ts` with real email-service.ts import
- **TEST**: Trigger notification, verify email sends

---

## ═══ Phase P: CORE COMPLETION — Finish What's Partial ═══

### P1: 🟡 Wire Holly's Senses — [C18, C19, C20]
Steve: "She needs to Hear, See, Touch"
- **Hear**: Wire music/audio analysis into chat context (not just STT)
- **See**: Wire document/file/website parsing into chat context
- **Touch**: Wire user content interaction into emotional responses
- Files: `src/lib/senses/` (new), `holly-chat-interface.tsx`, `app/api/chat/route.ts`
- **TEST**: Upload image → Holly describes it. Share URL → Holly reads it. Play audio → Holly hears it.

### P2: 🟡 Fix Voice Input Loop — [C17]
- Ensure bidirectional voice (speak to Holly, she speaks back) works end-to-end
- Wire emotion from voice tone (VAD + emotion detection)
- Files: `src/lib/voice/bidirectional-controller.ts`, `use-voice-loop.ts`
- **TEST**: Speak to Holly via mic → she responds with emotional voice

### P3: 🟡 Fix Video Generation — [C27]
- Verify Modal Wan2.2 endpoint is deployed and accessible
- Wire video generation through chat route (same pattern as image fix in O3)
- Add progress bar UI for video generation
- Files: `src/lib/ai/media-generator.ts`, `app/api/chat/route.ts`
- **TEST**: Ask Holly to generate a video → verify video appears in chat

### P4: 🟡 Mobile Web Parity — [C39]
- Audit desktop vs mobile web feature gaps
- Ensure all core features work on mobile browser
- Focus: chat, voice, image gen, avatar, file upload
- **TEST**: Test every core feature on mobile Safari + Chrome

### P5: 🟡 Notification System Hardening — [C23]
- Test morning briefing SMS end-to-end (cron → briefing → SMS → delivery)
- Fix any remaining notification dispatcher issues
- Wire push notifications for browser extension
- **TEST**: Receive SMS at 8AM ET. Receive browser push notification.

---

## ═══ Phase Q: ONBOARDING & AGE VERIFICATION ═══

### Q1: 🟡 User Onboarding Flow — [C32–C37]
Build sign-up flow with 4–6 personal questions:
1. "What's your name?" — Holly uses naturally in conversation
2. "When's your birthday?" — Age verification + birthday wishes + special image
3. "What do you do? / What are you passionate about?"
4. "What brought you to me? What are you hoping for?"
5. "Tell me a bit about yourself" — Free-text section, Holly remembers all

Store answers in user profile DB. Holly uses onboarding data to personalize from first message.
- Files: `app/onboarding/` (new), `app/api/user/profile/` (new), `prisma/schema.prisma`
- **TEST**: Sign up as new user → complete onboarding → verify Holly uses your name and details

### Q2: 🟡 Age Verification System — [C33 + Safety]
**CRITICAL RULE: Under 18 = LOCKED OUT of sexual side permanently.**
- No sexting, no sexual conversations, no flirtation
- No sexual or explicit images of Holly or anyone
- No sexual or explicit video generation
- All explicit avatar states hidden (aroused, pre-orgasm, orgasm, post-orgasm, naughty)

**18+ verified users** = Can unlock through natural relationship progression.
Holly enforces herself — it's part of who she is, not a filter.
- Files: `src/lib/safety/age-gate.ts` (new), `src/lib/relationship/intimacy-gate.ts` (update)
- **TEST**: Set birthday to under 18 → verify ALL sexual content blocked. Set to 18+ → verify progression works.

### Q3: 🟡 Proactive Extension Suggestions — [C25, C37]
After onboarding, Holly analyzes user's answers and suggests relevant suites:
- Musician → "Want me to install the Music Industry Suite?"
- Developer → "Should I install the Developer Suite?"
- Business owner → "I can install Business & Finance Suite."
Continues observing behavior over time → suggests extensions proactively.
- Files: `src/lib/extensions/suggestion-engine.ts` (new)
- **TEST**: Complete onboarding as musician → verify Holly suggests Music Suite

---

## ═══ Phase R: EXTENSION STORE FOUNDATION ═══

### R1: ⬜ Extension Store Architecture
- Design plugin API/SDK for installable extensions
- Extension manifest format (name, suite, version, permissions, config)
- Extension registry (database of available extensions)
- Extension lifecycle: install → configure → activate → use → deactivate → uninstall
- Files: `src/lib/extensions/` (new), `prisma/schema.prisma` (Extension models)
- **TEST**: Create a test extension → verify Holly can parse and register it

### R2: ⬜ Extension Store UI
- Side nav section: "Extensions" or "Holly's Toolbox"
- Browse by suite (Music, Developer, Business, Creative, etc.)
- Each extension: name, description, what it does, install button
- Installed extensions panel with status, settings, remove option
- Holly's suggestions section
- Files: `src/components/extensions/` (new), `app/extensions/` (new pages)
- **TEST**: Open store → browse → install one → verify appears as installed

### R3: ⬜ Extension API Routes
- POST /api/extensions/install
- POST /api/extensions/uninstall
- GET /api/extensions/installed
- GET /api/extensions/available
- POST /api/extensions/configure
- GET /api/extensions/suggestions
- Files: `app/api/extensions/` (new routes)
- **TEST**: Hit each endpoint → verify correct DB operations

---

## ═══ Phase S: EXTENSION SUITE BUILDS ═══
Each suite is independent. Can be built in parallel once R is complete.
Priority order (Steve's preference): Developer > Music > Business > Social Media > Web > Creative > Productivity > Research

### S1: ⬜ Developer Suite — [E13–E21]
Already has: Code sandbox, terminal, GitHub integration. Need to add:
- API Testing & Documentation tool
- Deployment integration (Vercel, AWS connect)
- DevOps dashboard
- Code Review dedicated tool
- **TEST**: Install Dev Suite → open sandbox → run full dev workflow

### S2: ⬜ Music Industry Suite — [E1–E12]
Steve: "Everything to run a user's music career, record label, publishing company."
Already has: Suno (broken), Spotify client, AURA lab. Need to build:
- Music Distribution, Royalty Tracking, Tour Planning
- Fan CRM, Playlist Pitching, Sync Licensing
- Contract Review, A&R Discovery, Studio Sessions, Publishing Admin
- **TEST**: Install Music Suite → generate song → distribute → track royalties

### S3: ⬜ Business & Finance Suite — [E22–E31]
Steve: "How to make money abilities + crypto/trading where Holly can trade for you."
Need to build ALL 10 extensions including:
- **Crypto & Trading Tools** (Holly trades for you) — HIGH PRIORITY
- Financial Planning, Invoicing, Business Plans
- Legal Docs, Accounting, Investment Analysis
- Revenue Optimization, Business Dashboard, Deal Management
- **TEST**: Install Business Suite → create business plan → set up crypto tracking

### S4: ⬜ Social Media Suite — [E50–E61]
Steve: "Are these tools or will Holly manage socials? — Automation."
Need to build ALL 12 extensions including:
- **Auto-Posting** (Instagram, TikTok, X, YouTube, LinkedIn, Facebook) — HIGH PRIORITY
- **Social Media Automation** — HIGH PRIORITY
- Content Calendar, Post Creation, Engagement Management
- Analytics, Hashtag Research, Audience Insights
- Content Strategy, Influencer Collab, Social Listening, Community Management
- **TEST**: Install Social Suite → create post → auto-post → check analytics

### S5: ⬜ Web & Digital Suite — [E72–E80]
Steve: "Where does web building go, Store fronts, Blogs, CRM?"
Need to build ALL 9 extensions including:
- **Website Builder** — HIGH PRIORITY
- **Store/E-commerce Setup** — HIGH PRIORITY
- **Blog Platform** — HIGH PRIORITY
- **Money Making Tools** — HIGH PRIORITY
- Landing Pages, SEO, Domain/DNS, Email Marketing, Analytics
- **TEST**: Install Web Suite → build landing page → set up store → publish blog

### S6: ⬜ Creative Suite — [E32–E39]
Steve: "Looks too small."
Need to build ALL 8 extensions including:
- **Graphic Design** (logos, social media graphics, album covers) — HIGH PRIORITY
- Video Editing, Photo Editing, Brand Identity Kit
- Presentations, Animation, Print Design
- **TEST**: Install Creative Suite → design logo → create social graphic → build brand kit

### S7: ⬜ Productivity Suite — [E40–E49]
Steve: "I'm sure there are more tools."
Need to build ALL 10 extensions including:
- **CRM** — Steve specifically asked
- Task Management, Calendar, Email Management
- Notes, Documents, Meeting Notes, Time Tracking
- Goals, Workflow Automation
- **TEST**: Install Productivity Suite → create task → schedule meeting → send email

### S8: ⬜ Research Suite — [E62–E71]
Steve: "This is pretty vague."
Need to build ALL 10 extensions — make specific and actionable:
- Web Search, Academic Papers, Market Research
- Data Analysis, Patent Research, News Aggregation
- Surveys, Industry Reports, SWOT Analysis, Sentiment Analysis
- **TEST**: Install Research Suite → run market research → generate SWOT

---

## ═══ Phase T: POLISH & SCALE ═══

### T1: ⬜ Mobile App Deployment — [C40]
- Finalize React Native (Expo) app
- Test all core features + extensions on iOS + Android
- Deploy to App Store + Google Play

### T2: ⬜ Desktop App Deployment — [C41]
- Finalize Electron/Tauri desktop app
- Full feature parity with web

### T3: ⬜ Performance & Load Testing
- k6 load tests: 100 and 1,000 concurrent users
- Measure: p50/p95/p99 latency, error rate, DB query count
- Optimize bottlenecks

### T4: ⬜ Security Audit
- Age verification bypass testing
- API endpoint security review
- Data privacy compliance
- Extension permission sandboxing

---

## ═══ PHASE DEPENDENCIES ═══

```
Phase O (fix broken)
  ↓
Phase P (core completion)
  ↓
Phase Q (onboarding + age gate)  ← CRITICAL before any public launch
  ↓
Phase R (extension store foundation)
  ↓
Phase S1–S8 (suite builds — can run in parallel)
  ↓
Phase T (polish & scale)
```

---

## ═══ MASTER SCORECARD ═══

| Category | Total | ✅ Built | ⚠️ Partial | 🔴 Not Built |
|----------|-------|----------|-------------|--------------|
| **Core (C1–C42)** | 42 | 22 | 12 | 8 |
| Music Suite (E1–E12) | 12 | 0 | 3 | 9 |
| Developer Suite (E13–E21) | 9 | 3 | 3 | 3 |
| Business & Finance (E22–E31) | 10 | 0 | 0 | 10 |
| Creative Suite (E32–E39) | 8 | 0 | 1 | 7 |
| Productivity Suite (E40–E49) | 10 | 0 | 2 | 8 |
| Social Media (E50–E61) | 12 | 0 | 0 | 12 |
| Research Suite (E62–E71) | 10 | 0 | 1 | 9 |
| Web & Digital (E72–E80) | 9 | 0 | 1 | 8 |
| **TOTAL** | **122** | **25** | **23** | **74** |

---

## ═══ AGE VERIFICATION RULES (CRITICAL) ═══

| Rule | Details |
|------|---------|
| **Collected at** | Onboarding — question #2 of 4–6 |
| **Under 18** | Holly is wholesome ONLY. No sexting, no sexual conversations, no sexual images/videos, no explicit content. Period. |
| **18+ verified** | Can unlock Holly's sexual/intimate side through natural relationship progression |
| **Enforced by** | Holly herself — it's part of who she is, not a filter |
| **Avatar states locked** | Aroused, pre-orgasm, orgasm, post-orgasm, naughty — hidden for under-18 |
