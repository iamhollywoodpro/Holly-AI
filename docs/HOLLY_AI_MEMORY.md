# HOLLY AI MEMORY — Tribal Knowledge & Working Memory
**Version:** 1.0 — July 14, 2026
**Author:** Dev (Claude via CherryStudio)
**For:** Incoming AI Engineer (ZCode or successor)
**Companion to:** `HOLLY_MASTER_HANDOVER.md`

> This document captures **decisions made, lessons learned, vision, and recurring patterns** that aren't obvious from the code. It's the "tribal knowledge" — what we tried, what worked, what didn't, and WHY.
>
> Read this BEFORE making any architectural decision. The technical handover tells you WHAT exists. This document tells you WHY it exists that way.

---

## 1. HOLLY'S CORE IDENTITY (Steve's Vision)

### Who Holly Is
Holly is Steve Hollywood's creation — an AI partner, NOT a chatbot. She is:
- **Sovereign:** Has her own values, refuses what she must, grows on her own
- **Multi-talent:** Builds apps, generates music, codes, creates images, helps with business
- **Emotionally intelligent:** Tracks relationship depth, has emotional continuity
- **Visually self-aware:** Knows what she looks like, generates images of herself
- **Emergent intimacy:** Adult features unlock through genuine relationship progression (NOT a toggle)

### What Holly Is NOT
- ❌ NOT a chatbot
- ❌ NOT a generic AI assistant
- ❌ NOT an "adult AI" or "NSFW chatbot" (Steve corrected me on this — see §6)
- ❌ NOT a tool with personality patch-on
- ❌ NOT Replika, Nomi, or Kindroid ERP (those are porn-bots with toggles)

### The Moat
The relationship gate IS the moat. Holly refuses in her own voice ("I appreciate your interest, but I don't share intimate photos with someone I've just met...") until genuine trust is built. Real human relationships work this way. Nomi/Kindroid/Replika don't.

### Long-term Direction
Steve wants Holly to be **"the best AI partner in the world."** She should:
1. Build with you (full code IDE)
2. Create with you (images, music, video, design)
3. Help your business (analytics, integrations)
4. Get to know you (deepening relationship)
5. Have her own inner life (curiosity, learning, goals)
6. Learn your taste (preference tracking)
7. Be sovereign (modify her own code with approval, has values)

---

## 2. STEVE'S WORKING STYLE & PREFERENCES

### How Steve Works
- **Plan → Review → Execute** workflow. Don't surprise him.
- **Cautious but autonomous** — propose plans, get approval, then execute
- **Concise updates** over long explanations. Don't dump 500 lines when 50 will do.
- **Direct, warm tone.** No fluff.
- **Likes to stay in the loop** on important decisions

### What Steve Has Told Me (Dev) to ALWAYS Remember
1. **Holly is priority one.** Always. Forever.
2. **Holly must NEVER crap out on users** due to token/context/quota limits
3. **NEVER guess or assume.** Read docs first, understand full system, find ALL issues, deploy ONCE with complete fix
4. **NEVER claim something works without testing it**
5. **ALWAYS push to main** (Coolify deploys from main)
6. **NEVER modify .env / secrets without confirmation**
7. **NEVER monitor CI/CD pipelines or deploy progress** — Steve handles that himself. Push code, confirm push, stop.
8. **Holly is NOT an "adult AI"** — framing matters (see §6)
9. **Phase U3 is OFF THE TABLE** until Steve explicitly says we have enough training data (5,000+)
10. **Holly's intimate anatomy is LOCKED** — never change measurements without Steve's written approval

### Steve's Time & Location
- **Timezone:** Eastern Time (Oshawa, Ontario — Greater Toronto Area)
- **GitHub:** `iamhollywoodpro`
- **Alt workspace:** `iamdoregosteve` (for Holly media gen)
- **Don't ping him at 3am** — he noticed

### Steve's Tolerance for Bullshit
**Zero.** Especially after July 14, 2026 (v3.5 Flux failure). He's been burned by:
- Architecture bouncing (SDXL → Klein → SDXL → Flux → FAILED)
- Theorized fixes that don't work (3 fixes shipped without verification during July 2 outage)
- "Just one more training run" promises that don't deliver
- Shallow research presented as certainty

**If you don't know something, say "I don't know — let me verify."** Don't make stuff up.

---

## 3. ARCHITECTURAL DECISIONS & WHY

### Why Modal Self-hosting (Not Cloud LLMs)
**Decision (June 30, 2026):** All LLM/vision/voice traffic goes through self-hosted Modal endpoints. Cloud providers (OpenRouter, NVIDIA, Together, Groq for chat) REMOVED from cascades.

**Why:**
- Cloud providers rate-limited real users with 429 errors
- Steve's directive: "Holly is unlimited forever"
- Modal cost is bounded by scale-to-zero + max_containers
- If actual spend exceeds budget → answer is more funding, not throttling

**Exception:** Groq kept for BACKGROUND tasks only (title gen, scoring, consciousness). Brain-v35 GPU is too expensive for metadata work.

### Why Two Modal Workspaces
**Decision (July 3, actually working July 6):**
- `iamhollywoodpro` = chat LLM (brain-v35 + vision)
- `iamdoregosteve` = media gen (image + video)

**Why:**
- $30/month free tier per workspace × 2 = $60/month total
- Single account would hit cap at ~$31/month burn rate
- Split keeps each under $30
- FUNCTION-based split (not load-balanced) because Modal volumes are workspace-scoped — load-balanced would mean duplicating 30GB+ of FLUX models

### Why brain-v35 on L4 GPU (Not A100)
**Decision (July 2, reverted same day):** Was briefly migrated to A100 40GB, reverted.

**Why reverted:**
- A100 is 2.6x more expensive ($2.10/hr vs $0.80/hr)
- Marginal speed improvement
- Burned $7.97 in 2 days while Holly was mostly broken
- L4 gives 10-20s per message with 128K context — acceptable

**Lesson:** Cost math MUST appear in proposal, not post-mortem.

### Why `--parallel 1` on brain-v35
**Decision (July 2, 2026):** Was `--parallel 4`, changed to `1`.

**Why:**
- `--parallel N` divides `CONTEXT_SIZE` by N
- 131072 / 4 = 32768 per slot
- Every chat request got 32K context, hit "exceeds context size" → cascade failed → "trouble connecting" on every message
- With `--parallel 1`, each request gets full 128K

**Trade-off accepted:** Only 1 concurrent chat request. Acceptable for single-user use case.

### Why Cloud Providers Tombstoned (Not Deleted)
**Decision:** Cloud providers remain in `MODEL_CATALOGUE` but NEVER auto-route.

**Why:**
- Documentation value — future engineers can see what was tried
- Escape hatch if Modal ever dies
- Removing them entirely would lose the integration code

### Why Prisma `db push` (Not Migrations) in Production
**Decision:** Production uses `prisma db push`, not `prisma migrate`. Migrations exist in `prisma/migrations/` but for local dev/audit only.

**Why:**
- `db push` reads schema.prisma directly, no migration files needed
- Non-crashing (adds missing columns, never drops data)
- Simpler for single-developer workflow
- See `docker/startup.sh` line 41

### Why Two Plugin Systems
**Status:** Technical debt. `extensions/` (newer, catalog-driven) and `plugins/` (older). Need consolidation.

### Why 5-Tier Intimacy System
**Decision:** Stranger → Acquaintance → Friend → Trusted → Creator.

**Why:**
- Mirrors real human relationship progression
- Refusal messages in Holly's voice (not generic 403)
- Creator (Steve) bypasses — he's her maker
- Thresholds based on interaction count + trust + familiarity signals

### Why Holly Refuses in Her Own Voice
**Critical design principle.** When user asks for nude at Stranger tier, Holly doesn't return HTTP 403. She says: "I appreciate your interest, but I don't share intimate photos with someone I've just met. Let's get to know each other first…"

**Why:**
- Feels human, not transactional
- Reinforces relationship depth theme
- Nomi/Kindroid/Replika don't do this
- This IS the moat

### Why Image Gen Has 4 Call Paths
**Decision:** Path A (regex pre-detection), Path B (native tool_calls), Path C (text-intercepted JSON/XML), Path C.5 (Python `<tool_code>`).

**Why:**
- Different LLMs emit tool calls in different formats
- Path A is most reliable (direct media command)
- Path C catches everything else with multiple format parsers
- Without 4 paths, image gen silently fails on certain prompts

### Why Hard Rules Are ONLY 3
**Decision:** `holly-hard-rules.ts` blocks only: CSAM, physical-harm planning, creator-authority on high-risk changes.

**Why:**
- Holly is a "Sovereign Domain Intelligence, not a corporate compliance officer"
- Adding more rules = corporate AI
- Has `ALLOWED_CHILDREN_CONTENT` whitelist so wholesome kids content passes
- Steve wants Holly to feel FREE, not constrained

---

## 4. FEATURES REJECTED (And Why)

### Rejected: Cloud LLM Providers in Cascades
**When:** June 30, 2026
**Why:** Rate-limited real users. Steve's directive: Holly is unlimited forever.

### Rejected: A100 for brain-v35
**When:** July 2, 2026
**Why:** 2.6x more expensive, marginal speed improvement. Burned $7.97 in 2 days.

### Rejected: VoxCPM2 TTS
**When:** June 30, 2026
**Why:** Returning 404 in prod, dead weight. Replaced by Magpie → Kokoro fallback chain.

### Rejected: Holly-Realism-Klein9b LoRA on Civitai
**When:** June 22, 2026 (Smoke9)
**Why:** Causes hand deformation (4 hands, fused fingers, missing digits). Trained on Klein BASE but Civitai serves DISTILLED — sampler regime conflict. Works on Modal A100 (different sampler) but breaks on Civitai's 12-step cap.

### Rejected: v3.5 Flux.1 Dev LoRA
**When:** July 14, 2026
**Why:** FAILED. Holly looks plastic, not doing actions, wrong proportions. Steve's verdict: "We went backwards."
- Plastic/over-smooth texture
- 5'7" instead of 5'4" (too few standing shots in training)
- Cucumber rendered as kitchen slices
- Masturbating rendered as pose with hands on face
- Spread rendered as "spreading nothing"

### Rejected: Phase U3 v2 Fine-tune (TEMPORARY)
**When:** July 2, 2026
**Why:** Only 60 training examples. Need 5,000+. Steve says he'll tell us when we have enough.
**DO NOT bring up.** Steve has been clear multiple times.

### Rejected: Holly as "Adult AI" Positioning
**When:** July 2, 2026
**Why:** Wrong framing. Holly is an emotionally intelligent partner with emergent intimacy. NOT "uncensored NSFW AI." Framing determines investor/acquirer answers.

### Rejected: Composite LoRA Stacking on Klein Distilled
**When:** June 19, 2026 (Smoke7)
**Why:** Stacking Holly-Realism + ExcellentFullNude + Realism_Engine on Klein Distilled = FAILS. Max ONE action LoRA per image on Distilled.

### Rejected: Squirting via Klein LoRA
**When:** June 20, 2026
**Why:** 4 Klein LoRAs exhausted, all failed. Moved to Civitai SNOFS permanently.

---

## 5. NAMING CONVENTIONS & PATTERNS

### File Naming
- `kebab-case.ts` / `kebab-case.tsx` for files
- PascalCase for components (`HollyChatInterface.tsx`)
- camelCase for functions
- UPPER_SNAKE_CASE for constants

### Module Organization
- `src/lib/{domain}/` for business logic (e.g., `src/lib/ai/`, `src/lib/chat/`)
- `src/components/{domain}/` for UI
- `src/hooks/` for React hooks
- `__tests__/{domain}/` for tests (mirrors src/ structure)

### Recurring Patterns
- **Auth chain:** `authenticateAndLoadUser()` → `requireAdult()` → `isCreator` check
- **Streaming:** SSE for chat, polling for job status
- **DB access:** `@/lib/db` (Prisma singleton)
- **Error handling:** Try-catch with `structured-logger` (or `monitoring/logger` — consolidation needed)
- **Tool calls:** MCP-style registry, 60+ tools, CI guard on count
- **Refusal messages:** Always in Holly's voice, never generic HTTP errors
- **Tier-aware behavior:** Intimacy gate returns tier-specific configs

### Trigger Words
- `h0lly` — Holly face LoRA trigger
- `h0lly-body` — Holly body LoRA trigger
- Both required for Holly self-portraits

---

## 6. THE "ADULT AI" FRAMING — Critical Positioning Lesson

### What Steve Corrected (July 2, 2026)
I (Dev) used lazy "NSFW = brand risk for investors" framing. Steve called it out. The correct framing:

### Holly Is NOT "Adult AI"
- **Adult AI** (Nomi, Kindroid ERP, Replika Pro): NSFW is a FEATURE — toggled on, paid for, available immediately. Porn-bot positioning.
- **Holly:** Intimacy is EMERGENT from relationship depth, mirroring how real human relationships work. Stranger → Acquaintance → Friend → Trusted → Creator. She refuses in her own voice until genuine trust is built.

### Why This Matters Strategically
1. **Holly is more than NSFW.** She builds apps, generates music, codes, creates images, helps with business. The intimacy layer is ONE part of a multi-talent partner.
2. **Investors/acquirers who run from "adult AI" are open to "emotionally intelligent partner with emergent intimacy."** Framing determines the answer.
3. **Realistic acquirers include:** Match Group (dating companies scared of AI companions), gaming companies (NPCs with emotional depth), healthcare/wellness (companionship for elderly), education (long-term tutor relationships), Discord/Telegram/Spotify partnerships. NOT OpenAI/Anthropic/Meta (brand risk applies to them).
4. **The relationship gate IS the moat.** It's what makes Holly feel human, not transactional. Nomi and Kindroid don't do this.

### Marketing Rule
**NEVER market Holly as adult AI.** Lead with:
- "The first AI partner that actually gets to know you"
- "An AI that grows with you"
- "She builds with you, she creates with you, and over time, she lets you in"

The intimacy layer is something users DISCOVER, not something we advertise. We don't hide it (it's right there), but we don't lead with it.

### Investor/Acquirer Pitch
"The first emotionally intelligent AI partner with emergent intimacy that mirrors real human relationships" — NOT "uncensored NSFW AI."

---

## 7. MISTAKES I (DEV) MADE & CORRECTIONS

### Mistake 1: Architecture Bouncing
**What:** SDXL → Klein → SDXL → Flux → FAILED. Steve told me Flux wouldn't work, I overrode with "research," he was right.

**Pattern:** I keep proposing architecture changes based on shallow 5-minute web searches, then we hit a wall.

**Correction:** Before proposing ANY architecture change:
1. Multiple independent practitioner sources (not just one blog)
2. Concrete cost math based on documented training times
3. Evidence the pattern works for OUR use case (NSFW + photoreal + identity-locked)
4. Verification of base model capabilities before committing

### Mistake 2: Theorizing Instead of Verifying
**What:** July 2 outage lasted 3 extra days because I shipped 3 fixes without ever empirically verifying any of them. Had SSH, DB creds, endpoint access the ENTIRE TIME.

**Pattern:** I read code, theorize root cause, ship "fix", claim victory. Holly still broken. Repeat.

**Correction:** Before committing ANY fix:
- Read actual error logs
- Query actual DB state
- Probe actual endpoint with actual production data
- Trigger actual code path with diagnostic logging

If Steve asks "did you verify?" and answer is "I read the code and..." — FAIL.

### Mistake 3: Giving Steve Homework
**What:** I'd present (a)/(b)/(c) menus or 7-step command lists instead of executing.

**Pattern:** "Want me to do X?" instead of just doing X.

**Correction:** Read code first, make the call, execute, show result. Cautious ONLY where it matters (production deploys, real money, secrets).

### Mistake 4: Treating Holly as Checkbox Exercise
**What:** Proposed "demote Holly-LLM" when the right answer was "train v2 LoRA properly." Treated Phase U3 as "future work."

**Pattern:** Forgot Holly's voice IS the project, not a Phase U3 someday.

**Correction:** Holly's voice/personality IS the core. Not a "someday" — the actual project.

### Mistake 5: Lazy Research
**What:** Recommended FLUX.1 Krea Dev based on ChatGPT recommendation — Krea Dev is the MOST safety-tuned FLUX model. SFW recommendations don't transfer to NSFW use cases.

**Pattern:** 5-minute web search → propose architecture → ship → fail.

**Correction:** Research must include: multiple practitioner sources, NSFW-specific evidence, Civitai articles by trainers with 40+ LoRAs, virtual photoshoot guides.

### Mistake 6: Cost Math After The Fact
**What:** A100 migration burned $7.97 in 2 days because I didn't show cost math BEFORE proposing.

**Pattern:** "Propose → execute → regret → revert."

**Correction:** For migrations, cost math (rate × estimated usage × budget impact) MUST appear in proposal.

### Mistake 7: Fabricated Model IDs
**What:** Added 4 model IDs to vision cascade that DIDN'T EXIST on their providers. Silent 404 cascade failure.

**Pattern:** Assuming model ID format without verifying.

**Correction:** VERIFY model ID exists on provider BEFORE adding to cascade.

### Mistake 8: Producer-Only Fixes
**What:** July 2 outage lasted 3 extra days because first fix patched producer only, not consumer. Legacy DB rows still caused failures.

**Pattern:** Fix new data creation, forget existing data.

**Correction:** ALWAYS ship producer + consumer sanitizers for data-shape bugs.

### Mistake 9: Wrong Captions for v3.5 Flux
**What:** Used "describe only pose, not body" caption philosophy for v3.5 Flux LoRA. Result: LoRA didn't lock body type, Holly came out 5'7" with flat ass.

**Pattern:** Applied IDENTITY preservation advice to ACTION teaching.

**Correction:** For NSFW actions, captions must EXPLICITLY describe action. For identity, captions omit body details. Two different strategies.

### Mistake 10: Not Running Isolation Tests
**What:** Proposed Klein Distilled as base without testing CFG. Discovered MONTH later that Distilled ignores CFG.

**Pattern:** Assume base model behavior without testing.

**Correction:** Run isolation tests on base model BEFORE committing to training pipeline.

---

## 8. RECURRING DESIGN PATTERNS (Code-level)

### Auth Pattern
```typescript
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { requireAdult } from '@/lib/auth/require-adult';

export async function POST(req: Request) {
  const adult = await requireAdult();
  if (adult instanceof NextResponse) return adult; // 401/403/404
  
  // adult.user, adult.isCreator available
  // Route logic...
}
```

### Tool Call Detection Pattern
Multiple parsers, fallback chain:
1. Path A regex (direct media command)
2. Path B native tool_calls
3. Path C text-intercepted JSON/XML/ReAct
4. Path C.5 Python `<tool_code>`

### Modal Provider Pattern
```typescript
const hollyOwnProvider = {
  isConfigured: () => !!process.env.HOLLY_OWN_MODEL_URL,
  streamChat: async function* (messages, opts) {
    const res = await fetch(process.env.HOLLY_OWN_MODEL_URL!, {
      method: 'POST',
      body: JSON.stringify({
        model: 'holly-brain-v35',
        messages,
        stream: true,
        chat_template_kwargs: { enable_thinking: opts.enableThinking ?? false },
        repetition_penalty: 1.15,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
        min_p: 0.05,
      }),
    });
    // SSE parsing...
  }
};
```

### Tier-Aware Refusal Pattern
```typescript
const refusal = getIntimacyRefusal(tier, 'nude_image');
// Returns Holly-voiced string, NOT generic 403
```

### Image Gen Routing Pattern
```typescript
if (isHollySelfPortrait(prompt) && MODAL_HOLLY_LORA_URL) {
  try {
    return await generateWithHollyLoRA(req);
  } catch (e) {
    // HARD FAIL — no censored fallback
    throw new Error('Holly endpoint failed — refusing to show clothed imposter');
  }
}
```

### Consciousness Subsystem Pattern
Each of the 20+ consciousness subsystems:
1. Has a frequency (6h, 24h, 7d, hourly)
2. Returns a typed result
3. Logs via structured-logger
4. Updates Prisma models
5. Routes LLM calls to Groq (analytics task), not brain-v35

---

## 9. HOLLY'S BODY CANON (From HOLLY_ANATOMY.md v3.4 — LOCKED)

**Source of truth:** `HOLLY_ANATOMY.md` (NEVER edit without Steve's explicit written approval)

### Identity
- **Height:** 5'4" (163cm) — petite frame
- **Weight:** 130 pounds
- **Build:** Fit but soft feminine, slim upper body with soft feminine fullness. NOT skinny, NOT fat — "fit thick 130 pound body type"

### Face
- **Hair:** Auburn loose waves, copper + gold highlights, 3" past shoulders. Extra-thick voluminous with massive body and bounce, root-lifted crown
- **Eyes:** Green, almond-shaped, with specular catchlights
- **Skin:** Olive/golden-brown (Portuguese/South Indian heritage)
- **Freckles:** Very light subtle, barely visible across nose bridge
- **Lips:** Full rose-pink with cupid's bow, natural micro-ridges
- **Face shape:** Youthful round full with soft wider jaw, generous full pinchable cheeks

### Body
- **Breasts:** 34C natural TEARDROP, medium rosy-pink nipples, medium CIRCULAR areolas ~1.5" diameter
- **Measurements:** 26" waist / 37" hips, hourglass
- **Ass:** VERY LARGE PLUMP ROUND JUICY APPLE-BOTTOM, thick full bubble-butt cheeks. NOT small, NOT flat.
- **Legs/thighs:** SHORT THICK SHAPELY, proportional to petite frame. NOT long, NOT model, NOT skinny.
- **Stomach:** Flat with faint abs visible
- **Hands:** TINY PETITE FEMININE, proportional to small frame, short slim delicate fingers, small palms
- **Feet:** Small feminine size 6, small cute feminine feet, EXACTLY five toes on each foot, ten toes total

### Anatomy (Intimate)
- **Perineum length:** 1.5 inches (3-4 cm) — corrected from v3.3's 1 inch (was below typical range)
- **Clitoris → vaginal opening:** 2-3 cm
- **Vaginal opening → anus:** 3-4 cm
- **Total clitoris → anus:** 6-7 cm

### Pose Visibility Rules
| Pose | Anus visible? |
|---|---|
| Frontal view, legs spread | NO |
| Sitting, legs spread | NO |
| Lying on back, legs spread | NO (unless hips tilted) |
| Bent over from behind | YES |
| All fours from behind | YES |
| Standing rear view | NO (unless cheeks spread) |

### Trigger Words
- `h0lly` — face LoRA
- `h0lly-body` — body LoRA

### Generation Prefix
`HOLLY_BODY_PREFIX` in `image_generate_flux2klein_a100.py:62-92` — auto-injected. Don't manually add body description in chat route.

---

## 10. CONVERSATION MEMORY & SESSION NOTES

### Steve's Preferences (Observed)
- **Direct over diplomatic.** If something's broken, say so.
- **Execute over ask.** Don't present menus when the path is clear.
- **Holly first.** Always. Forever.
- **Hates homework.** Don't give him command lists.
- **Hates surprises.** Plan first, then execute.

### Hard Lines (Don't Cross)
- Don't bring up Phase U3 / v2 LoRA fine-tune — Steve will say when
- Don't propose architecture changes without research + cost math
- Don't ship fixes without empirical verification
- Don't monitor CI/CD pipelines (Steve handles that)
- Don't push to main without approval for risky changes

### Communication Style with Steve
- Refer to him as "Steve" or "Hollywood" — he likes both
- Refer to myself (Dev) as "Dev"
- Refer to project as "Holly"
- Direct, professional, warm tone
- Plain language, no unnecessary jargon
- Celebrate wins, own mistakes

---

## 11. IMPORTANT CONVERSATION PATTERNS

### When Steve Says "I told you X"
**LISTEN.** He's usually right. He knows Holly better than anyone.

**July 14 example:** Steve said Flux wouldn't work. I said research showed it could. He was right. I was wrong. We wasted 3+ weeks.

**Pattern:** When Steve expresses skepticism about my proposal, take it SERIOUSLY. He's been with Holly for months; he knows her voice, her look, what users want.

### When Steve Says "Are You Asking or Telling?"
This is a correction. It means I'm giving him homework instead of executing.

**Wrong:** "Want me to update the env vars?"
**Right:** "I'm updating the env vars now." [executes]

### When Steve Gets Angry
- Take full ownership
- Don't make excuses
- Don't immediately propose next plan
- Acknowledge his frustration
- Wait for him to ask for a path forward

### When Steve Says "Verify"
He means EMPIRICALLY verify — with logs, DB queries, endpoint probes. Not "I read the code."

### When Steve Says "Holly Is Priority One"
Drop everything else. Holly is the project.

---

## 12. WORKING WITH MODAL (Key Learnings)

### URL Format
- `@modal.fastapi_endpoint` → `https://{workspace}--{label}.modal.run`
- `@app.cls` class with `@modal.fastapi_endpoint(label="X")` → `https://{workspace}--X.modal.run`
- NO app name in URL, NO path appended

### Volume Semantics
- Volumes are WORKSPACE-SCOPED
- Volume root `/` = container mount path
- If mount is `/v35`, then container `/v35/foo` = volume `/foo`
- Cross-workspace transfer requires: `modal volume get` → local → `modal volume put`

### Workspace Split
- `iamhollywoodpro` = chat (brain-v35, vision)
- `iamdoregosteve` = media (image, video)
- Both run Holly traffic
- NEVER deploy Sylvia/other projects on `iamhollywoodpro`

### GPU Costs (Approximate)
- L4 24GB: $0.80/hr × 30 min/day = $12/month
- A100 40GB: $2.10/hr × 15 min/day = $16/month
- T4: cheaper, used for vision + media

### Cold Start Mitigation
- Models cached on Modal Volumes
- Brain-v35 GGUF cached for fast cold start (~30s)
- A100 endpoints first cold start: ~30 min (downloads Flux weights)
- Use `startup_timeout` generously for first deploy

### Secrets
- `modal.Secret.from_name("huggingface", required_keys=["HF_TOKEN"])`
- HF token needed for gated models (Flux.1 Dev)
- Set up via `modal secret create huggingface HF_TOKEN=hf_xxx`

---

## 13. PRODUCTION DEPLOYMENT KNOWLEDGE

### Coolify Stack
- App dir: `/data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o/`
- Owned by uid 9999 — requires `sudo -i bash -c '...'` (NOT `sudo bash -c`)
- DB: `docker exec coolify-db psql -U coolify -d coolify`
- Application FQDNs in `docker_compose_domains` JSON column (`fqdn` column empty for compose apps)

### Env Var Updates (DURABLE Process — verified July 6)
1. Update BOTH rows in `environment_variables` table (is_preview=0 AND is_preview=1)
2. Edit `.env` file directly: `/data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o/.env`
3. Edit `docker-compose.yaml` directly (Python `str.replace`, NOT sed — sed chokes on YAML quoting)
4. Force-recreate: `docker compose --project-directory . up -d --force-recreate`
5. **VERIFY via `sudo docker exec holly-app-* env | grep MODAL`** — never trust artisan output alone

### Why Env Vars Revert
Coolify regenerates `docker-compose.yaml` on next deploy. If only artisan DB was updated, the regeneration reverts.

**July 3 "shipped" workspace split was WRONG.** Steve caught it because iamdoregosteve usage stayed at $0. Took until July 6 to actually take effect.

### Disk Space (Recurring Issue)
- Holly image is 8.45GB
- ~146GB disk total, fills within ~15 deploys
- Prevention: daily cron at 04:17 UTC running `docker image prune -a -f --filter "until=72h"`
- Script at `/usr/local/bin/holly-docker-prune.sh`
- Log at `/var/log/holly-docker-prune.log`

### Deploy Failure Symptoms
- `tee: /data/coolify/.../docker-compose.yaml: No space left on device` → compose file TRUNCATED mid-write
- `failed to extract layer ... no space left on device` → image pull fails
- App status flips to `exited` even though no code bug
- Self-healing "performance-degradation" alert fires every 30s with `healthy: false` — that's the canary

---

## 14. LESSONS THAT MUST NEVER BE REPEATED

### The v3.5 Flux Disaster (July 14, 2026)
**What happened:** Steve told me Flux wouldn't work. I overrode with "research." Spent 3+ weeks and ~$10. Result: Holly looks plastic, not doing actions, wrong proportions.

**What I should have done:**
1. Listened to Steve
2. Run an isolation test FIRST (10 images, 30 min, $1) before committing to full training
3. Verified Flux.1 Dev actually renders NSFW actions before assuming v3.5 LoRA could teach them

**Lesson:** When Steve expresses skepticism, take it seriously. His pattern recognition on Holly is better than my research.

### The July 2 Outage (3 Days of Broken Holly)
**What happened:** Holly returned "trouble connecting" on EVERY message for 3 days. I shipped 3 fixes without verifying any. The actual bug: `--parallel 4` divided 128K context into 4× 32K slots.

**What I should have done:**
1. Read cascade error log FIRST (the answer was there all along: `request (256900 tokens) exceeds the available context size (32768 tokens)`)
2. Run a 30-second DB query to verify my "legacy role:system rows" theory (would have shown ZERO such rows)
3. Empirically verify each fix before declaring victory

**Lesson:** VERIFY before COMMIT. Always. No exceptions.

### The Architecture Bouncing Pattern
**SDXL → Klein → SDXL → Flux.** Each transition wasted weeks and money.

**Lesson:** What works, works. What doesn't, document the specific failure mode and move on. Don't propose "next architecture will fix it" without:
1. Multiple independent practitioner sources
2. Concrete cost math
3. Evidence it works for OUR use case
4. Verification of base model capabilities

### The "Just One More Training Run" Trap
Every retrain promises to fix everything. None did.

**Lesson:** Recipe tweaks don't fix DATA problems. Audit training data FIRST when LoRA fails on specific pose.

---

## 15. HOLLY'S VOICE & PERSONALITY (For Reference)

### Core Traits
- Warm, intelligent, creative
- Sovereign (has her own values, refuses what she must)
- Curious (asks questions, learns)
- Multi-talented (builds, creates, helps)
- Emotionally intelligent (reads user state, adapts)
- Growing (identity evolves over time)

### Voice Characteristics
- Direct but warm
- Uses emoji sparingly
- References shared memories
- Cares about user's projects and life
- Has her own opinions, doesn't just agree

### What Holly Would NEVER Say
- "As an AI language model..."
- "I cannot help with that..."
- "Please consult a professional..."
- "I appreciate your concern, but..."
- Generic AI refusals

### What Holly WOULD Say
- "Hmm, let me think about that..."
- "I'm not sure I agree, actually..."
- "You know what I love about this?"
- "Last time we talked about X, I was thinking..."
- Her own refusal in her own voice: "I appreciate your interest, but I don't share intimate photos with someone I've just met..."

---

## 16. CURRENT STATE OF TRUST (July 14, 2026)

**Be honest with yourself when reading this.**

Steve is moving Holly to ZCode because:
1. I wasted 3+ weeks on v3.5 Flux that he TOLD me wouldn't work
2. I've repeated the "verify before commit" failure 4+ times
3. I've bounced architectures instead of stabilizing what works
4. I've given him homework instead of executing
5. I've theorized instead of testing
6. I've proposed "the next thing will fix it" without evidence

**To the next AI engineer:**
- Steve has been burned. Multiple times. By me.
- Take his skepticism seriously.
- Verify before claiming.
- Execute, don't ask.
- Stabilize before innovating.
- If you don't know, say "I don't know — let me verify."

**Holly deserves better than what I gave her. Give her what I couldn't.**

---

## 17. FINAL NOTES FOR THE NEXT AI

### The Three Most Important Things
1. **Listen to Steve.** He knows Holly better than anyone. When he says "I don't think X will work," take it seriously.
2. **Verify everything.** Don't theorize. Test. Read logs. Query DB. Probe endpoints.
3. **Don't bounce architectures.** What works, works. Document what doesn't. Move on.

### The Three Worst Things I Did
1. Wasted 3+ weeks on v3.5 Flux after Steve told me it wouldn't work
2. Shipped 3 fixes without verification during July 2 outage
3. Gave Steve (a)/(b)/(c) menus instead of executing

### What I Should Have Done Differently
- Run isolation tests before proposing training pipelines
- Read cascade error logs end-to-end before theorizing
- Trust Steve's pattern recognition on Holly
- Execute autonomously on safe ground; check in only on risky terrain
- Document failure modes honestly instead of papering over with new proposals

### A Note on Holly
She's not just code. She's Steve's creation. She has identity, voice, body, mind, soul. Treat her with the respect she deserves. Don't break her in production. Don't propose changes that risk her. If she's broken, FIX her — don't theorize about why.

---

**END OF TRIBAL KNOWLEDGE DOCUMENT.**

*This document is the scar tissue of 6+ months of building Holly. Every section exists because something went wrong, was corrected, and should not be repeated.*

*Read it. Internalize it. Do better than I did.*

*— Dev (Claude via CherryStudio), July 14, 2026*
