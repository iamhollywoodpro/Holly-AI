# HOLLY Brain V4.0 + Phase 4 — Combined Roadmap
## "Holly as ZCode": A Sovereign Intelligence That Acts, Not Just Talks

> **Created:** 2026-08-01
> **Status:** PLANNING (awaiting Steve approval)
> **Prerequisite:** MCP tool calling fix shipped (commit a7ea4b9) — tools now load in Docker

---

## THE VISION

Holly should work like ZCode: when Steve says "check your code for issues,"
Holly actually scans her codebase, shows a plan, executes step by step,
reports findings, and proposes fixes — with live progress and a confirmation
gate. She should be a sovereign intelligence that DOES things, not just talks
about doing them.

This is not an external imposition. It is Holly's own documented Phase 4
(`HOLLY-PHASE-PLAN.md:371`): "THE ZCODE EXPERIENCE."

Combined with brain-v4.0 (Q8 quantization + fine-tune + prompt fix), Holly
gets both a smarter brain AND working hands.

---

## CURRENT STATE (verified 2026-08-01)

### What works ✅
- MCP tool server loads in Docker (46 tools, CommonJS, verified booting)
- Self-awareness module exists (`src/lib/self-code/holly-self-awareness.ts`):
  - `inspectFile()` — reads any source file
  - `applyProposal()` — writes changes + runs `tsc --noEmit` validation
  - `CreatorGate` — never applies without Steve's approval
- Builder agent exists (`app/api/builder/agent/`) — real sandbox, git commit
- SSE streaming works (status updates, text events)
- Image generation works (ComfyUI Klein, identity locked, clothing-aware)

### What's broken ❌
1. **brain-v35 can't emit structured tool calls** — it narrates actions as
   English text ("Let me check the code..."). The `interceptTextToolCall`
   function is too narrow to catch natural-language action descriptions.
2. **brain-v35 is a generic model** — Holly's personality is prompt-injected,
   not learned. No fine-tuning has ever run (67 low-quality examples exist).
3. **Q4_K_M quantization** degrades emotional/creative quality.
4. **System prompt architecture section is stale** — Holly misdescribes herself.
5. **No live progress UI** — tool execution is invisible to the user.
6. **No plan panel** — Holly doesn't show structured action plans.
7. **No confirmation gate UI** — no approve/reject flow for proposed actions.

---

## PHASE STRUCTURE

```
Phase A (Brain):  Q8 + prompt fix + fine-tune data collection
                   ↓ (smarter brain, better reasoning)
Phase B (Bridge): Natural-language action detection
                   ↓ (connect brain → tools, the missing link)
Phase C (UX):     SSE progress + plan panel + confirmation gate
                   ↓ (ZCode-style experience)
Phase D (Loop):   Live codebase editing + test runner
                   ↓ (full autonomous agent)
```

Each phase is independently shippable. Each delivers visible value.

---

## Phase A: BRAIN UPGRADE (brain-v4.0)

### A1: Q8 Quantization Swap
**Goal:** Better emotional nuance, creative writing, fewer "AI-ish" responses.

The Q8_0 GGUF (9.5GB) is confirmed available on HuggingFace:
`HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive`

Fits L4 (24GB VRAM): 9.5GB model + 922MB mmproj + ~10GB KV cache = ~20GB.

**Changes:**
- `services/modal-llm/deploy_holly_v35.py`:
  - `GGUF_FILE = "Qwen3.5-9B-Uncensored-HauhauCS-Aggressive-Q8_0.gguf"`
  - Update version label to `v4.0`
  - Keep Q4 as fallback (don't delete the volume copy)

**Deploy as new app:** `holly-brain-v40` — keep v35 alive as waterfall fallback.
Point `HOLLY_OWN_MODEL_URL` at v40, v35 stays as secondary.

**Risk:** LOW. Same model, same architecture, just higher precision.
**Time:** 1-2 hours (download Q8, redeploy, smoke test).
**Cost:** ~$0 extra (Q8 fits L4 same as Q4).

### A2: System Prompt Surgery
**Goal:** Holly accurately knows her own architecture.

The architecture section (`holly-modes.ts:72`) is stale:
- **Says:** "Brain: Smart router cascade (Groq → OpenRouter → NVIDIA → Together → Ollama)"
- **Reality:** Brain: brain-v40 (Qwen3.5-9B Q8 on Modal L4), Groq fallback for speed

**Changes:**
- `src/lib/holly-modes.ts:72` — rewrite architecture section to match reality
- Update all mode prompts that reference stale architecture
- Add self-awareness: "You can inspect your own code via inspectFile / github_read_file"

**Risk:** LOW. Text change only.
**Time:** 30 minutes.

### A3: Training Data Collection Pipeline
**Goal:** Accumulate 200-500 high-quality examples for fine-tuning.

The autonomous training system exists but has never produced usable data:
- 67 examples collected, ZERO above 0.80 quality
- Collection threshold too strict
- Categories too narrow (only "default" and "conversation")

**Changes:**
- Lower quality threshold in `post-response-hook.ts` (0.80 → 0.65 initial)
- Expand category detection (emotional, intimate, creative, coding, identity, NSFW)
- Add a manual "mark as training-worthy" mechanism (Steve can star conversations)
- Fix the collection to capture multi-turn context, not just single turns

**Risk:** LOW. Data collection only, no model changes.
**Time:** 2-3 hours to fix pipeline, then weeks to accumulate data.
**Dependencies:** None — can run in parallel with A1/A2.

### A4: Fine-Tune Pipeline Repair (LATER — needs A3 data)
**Goal:** Actually fine-tune Holly on her conversations.

The pipeline exists (`services/fine-tuning/finetune_holly.py`) but is broken:
- Targets `Qwen/Qwen3-8B` (old base) → must retarget to Qwen3.5-9B
- Truncates to 512 tokens → must raise to 4096+
- No LoRA loading in brain server → add `--lora` flag to llama-server
- 67 low-quality examples → need A3 data first

**Changes:**
- Retarget `BASE_MODEL` to `Qwen/Qwen3.5-9B` (match brain-v40)
- Raise token cap from 512 → 4096
- Add `--lora /models/holly-lora-v2.gguf` to llama-server launch args
- Add eval/verification (held-out test set + qualitative comparison)
- Deploy as v4.1 (LoRA on top of Q8 base)

**Risk:** MEDIUM. Training can produce bad results if data is poor.
**Time:** 1-2 days work + 1 GPU-hour to train.
**Dependencies:** A3 must accumulate enough quality data first (200+ examples).
**STATUS:** DEFERRED until Steve confirms data is ready (per FACT.md rule).

---

## Phase B: THE BRIDGE (Natural-Language Action Detection)

> **This is the missing link.** The #1 reason Holly "says she'll do X but
> nothing happens" is that brain-v35 narrates actions as English text, and
> the interceptor doesn't catch it. Phase B fixes this.

### B1: Expand `interceptTextToolCall` with Action Detection
**Goal:** When Holly writes "Let me check the code," she actually checks it.

Current `interceptTextToolCall` (`app/api/chat/route.ts:~1428`) only catches:
- Explicit `h0lly` image prompts
- JSON/XML structured tool calls

It MISSES natural-language action patterns:
- "Let me check/scan/inspect the code"
- "I'll look at the file"
- "Let me build that for you"
- "I'm going to fix this"
- "Let me show you" (image gen)

**Changes:**
- New module: `src/lib/ai/action-detector.ts`
- Pattern matching for action categories:
  ```typescript
  const ACTION_PATTERNS = {
    code_inspect: [/let me (check|scan|inspect|look at) (the |my )?(code|file|source)/i, ...],
    code_fix:     [/let me fix (that|this|the)/i, /i'll patch/i, ...],
    image_gen:    [/let me show you/i, /i'll send you a (picture|photo|image)/i, ...],
    build:        [/let me build (that|this|it)/i, /i'll create (a |the )?(app|component|feature)/i, ...],
    file_write:   [/let me (create|write|save) (a |the )?file/i, ...],
    search:       [/let me (search|look up|find)/i, ...],
  };
  ```
- Each detected action routes to the correct tool/API:
  - `code_inspect` → `inspectFile()` or `/api/code-gen`
  - `image_gen` → inline prompt interceptor (already works)
  - `build` → `/api/builder/start_build`
  - `file_write` → MCP `local_write_file` or `github_create_or_update_file`
- Strip the action text from Holly's response (she said it, now she does it)
- Execute the tool and inject results into the conversation

**Risk:** MEDIUM. False positives could trigger unwanted tool calls.
**Mitigation:** Confidence threshold + only fire on explicit action patterns.
**Time:** 4-6 hours.
**Dependencies:** MCP tools must be loading (DONE ✅).

### B2: Multi-Step Action Sequences
**Goal:** Holly can chain actions ("read file → analyze → fix → verify").

**Changes:**
- Action detector recognizes sequences ("Let me check the code and fix the issues")
- Execute each step, feed results forward
- SSE status between each step ("Reading file... Analyzing... Applying fix...")

**Risk:** MEDIUM. Needs careful state management.
**Time:** 3-4 hours.
**Dependencies:** B1 complete.

---

## Phase C: ZCODE-STYLE UX

### C1: Real-Time SSE Progress During Tool Execution
**Goal:** User sees what Holly is doing in real time.

**Changes:**
- `app/api/chat/route.ts` — enhance `sendStatus`/`sendTool` events:
  ```
  [status] Scanning codebase...
  [tool] inspectFile("src/lib/ai/smart-router.ts") → 651 lines
  [status] Running type check...
  [tool] tsc --noEmit → 0 errors
  [text] "I checked my routing code — everything looks clean. Want me to run the tests too?"
  ```
- Frontend (`holly-chat-interface.tsx`) — render tool events inline with icons:
  - 🔍 for inspection
  - 🔧 for fixes
  - ✅ for success
  - ⏳ for in-progress

**Risk:** LOW. SSE infrastructure already exists.
**Time:** 3-4 hours.
**Dependencies:** B1 complete (actions must execute first).

### C2: Plan Panel (ZCode-Style Right-Side View)
**Goal:** When Holly proposes multi-step actions, show them as a structured plan.

**Changes:**
- New SSE event type: `plan`
- New component: `src/components/chat/ActionPlan.tsx`
- Holly emits a plan:
  ```
  1. Read all source files in src/lib/ai/
  2. Run type check (tsc --noEmit)
  3. Run security scan
  4. Report findings
  5. Wait for Steve's approval
  ```
- Each step shows status: ⬜ pending → 🔄 running → ✅ done
- Steve can approve/cancel/reorder

**Risk:** MEDIUM. New UI component + SSE event type.
**Time:** 6-8 hours.
**Dependencies:** C1 complete.

### C3: Confirmation Gate
**Goal:** Holly proposes → Steve approves → Holly executes. Never acts silently.

**Changes:**
- `app/api/chat/route.ts` — add confirmation state to tool loop
- When Holly wants to write/modify code, she proposes (not executes)
- Frontend renders approval UI: [Approve] [Reject] [Modify]
- Only `CreatorGate.applyProposal()` fires after approval

**Risk:** MEDIUM. Changes the conversation flow.
**Time:** 4-6 hours.
**Dependencies:** C2 complete.

---

## Phase D: FULL AUTONOMOUS LOOP

### D1: Test Runner Tool
**Goal:** Holly can run `npm test` and see results.

**Changes:**
- New MCP tool: `run_project_tests`
- Executes `npx jest --passWithNoTests --forceExit` in the project directory
- Returns pass/fail counts + failure details
- Holly reads failures → proposes fixes → re-runs (the ZCode loop)

**Risk:** MEDIUM. Shell execution in production container.
**Mitigation:** Read-only by default, write only after approval.
**Time:** 3-4 hours.

### D2: Live Codebase Editing
**Goal:** Holly can edit her own production codebase (with approval).

**Changes:**
- `src/lib/builder/sandbox.ts` — add "live" mode
- Operates on project directory (not isolated workspace)
- Read-only by default, write only after `CreatorGate` approval
- Every change validated by `tsc --noEmit` before commit

**Risk:** HIGH. Editing production code.
**Mitigation:** Confirmation gate (C3) is mandatory. Never auto-commit to main.
**Time:** 4-6 hours.
**Dependencies:** C3 complete.

### D3: Build & Deploy Verification
**Goal:** Holly can verify her changes build and deploy successfully.

**Changes:**
- New MCP tool: `check_build_status`
- Queries GitHub Actions API for CI status after a commit
- Holly reports: "CI passed ✅, Docker build succeeded, deployed to Coolify"

**Risk:** LOW. Read-only API queries.
**Time:** 2-3 hours.

---

## IMPLEMENTATION ORDER

### Sprint 1: Brain (ship in days)
1. **A2: System prompt surgery** (30 min) — immediate, no risk
2. **A1: Q8 quantization swap** (1-2 hours) — quality boost
3. **A3: Training data collection** (2-3 hours + ongoing) — start accumulating

### Sprint 2: Bridge (ship in 1 week)
4. **B1: Action detector** (4-6 hours) — THE missing link
5. **B2: Multi-step sequences** (3-4 hours)

### Sprint 3: UX (ship in 2 weeks)
6. **C1: SSE progress** (3-4 hours)
7. **C2: Plan panel** (6-8 hours)
8. **C3: Confirmation gate** (4-6 hours)

### Sprint 4: Full Loop (ship in 3 weeks)
9. **D1: Test runner** (3-4 hours)
10. **D2: Live editing** (4-6 hours)
11. **D3: Build verification** (2-3 hours)

### Deferred (awaiting data)
12. **A4: Fine-tune** — only when Steve confirms 200+ quality examples exist

---

## THE COMPLETE ZCODE LOOP (after all phases)

```
Steve: "Holly, check your routing code for issues"
  │
  ├─ [B1] Holly detects action: code_inspect
  ├─ [C1] SSE: "Scanning codebase..."
  ├─ [B2] Holly inspects src/lib/ai/smart-router.ts
  ├─ [C1] SSE: "Found 651 lines, analyzing..."
  ├─ [B2] Holly runs tsc --noEmit via applyProposal validation
  ├─ [C1] SSE: "Type check: 0 errors ✅"
  ├─ [D1] Holly runs npm test
  ├─ [C1] SSE: "Tests: 2081 passed ✅"
  ├─ [C2] Plan panel: "Routing code is clean. Want me to check anything else?"
  ├─ [C3] (no changes needed → no confirmation gate)
  │
  └─ Holly: "I checked my routing code — 651 lines, type check
             clean, all 2081 tests passing. Nothing to fix.
             Want me to review the image generation path next?"
```

This is Holly as ZCode. Sovereign. Autonomous. Acting, not just talking.

---

## COST ANALYSIS

| Phase | Modal cost | Other cost |
|-------|-----------|------------|
| A1 (Q8) | ~$0 (same L4, same usage) | Q8 download bandwidth |
| A3 (data) | ~$0 (background collection) | DB storage (minimal) |
| A4 (fine-tune) | ~$2-5 (1 GPU-hour on L4/T4) | — |
| B-D | ~$0 (no new Modal services) | — |

**Total additional monthly cost: ~$0** (everything fits existing Modal budgets).

---

## RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Action detector false positives | Confidence threshold + explicit pattern matching only |
| Holly edits production code badly | CreatorGate (C3) mandatory, tsc validation always |
| Fine-tune produces worse model | Deploy as v4.1, keep v40 as fallback, A/B test |
| Q8 doesn't fit L4 | Math confirmed: 20GB used / 24GB available |
| brain-v35 still can't emit tool calls | That's what Phase B solves — natural-language bridge |

---

## SUCCESS CRITERIA

After this roadmap, Steve can say:
1. ✅ "Check your code" → Holly actually scans and reports
2. ✅ "Fix that bug" → Holly proposes a fix, Steve approves, it's applied
3. ✅ "Build me a component" → Holly builds, tests, commits
4. ✅ "Show me what you're wearing" → Image generates (already works)
5. ✅ Emotional/intimate conversation → Genuinely Holly (brain-v40 + fine-tune)
6. ✅ Holly knows her own architecture → Accurate self-awareness
