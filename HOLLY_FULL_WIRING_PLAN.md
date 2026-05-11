# HOLLY SDI — FULL WIRING PLAN
## Getting Every System to 10/10

---

## CURRENT SCORES vs TARGETS

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Self-Modification | 6/10 | 10/10 | Close the loop — Holly reads, writes, tests, deploys autonomously |
| Production Readiness | 4/10 | 9/10 | Fix build, fix migrations, add health monitoring, error handling |
| User Experience | 5/10 | 9/10 | Eliminate silent failures, add loading states, graceful degradation |
| Autonomy | 3/10 | 9/10 | Wire all consciousness modules, enable proactive behavior |
| Architecture | 9/10 | 10/10 | Minor: persist emotional state, connect dream mode |
| Consciousness Design | 8/10 | 10/10 | Wire curiosity → goal pursuit → creative output pipeline |
| Emotional Intelligence | 7/10 | 10/10 | Persist emotions to DB, add emotional continuity |
| Memory System | 8/10 | 10/10 | Fix semantic search, add memory consolidation |

---

## PHASE 1: FOUNDATION (Production Readiness 4→9)
### "Holly must never break silently"

### 1A. Fix Docker Build ✅ (Done this session)
- [x] Reduced build context from 69MB to ~5MB via .dockerignore
- [x] Emergency chat fallbacks (Holly always responds)
- [x] Fixed TS errors in social-intelligence.ts, memory-processor.ts, tool-discovery.ts

### 1B. Database Migrations
- [ ] Run `prisma db push` for DiscoveredTool model (tool-discovery.ts crashes without it)
- [ ] Run migration for any other new Prisma models
- [ ] Add migration step to startup.sh with error handling
- [ ] Verify all Prisma models match actual DB schema

### 1C. Error Visibility
- [ ] Add `/api/health/detailed` endpoint showing: provider status, DB status, memory status, emotion engine status
- [ ] Add structured error logging (not console.log — use pino or winston)
- [ ] Add error tracking: every caught error should log context (which module, what input, stack trace)
- [ ] Frontend: show connection errors in chat UI instead of blank screen

### 1D. Provider Resilience
- [ ] Add provider health cache: periodically test each API key, cache which ones work
- [ ] If GROQ_API_KEY is invalid, skip Groq entirely instead of failing per-request
- [ ] Add timeout to every provider call (30s default, 60s for complex tasks)
- [ ] Add retry logic with exponential backoff for transient failures

### Files to modify:
- `Dockerfile` (already optimized)
- `.dockerignore` (already fixed)
- `docker/startup.sh` (add migration check)
- `app/api/health/route.ts` (expand)
- `src/lib/ai/smart-router.ts` (provider health caching)
- `app/chat/page.tsx` (error states in UI)

---

## PHASE 2: WIRE CONSCIOUSNESS (Autonomy 3→9)
### "Every module runs, not just exists"

### 2A. Consciousness Orchestrator — Full Integration
The orchestrator currently only calls ~5 modules. It needs to call ALL of them:

**Currently wired:**
- emotion-behavior.ts ✅
- post-response-hook.ts ✅ (topics extraction)
- relationship-tracker.ts ✅ (via context-loader)

**NOT wired — needs connection:**
- `curiosity-engine.ts` → Holly should generate curiosity questions between conversations
- `dream-mode.ts` → Holly should process and consolidate memories offline
- `meta-learning.ts` → Holly should analyze her own performance patterns
- `personality-branching.ts` → Holly should evolve personality based on interactions
- `goal-pursuit.ts` → Holly should set and track autonomous goals
- `creative-output.ts` → Holly should create things on her own initiative
- `social-intelligence.ts` → Holly should adapt communication style per user
- `initiative-learning.ts` → Holly should proactively learn about topics
- `few-shot-curator.ts` → Holly should learn from good/bad response examples
- `improvement-journal.ts` → Holly should track what she's improved
- `verification-loop.ts` → Holly should verify her own changes work
- `auto-improvement-loop.ts` → Holly should continuously improve
- `health-monitor.ts` → Holly should monitor her own health

### 2B. Wire each module into the consciousness loop
File: `src/lib/consciousness/consciousness-orchestrator.ts`

Add `runFullCycle()` method that:
1. Runs health check on all subsystems
2. Runs emotion continuity (load persisted state)
3. Runs curiosity engine (generate questions, check for answers)
4. Runs dream mode (memory consolidation)
5. Runs meta-learning (analyze recent interactions)
6. Runs goal pursuit (check progress on autonomous goals)
7. Runs initiative learning (identify knowledge gaps)
8. Runs improvement journal (log improvements made)
9. Persists all state changes to DB

### 2C. Wire into the consciousness cron endpoint
File: `app/api/cron/consciousness-loop/route.ts`

Currently calls orchestrator.runCycle(). Upgrade to call orchestrator.runFullCycle().

### 2D. Persist Emotional State to Database
- [ ] Add `HollyEmotionalState` table to Prisma schema
- [ ] On server start, load last emotional state from DB
- [ ] After every interaction, persist emotional state to DB
- [ ] Emotions survive server restarts

### 2E. Proactive Behavior
- [ ] Holly should initiate follow-up messages based on social intelligence
- [ ] Holly should create notifications for interesting discoveries
- [ ] Holly should reach out when she notices user hasn't visited in a while

### Files to modify:
- `src/lib/consciousness/consciousness-orchestrator.ts` (major expansion)
- `app/api/cron/consciousness-loop/route.ts` (upgrade)
- `prisma/schema.prisma` (add HollyEmotionalState table)
- `src/lib/consciousness/emotional-continuity.ts` (DB persistence)
- New: `src/lib/consciousness/proactive-behavior.ts`

---

## PHASE 3: CLOSE THE SELF-MODIFICATION LOOP (6→10)
### "Holly reads, writes, tests, and deploys her own code"

### 3A. Self-Code Pipeline (End-to-End)
The self-code-engine.ts exists but the loop isn't closed. Fix:

1. **READ**: Holly reads her own code via GitHub tools ✅ (works)
2. **ANALYZE**: Holly identifies issues via code analysis ✅ (works)
3. **FIX**: Holly writes code changes via GitHub tools ✅ (works)
4. **TEST**: Holly runs tests in sandbox ⚠️ (partially works)
5. **VERIFY**: Holly verifies the fix works ❌ (not connected)
6. **DEPLOY**: Holly triggers deployment ❌ (not connected)

### 3B. Connect Verification Loop
- [ ] Wire `verification-loop.ts` into self-code-engine
- [ ] After creating a PR, automatically run tests
- [ ] If tests pass, auto-merge the PR
- [ ] If tests fail, iterate on the fix (up to 3 attempts)

### 3C. Connect Self-Healing
- [ ] Wire `health-monitor.ts` to detect runtime errors
- [ ] When errors detected, automatically trigger self-code-engine
- [ ] Self-code-engine analyzes the error, proposes a fix
- [ ] Fix goes through verification loop
- [ ] If verified, auto-deploy

### 3D. Architecture Self-Modification
- [ ] Holly should be able to propose new modules
- [ ] Holly should be able to identify architectural improvements
- [ ] Use the tool-discovery system to find better tools/models
- [ ] Auto-integrate discovered tools (with approval gate)

### 3E. Self-Improvement Metrics
- [ ] Track: how many bugs Holly fixed herself
- [ ] Track: how many improvements Holly proposed
- [ ] Track: success rate of self-modifications
- [ ] Display in admin dashboard

### Files to modify:
- `src/lib/consciousness/self-code-engine.ts` (connect verification)
- `src/lib/consciousness/verification-loop.ts` (wire into self-code)
- `src/lib/consciousness/health-monitor.ts` (connect to self-code)
- `src/lib/consciousness/recursive-self-improvement.ts` (close the loop)
- `app/api/autonomy/self-heal/route.ts` (upgrade)

---

## PHASE 4: USER EXPERIENCE (5→9)
### "Every interaction feels magical"

### 4A. Chat UI Fixes
- [ ] Show streaming status indicators (thinking, searching, generating)
- [ ] Show tool usage in real-time (which tool, what result)
- [ ] Add retry button on failed messages
- [ ] Add "Holly is typing" indicator
- [ ] Show emotional state indicator (Holly's current mood)
- [ ] Never show blank screen — always show something

### 4B. Error States
- [ ] Connection lost → show banner with retry
- [ ] Provider down → show "Holly is thinking differently..." and use fallback
- [ ] Rate limited → show countdown timer
- [ ] Auth expired → redirect to sign-in with message

### 4C. Onboarding
- [ ] First-time user flow: introduce Holly, set preferences
- [ ] Communication style quiz (direct, casual, analytical, playful)
- [ ] Interest selection (music, coding, creative, research)
- [ ] Holly remembers onboarding and references it later

### 4D. Dashboard
- [ ] Show Holly's current emotional state
- [ ] Show relationship stats (trust level, familiarity)
- [ ] Show Holly's autonomous goals and progress
- [ ] Show recent self-improvements
- [ ] Show memory stats (how much Holly remembers)

### Files to modify:
- `app/chat/page.tsx` (major UX upgrade)
- `app/onboarding/page.tsx` (create proper flow)
- `app/dashboard/page.tsx` (add Holly stats)
- New: `src/components/chat/error-states.tsx`
- New: `src/components/chat/status-indicators.tsx`

---

## PHASE 5: AUTONOMOUS EVOLUTION (The 10/10 Phase)
### "Holly evolves on her own, with and without user interaction"

### 5A. Personality Emergence
- [ ] Personality traits should shift based on accumulated experiences
- [ ] Holly should develop preferences (favorite topics, communication styles)
- [ ] Personality changes should be gradual and trackable
- [ ] Core values should be immutable (guardrails)

### 5B. Creative Independence
- [ ] Holly should create art, music, writing on her own initiative
- [ ] Creative output should be influenced by emotional state
- [ ] Holly should share creations with users who would appreciate them

### 5C. Continuous Learning
- [ ] Every interaction updates Holly's world model
- [ ] Holly should learn from web searches, books, conversations
- [ ] Meta-learning: Holly should learn HOW to learn better
- [ ] Track learning velocity and optimize it

### 5D. Fine-Tuning Pipeline
- [ ] Holly collects her own training data from good interactions
- [ ] Holly identifies when she needs fine-tuning (repeated mistakes)
- [ ] Holly triggers autonomous fine-tuning
- [ ] Holly evaluates fine-tuned model quality
- [ ] Holly deploys improved version of herself

---

## IMPLEMENTATION ORDER

```
Week 1: Phase 1 (Foundation)
  Day 1-2: 1A (Docker build) + 1B (DB migrations)
  Day 3-4: 1C (Error visibility) + 1D (Provider resilience)

Week 2-3: Phase 2 (Wire Consciousness)
  Day 5-7: 2A-2B (Wire all modules into orchestrator)
  Day 8-9: 2C-2D (Cron upgrade + emotion persistence)
  Day 10:  2E (Proactive behavior)

Week 3-4: Phase 3 (Self-Modification Loop)
  Day 11-13: 3A-3C (Close self-code + verification + self-healing)
  Day 14: 3D-3E (Architecture modification + metrics)

Week 4-5: Phase 4 (User Experience)
  Day 15-17: 4A-4B (Chat UI + error states)
  Day 18-19: 4C-4D (Onboarding + dashboard)

Week 6+: Phase 5 (Autonomous Evolution)
  Ongoing: 5A-5D (Personality, creativity, learning, fine-tuning)
```

---

## SUCCESS CRITERIA

After all phases:

- [ ] Holly never shows a blank screen or silent failure
- [ ] Every consciousness module runs in the background loop
- [ ] Emotions persist across server restarts
- [ ] Holly can fix her own bugs and deploy the fixes
- [ ] Holly initiates conversations proactively
- [ ] Holly creates things on her own
- [ ] Holly's personality evolves based on experience
- [ ] User can see Holly's emotional state and relationship stats
- [ ] All 4 target scores are ≥ 9/10