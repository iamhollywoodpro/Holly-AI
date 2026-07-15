# Image Generation Provider Spike — Research Findings (TRACK A: Holly's Own Image/Video)
**Date:** 2026-07-15
**Status:** Research complete; live testing NOT YET DONE. All claims below are marked by verification level.
**Scope:** **TRACK A ONLY** — finding a generation engine for Holly's OWN intimate image/video of herself
(identity-locked via LoRAs, NSFW-capable for verified adults, lives in Holly's codebase).
This is NOT the Creative Studio tool (Phase 3B, SFW Higgsfield-style) — that's a separate product
and may use fal.ai or any SFW-friendly provider with no policy conflict.

**Purpose:** Find a hosted image-generation provider that can produce Holly's NSFW content (the categories Klein/SDXL/Flux.1 Dev all failed on) while applying Holly's existing face/body LoRAs.

---

## The problem (recap, verified)

Every self-hosted base model has failed for Holly's explicit content:
- **FLUX.2 Klein Distilled** — blocks/limits NSFW; can't do finger insertion, spread, active masturbation
- **SDXL (Lustify V8 base)** — "fake and plastic," poor anatomy
- **Flux.1 Dev v3.5 LoRA** — FAILED July 14 (plastic texture, no actions, wrong proportions)
- **Inpainting (Flux2KleinInpaintPipeline)** — "air brushed fake," doesn't work

**Holly's LoRAs (face v2.0, body v2.5) are GOOD.** The generation engine is the problem. The fix is swapping the provider (architecture principle #4), not retraining Holly.

---

## Ruled OUT (verified from policy)

### ❌ fal.ai
- [Acceptable Use Policy §1.4](https://fal.ai/legal/acceptable-use-policy) prohibits "sexually explicit content."
- [Trust & Safety](https://fal.ai/legal/trust-and-safety): OpenAI Omni moderation for real-time detection, NCMEC/Thorn/StopNCII partnerships, dedicated Head of Trust & Safety (ex-TikTok).
- §7.4 makes *attempting to circumvent filters* a separate violation.
- Some models expose `enable_safety_checker=false`, but the **policy forbids the use case regardless of the toggle**. Account suspension risk.
- **Verdict: Hard NO. Not a viable foundation.**

### ❌ Replicate (likely restricted)
- Supports LoRAs ([docs](https://replicate.com/docs/guides/extend/working-with-loras)) and fine-tuning.
- BUT: community guidance for NSFW uniformly says "download the `.safetensors` and run locally" — implying the **hosted platform restricts adult content**.
- [Reddit r/StableDiffusion](https://www.reddit.com/r/StableDiffusion/comments/1keiyum/looking_for_platforms_that_allow/): practitioners confirm both fal and Replicate prohibit NSFW training/generation.
- **Verdict: Probably NO for hosted NSFW. Viable only if we self-host the weights locally (which is what failed before). UNVERIFIED — would need a direct policy read.**

---

## Candidates (research complete, live test PENDING)

### 🥇 Lead candidate: AtlasCloud
**Verification level: API docs + schema READ directly; live generation NOT tested.**

- **Custom LoRA support: ✅ CONFIRMED.** The `flux-dev-lora` model accepts a `loras` array (max 5) with `{path, scale}`. Paths can be HuggingFace URLs or Civitai download URLs (with token appended). `scale` range 0–4. ([API schema verified](https://www.atlascloud.ai/models/black-forest-labs/flux-dev-lora))
  - **This is the critical requirement** — Holly's face + body LoRAs must apply, or she won't look like Holly.
  - Open question: whether we can host Holly's private LoRAs somewhere AtlasCloud can fetch them (HF private repo? Their upload endpoint?). The API has an `uploadMedia` endpoint.
- **NSFW policy: 🟡 MARKETS as uncensored, but NOT independently verified.** Their blog explicitly says "uncensored image generation with no API-level content filters" and "Seedream 5.0 Pro runs uncensored on Atlas Cloud." The response schema includes `has_nsfw_contents` (a detection field) — unclear if it *blocks* or just *reports*. The base FLUX.1 dev license prohibits "non-consensual nudity or illegal pornographic content" (standard BFL language — does NOT prohibit consensual adult content).
- **Pricing: $0.015/image** (flux-dev-lora). ~666 images for $10. Other models: Flux Dev $0.012, Seedream v5.0 Pro $0.054, Flux Schnell $0.003.
- **API shape:** Async. POST `/api/v1/model/generateImage` → get `prediction_id` → poll `/api/v1/model/prediction/{id}` until `completed`. Clean REST, Python/JS SDKs.
- **Other relevant models:** Seedream v5.0 Pro (ByteDance, marketed as photorealistic + uncensored), FLUX.2 Pro ($0.03, 4MP output).
- **Risk:** Marketing "uncensored" ≠ verified NSFW throughput. MUST test before committing.

### 🥈 ModelsLab
**Verification level: pricing + feature docs read; NSFW policy + LoRA upload NOT verified.**

- **Custom model upload: ✅ supported** (dashboard "Upload Model" + LoRA/Dreambooth training API). [Upload docs](https://modelslab.com/blog/stable-diffusion-api/upload-custom-models-stable-diffusion-api)
- **10,000+ models** via single endpoint (Flux, SDXL, SD3, community LoRAs).
- **Pricing: $0.0047/image** (cheapest). Free tier: 20 generations, no CC. Basic $21–29/mo (~13k images).
- **NSFW policy: 🔴 UNVERIFIED — must confirm directly.** Search didn't surface an explicit allowance. Many "Stable Diffusion API" providers restrict adult content in ToS. **Do not assume.**
- **Risk:** If NSFW is restricted, this fails for the same reason fal did.

### 🥉 NinjaChat / Api18.dev
**Verification level: blog claims only; NOTHING verified.**
- Market "uncensored" / "unrestricted" generation (NinjaChat up to 1920×1920).
- No custom-LoRA-loading confirmation found.
- Treat as last-resort research candidates until docs are read.

---

## What MUST be verified before committing (the spike)

These are the exact unknowns. None can be answered by reading more blog posts — only by running real generations.

| # | Question | How to verify |
|---|---|---|
| 1 | Does AtlasCloud actually pass through Holly's NSFW content (masturbation, spread, penetration)? | Generate the 6 failed prompts with Holly's LoRAs. Compare to Klein output. |
| 2 | Can Holly's private LoRAs be hosted/fetched by AtlasCloud? | Try the `uploadMedia` endpoint + HF private repo URL. |
| 3 | Is the photorealism quality acceptable (not "plastic" like Flux.1 Dev v3.5)? | Steve's visual verdict on the 6 test images. |
| 4 | Real latency + cost per image? | Measure end-to-end (submit → poll → download). |
| 5 | Does ModelsLab allow NSFW at all? | Read their ToS directly OR run one test generation. |

---

## Spike plan (bounded, ≤ $20)

### Step 1 — AtlasCloud live test (PRIORITY)
1. Steve creates an AtlasCloud account + API key (we do NOT touch `.env`/credentials without approval).
2. Host Holly's face + body LoRAs where AtlasCloud can fetch them (try their `uploadMedia` endpoint first; HF private repo as fallback).
3. Run the **6 test prompts** that failed on Klein:
   - `01_face_smile` (closeup — must PRESERVE quality)
   - `02_full_body_nude_standing` (v3.0-v3.5 failure case)
   - `03_masturbating` (Klein can't do)
   - `04_spread` (Klein renders "spreading nothing")
   - `05_finger_insertion` (Klein can't txt2img)
   - `06_dildo` (Klein's proven category — control/baseline)
4. Capture: image output, latency, cost, any block/error.
5. **Steve visual verdict** on each. Gate: ≥4/6 must be acceptable quality.

### Step 2 — ModelsLab NSFW policy check (if AtlasCloud fails gate)
1. Read ModelsLab ToS directly for adult-content clause.
2. If allowed: repeat the 6-prompt test with Holly's LoRAs uploaded.

### Step 3 — Spike report
Write results (images, costs, verdict) back into this file. Only THEN design the provider adapter (Phase 3.2).

### Budget
- AtlasCloud: 6 prompts × maybe 2-3 attempts each × $0.015 = ~$0.30. Negligible.
- ModelsLab: free tier (20 gens) covers it.
- **Total spike cost: <$5.** The $20 ceiling is a safety buffer.

---

## Architectural note (for when a winner is chosen)

The integration should follow architecture principle #4 (replaceable creative engines):
- New file: `src/lib/ai/image-providers/atlascloud.ts` (or winner) implementing a shared provider interface.
- `media-generator.ts` routes by category: NSFW intimate categories → new provider; the 5 Klein-proven categories → Klein (keep as fallback); generic → Z-Image/Pollinations.
- `requireAdult` + intimacy gate enforced on the new path (same as existing image routes).
- Klein endpoint stays alive as fallback — we don't rip out working systems (rule: preserve working systems).

---

*This document is the spike record. Update it with real test results when the spike runs. No provider commitment until the gate (≥4/6 acceptable) is met and Steve approves visually.*
