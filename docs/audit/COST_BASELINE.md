# COST_BASELINE — Cost, Scalability & Multi-User Economics
**Date:** 2026-07-14 · Read-only audit. Figures from `FACT.md` and deploy scripts; **marked UNVERIFIED where not independently confirmable.**

---

## 1. Current cost posture (per FACT.md + deploy scripts)

### Modal GPU endpoints (the primary cost driver)
| Endpoint | GPU | Rate (FACT.md) | `max_containers` | `--parallel` |
|---|---|---|---|---|
| brain-v35 (chat) | L4 24GB | ~$0.80/hr (`deploy_holly_v35.py:142`) | 1 (`:158`) | 1 (`:203`) |
| vision-mini | T4 | cheaper | 1 (`deploy_holly_vision.py:149`) | 4 (`:179`) |
| image (Z-Image) | T4 | ~$0.0001/image (`.env.example:167`) | 1 (`image_generate.py:58`) | — |
| Holly image (Klein) | A100 80GB | ~$2.10/hr (`FACT.md:672`) | 1 (`:219`) | — |
| video | A10G | ~$0.028/video (`.env.example:184`) | 1 (`video_generate.py:74`) | — |

**Workspace split (function-based):** `iamhollywoodpro` (chat/vision), `iamdoregosteve` (media). Rationale: $30/mo free tier × 2 = $60/mo combined ceiling (`FACT.md:657-672`).

### Burn-rate estimates (from FACT.md, UNVERIFIED — not independently measured)
- iamhollywoodpro (chat L4 + vision): ~$14/month
- iamdoregosteve (media A100/A10G): ~$17/month
- Combined: ~$31/month, under the $60 free-tier ceiling.

### Other services (free tiers)
- **Groq** — free, 14,400 req/day (background analytics only)
- **Neon Postgres** — free tier (connection_limit=10, `db.ts:6`)
- **Clerk** — free tier
- **Cloudflare** — R2 + Workers AI (free tier)
- **Pollinations** — free image/video
- **NVIDIA NIM** — free tier (Magpie TTS + embeddings fallback)
- **Oracle Cloud** — free tier ARM64 (4 OCPU / 24GB RAM / 146GB disk)
- **Suno** — **the only paid external API** (`SUNO_API_KEY`)

### Documented spend to date (FACT.md, UNVERIFIED)
- Modal rounds 1-8 + smoke tests: ~$9.15 of $10 budget
- A100 brain-v35 migration (July 2, reverted): burned $7.97 in 2 days
- v3.5 Flux training + validation: ~$10

---

## 2. The single-concurrency ceiling (verified from code)

**This is the dominant cost/scalability fact:** every Modal endpoint runs `max_containers=1`, and brain-v35 runs `--parallel 1`. Verified:
- `deploy_holly_v35.py:158` `max_containers=1`
- `deploy_holly_v35.py:203` `"--parallel", "1"`
- `image_generate_flux2klein_a100.py:219` `max_containers=1`
- `video_generate.py:74` `max_containers=1`
- All other media endpoints: `max_containers=1`

**Consequence:** the entire Holly deployment can serve **one chat request, one image job, and one video job at a time, system-wide.** A second concurrent user either queues (if Modal scales — it won't, because max_containers=1) or receives an error. This is acceptable for the current single-user (Steve) reality and is a deliberate cost-control choice, but it is the **hard ceiling** for multi-user.

The `--parallel 1` choice is doubly locked-in: FACT.md documents that `--parallel 4` caused the July 2 outage (divided 128K context into 4×32K slots). Raising parallelism needs a GPU that fits N×full-context KV cache.

---

## 3. What prevents multiple simultaneous paying users

| Barrier | Detail | Fix path |
|---|---|---|
| **1 GPU for all chat** | brain-v35 `max_containers=1`, `--parallel 1` | Raise `max_containers` (paid Modal tier) + horizontal autoscale; revisit `--parallel` with a bigger GPU (A100 40GB+) — needs cost math first. |
| **1 GPU for all media** | image/video endpoints single-container | Same: raise `max_containers`, accept higher spend. |
| **Single app instance** | Docker compose has no replicas; Oracle box = 4 OCPU/24GB | Containerize for horizontal scaling; move off single Oracle box or add replicas. |
| **No usage metering/billing** | No Stripe, no per-user quotas, noMetering tables | Build metering + Stripe + the planned Tier 2/3 age verification. |
| **Insecure multi-tenant auth** | fuzzy creator match (SECURITY_FINDINGS S2) | Replace with verified Clerk ID allowlist / DB role column. |
| **DB pool = 10** | `db.ts:6` | Adequate for 1 user; saturates under concurrency. Neon autoscaling or paid tier needed. |
| **8.45GB image, 146GB disk** | FACT.md: fills within ~15 deploys | Daily prune cron installed; needs larger disk for multi-user data volume. |
| **Embedding dim mixing** | semantic-memory.ts pads 768→1024 across providers | Potential recall degradation under load; standardize on one provider/dim. |

---

## 4. "Holly Cloud" requirements (multi-tenant hosted)
1. **Paid Modal tier** with autoscaling (`max_containers > 1`, or `allow_concurrent_inputs` on class endpoints). Cost math must precede any change (FACT.md lesson).
2. **Per-tenant resource isolation:** data is already userId-keyed (good), but creator-bypass, self-code, deploy, and admin paths must be reworked to role-based auth.
3. **Metering & billing:** Stripe integration + usage counters (no metering models exist today). Tier 2 (CC $0 auth) and Tier 3 (Stripe Identity) age verification are documented but unbuilt.
4. **Horizontal app scaling:** the Next.js standalone server must run as multiple replicas behind a load balancer (currently single Docker instance).
5. **Rate limits per user, not per IP** (currently IP-based in `middleware.ts`).
6. **Log/metrics/observability** for cost attribution — currently ad hoc.
7. **Secret rotation + history scrub** before any external exposure (SECURITY_FINDINGS S1).

## 5. "Holly Local Engine" requirements (self-hosted/on-device)
1. **Local LLM path exists** — Ollama (`ollama:*` waterfall, `OLLAMA_ENABLED=true`). Replaceable by design.
2. **Local TTS** — Kokoro is already self-hostable (CPU, no key).
3. **Local embeddings** — Ollama `nomic-embed-text` is already a fallback.
4. **Local image** — **hard gap.** Holly's self-image depends on the Klein A100 LoRA endpoint; no consumer-GPU path exists. A local engine would either (a) ship without Holly self-portrait capability, or (b) require a quantized small image model that cannot reproduce the LoRA likeness. This is the hardest local-engine problem.
5. **Local video/music** — Modal-only today; would need local alternatives or graceful "unavailable locally."
6. **Local DB** — Postgres+pgvector bundle or SQLite-vector alternative. `db push` workflow would need adapting.
7. **Identity portability** — memory/relationship are DB-backed and model-independent (already the design), so a local engine could carry a user's relationship continuity. ✅ architecturally sound.

**Net:** Holly Local is *architecturally feasible* for chat/voice/memory but *not* for Holly self-image generation without solving local image LoRA. Cloud is feasible but requires paid infra + auth hardening + billing.

---

## 6. Licensing notes (relevant to provider choices)
- Models: Qwen3.5 (Apache-2.0 base, uncensored finetunes vary), CogVideoX-5B (Apache-2.0), Kokoro-82M (Apache-2.0), ACE-Step (MIT), FLUX (non-commercial for some variants — verify Klein/Dev licences before commercial use).
- Music: Suno is a **paid external API** (the only one) — licence/ToS must permit Holly's use.
- Holly's own code: MIT (`package.json:36`).
- ⚠️ **UNVERIFIED:** whether the specific uncensored model finetunes (HauhauCS, DuoNeural, etc.) carry licences compatible with a commercial product. This needs a separate licensing review before any paid launch.

## 7. Cost-attribution gaps (what we can't measure today)
- No per-user cost counters; no model in schema for usage metering.
- Modal spend is workspace-level, not per-request attributable.
- No alerting on spend beyond Modal's own billing UI.
- `ApiKey` / `ApiKeyUsage` models exist but usage tracking is thin (2 refs).

*No changes made during this audit.*
