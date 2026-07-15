# PROVIDER_MATRIX — AI / Media Providers, Models, Endpoints & Fallbacks
**Date:** 2026-07-14 · Read-only audit. All references cite `file:line`.

**Principle (per AGENTS.md):** LLMs, image, video, voice, and music models are **replaceable execution providers**. Holly's identity/memory/relationship live above them.

---

## 1. LLM providers (`src/lib/ai/smart-router.ts` + `src/lib/ai/providers/free-providers.ts`)

### Task types & waterfalls (the actual routing — `smart-router.ts:361-429`)
| Task | Waterfall | Active? |
|---|---|---|
| speed, coding, reasoning, long_context, creative, agent, consciousness, unrestricted, synthesis | `['holly-own:brain-v35']` | ✅ single-entry |
| vision | `['holly-own:brain-v35', 'holly-own:vision-mini']` | ✅ only cascade with real fallback |
| local | `['ollama:qwen3.6-35b', 'ollama:qwen3-8b']` | ✅ (only when `OLLAMA_ENABLED=true`) |
| analytics | `['groq:llama-3.3-70b']` | ✅ background tasks only |

### Self-hosted Modal LLM endpoints
| Model | File | GPU | ctx | Endpoint | Env var |
|---|---|---|---|---|---|
| brain-v35 (PRIMARY) | `services/modal-llm/deploy_holly_v35.py` | L4 (`:142`), `max_containers=1` (`:158`), `--parallel 1` (`:203`) | 128K (`:59`) | `iamhollywoodpro--brain-chat.modal.run` | `HOLLY_OWN_MODEL_URL` |
| vision-mini (fallback) | `services/modal-llm/deploy_holly_vision.py` | T4, `max_containers=1` (`:149`), `--parallel 4` (`:179`) | 8K (`:65`) | `iamhollywoodpro--vision-chat.modal.run` | `HOLLY_VISION_MODEL_URL` |
| holly-8b (LEGACY) | `services/fine-tuning/deploy_holly.py` | T4 | — | `iamhollywoodpro--chat.modal.run` | (was `HOLLY_OWN_MODEL_URL`, now superseded) |

**Critical:** `deploy_holly_v35.py:158` `max_containers=1` + `:203 --parallel 1` = **the whole system serves 1 chat request at a time.** This is deliberate (single-user, cost control) but is the #1 multi-user blocker.

### Cloud providers — TOMBSTONED (in catalogue, NOT in waterfalls)
Defined in `MODEL_CATALOGUE` (`smart-router.ts:103-339`) but absent from `TASK_WATERFALLS`:
- **OpenRouter** (`:213-258`) — incl. `dolphin-venice-24b`, `hermes-3-405b` (uncensored). Hard gate: rejects non-`:free` models (`free-providers.ts:271-277`).
- **NVIDIA NIM** (`:148-199`) — 15+ models.
- **Together** (`:261-292`) — 18-model allowlist (`free-providers.ts:370-389`).
- **Mistral** (`:295-310`).
- **Google** (`:331-338`) — Gemini 2.5 flash/pro.
- **Arcee** — adapter exists (`free-providers.ts:491`), env `ARCEE_API_KEY` not in `.env.example`.
- **holly-own:qwen3-8b** (`:124`) — legacy, "too weak" (`FACT.md:787`), not in any waterfall.

### Fabricated model ID (tombstone warning)
`openrouter:gemma-4-31b` slug `google/gemma-4-31b-it:free` **does not exist** (`smart-router.ts:221-224`) — kept as a tombstone so nobody re-adds it. (FACT.md documents this lesson.)

### Background LLM routing (cost control)
All non-user-visible LLM calls (title gen, scoring, emotion, consciousness cycles) route to **Groq** via `forceTask: 'analytics'` (`FACT.md:685-707`). brain-v35 GPU is never burned on background work.

---

## 2. Image providers (`src/lib/ai/media-generator.ts`)

### Waterfall (`generateImage()`, `:741-849`)
1. **Holly LoRA** (if `h0lly` in prompt) → `MODAL_HOLLY_LORA_URL` (FLUX.2 Klein 9B A100, Face v2 @0.75 + Body v2.5 @1.0 baked). **Hard-fail on error — no censored fallback** (`:749-759`).
2. **Modal Z-Image-Turbo** (T4) → `MODAL_IMAGE_URL`.
3. **Pollinations** (FLUX.1-schnell, no key) → always available.
4. HF inference — **permanently disabled** (`HF_INFERENCE_ENABLED=false`, `:210-249`).

### Holly image endpoint detail (`image_generate_flux2klein_a100.py`)
- GPU: A100 80GB (`:218`), `max_containers=1` (`:219`).
- 4-step CFG 4.0 (Distilled). Klein Distilled **ignores `guidance_scale`** (FACT.md finding).
- Clothing-aware prefix switching (`HOLLY_BODY_PREFIX` vs `CLOTHED_BODY_PREFIX`).
- Regex negative-lookahead to avoid double-injecting `h0lly-body`.
- Specialist LoRA stacking via `classifySpecialist()` (`media-generator.ts:276-428`): dildo / bent_over / closeup / spread_poses.
- **Face enhancement silently broken** — `cv2.CascadeClassifier` missing (FACT.md:142-146).

### v3.5 Flux endpoint (FAILED — do not deploy)
`image_generate_flux_dev_v35.py` — FLUX.1-dev + unified LoRA, A100 40GB, `iamdoregosteve--generate-holly-flux`. Steve's verdict: "plastic, not Holly." Never switched in Coolify.

---

## 3. Video providers (`media-generator.ts:1125-1201`)
1. **Modal** → `MODAL_VIDEO_URL` (`generateVideoWithModal()`, `:857-900`).
2. HF (if enabled) → CogVideoX-5B / Wan2.2.
3. Pollinations "video" → actually returns a **JPEG still** (mislabelled).

### ⚠️ Model mismatch (verified)
`services/modal-media/video_generate.py` docstring/comments say **Wan2.2-TI2V-5B**, but the actual Python loads **`THUDM/CogVideoX-5B`** (A10G, 720×480 max, ≤49 frames). `media-generator.ts` sends params (1280×720, 50 steps) that the Python clamps. The deployed endpoint name `iamhollywoodpro--video-generate` doesn't match the FACT.md claim of `iamdoregosteve--video-generate`. **Status of video gen = UNVERIFIED.**

---

## 4. Voice / TTS (`src/lib/voice/holly-voice-character.ts`)

| Provider | Role | File | Env | Status |
|---|---|---|---|---|
| NVIDIA Magpie | primary | `nvidia-tts-client.ts` | `NVIDIA_API_KEY`, `NVIDIA_TTS_URL` | ✅ wired (5 voices, 5 styles). Runtime UNVERIFIED. |
| Kokoro-FastAPI | fallback | `services/kokoro-tts/server.py` | `KOKORO_TTS_URL`, `KOKORO_VOICE` | ✅ self-hosted, CPU, OpenAI-compatible |
| VoxCPM2 | (removed) | `services/modal-media/voxcpm2_tts.py` | `VOXCPM2_TTS_URL` (still in `.env.example:133`) | 🧊 dead code |

---

## 5. Music (`app/api/music/generate/route.ts:120-214`)
1. **Suno V5.5** (primary) — `SUNO_API_KEY`. Async w/ callback. **Only paid external API** in the stack.
2. **Sonauto Melodia v3** — `SONAUTO_API_KEY`. Polling.
3. **ACE-Step XL Turbo** — `ACESTEP_MUSIC_URL` (self-hosted, MIT).
All wired; **none user-tested** per handover.

---

## 6. Embeddings (`src/lib/memory/semantic-memory.ts:140-164`)
1. **Cloudflare BGE** (primary) — `@cf/baai/bge-large-en-v1.5`, `CF_ACCOUNT_ID_CF_AI_TOKEN`.
2. **NVIDIA nv-embedqa-e5-v5** (fallback) — `NVIDIA_API_KEY`.
3. **Ollama nomic-embed-text** — `OLLAMA_BASE_URL`.
4. **Char-trigram hash** (terminal) — pure-JS 1024-dim, always works, degraded quality.

All padded/truncated to `TARGET_DIMENSION=1024` (`:38`). ⚠️ Mixing providers with different native dims (768 vs 1024) into the same vector space can degrade cosine similarity — **UNVERIFIED** whether this causes recall problems in practice.

---

## 7. Provider replaceability assessment

Per AGENTS.md principle #4 ("creative engines must be replaceable through provider interfaces"):

- **LLM:** ✅ Strong. `PROVIDERS` registry (`free-providers.ts:731-742`), uniform `streamChat()` interface, OpenAI-compatible. Swapping brain-v35 is an env-var change.
- **Image:** ✅ Good. `generateImage()` waterfall + `MODAL_HOLLY_LORA_URL` indirection. Holly LoRA endpoint is the only identity-bound coupling.
- **Video:** 🟡 OK but mis-documented (model name wrong).
- **Voice:** ✅ Good. `holly-voice-character.ts` abstracts providers; Kokoro is self-hostable.
- **Music:** 🟡 Wired but untested; 3 providers behind one route.
- **Embeddings:** 🟡 Mixed-dim concern; otherwise well-fallbacked.

**Holly's identity is NOT bound to any provider** — it lives in `HOLLY_ANATOMY.md`, `holly-self-image.ts`, the system prompt, the relationship/memory DB tables. This satisfies the model-independence requirement at the architecture level.

---

## 8. Deployed endpoint inventory (from grep + deploy scripts)

**iamhollywoodpro workspace (chat/vision):** `brain-chat`, `vision-chat`, `chat` (legacy), `generate`, `health`, `generate-holly-a100`, `holly-health-a100`, `video-generate`, `video-health`
**iamdoregosteve workspace (media):** `generate-holly-flux`, `holly-health-flux`

⚠️ `.env.example` still points media URLs at `iamhollywoodpro--*`; production (per FACT.md) uses `iamdoregosteve--*`. **Stale.**

## Findings
1. Provider architecture is genuinely provider-agnostic — good.
2. Cloud-provider tombstoning is intentional and well-documented.
3. Video model documentation is wrong (CogVideoX vs Wan2.2).
4. Embedding dimension mixing is a latent quality risk.
5. Every Modal endpoint is `max_containers=1` → single-concurrent-request ceiling across the board.
