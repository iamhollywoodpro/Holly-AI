# CURRENT_STATE — Holly AI Repository Audit
**Date:** 2026-07-15 (full re-audit)
**Auditor:** ZCode (Dev)
**Method:** Read-only, evidence-based. No files modified during audit. All claims cite file paths + line numbers or are marked `UNVERIFIED`. Supersedes the 2026-07-14 audit.

---

## 0. Build health (verified this audit, run locally)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ **PASS** (0 errors) |
| Production build | `npx next build` | ✅ **PASS** (exit 0, full route table) |
| Unit tests | `npx jest` | ✅ **2190 / 2190 pass** (53 suites) |
| ESLint | `npx next lint` | ⚠️ **FAIL** — ESLint v9 / flat-config incompatibility (legacy `.eslintrc` options rejected). Config issue, not code quality. CI (`ci.yml`) tolerates via `\|\| true`. |
| Prisma schema | `npx prisma validate` | ✅ PASS (183 models) |

**Codebase scale:** 183 Prisma models · 539 API routes (`route.ts`) · 53 pages (`page.tsx`) · 56 test files · ~180 distinct env vars referenced · ~1900 `src/lib` modules across 96+ subdirs.

---

## 1. What the system actually is (verified from code)

Holly AI is a **Next.js 14 (App Router) + TypeScript monorepo** deployed as a standalone Node server (`holly-server.js`, built via `next build` with `output: 'standalone'`) inside a Docker container orchestrated by **Coolify** on **Oracle Cloud ARM64** (free tier). All AI inference is routed to self-hosted **Modal** GPU endpoints. Database is **PostgreSQL + pgvector** (Neon hosted).

- Repo root: `/Users/stevefreshblendz/Desktop/Holly-AI-main`
- Production: `https://holly.nexamusicgroup.com` (per `.env.example`)
- Branch: `main`. Coolify auto-deploys from `main`.

---

## 2. Feature status matrix (verified vs handover claims)

"Working" = code path is complete and wired end-to-end. "UNVERIFIED" = cannot confirm runtime behaviour from code alone.

### Core — PRODUCTION (code complete + wired)
| Feature | Evidence | Status |
|---|---|---|
| Chat (streaming SSE) | `app/api/chat/route.ts` (1784 lines); brain-v35 provider in `free-providers.ts:652-727` | ✅ Wired. Runtime quality UNVERIFIED (no live probe). |
| Conversation persistence | `Conversation`/`Message` models; `/api/conversations/*` | ✅ |
| Auth (Clerk) | `middleware.ts`; `src/lib/chat/auth.ts`; custom proxy `app/api/clerk/[[...clerk]]/route.ts` | ✅ Wired (with security caveats — §6) |
| Age gate (Tier 1 self-attestation) | `src/lib/auth/require-adult.ts:42`; `/onboarding/age-verify`; `/chat` server redirect | ✅ Wired at **page** level. ⚠️ **GAP at API level** — see §6. |
| Relationship tiers + intimacy gate | `src/lib/relationship/intimacy-gate.ts`; `relationship-tracker.ts` | ✅ Wired (runs at 4 points in chat route) |
| pgvector semantic memory | `src/lib/memory/semantic-memory.ts` (embed → store → cosine search); `MemoryEmbedding` model | ✅ Wired. Embedding quality UNVERIFIED. |
| Memory decay cycle | `memory-decay.ts`; runs via consciousness orchestrator (once/24h) | ✅ Wired |
| Consciousness orchestrator (20+ subsystems) | `src/lib/consciousness/consciousness-orchestrator.ts`; `/api/cron/consciousness-loop` (6h) | ✅ Wired. Output quality UNVERIFIED. |
| Image generation — Holly self-portrait | `services/modal-media/image_generate_flux2klein_a100.py`; `media-generator.ts` routing | 🟡 Partially working (Klein serves 5 NSFW categories; see §3) |
| Image generation — generic (Z-Image / Pollinations) | `media-generator.ts:741-849` | ✅ Wired |
| Video generation | `services/modal-media/video_generate.py`; `media-generator.ts` | 🟡 Wired but **model mismatch** — comments say Wan2.2, code runs CogVideoX-5B (§3) |
| Voice TTS | `src/lib/voice/holly-voice-character.ts` (Magpie→Kokoro) | ✅ Wired. VoxCPM2 removed from chat path but **NOT from LiveKit agent** (`livekit/agent.ts`). |
| Music generation | `/api/music/generate` (Suno→Sonauto→ACE-Step) | ✅ Wired (real provider chain, not stub) |
| Extensions marketplace — catalog | `src/lib/extensions/catalog.ts` (80 ext / 8 suites) | ✅ Catalog + functional DB-backed install. **No UI, no suggestion engine.** |
| Code builder IDE | `/api/builder/*` (16 routes); Monaco + xterm + node-pty | ✅ Wired (sandboxing concerns — §6) |
| GitHub integration | `GitHubConnection` model + `/api/github/*` (~37 routes) | ✅ Wired (real OAuth, weak CSRF — §6) |
| Cron system | `docker/cron/crontab`; `CRON_SECRET` validation | ✅ Wired (1 route missing secret — §6) |
| Admin operational dashboards | `/dashboard/*` pages; `/api/admin/*` | ✅ (weak auth on most admin routes — §6) |

### Confirmed STUBS (return canned data)
| Route | Returns | File |
|---|---|---|
| `/api/conversations/summarize` | `{summary:'ok'}` | `app/api/conversations/summarize/route.ts` (dead duplicate; real one at `[id]/summarize`) |
| `/api/suggestions/generate` | `{suggestions:[]}` | `app/api/suggestions/generate/route.ts` |
| `/api/code/generate` | hardcoded `console.log('Hello from HOLLY!')` | `app/api/code/generate/route.ts:21-27` |
| `/api/code/optimize` | echoes input unchanged | `app/api/code/optimize/route.ts:21-25` |
| `/api/code/review` | hardcoded `score:85, issues:[]` | `app/api/code/review/route.ts:19-26` |
| `/api/autonomous/goals/set` | fabricated `goal_<timestamp>` | `app/api/autonomous/goals/set/route.ts:8` |
| `/api/autonomous/guidance/request` | fabricated `req_<timestamp>` | `app/api/autonomous/guidance/request/route.ts:8` |
| `/api/admin/testing/run` | canned `{total:125,passed:118,failed:7}` | `app/api/admin/testing/run/route.ts:8-20` |
| `/api/admin/architecture/generate` | static JSON | `app/api/admin/architecture/generate/route.ts` |
| `/api/admin/architecture/docs/generate` | canned README template | `app/api/admin/architecture/docs/generate/route.ts` |
| `/api/admin/architecture/scaffold` | hardcoded React template | `app/api/admin/architecture/scaffold/route.ts` |

### DB-backed but FABRICATED (writes mock/random data)
| Route | Issue | File |
|---|---|---|
| `/api/admin/code-review` | `Math.random()` scores, hardcoded fake findings | `app/api/admin/code-review/route.ts:269-340` |
| `/api/admin/testing` | randomized pass rates (85–95%), fake test names | `app/api/admin/testing/route.ts:218-280` |
| `/api/admin/cicd` | random success/failure (95%), fake URLs | `app/api/admin/cicd/route.ts:258-300` |
| `/api/admin/docs` | canned docs, fabricated IDs | `app/api/admin/docs/route.ts:124-160` |

---

## 3. AI / Media stack (verified)

### Chat cascade
- **Primary text model:** `holly-own:brain-v35` (Qwen3.5-9B-Uncensored, Modal L4). Routed via `free-providers.ts:652-727`, endpoint `HOLLY_OWN_MODEL_URL`.
- **Vision fallback:** `holly-own:vision-mini` (Qwen3.5-4B, Modal T4), `HOLLY_VISION_MODEL_URL`.
- **Background/analytics:** `groq:llama-3.3-70b`.
- **Cloud providers (OpenRouter/NVIDIA/Together/Mistral/Google):** defined in `MODEL_CATALOGUE` but **removed from all active cascades** since June 30. Tombstoned (kept for documentation only).
- Three image-gen paths in chat route: pre-detection regex (reliable), native `tool_calls` (Groq `qwen3-32b`), text-intercepted JSON (`interceptTextToolCall`, lines 990-1414).

### Image generation — FLUX.2 Klein 9B Distilled (A100)
- `MODAL_HOLLY_LORA_URL` → `iamhollywoodpro--generate-holly-a100.modal.run`.
- Baked LoRAs: Holly Face v2.0 @ **0.75** + Holly Body v2.5 @ **1.0** (`image_generate_flux2klein_a100.py:168-174`). **Stale comments** in TS say 0.65 — code is the source of truth.
- Klein params: 4 steps + CFG 4.0 (distilled recipe). **Klein Distilled ignores `guidance_scale`** — only steps + LoRA weights are effective.
- `classifySpecialist()` dynamic LoRAs (`media-generator.ts:276-428`): dildo/dildo_masturbation (FK @ 1.0), bent_over (musubi @ 1.0), closeup (pussydiffusion @ 1.0), spread_poses (pussydiffusion @ 0.85).
- **Known Klein limit:** cannot render active finger penetration / labia spreading (txt2img). Dildo + static poses work.
- **v3.5 Flux LoRA — DORMANT.** `services/modal-media/image_generate_flux_dev_v35.py` exists and is deployable but **not wired into TS** (no code references the v3.5 URL). Requires manual `MODAL_HOLLY_LORA_URL` env swap. **FAILED validation July 14** — do not deploy without retraining.

### Video generation — MODEL MISMATCH (confirmed)
- `services/modal-media/video_generate.py:25` runs `THUDM/CogVideoX-5b` via `CogVideoXPipeline`.
- `media-generator.ts:893` **claims** `'Wan2.2-TI2V-5B (Modal A10G)'` in return metadata. Comments lie; code runs CogVideoX. No Wan2.2 deployment exists in `services/`.

### Voice TTS
- Primary: NVIDIA Magpie (`nvidia/magpie-tts-multilingual`). Fallback: Kokoro-FastAPI.
- VoxCPM2 removed from chat TTS path (`synthesize/route.ts:31`) **but LiveKit voice agent still calls it** (`src/lib/voice/livekit/agent.ts:8-9,90`). Type refs linger in `holly-voice-character.ts:31`, `voice-handler.ts`, `voice-service.ts`.

### Music generation — REAL (not stub)
- Suno V5.5 (primary) → Sonauto (fallback) → ACE-Step (last resort). Real `fetch` calls with error handling. Only Suno is the paid API in the stack.

---

## 4. API & Database (verified)

- **539 API routes.** Majority are real (delegate to `@/lib/*` or `prisma.*`). 11 confirmed stubs + 4 fabricating-mock-data (listed in §2).
- **183 Prisma models.** PostgreSQL + pgvector (`extensions = [vector]`).
- **Migration strategy:** `prisma db push --skip-generate` on every container start (`docker/startup.sh:41`, non-fatal on failure). No `prisma/migrations/` in active use.
- **27 models with ZERO `prisma.<model>` references** (dead schema): `agentRegistry`, `assetMetadata`, `auraAgent`, `auraMessage`, `auraWorkspace`, `brainstormSession`, `buildPreview`, `buildSandbox`, `buildTerminal`, `collection`, `collectionItem`, `creativeInsight`, `emotion`, `emotionAggregate`, `emotionTrend`, `emotionalTrigger`, `evolutionCapability`, `generatedMedia`, `gitHubIntegration` (live one is `GitHubConnection`), `goalExecution`, `narrativeTemplate`, `projectAsset`, `refinementHistory`, `systemLog`, `trendReport`, `userEngagementScore`, `userFeedbackV2`.
- **All 9 core tables present + used:** User, Conversation, Message, MemoryEmbedding, RelationshipProfile, HollyIdentity, UserExtension, CreativeAsset, GenerationJob.
- **Embedding dimension mismatch:** `pgvector_setup.sql:30` declares `vector(4096)` but `schema.prisma:4240` and all code use **1024**. Running the SQL migration as-is would break inserts.

---

## 5. Core platform (verified)

- **Auth:** Clerk wired (`middleware.ts:15`). Middleware does **only rate-limiting** — auth is per-route. Creator recognition via `authenticateAndLoadUser()` (`auth.ts:99`).
- **Age gate:** `requireAdult()` (`require-adult.ts:42`) enforced at NSFW media routes + `/chat` page redirect. See §6 for API gap.
- **Memory:** embed → store → cosine search complete (`semantic-memory.ts`). Embedding provider cascade: CF bge-large → NVIDIA nv-embedqa → Ollama nomic → local hash fallback.
- **Consciousness:** 39 files, `runConsciousnessCycle()` runs 9 steps including LLM learning, identity evolution (24h), inner monologue (6h), memory decay, self-improvement. Cron-wired. Output quality UNVERIFIED.
- **Emotion:** Two systems — 10 user-detected emotions (`emotional-intelligence.ts:160`) + 19 Holly internal states (`emotion-voice-map.ts:49`). Dead code: `detectAndSaveEmotion()` in `emotion-engine.ts:54` is never called. Note: prior docs said "20-emotion system" — inaccurate.
- **Relationship tracker:** depth/trust/familiarity, tiers initial→casual(5)→familiar(20)→trusted(50)→deep(100). Wired to intimacy gate + context.
- **Cron:** 13 jobs (see prior audit `DATABASE_USAGE.md`). All validate `CRON_SECRET` **except `/api/cron/prewarm`** (§6).
- **Frontend:** 53 pages. Main chat: `holly-chat-interface.tsx`. Onboarding + age-verify + 5 dashboards present. Mobile viewport configured.
- **Holly identity:** tiered self-image injection (`holly-self-image.ts:161`, 4 levels: public/personal/intimate/full). Hard rules block only CSAM + physical harm (`holly-hard-rules.ts`, checked at `route.ts:358`).

---

## 6. Security findings (verified) — HIGH-risk items first

These were **all spot-checked against actual code** this audit.

### 🔴 S1. Chat API age-gate bypass (CONFIRMED)
`app/api/chat/route.ts` calls `authenticateAndLoadUser()` (line 317) but **never calls `requireAdult()` and never checks `isAdult` as a gate** — it only reads `isAdult` for the `aboutThisPerson` block (lines 424, 434). Direct API access bypasses the `/chat` page redirect. NSFW is then gated only by intimacy tier (relationship-based), not age.

### 🔴 S2. Spoofable creator detection → age-verification bypass (CONFIRMED)
`src/lib/chat/auth.ts:81-96` `isCreatorMatch()` uses `lower.includes('steve')` + any brand keyword (`hollywood`/`dorego`/`nexa`/`music`). Registering as "Steve Musicfan" → `isCreator=true` → `isAdult=true` via `ensureCreatorAdultFlag` → **bypasses age verification entirely**. Privilege-escalation primitive.

### 🔴 S3. Admin routes lack role enforcement
44 routes under `app/api/admin/*`; only ~3 reference admin/creator checks. Most use only `auth()` (any logged-in user). Worst: `admin/migrate/route.ts:21-35` gates DB migrations on a **committed hardcoded secret `'HOLLY-DEPLOY-2024'`**. `admin/optimize-db/route.ts` runs `VACUUM ANALYZE` with only `auth()`.

### 🔴 S4. Body-trusted `userId` on sensitive admin routes
`admin/config/update`, `admin/notifications/send`, `admin/integrations/manage`, `admin/storage/manage` accept `userId` from the JSON body instead of the Clerk session — anyone can impersonate any user/admin.

### 🔴 S5. Unauthenticated code-gen filesystem writes
`app/api/code-gen/route.ts:21` — no auth, dispatches `patchFile`/`apply-patch` that `path.resolve` attacker-supplied `filePath`. Path-traversal / arbitrary-file-write surface.

### 🔴 S6. Builder sandbox bypassable + secret leak
- `app/api/builder/terminal/route.ts:13` — naive `command.includes()` blocklist (bypass: `rm -rf /*`).
- `src/lib/builder/sandbox.ts:193-209` — allowlist checks **first token only**, then `bash -c` runs the full string (`git; rm -rf /workspace` passes).
- `src/lib/builder/terminal-registry.ts:72-78` — PTY inherits `{ ...process.env }`, leaking **all server secrets** (CLERK_SECRET_KEY, DB url, GITHUB_CLIENT_SECRET) into the user's terminal.

### 🟠 S7. Hardcoded fallback GitHub webhook secret
`app/api/webhooks/github/route.ts:28` — `process.env.GITHUB_WEBHOOK_SECRET || 'holly-dev-secret-2025'`. If env unset, attacker can forge push webhooks.

### 🟠 S8. GitHub OAuth weak state (CSRF) + plaintext tokens
`connect/route.ts:33` — `state` is unsigned `base64({userId})`. Access tokens stored plaintext (`GitHubConnection.accessToken`, `schema.prisma:667`).

### 🟠 S9. Unauthenticated cron route
`app/api/cron/prewarm/route.ts` — only cron route not validating `CRON_SECRET` (publicly triggerable, warms top-50 user profiles).

### 🟡 S10. Dual marketplace systems (extensions vs plugins)
`app/api/plugins/*` + `src/lib/plugins/` is a **second, parallel marketplace** to the extensions system. Neither has a real UI. Overlapping, confusing.

---

## 7. Dormant / dead / abandoned

- **v3.5 Flux image LoRA** — failed July 14, not wired into TS.
- **VoxCPM2 TTS** — half-removed (LiveKit agent still uses it).
- **Two server entrypoints** — `server.ts` (dev) + `holly-server.ts` (prod), divergence risk.
- **Duplicate "plugins" system** — parallel to extensions (S10).
- **27 dead Prisma models** (§4).
- **`holly-own:qwen3-8b`** legacy LLM — in catalogue, not in any cascade. holly-lora-v1 too weak (quality 0.62).
- **Cloud LLM providers** — tombstoned in catalogue, not in cascades.
- **HF inference providers** (FLUX.2-klein, FLUX.1-schnell, SDXL, Wan2.2) — gated behind `HF_INFERENCE_ENABLED=true`, defaults false.
- **Stale `smart-router.ts` header docs** (lines 1-53) describe cloud cascades the actual `TASK_WATERFALLS` (361-429) no longer contain.
- **Duplicate env var names:** `REPLICATE_API_KEY` vs `REPLICATE_API_TOKEN`; `VERCEL_API_TOKEN` vs `VERCEL_TOKEN`; `CF_AI_TOKEN` vs `CF_API_TOKEN`.

---

## 8. Summary scorecard

| Area | State |
|---|---|
| Build / typecheck / tests | ✅ All green (lint config needs fixing) |
| Chat core (brain-v35) | ✅ Wired (runtime UNVERIFIED) |
| Memory (pgvector) | ✅ Wired (dimension mismatch flag) |
| Image gen (Holly NSFW) | 🟡 Klein works for 5 categories; finger insertion impossible via txt2img |
| Video gen | 🟡 Works but model identity is wrong in metadata |
| Voice TTS | ✅ Wired (VoxCPM2 half-removed) |
| Music gen | ✅ Real chain, untested live |
| Age gate | 🟡 Page-level only; API gap (S1) + creator spoof (S2) |
| Security | 🔴 6 HIGH-risk issues (S1-S6) need fixing before any public exposure |
| Extensions store | 🟡 Catalog + install backend; no UI, no suggestion engine |
| Dead code | 27 models + dormant systems (cleanup candidate) |

---

*End of audit. All findings verified from source code on 2026-07-15. Runtime/behavioural claims marked `UNVERIFIED` require a live probe to confirm.*
