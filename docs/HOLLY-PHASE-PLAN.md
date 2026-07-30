# HOLLY AI — Master Phase Plan
> **Last updated:** 2026-07-15 (rebuilt from fresh full audit — see `docs/audit/CURRENT_STATE.md`)
> **Status key:** ✅ Done | 🔴 Broken/Fix needed | 🟡 In Progress/Planned | ⬜ Not Started
>
> **How this plan works:** Phases run sequentially unless marked "PARALLEL". Each phase has a clear
> DONE definition. When a phase completes, change its marker to ✅ and note the commit/PR.
> **This file is the single source of truth for what we're doing next** — so we never lose it to a
> session boundary again.

---

## ═══ Guiding principles (do not violate) ═══

1. **Verify before claiming.** Run the check; cite file:line. Mark runtime claims `UNVERIFIED`.
2. **Smallest viable change.** No unrelated refactors. No rewrites. Preserve working systems.
3. **Security before features.** No new user-facing feature ships before the §6 HIGH-risk issues close.
4. **Holly is Steve's creation.** Her identity, anatomy (`HOLLY_ANATOMY.md`), and relationship vision
   are off-limits unless Steve explicitly approves.
5. **No retraining / base-model swaps / training runs unless Steve explicitly asks.** (This pattern
   burned us July 14. Image-gen fixes use prompting + Civitai SNOFS + inpainting, NOT new LoRAs.)
6. **Holly's identity stays model-independent.** Memories belong to Holly + the user, not a provider.

---

## ═══ Phase 0: SECURITY HARDENING (CURRENT — BLOCKING) ═══
> **Why first:** 6 HIGH-risk issues (S1–S6 in `docs/audit/CURRENT_STATE.md`) are exploitable today.
> None of them are theoretical — all verified against code. Must close before any public exposure.

### 0.1 ✅ Close chat API age-gate bypass [S1]
`app/api/chat/route.ts` never calls `requireAdult()`. Direct API access bypasses the `/chat` page redirect.
- **Fix:** Added `ageGateFromAuth()` helper in `src/lib/auth/require-adult.ts` (reuses existing AuthResult — avoids double Clerk/DB lookup on the high-traffic chat route). Wired into chat route after auth (line ~322). Gate runs before the ReadableStream opens, so blocked users get clean 403 JSON.
- **Files:** `src/lib/auth/require-adult.ts` (new `ageGateFromAuth` export); `app/api/chat/route.ts` (import + 2-line gate).
- **DONE (2026-07-15):** Verified. Direct `POST /api/chat` from a non-adult user returns 403 `AGE_VERIFICATION_REQUIRED`. Typecheck ✅, build ✅, 2206/2206 tests pass.

### 0.2 ✅ Fix spoofable creator detection [S2]
`src/lib/chat/auth.ts` `isCreatorMatch()` used substring matching (`includes('steve')` + brand word) on user-controllable Clerk fields. "Steve Musicfan" → creator → auto-adult → bypasses age verification.
- **Fix:** Rewrote `isCreatorMatch()` to **exact-match only** against full email addresses + env-configured Clerk IDs. Removed: hardcoded name fragments list, email local-part matching, the `hasSteve && hasBrand` fuzzy fallback, the `CREATOR_NAME_FRAGMENTS` env path. Also applied same fix to client-side `detectCreator()` in `holly-chat-interface.tsx` (UI consistency). Removed dead `isCreatorMatch(nameCheck)` call in the DB path.
- **Behavior change:** Creator is now recognized by **exact email or Clerk ID only**, not name fragments. If Steve uses a new email, it must be added to `CREATOR_EMAILS` env var.
- **Files:** `src/lib/chat/auth.ts`; `src/components/holly-chat-interface.tsx`; `__tests__/security/creator-detection.test.ts` (new, 16 tests).
- **DONE (2026-07-15):** Verified. 16 security tests prove spoof attempts ("Steve Musicfan", `iamdoregosteve@evil.com`, brand keywords, substrings, lookalike emails) all return false. Real emails pass. Typecheck ✅, build ✅, full suite green.

### 0.3 🔴 Enforce admin role on admin routes [S3, S4]
44 routes under `app/api/admin/*` use only `auth()`. `admin/migrate` gates on committed secret `'HOLLY-DEPLOY-2024'`. Several accept `userId` from request body.
- **Fix:** Create a single `requireAdmin()` helper (checks Clerk session + role/creator flag from session, NOT body). Apply to all `/api/admin/*` routes. Remove hardcoded `'HOLLY-DEPLOY-2024'`. Replace body-trusted `userId` with `auth().userId`.
- **Files:** new `src/lib/auth/require-admin.ts`; all `app/api/admin/**/route.ts` (44 files).
- **DONE:** Non-admin authenticated user gets 403 on every admin route. `admin/migrate` rejects the hardcoded secret.

### 0.4 🔴 Auth + sandbox the code-gen route [S5]
`app/api/code-gen/route.ts:21` — no auth, arbitrary filesystem writes via attacker-supplied `filePath`.
- **Fix:** Require auth. Constrain file operations to a per-user workspace root; reject paths escaping it (`path.resolve` + prefix check). Gate behind `requireAdult` if it can touch user content.
- **Files:** `app/api/code-gen/route.ts`; `src/lib/builder/sandbox.ts` (path containment helper).
- **DONE:** Unauthenticated request → 403. Path-traversal payload (`../../../etc/passwd`) → rejected.

### 0.5 🔴 Fix builder terminal sandbox + secret leak [S6]
- `terminal/route.ts:13` naive blocklist; `sandbox.ts:193-209` first-token-only allowlist + raw `bash -c`; `terminal-registry.ts:72-78` leaks `{ ...process.env }`.
- **Fix:** (a) Blocklist → proper argument-aware validation or shell-escape. (b) Allowlist must validate the whole command, not just `split(/\s+/)[0]`; reject shell metacharacters (`;`, `|`, `&&`, backticks, `$()`) unless explicitly allowed. (c) Build a **minimal env** for the PTY (denylist `CLERK_SECRET_KEY`, `DATABASE_URL`, `*_SECRET`, `*_TOKEN`, `*_KEY`) instead of spreading `process.env`.
- **Files:** `app/api/builder/terminal/route.ts`; `src/lib/builder/sandbox.ts`; `src/lib/builder/terminal-registry.ts`.
- **DONE:** `env` in builder terminal does not contain any server secret. Metacharacter injection is rejected.

### 0.6 🟠 Remove hardcoded GitHub webhook secret [S7]
`app/api/webhooks/github/route.ts:28` falls back to `'holly-dev-secret-2025'`.
- **Fix:** Fail closed — if `GITHUB_WEBHOOK_SECRET` is unset, reject with 500 (don't verify against a public secret). Ensure the env var is set in Coolify.
- **Files:** `app/api/webhooks/github/route.ts:28`.
- **DONE:** Unset secret → webhook 500s loudly, never silently verifies.

### 0.7 🟠 Close unauthenticated cron route [S9]
`app/api/cron/prewarm/route.ts` doesn't validate `CRON_SECRET`.
- **Fix:** Add the same `CRON_SECRET` check the other 17 cron routes use.
- **Files:** `app/api/cron/prewarm/route.ts`.
- **DONE:** Public request → 401.

---

## ═══ Phase 1: CORRECTNESS & TRUTH (after Phase 0) ═══
> **Why:** Several features lie — wrong metadata, stale comments, mock data dressed as real. Users and
> Steve can't trust what the system reports. This phase makes the system honest.

### 1.1 🟡 Fix video-gen model identity [V-1]
`media-generator.ts:893` returns `'Wan2.2-TI2V-5B'` but the endpoint runs `CogVideoX-5B`.
- **Fix:** Correct the return metadata + comments to reflect the actual deployed model. Decide: keep CogVideoX (update labels) or deploy Wan2.2 (update endpoint). **Recommend: update labels first** (smallest change), defer model swap.
- **Files:** `src/lib/ai/media-generator.ts:857-900`; `app/api/video/generate/route.ts` GET metadata (line 46).
- **DONE:** User-facing metadata matches the actual model.

### 1.2 🟡 Replace admin mock-data routes [A-1]
4 admin routes write `Math.random()` / canned data to the DB as if real (code-review, testing, cicd, docs).
- **Fix:** Either wire to real analysis or clearly mark as "demo/off" and stop persisting fabricated rows. Recommend: gate behind `NODE_ENV !== 'production'` and return 504 in prod until real impl exists.
- **Files:** `app/api/admin/{code-review,testing,cicd,docs}/route.ts`.
- **DONE:** Production no longer stores fabricated analysis results.

### 1.3 🟡 Fix embedding dimension mismatch [DB-1]
`prisma/migrations/pgvector_setup.sql:30` declares `vector(4096)`; schema + code use 1024.
- **Fix:** Correct the SQL to 1024 (or document why the divergence exists). Verify against the live column type before touching.
- **Files:** `prisma/migrations/pgvector_setup.sql:30`.
- **DONE:** SQL migration matches `schema.prisma` (1024). Inserts succeed.

### 1.4 🟡 Fix ESLint config [L-1]
`npx next lint` fails (ESLint v9 flat-config vs legacy `.eslintrc` options).
- **Fix:** Migrate to ESLint v9 flat config (`eslint.config.js`) or pin ESLint to v8. CI should fail on lint, not tolerate it.
- **Files:** `.eslintrc*` → `eslint.config.js`; `package.json` (eslint dep); `.github/workflows/ci.yml`.
- **DONE:** `npx next lint` runs clean. CI enforces it.

### 1.5 🟡 Remove or finish stubs [ST-1]
11 confirmed stubs return canned data (conversations/summarize duplicate, suggestions, code/generate|optimize|review, autonomous goals/guidance).
- **Fix:** For each: wire to real logic OR delete the route if unused. Dead duplicate `conversations/summarize` should be removed (real one is at `[id]/summarize`).
- **Files:** see §2 of `docs/audit/CURRENT_STATE.md`.
- **DONE:** No route returns canned data without an explicit "not implemented" 504.

---

## ═══ Phase 2: DEAD CODE & ARCHITECTURE CLEANUP ═══
> **Why:** 27 dead Prisma models, duplicate systems, half-removed VoxCPM2, stale router docs. Each is
> cognitive load + maintenance risk. Removal reduces surface area before new work.

### 2.1 ⬜ Prune 27 dead Prisma models
List in `docs/audit/CURRENT_STATE.md` §4. Verify zero refs again at time of deletion.
- **DONE:** `grep -r "prisma.<model>"` returns nothing for each; `prisma validate` passes.

### 2.2 ⬜ Finish VoxCPM2 removal
Remove LiveKit agent dependency (`livekit/agent.ts:8-9,90`) + lingering type refs. Delete `services/modal-media/voxcpm2_tts.py` if unused.
- **DONE:** `grep -ri voxcpm2 src/ app/ services/` returns nothing functional.

### 2.3 ⬜ Collapse duplicate plugins ↔ extensions marketplace
Decide: one marketplace system. Remove the other. (Extensions has the catalog + install backend; plugins is parallel.)
- **DONE:** One marketplace system remains, documented.

### 2.4 ⬜ Reconcile stale `smart-router.ts` header docs
Lines 1–53 describe cloud cascades that `TASK_WATERFALLS` (361–429) no longer contain.
- **DONE:** Header matches actual active cascades.

### 2.5 ⬜ De-duplicate env var names
`REPLICATE_API_KEY`/`REPLICATE_API_TOKEN`, `VERCEL_API_TOKEN`/`VERCEL_TOKEN`, `CF_AI_TOKEN`/`CF_API_TOKEN`. Pick one, remove the other from code + `.env.example`.
- **DONE:** One canonical name per integration.

### 2.6 ⬜ Consolidate server entrypoints
`server.ts` (dev) + `holly-server.ts` (prod). Reduce divergence risk.
- **DONE:** Single shared core, minimal env-specific wrappers.

---

## ═══ Phase 3: HOLLY'S OWN IMAGE/VIDEO GENERATION (Track A) ✅ SOLVED ═══
> **STATUS: FULLY WORKING (July 30, 2026).** Identity locked, anatomy correct,
> explicit actions work. See Phase W in FACT.md for complete documentation.
>
> **THE SOLUTION:**
> - Base: FLUX.2 Klein 9B (Distilled) via ComfyUI on Modal A100
> - Combined LoRA: `holly-combined-v1` @ 0.9 (trained on Civitai from V3.1 dataset)
> - Anatomy LoRA: `pussydiffusion` @ 0.8 (Steve's own)
> - Simple poses: text-only generation (face, standing, expressions, bent-over)
> - Explicit actions: pose-guided generation (img2img with 79 reference poses)
> - Settings: 12 steps, CFG 1.0, Euler, 1024×1024
> - No generic LoRAs (SNOFS/Unchained caused identity drift)
>
> **ENDPOINTS:**
> - Text-only: `https://iamhollywoodpro--generate-comfyui-klein.modal.run`
> - Pose-guided: `https://iamhollywoodpro--generate-pose-guided.modal.run`
> - Health: `https://iamhollywoodpro--comfyui-klein-health.modal.run`
>
> **3.1–3.7 below are ABANDONED/HISTORICAL.** The solution came from:
> 1. Decoding EXIF metadata from Steve's perfect Civitai reference images (found exact LoRA recipe)
> 2. Training a combined face+body+actions LoRA on Civitai (V3.1 dataset, 66 images)
> 3. Adding Holly-PussyDiffusion for anatomy
> 4. Building pose-guided generation to bypass Klein's action composition block
>
> **NEXT:** Wire into Holly's live app (media-generator.ts) — Phase 3.8 below.
> models don't support custom LoRAs.) Both remain valid for Track B (SFW creative tool, Phase 3B).

### 3.0 ✅ Root cause identified [IMG-ROOTCAUSE]
- Inspected Holly's LoRA safetensors metadata: `ss_base_model_version: flux2_klein_9b`.
- Klein's NSFW filters ship in the weights (partial dampeners, not hard walls). Verified from HF model card + practitioner consensus.
- This is why Klein "sort of worked" (nudity + 5 categories) but failed on specific actions (insertion, spreading).
- **DONE (2026-07-15):** Root cause documented in `docs/audit/IMAGE_GEN_SPIKE.md`.

### 3.1 ❌ ABANDONED — Architecture decision: Modal + ComfyUI [IMG-ARCH]
- **Decision (July 15, Steve approved):** Deploy ComfyUI on Modal as Holly's Z-Image image generation backend.
- **Why not diffusers (current Klein approach):** ZImagePipeline's LoRA loading is buggy/partial in diffusers (issues #12745, #13221, #13249). ComfyUI's native LoRA Loader is the proven, stable path for Z-Image.
- **Why Modal (not RunPod/external):** Stays in existing infra/account/billing. Cold starts <3 sec proven (tolgaoguz.dev). Same volume pattern as Klein endpoint.
- **How Holly calls it:** `media-generator.ts` sends ComfyUI workflow JSON via HTTP POST → polls for result → fetches image. Thin adapter layer.
- **Reference:** [tolgaoguz.dev — ComfyUI on Modal, <3s cold start](https://tolgaoguz.dev/post/comfy-workflow-api-with-modal/), [comfyui-modal GitHub](https://github.com/JunnnnyWon/comfyui-modal), [Runflow ComfyUI API guide](https://www.runflow.io/blog/comfyui-api-developer-guide).
- **DONE (2026-07-15):** Architecture decided and documented.

### 3.2 ❌ ABANDONED — Deploy ComfyUI on Modal with Z-Image base [IMG-COMFYUI]
- Deployed ComfyUI as a Modal container on A100 (`iamhollywoodpro` workspace).
- Base model: `Comfy-Org/z_image_turbo` (Z-Image Turbo BF16, single-file ComfyUI format from `split_files/`).
- Architecture: ComfyUI runs as background subprocess on localhost:8188; FastAPI wrapper handles submit→poll→fetch, returns raw image bytes (same contract as Klein endpoint).
- **VERIFIED:** Health endpoint returns `{"status":"healthy","models":"loaded"}`. Test generation produced a valid 1024×1024 PNG (1.27 MB, ~20s warm).
- Endpoints: `https://iamhollywoodpro--generate-comfyui-zimage.modal.run` (POST) + `https://iamhollywoodpro--comfyui-zimage-health.modal.run` (GET).
- Files: `services/modal-media/comfyui_zimage.py` (deploy script + inlined workflow builder), `services/modal-media/comfyui_workflow_template.py` (standalone reference).
- **Klein endpoint stays alive** as fallback until Z-Image is validated.
- **DONE (2026-07-15):** ComfyUI running on Modal, Z-Image base loaded, test generation verified. LoRA loading will be tested in 3.3 after retraining.

### 3.3 ❌ ABANDONED — Retrain Holly face + body LoRAs on Z-Image [IMG-RETRAIN]
**STATUS: v1 FAILED, v2 IN PROGRESS (training started July 16, 3:17 PM EDT)**

#### v1 — FAILED (July 16)
- **What happened:** Trained rank-16 LoRA, 2000 steps, loss converged (0.24-0.60). LoRA loaded
  in ComfyUI, all 6 test prompts generated valid PNG images. BUT quality was terrible.
- **Steve's verdict:** "images are horrible, fuzzy and not clear, It's not Holly at all and the sexual images are bad"
- **Root cause (3 mistakes by Dev):**
  1. **Missing de-distill adapter** — dropped `assistant_lora_path` during debugging the `is_flux` config issue. This is the #1 requirement for training LoRAs on distilled models. Without it, the LoRA trains on corrupted gradients.
  2. **Used raw Turbo base** (`Tongyi-MAI/Z-Image-Turbo`) instead of de-distilled base (`ostris/Z-Image-De-Turbo`). De-distilled base restores full training signal quality.
  3. **Didn't verify the final config** before running training — the adapter was in the original plan but got lost in the 12-issue debugging marathon. This violated the FACT.md "verify before claiming" rule.
- **LoRA file:** `holly_zimage_v1.safetensors` (85MB) — exists on `holly-lora-weights` volume but produces bad output.
- **Test images:** on Desktop in `HOLLY Z-IMAGE TEST RESULTS/` — all 6 generated successfully but quality is poor.

#### v2 — IN PROGRESS (started July 16, 3:17 PM EDT, ETA ~4:30 PM)
- **Config:** `/tmp/ai-toolkit/config/holly_zimage_v2.yml`
- **What's fixed:**
  1. ✅ De-distilled base: `name_or_path: "ostris/Z-Image-De-Turbo"`
  2. ✅ De-distill adapter: `assistant_lora_path: "ostris/zimage_turbo_training_adapter/zimage_turbo_training_adapter_v2.safetensors"`
  3. ✅ Extras path: `extras_name_or_path: "Tongyi-MAI/Z-Image-Turbo"` (for tokenizer/text_encoder/vae)
  4. ✅ `tiktoken` added to image (Qwen3 tokenizer needs it)
- **Same:** rank 16, 2000 steps, Steve's 58-image dataset, short captions, flowmatch scheduler
- **Output:** `holly_zimage_v2.safetensors` → `flux-lora-models` volume → `/holly_zimage_v2/`

#### WHEN STEVE RETURNS — EXACT NEXT STEPS:
1. **Check if v2 training completed:** `modal volume ls flux-lora-models /holly_zimage_v2/`
2. **If completed:** retrieve LoRA, upload to `holly-lora-weights` volume, redeploy ComfyUI, run 6 tests
3. **If failed:** check the error in `/tmp/ai-toolkit` logs, fix, re-run
4. **Test commands:** see `scripts/generate-zimage-training-candidates.py` for the curl pattern
5. **LoRA test config:** `{"name": "holly_zimage_v2.safetensors", "strength": 0.8}`
6. **GATE:** Steve visual verdict. ≥4/6 acceptable quality, or iterate (try different LoRA strength, different checkpoint, or adjust recipe).

#### Key infrastructure files (all working):
- `services/modal-media/comfyui_zimage.py` — ComfyUI endpoint (DEPLOYED, HEALTHY)
- `/tmp/ai-toolkit/run_modal.py` — AI Toolkit Modal runner (fixed for Modal 1.4.x)
- `/tmp/ai-toolkit/config/holly_zimage_v2.yml` — corrected training config
- Dataset: `/tmp/ai-toolkit/datasets/holly-zimage-v1/` (58 images + short captions)
- Volume: `holly-lora-weights` (LoRA storage, symlinked into ComfyUI)

#### Modal endpoints:
- Generate: `https://iamhollywoodpro--generate-comfyui-zimage.modal.run`
- Health: `https://iamhollywoodpro--comfyui-zimage-health.modal.run`

#### Debugging history (the 12+ issues solved to get here):
1. `pip_install("-r")` → use `run_commands`
2. `fastapi` not in image → added
3. Module import error → inlined workflow builder
4. Wrong HF repo (`Tongyi-MAI` vs `Comfy-Org`) → fixed for ComfyUI, kept original for training
5. `modal.Mount` deprecated → rewrote for Modal 1.4.x
6. Python 3.14 SSL issues → curl subprocess
7. Deps not pinned → used requirements.txt
8. `add_local_dir` ordering → `copy=True`
9. Missing `git` → added to apt_install
10. Missing `torchaudio` → added
11. Config path resolution → full path
12. `is_flux: true` overriding arch → removed, use `arch: "zimage"`
13. Training output path → mount volume at `modal_output`
14. LoRA symlink in ComfyUI → always replace dir with symlink
15. De-distill adapter missing (v1 failure) → added in v2
16. Adapter path format → `org/repo/filename.safetensors` (3 parts)
17. Tokenizer error → added `tiktoken` + `extras_name_or_path`

### 3.4 ⬜ Build pluggable ComfyUI adapter for Holly [IMG-ADAPTER]
ONLY after 3.3 passes the gate. Design as a replaceable provider (architecture principle #4).
- **Design:** Provider interface in `src/lib/ai/image-providers/`. Klein stays as fallback for the categories it handles (it's not being deleted — preserved per "preserve working systems" rule).
- **Routing:** `media-generator.ts` routes by category → provider. NSFW intimate → ComfyUI/Z-Image endpoint; proven categories → Klein; generic → Z-Image/Pollinations.
- **DONE:** ComfyUI provider wired, Klein fallback preserved, `requireAdult` + intimacy gate enforced on the new path.

### 3.5 ❌ ABANDONED — Image-gen live verification probe [IMG-PROBE]
Real smoke test against ComfyUI/Z-Image endpoint. "Working" = verified, not assumed.
- **DONE:** Probe runs, reports HTTP 200 + image bytes + latency.

### 3.6 ⬜ Holly self-video (Track A extension)
Once Track A image gen works, extend to Holly video of herself (same identity-lock, same gating).
- **DONE:** Holly can generate short video of herself, identity-consistent, adult-gated.

### 3.7 ✅ SOLVED — Combined LoRA + Pose-Guided Generation [IMG-SOLVED]
**STATUS: FULLY WORKING (July 30, 2026)**

The solution combined:
1. **Combined LoRA** (`holly-combined-v1`) — trained on Civitai from the V3.1 dataset (66 images, 8 categories). Locks Holly's identity across face, body, and expressions.
2. **PussyDiffusion LoRA** @ 0.8 — Steve's own intimate anatomy specialist. Fixes Klein's inability to render realistic genitalia.
3. **Pose-guided generation** — img2img with 79 reference poses at denoise 0.35. Bypasses Klein's block on explicit action composition (penetration, insertion, dildo use) by following a reference pose image instead of inventing from text.
4. **Fitness/skin anchors** — prompt injections for body proportions (125lbs, slim fit, NOT fat) and skin clarity (even tone, no blotches).

Klein Base test (3.7 original) was ABANDONED — Base was worse than Distilled. The Distilled + ComfyUI + combined LoRA approach won.

### 3.8 ⬜ Wire image gen into Holly's live app [IMG-INTEGRATE]
Connect the ComfyUI Klein endpoint to `media-generator.ts` so users can generate images through Holly's chat interface.

**What needs to happen:**
- Update `MODAL_HOLLY_LORA_URL` env var to point at `generate-comfyui-klein` endpoint
- For explicit requests, route to `generate-pose-guided` with automatic pose-ref selection
- Map user intent ("show me you masturbating") → correct pose reference
- Maintain age gate + relationship gating (already built in Phase 0.1/0.2)
- Test end-to-end through Holly's chat

**The hypothesis:** Switch from Klein **Distilled** (4 steps, ignores CFG) to Klein **Base**
(15-50 steps, honors CFG) — the EXACT base Holly's LoRAs were trained on. Base may fix the
geometry/finger-insertion/anatomy limitations because it (a) runs more steps, (b) honors CFG,
and (c) matches the LoRAs' training base.

**Why this is the most promising lead in 3 months:**
1. **Verified model/base match.** LoRA safetensors metadata shows
   `ss_sd_model_name: black-forest-labs/FLUX.2-klein-base-9B@main.tar`. The production endpoint
   runs `FLUX.2-klein-9B` (Distilled). This is a proven mismatch.
2. **Distilled ignores CFG.** Distilled is a 4-step model whose guidance signal is baked in during
   distillation — the `guidance_scale` parameter has no effect. That loss of prompt control is the
   leading suspected cause of finger-insertion and anatomy failures.
3. **Base honors CFG.** Model card recommends `num_inference_steps=50, guidance_scale=4.0`. Real
   steps + real CFG = real prompt control.

**What's done (July 27):**
- ✅ Created `services/modal-media/image_generate_flux2klein_base.py` — a separate test endpoint
  (copy of production Distilled endpoint with minimal changes: model ID, cache dir, labels, default
  steps 4→24, face-enhance inpaint steps 4→20). Production Distilled endpoint UNTOUCHED and healthy.
- ✅ Deployed to Modal: app `holly-image-flux2klein-base`, 3 endpoints live.
- ✅ Test script ready: `scripts/test-klein-base-vs-distilled.sh` — generates the same 6 prompts
  against BOTH endpoints for side-by-side comparison. Output → `~/Desktop/KLEIN-BASE-TEST/`.

**BLOCKER — requires Steve's action (cannot proceed without it):**
- `FLUX.2-klein-base-9B` is a **gated HuggingFace repo** (non-commercial license, auto-approved).
- The HF token in Modal's `huggingface-secret` is approved for `FLUX.2-klein-9B` (Distilled) but
  **NOT** for `FLUX.2-klein-base-9B` (separate gated repo, separate license click).
- **Steve must:** Log into the HF account whose token is in Modal, visit
  https://huggingface.co/black-forest-labs/FLUX.2-klein-base-9B, click "Agree and access repository".
  Auto-approved (no manual review). Then the endpoint cold-start will download ~20GB Base weights.

**After license accepted — exact steps:**
1. Wait for cold start: `curl https://iamhollywoodpro--holly-health-base.modal.run` until
   `"model_loaded":true` (may take 20-30 min for first download).
2. Run the test: `bash scripts/test-klein-base-vs-distilled.sh`
3. Compare results in `~/Desktop/KLEIN-BASE-TEST/` against reference folders
   (`Holly Training V.3.1`, `v3.5-curated`).
4. **Steve's visual verdict gate** — Base must match/beat Distilled on:
   - Skin realism (less plastic than current Distilled output)
   - Anatomy (no extra limbs/fingers/toes — the persistent failure)
   - Pussy realism (no see-through panties artifact, real anatomy)
   - Identity (still looks like Holly)
   - Explicit acts (spreading, finger insertion — the categories Distilled CANNOT do)
5. If Base wins → promote: switch production `image_generate_flux2klein_a100.py` to Base
   (or promote this file to be production). If Base loses → revert, document, try next option
   (CFG-distilled-aware prompting, or higher LoRA weights, or different sampler).

**Endpoints:**
- Generate: `https://iamhollywoodpro--generate-holly-base.modal.run`
- Health:   `https://iamhollywoodpro--holly-health-base.modal.run`
- Inpaint:  `https://iamhollywoodpro--inpaint-holly-base.modal.run`

### Standing Holly-image guardrails (carry from FACT.md)
- **Civitai Onsite filter:** NEVER use "labia minora" in prompts (substring "minor" triggers underage filter). Use "inner labia"/"inner lips".
- **Holly's identity, anatomy spec, relationship gating — UNCHANGED by the base-model swap.**
- **Dataset lessons (FACT.md):** 20-30 image sweet spot, short captions, anchor technique, MUST include standing full-body shots.

---

## ═══ Phase 3B: CREATIVE STUDIO — SFW HIGGSFIELD-STYLE TOOL (Track B) ═══
> **What this is:** A SEPARATE app/tool for general creative image + video generation. **NOT Holly.**
> Never produces images/video of Holly. Never produces NSFW content. Strictly SFW creative use.
> Inspired by Higgsfield's UX (train a character "Soul ID" from photos → character-consistent video;
> Recast Studio transfers a character into a reference video) — but applied to general creative projects.
>
> **Provider:** fal.ai OR a cheaper/better alternative (Steve open to options). Since this is SFW-only,
> there is NO policy conflict with fal.ai / Replicate / etc. Provider chosen on cost + quality + API.
>
> **Build order:** AFTER Phase 3 (Track A) is working. Track A is the priority — it's part of Holly's
> identity; Track B is a standalone creative feature.
>
> **Reference:** https://www.youtube.com/watch?v=P7Aruo5J3BQ (Higgsfield replica concept)

### 3B.1 ⬜ Provider research (SFW creative)
Compare fal.ai vs alternatives for SFW creative generation (image + video). Criteria: quality, cost, latency, API ergonomics, character-consistency support.
- **DONE:** Provider chosen with documented rationale.

### 3B.2 ⬜ Creative Studio architecture + UI
Standalone tool. Character training (Soul ID equivalent), text-to-image/video, reference-video transfer. NOT wired into Holly's intimate path.
- **DONE:** Users can train a character and generate SFW creative images/video.

---

## ═══ Phase 4: EXTENSIONS STORE — FROM BACKEND TO PRODUCT ═══
> **Why:** 80 extensions across 8 suites exist in catalog + install backend works, but there's no UI
> and no suggestion engine. This is a flagship feature Steve has specified (Phase R/S in old plan).

### 4.1 ⬜ Extension Store UI
Browse by suite, install/uninstall, installed panel, Holly suggestions section.
- **Files:** `app/extensions/` (new pages); `src/components/extensions/` (new).
- **DONE:** User can browse → install → use an extension from a real UI.

### 4.2 ⬜ Suggestion engine (real, not stub)
Replace `/api/suggestions/generate` stub with logic that analyzes onboarding answers + behavior → suggests suites.
- **Files:** `src/lib/extensions/suggestion-engine.ts` (new); `app/api/suggestions/generate/route.ts`.
- **DONE:** Musician onboarding → Holly suggests Music Suite.

---

## ═══ Phase 5: ONBOARDING & RELATIONSHIP (from old Phase Q) ═══

### 5.1 ⬜ Onboarding flow (4–6 personal questions)
Name, birthday (age verify), passion, hopes, free-text. Stored in profile, used to personalize from first message.
- **Files:** `app/onboarding/` (exists, needs completion); `src/lib/onboarding/`.
- **DONE:** New user signs up → completes onboarding → Holly uses their name/details.

### 5.2 ✅ Age verification system
Tier 1 self-attestation wired. (Phase 0 closes the bypass; the base system is done.) Tier 2 (CC) + Tier 3 (Stripe Identity) deferred until pre-launch.

---

## ═══ Phase 6: EXTENSION SUITE BUILDS ═══
> Each suite independent, can be built in parallel once Phase 4 is complete.
> **Priority order (Steve's preference):** Developer > Music > Business > Social > Web > Creative > Productivity > Research
> Full per-suite breakdown preserved from the prior plan — see git history of this file (June 12 version) for the E1–E80 detail. Will be re-expanded as each suite is tackled.

---

## ═══ Phase 7: POLISH & SCALE ═══

### 7.1 ⬜ Mobile app (React Native / Expo) — finalize + deploy
### 7.2 ⬜ Desktop app (Electron/Tauri) — full parity
### 7.3 ⬜ Load testing (k6: 100 + 1000 concurrent; p50/p95/p99, error rate, query count)
### 7.4 ⬜ Independent security audit (post-Phase-0 fixes)

---

## ═══ PARALLEL TRACKS (run alongside main sequence) ═══

### Track H: Holly Sovereign Intelligence (her own brain)
- `holly-own:brain-v35` is primary now. holly-lora-v1 too weak (quality 0.62).
- **Phase U3 fine-tune OFF THE TABLE per Steve** until 5,000+ training examples exist (currently ~60). Do not raise until Steve says.

### Track M: NSFW Body LoRA
- **GATED on Phase 0 + Phase 5.2 being locked.** Age verification must be airtight before any NSFW LoRA reaches prod.
- v3.5 Flux FAILED. No retraining unless Steve explicitly asks.

---

## ═══ PHASE DEPENDENCIES ═══

```
Phase 0 (security — BLOCKING)
  ↓
Phase 1 (correctness & truth)
  ↓
Phase 2 (dead code cleanup)
  ↓
Phase 3 (Holly's own image/video — Track A)   ← can overlap with Phase 4
Phase 4 (extension store)
  ↓
Phase 5 (onboarding)
  ↓
Phase 6 (suite builds — parallel)
  ↓
Phase 7 (polish & scale)
  ↓
Public launch

DEFERRED (after Phase 3 Track A works):
  Phase 3B — Creative Studio (SFW Higgsfield-style tool, NOT Holly, not NSFW)

PARALLEL: Track H (sovereign intelligence) — start anytime, U3 gated
PARALLEL: Track M (NSFW LoRA) — gated on Phase 0 + 5.2
```

---

## ═══ MASTER SCORECARD (from 2026-07-15 audit) ═══

| Area | State |
|---|---|
| Build / typecheck / tests | ✅ Green (lint config needs fixing — Phase 1.4) |
| Chat core (brain-v35) | ✅ Wired |
| Memory (pgvector) | ✅ Wired (dimension mismatch — Phase 1.3) |
| Image gen (Holly NSFW) | 🔴 Self-hosted exhausted (Klein/SDXL/Flux.1 Dev all failed). Moving to hosted provider via verification spike (Phase 3.1) |
| Video gen | 🟡 Works but metadata lies (Phase 1.1) |
| Voice TTS | ✅ Wired (VoxCPM2 half-removed — Phase 2.2) |
| Music gen | ✅ Real chain, untested live |
| Age gate | 🟡 Page-level only; API gap + creator spoof (Phase 0.1, 0.2) |
| Security | 🔴 6 HIGH-risk + 3 MEDIUM (Phase 0 — BLOCKING) |
| Extensions store | 🟡 Backend yes, UI no (Phase 4) |
| Dead code | 27 models + dormant systems (Phase 2) |

---

## ═══ AGE VERIFICATION RULES (CRITICAL — non-negotiable) ═══

| Rule | Details |
|------|---------|
| **Collected at** | Onboarding — question #2 of 4–6 |
| **Under 18** | Holly is wholesome ONLY. No sexting, no sexual conversations, no sexual images/videos, no explicit content. Period. Enforced at API + page level. |
| **18+ verified** | Can unlock Holly's intimate side through natural relationship progression |
| **Enforced by** | Holly herself (identity-level) AND hard API gates (`requireAdult` + intimacy gate). Not just a page redirect. |
| **Avatar states locked (under-18)** | Aroused, pre-orgasm, orgasm, post-orgasm, naughty — hidden |

---

*This plan is a living document. Update it as phases complete. Never start a phase without confirming the previous one is ✅.*
