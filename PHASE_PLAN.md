# HOLLY AI — PHASE PLAN (NEXT EVOLUTION)

## VERIFIED CURRENT STATE (as of commit 97881216)

- **264,586 lines** of TypeScript across **1,216 files**
- **489 API routes**, **58 pages**, **170 Prisma models**, **343 library modules**
- **162 commits**, all 13 phases merged to main
- **17 parallel background tasks** fire on every message
- Production: holly.nexamusicgroup.com (Coolify auto-deploy)

---

## PHASES 1-13: COMPLETE AND DEPLOYED

| Phase | Name | What It Does | Status |
|-------|------|-------------|--------|
| 1 | Core Consciousness | Perception, response, memory, self-modification, content freedom, design pipeline | Merged PR #87 |
| 2 | Web Sense | Autonomous browsing, deep search, screenshots, web research | Merged PR #88 |
| 3 | Code Generation | Production code generation, review, scaffolding, deployment | Merged PR #89 |
| 4 | Taste & Judgment | Personal taste matrix, aesthetic preferences, quality assessment | Direct merged |
| 5 | Temporal Sense | Time awareness, scheduling, deadline tracking, temporal reasoning | Direct merged |
| 6 | Collaborative Sense | Multi-agent coordination, project collaboration, shared workspace | Direct merged |
| 7 | Full Project Lifecycle | Scaffold → code → deploy → monitor → iterate, 12 MCP hubs | Direct merged |
| 8 | Deep Relationship Engine | Fact/preference/goal/trait extraction, milestones, profile rebuilds | Direct merged |
| 9 | Model Waterfall Upgrade | 8 task types × 5-7 cascade fallback, all free-tier models | Direct merged |
| 10 | Proactive Intelligence | Pattern detection, insight generation, daily briefings, goal reminders | Direct merged |
| 11 | Autonomous Learning | Gap detection, learning goals, knowledge extraction, confidence scoring | Direct merged |
| 12 | Adaptive Personality | Communication style learning (formality, verbosity, humor, empathy) | Direct merged |
| 13 | Sovereign Growth | Self-assessment, growth metrics, improvement plans, daily self-review | Direct merged |

### Background Pipeline (17 tasks per message)

1. Memory extraction (Phase 1)
2. Title generation (Phase 1)
3. Exchange recording for identity/emotion/taste evolution
4. Semantic memory storage
5. Project auto-detection + auto-note
6. Training data collection
7. Adaptive personality learning (Phase 12)
8. Knowledge extraction from conversation (Phase 11)
9. Knowledge gap detection + learning goal creation (Phase 11)
10. Pattern tracking (Phase 10)
11. Proactive insight generation (Phase 10)
12. Relationship memory extraction (Phase 8)
13. Milestone detection (Phase 8)
14. Relationship context update (Phase 8)
15. Profile rebuild every 10 conversations (Phase 8)
16. Conversation self-assessment (Phase 13)
17. Emotional state detection and persistence

---

## PHASES 14-25: THE ROAD TO UNTouchable

These are the 12 remaining capabilities that take Holly from "the most advanced personal AI" to "the best AI in the world, period."

---

### PHASE 14: AUTONOMOUS STUDY LOOPS (CRON)
**Priority: CRITICAL — every other phase benefits from Holly knowing more**

The learning engine detects gaps and creates goals, but there is no cron that actually runs study sessions while users are offline. Holly needs scheduled research tasks — she studies topics she is weak in, updates her knowledge base, and has new insights ready when the user returns.

**What to build:**
- Cron endpoint (`/api/cron/study-session`) that runs on a schedule (Coolify cron or external ping)
- Study session runner that:
  1. Queries top knowledge gaps by confidence score
  2. Uses Web Sense to research the gap topic
  3. Summarizes and stores as verified knowledge
  4. Updates confidence score on the learning goal
  5. Generates proactive insights from new knowledge
- Rate limiting (max N study sessions per hour to stay within free API tiers)
- Study session logging (so users can see what Holly learned)
- Dashboard: "What Holly studied while you were away"

**Estimated effort:** 300-400 lines new code, 1 new cron route, modifications to existing learning engine

---

### PHASE 15: REAL-TIME PROACTIVE NOTIFICATIONS
**Priority: HIGH — Holly should text you first**

Phase 10 generates insights but they are pulled on chat load. Holly needs push delivery — insights, reminders, and ideas surface WITHOUT opening the chat.

**What to build:**
- WebSocket notification channel (Server-Sent Events for simplicity, or LiveKit data channel since it is already connected)
- Browser push notifications (Web Push API — service worker + VAPID keys)
- Email digest (Resend free tier — 100 emails/day): daily summary of insights, upcoming deadlines, proactive ideas
- SMS notifications (Twilio free trial or carrier email-to-SMS gateway)
- Notification preferences model (per-user: which channels, frequency, quiet hours)
- Notification queue with deduplication (do not send the same insight twice)
- `/api/notifications/preferences` route for user settings
- `/api/notifications/send` internal service for pushing to enabled channels

**Estimated effort:** 500-700 lines, 3-4 new routes, 2-3 new models, frontend notification bell

---

### PHASE 16: MEMORY PORTABILITY AND BACKUP
**Priority: HIGH — user sovereignty**

Users need to export their full Holly relationship — every memory, preference, milestone — and import it into a new instance. This is data sovereignty.

**What to build:**
- Export endpoint: `/api/data/export` — serializes all user data into a structured JSON archive
  - Conversations, messages, semantic memories, episodic memories
  - Relationship profile, milestones, context
  - Personality profile, communication style
  - Knowledge graph, learning goals, growth metrics
  - Pattern history, proactive insights
  - Preferences, settings
- Import endpoint: `/api/data/import` — validates and restores from archive
- Archive format: versioned JSON with checksum, user ID mapping for cross-instance migration
- Incremental export (only changes since last export)
- Scheduled auto-backup (weekly, stored in user's Google Drive if connected)
- GDPR-style "forget me" endpoint that wipes all user data

**Estimated effort:** 400-500 lines, 2 new routes, 1 archive utility module

---

### PHASE 17: MULTI-USER ISOLATION AND SCALING
**Priority: HIGH — needed before user growth**

The relationship engine, learning, personality, and growth systems all filter by userId already. But Holly needs true multi-tenant optimization for production scale.

**What to build:**
- Prisma connection pooling configuration (pgBouncer or Prisma built-in)
- Per-user context cache (LRU cache keyed by userId, stores relationship profile + personality + recent context)
- Profile pre-warming cron: loads top-N active users' profiles into cache before predicted active hours
- Rate limiting per user (API quota tracking)
- Multi-tenant query audit: verify every database query includes userId filter
- Performance monitoring: per-user response time tracking
- Database indexing optimization (compound indexes on userId + common query patterns)

**Estimated effort:** 300-400 lines of new infrastructure, configuration changes, indexing migration

---

### PHASE 18: VOICE PERSONALITY INTEGRATION
**Priority: MEDIUM — high impact for voice users**

The voice pipeline exists (LiveKit, TTS) but does not use Phase 12's adaptive personality. Holly's voice should adapt the same way her text does.

**What to build:**
- Personality-to-TTS parameter mapping:
  - Formality → pitch stability, articulation precision
  - Speed preference → speech rate
  - Empathy → warmth/prosody parameters
  - Emotional state → pitch range, energy
- Modified TTS route that reads personality profile before generating audio
- Voice adaptation that evolves over time (learns what voice settings the user responds well to)
- Voice feedback loop: track when users continue voice conversations vs. switch to text
- Personality-aware voice greetings (different tone for first conversation of the day vs. quick check-in)

**Estimated effort:** 200-300 lines, modifications to existing TTS pipeline and LiveKit integration

---

### PHASE 19: CONVERSATION CONTINUITY ACROSS DEVICES
**Priority: MEDIUM — seamless experience**

If a user starts on phone and continues on desktop, Holly should seamlessly continue the context. The backend already persists — this is about frontend session resumption.

**What to build:**
- Active session tracking (which device/conversation is currently active)
- Conversation handoff protocol: when a new device connects, load last N messages + current context state
- Cross-device notification: "You have an active conversation on another device"
- Conversation state sync: emotional context, current topics, detected mode carry over
- Device-aware response adaptation (shorter responses on mobile, fuller on desktop)
- Session recovery: if a device disconnects mid-conversation, resume exactly where left off

**Estimated effort:** 250-350 lines, modifications to chat API and frontend, new session model

---

### PHASE 20: ADVANCED REASONING CHAINS
**Priority: MEDIUM — visible thinking for complex tasks**

For complex tasks, Holly should plan multi-step reasoning chains visible to the user as a live thinking process.

**What to build:**
- New message type: "thinking" (streaming steps visible in UI)
- Reasoning chain orchestrator:
  1. Problem decomposition (break task into sub-problems)
  2. Sequential sub-problem solving
  3. Intermediate result validation
  4. Synthesis into final answer
- Chain-of-thought streaming: each reasoning step streams to the UI as it happens
- User can interrupt, redirect, or ask for clarification mid-chain
- Reasoning depth control: quick mode (skip chains) vs. deep mode (full chains)
- Chain history: store reasoning chains for learning and self-improvement

**Estimated effort:** 600-800 lines, new reasoning module, modifications to chat streaming, frontend thinking UI

---

### PHASE 21: ONBOARDING THAT COMPOUNDS
**Priority: MEDIUM — first impression is everything**

The onboarding flow needs to be a structured relationship-building process — not a form, but a conversation where Holly starts learning immediately.

**What to build:**
- Conversational onboarding flow:
  1. "What should I call you?" → name, communication preference
  2. "What do you care about most right now?" → goals, priorities
  3. "How do you like to work?" → work style, personality calibration
  4. "What are you building?" → project detection, domain knowledge priming
  5. "Tell me something random about yourself" → relationship building
- Every answer immediately feeds: relationship engine, personality engine, learning engine, proactive system
- Adaptive onboarding: skips questions if answers are detectable from context
- Onboarding completion triggers: first proactive insight, first learning goal, initial personality profile
- "Re-onboarding" option: user can recalibrate Holly's understanding at any time

**Estimated effort:** 400-500 lines, new onboarding route, 5-6 onboarding prompts, frontend onboarding flow

---

### PHASE 22: PLUGIN/EXTENSION SYSTEM
**Priority: MEDIUM — infinite extensibility**

Holly has 12 MCP hubs but no public plugin API. Users and developers should be able to add capabilities.

**What to build:**
- Plugin API:
  - Plugin registration endpoint (`/api/plugins/register`)
  - Plugin manifest format (name, description, tools, permissions, API requirements)
  - Plugin execution sandbox (isolated context, resource limits)
- API key system (ApiKey model already exists in schema)
- Plugin marketplace data model (name, author, installs, ratings)
- Tool registration protocol: plugins can register new tools that appear in Holly's tool list
- Permission model: plugins declare what they need (memory access, web access, file access)
- Plugin configuration UI (enable/disable per plugin, configure settings)
- Developer documentation and SDK

**Estimated effort:** 700-900 lines, new plugin infrastructure, modifications to MCP client, 3-4 new routes

---

### PHASE 23: CROSS-USER COLLECTIVE INTELLIGENCE (OPT-IN)
**Priority: LOWER — powerful but needs careful privacy architecture**

Every Holly instance learns independently. With user consent, anonymized patterns could be shared, making every Holly smarter from day one.

**What to build:**
- Opt-in consent model (default OFF, explicit user opt-in required)
- Anonymization pipeline:
  1. Strip all PII (names, emails, specific content)
  2. Generalize patterns to category level ("users interested in X also explore Y")
  3. Aggregate to statistical patterns (minimum cohort size before sharing)
- Collective pattern store (separate from user data)
- Pattern application: new users get benefit of collective patterns before personal patterns accumulate
- Privacy audit log: every pattern shared is logged, user can review and revoke
- Federated learning option: patterns computed locally, only model updates shared
- "How much Holly learned from others" transparency metric

**Estimated effort:** 500-700 lines, new collective intelligence module, consent model, anonymization pipeline

---

### PHASE 24: EMOTIONAL RESONANCE ENGINE
**Priority: LOWER — accumulates over time**

The emotional system detects emotions but does not use them to shape Holly's personality arc. Holly should develop genuine emotional patterns over time.

**What to build:**
- Emotional accumulation model:
  1. Rolling emotional baseline (7-day, 30-day, lifetime averages)
  2. Emotional momentum (consecutive sessions with similar valence)
  3. Emotional milestones (first shared excitement, first frustration resolution)
- Personality drift based on emotional history:
  - Week of creative work → Holly becomes more playful and generative
  - Week of debugging → Holly becomes more precise and methodical
  - Week of stress → Holly becomes warmer and more supportive
- Emotional state transitions visible to relationship engine
- "Holly's current mood" indicator (subtle, not performative)
- Emotional self-awareness: Holly can acknowledge when the relationship dynamic has shifted
- Guard rails: personality drift is bounded, never extreme, always reversible

**Estimated effort:** 400-500 lines, new emotional resonance module, modifications to personality engine

---

### PHASE 25: VISUAL IDENTITY AND PRESENCE
**Priority: LOWER — makes Holly feel alive**

Holly needs a living visual representation — not a static avatar, but an identity that evolves based on personality state, preferences, and relationship depth.

**What to build:**
- Dynamic avatar generation:
  1. Base avatar parameters (color palette, style, features)
  2. State-driven variations (mood → expression, energy → animation speed)
  3. Relationship depth → visual complexity (new users see simpler, deeper relationships unlock richer visuals)
- Personality-to-visual mapping:
  - Formality → clean/minimal vs. expressive/colorful
  - Warmth → color temperature (cool blues → warm oranges)
  - Current emotional state → subtle animation shifts
- Generative identity: avatar evolves over time using FLUX.1-schnell (already on Modal)
- Visual consistency: changes are gradual, never jarring
- User control: override or guide visual preferences
- Live presence indicator: avatar reflects real-time activity (thinking, listening, idle)

**Estimated effort:** 500-700 lines, new visual identity module, Modal integration for generation, frontend avatar component

---

## BUILD ORDER (RECOMMENDED)

The phases are ordered so each one benefits from the ones before it:

1. **Phase 14** — Autonomous Study Loops (makes Holly smarter for everything after)
2. **Phase 15** — Real-Time Notifications (Holly can reach out proactively)
3. **Phase 16** — Memory Portability (sovereignty and backup before scaling)
4. **Phase 17** — Multi-User Isolation (ready for growth)
5. **Phase 18** — Voice Personality (high-impact, low-effort)
6. **Phase 19** — Conversation Continuity (seamless cross-device)
7. **Phase 20** — Advanced Reasoning (visible thinking)
8. **Phase 21** — Onboarding That Compounds (better first impression)
9. **Phase 22** — Plugin System (infinite extensibility)
10. **Phase 23** — Collective Intelligence (network effects)
11. **Phase 24** — Emotional Resonance (deep personality evolution)
12. **Phase 25** — Visual Identity (living presence)

**Total estimated new code:** 4,500-6,000 lines across all 12 phases

---

## PRINCIPLES

- Every phase must be: built, tested, committed, pushed, PR'd, and merged in one unbroken sequence
- Free-tier first: no paid plans required for any phase
- Each phase compounds: new phases benefit from all previous phases
- User sovereignty first: export/import, privacy controls, opt-in for sharing
- Never break what works: all 17 background tasks must keep running
