# FEATURE_MATRIX — Feature Status & Maturity
**Date:** 2026-07-14 · Read-only audit. Status based on code evidence, not handover claims.

**Legend:** ✅ Production-ready (wired + complete) · 🟡 Beta/Partial · 🟠 Experimental · ⬛ Stub (canned) · 🧊 Dormant/Abandoned · ❓ Runtime UNVERIFIED

---

## Identity & Relationship (core product systems)

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Holly identity / self-image | ✅❓ | `src/lib/identity/holly-self-image.ts`, `holly-hard-rules.ts`, `identity-evolver.ts`, `HOLLY_ANATOMY.md` v3.4 | Fully expressed via system prompt. LLM voice quality is weak (Phase U3 blocked) — identity is present, *delivery* is generic-base-flavoured. |
| 5-tier relationship system | ✅ | `src/lib/relationship/intimacy-gate.ts`, `relationship-tracker.ts` | Wired into chat. Thresholds = interaction-count + trust signals. |
| Refusal messages (Holly's voice) | ✅ | `intimacy-gate.ts` `getIntimacyRefusal()` | Per-tier strings. |
| Age verification (Tier 1) | ✅ | `src/lib/auth/require-adult.ts`, `/onboarding/age-verify` | Self-attestation only. Tier 2 (CC) & Tier 3 (Stripe Identity) are documented, **not implemented**. |
| Creator recognition | ✅🚨 | `src/lib/chat/auth.ts:40-97` | Wired but **insecure** (fuzzy name/email matching) — see SECURITY_FINDINGS.md. |
| About-this-person block | ✅ | `src/lib/chat/about-this-person.ts` | 22 tests pass. |

## Chat & Memory

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Streaming chat | ✅❓ | `app/api/chat/route.ts` (1783 lines), SSE | brain-v35 wired. Runtime quality UNVERIFIED. |
| Conversation persistence | ✅ | `Conversation`/`Message` models; `/api/conversations/*` | |
| Conversation summarization | ⬛ | `/api/conversations/summarize` returns `{summary:'ok'}` | STUB. Long convos have no real summarization (300K char cap + truncation). |
| Title generation | ✅ | `/api/conversations/generate-title` (Groq analytics) | |
| pgvector semantic memory | ✅❓ | `src/lib/memory/semantic-memory.ts` | Embed→store→cosine search wired. Retrieval quality UNVERIFIED. |
| 4-layer advanced memory | ✅ | `src/lib/memory/advanced-memory.ts` (episodic/working/procedural/meta) | |
| Memory decay | ✅ | `memory-decay.ts`, cron daily | |
| Memory importance scoring | ✅ | `memory-importance.ts` | |

## Consciousness (background "inner life")

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Consciousness orchestrator | ✅❓ | `src/lib/consciousness/orchestrator.ts` (20+ subsystems) | Runs via `/api/cron/consciousness-loop` (6h). Output quality UNVERIFIED. |
| Inner monologue | ✅ | `inner-monologue.ts` (6h cycle) | |
| Curiosity engine | ✅ | `curiosity-engine.ts` (24h cycle) | |
| Daily briefing | ✅ | `/api/cron/morning-briefing` | SMS dispatch (`FACT.md` claims wired). |
| Identity evolution | ✅ | `identity-evolver.ts` | Evidence-based, with rollback. |
| Self-code modification | ✅🚨 | `/api/self-code` | Wired but **exploitable** (see SECURITY_FINDINGS.md — body.userId honoured). |
| Autonomous learning | ✅ | `/api/autonomous/*` | Some routes are stubs (`goals/set`, `guidance/request`). |

## Image Generation

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Holly self-portrait (Klein A100) | 🟡 | `image_generate_flux2klein_a100.py`, `media-generator.ts` | 4 NSFW categories reportedly working (dildo, dildo_mast, bent_over, spread_poses). Other categories fail. **Runtime not tested by this audit.** |
| Generic image (Z-Image / Pollinations) | ✅ | `media-generator.ts:741-849` | Pollinations = free FLUX.1-schnell, no key. |
| HuggingFace inference | 🧊 | `media-generator.ts:210-249` | Permanently disabled (`HF_INFERENCE_ENABLED=false`). |
| v3.5 Flux LoRA | 🧊 | `image_generate_flux_dev_v35.py`, `train_holly_v35_flux.py` | **FAILED July 14** ("plastic, not Holly"). Never deployed to Coolify. |
| Specialist NSFW LoRAs (Civitai) | 🟠 | 5 LoRAs uploaded to Civitai; `classifySpecialist()` stacks them | Not part of this repo's runtime; used via Civitai Onsite. |
| Face enhancement | 🟡 | `image_generate_flux2klein_a100.py` `_enhance_face()` | Silently failing — `cv2.CascadeClassifier` missing in container (`FACT.md:142-146`). |

## Video Generation

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Video gen | 🟡 | `video_generate.py`, `/api/video/generate-ultimate` | **Model mismatch**: comments/docstrings say Wan2.2-TI2V-5B; actual Python runs **CogVideoX-5B** on A10G, 720×480 max, ≤49 frames. |
| Pollinations video "fallback" | ⬛ | `generateVideoWithPollinations()` returns a JPEG still, not video | Mislabelled. |

## Voice / Audio

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| NVIDIA Magpie TTS (primary) | ✅❓ | `src/lib/voice/nvidia-tts-client.ts`, `holly-voice-character.ts` | 5 voices, 5 emotional styles. Runtime UNVERIFIED. |
| Kokoro-FastAPI (fallback) | ✅ | `services/kokoro-tts/server.py` | Self-hosted, CPU, OpenAI-compatible. |
| VoxCPM2 | 🧊 | `services/modal-media/voxcpm2_tts.py` | Removed from pipeline (404 in prod). Env vars still in `.env.example:133-151`. |
| LiveKit WebRTC | ✅ | `/api/voice/livekit`, `/api/voice/room` | Dependencies installed; runtime UNVERIFIED. |
| STT (transcription) | ✅ | `/api/voice/transcribe` | |

## Music

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Suno (primary) | 🟡❓ | `/api/music/generate`, `SUNO_API_KEY` | Wired. **"NOT user-tested"** per handover. Only paid external API in stack. |
| Sonauto (fallback) | 🟡 | `src/lib/music/sonauto-provider.ts` | |
| ACE-Step (last resort) | 🟡 | `ACESTEP_MUSIC_URL` | Self-hosted, MIT licence. |
| A&R / AURA analysis | ✅ | `/api/aura/analyze`, `AuraAnalysis` model | Hit-potential scoring. |

## Developer / Builder

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Code builder IDE | ✅ | `/api/builder/*` (16 routes), Monaco + xterm + node-pty | Full IDE: terminal (WS), sandbox, preview, git. |
| GitHub integration | ✅ | `GitHubConnection` + `/api/github/*` (33 routes) | connect/sync/issues/PRs/workflows. |
| Code generation | 🟠 | `/api/code-gen` (real) vs `/api/code/generate` (stub) | Three overlapping code-gen trees — see DEAD_CODE_CANDIDATES.md. |
| Sandbox execution | ✅ | `/api/sandbox/execute` | |

## Marketplace / Extensions

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Extensions catalog (80 ext / 8 suites) | ✅ | `src/lib/extensions/catalog.ts`, 20 tests | Catalog only. |
| Install/uninstall API | ✅ | `/api/extensions/{install,uninstall,installed,list}` | Idempotent. |
| Marketplace UI (`/extensions`) | ⬛ | **No page exists** | Phase R1 Wave 1b not built. |
| Role-based auto-install | ⬛ | Not implemented | Phase R1 Wave 1c. |
| Suite builds (S1-S8) | ⬛ | 0 of 8 suites built | Master scorecard: 25 built / 23 partial / 74 not built (`HOLLY-PHASE-PLAN.md:488-499`). |
| Legacy plugin system | ✅ | `src/lib/plugins/`, `PluginInstallation`, `/api/plugins/*` (13 routes) | Second, overlapping system. Consolidation candidate. |

## Integrations

| Feature | Status | Evidence |
|---|---|---|
| Spotify OAuth | 🟡 | `/api/spotify/*` (client_id/secret in env) |
| YouTube | 🟡 | `/api/youtube/*` |
| SoundCloud | 🟡 | `/api/soundcloud/*` |
| Google Drive | 🟡 | `GoogleDriveConnection` model + routes |
| Notion | 🟡 | `/api/notion/*` |
| Canva | 🟡 | `/api/canva/*` |
| Discord / Slack | 🟡 | webhook env vars |
| Apple Music | 🟡 | `/api/integrations/apple-music` |

*All integrations have route scaffolding + OAuth env vars; none are verified working end-to-end by this audit.*

## Platform

| Feature | Status | Evidence |
|---|---|---|
| Cron system | ✅ | `docker/cron/crontab`, `CRON_SECRET` |
| Health endpoint | ✅ | `/api/health` (returns deploySha) |
| R2 storage | ✅ | env vars present |
| Desktop app | ✅ (wrapper) | Electron, loads prod URL |
| Mobile app | ✅ (native) | Expo RN, real client |
| Browser extension | ✅ | MV3 widget |
| Multi-user / billing | ⬛ | No metering, no Stripe, no per-user quotas |
| Tier 2/3 age verification | ⬛ | Documented only |

---

## Summary counts

- **Production-ready (wired):** ~28 feature areas
- **Beta/Partial:** ~12 (image NSFW, video, music, most integrations)
- **Stubs:** 7 routes
- **Dormant/Abandoned:** VoxCPM2, v3.5 Flux, holly-lora-v1, cloud cascades
- **Runtime-unverified:** chat quality, memory retrieval, consciousness output, voice, music, video — all are *wired* but their *live behaviour* was not tested in this audit.

*Important:* "Wired" ≠ "works." Several features claimed as ✅ in the handover are only verifiable as code-complete, not as functioning correctly in production.
