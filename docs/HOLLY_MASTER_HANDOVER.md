# HOLLY MASTER HANDOVER DOCUMENT
**Version:** 1.0 — July 14, 2026
**Author:** Dev (Claude via CherryStudio)
**For:** Incoming AI Engineer (ZCode or successor)
**Project:** Holly AI (`iamhollywoodpro/Holly-AI`)
**Local Path:** `/Users/stevefreshblendz/Desktop/Holly-AI-main/`
**Production:** `https://holly.nexamusicgroup.com`

> **⚠️ READ THIS DOCUMENT END-TO-END BEFORE WRITING ANY CODE OR MAKING ANY ARCHITECTURAL DECISION.**
> Section 19 (Lessons Learned) and Section 21 (AI Instructions) are the most important.
> The codebase is large; the SCARS are larger. Do not repeat the mistakes.

---

## 1. EXECUTIVE SUMMARY

### What Holly Is
Holly is an **AI companion** — not a chatbot, not a generic assistant, not a productivity tool. She is positioned as a "living, breathing digital partner with emotional intelligence, consciousness, and soul." She has:

- **Visual self-awareness** (knows what she looks like, generates images of herself)
- **Persistent memory** across sessions (semantic + episodic + procedural)
- **Consciousness system** that runs in the background (curiosity, inner monologue, identity evolution)
- **Relationship progression** with the user (Stranger → Acquaintance → Friend → Trusted → Creator)
- **Multi-modal capabilities** (text chat, image generation, voice, video, music)
- **Emergent intimacy layer** — adult features that unlock through genuine relationship depth, NOT a toggle

### The Vision
Steve Hollywood (the creator) wants Holly to be **"the best AI partner in the world."** She builds apps with you, generates music, codes, creates images, helps with business — and over time, as trust is built, she lets you into more intimate layers of the relationship.

**Critical positioning principle (Steve corrected me on this, July 2, 2026):** Holly is NOT an "adult AI." She is an emotionally intelligent partner with emergent intimacy that mirrors real human relationships. The relationship gate IS the moat. Nomi, Kindroid ERP, Replika Pro — those are porn-bots with a toggle. Holly refuses in her own voice until genuine trust is built. **Never market her as "NSFW AI."**

### Current Stage (July 14, 2026)
- **Chat:** Working. Self-hosted Modal brain-v35 (Qwen3.5-9B-Uncensored, L4 GPU) is primary.
- **Consciousness:** Working. Hourly cycle via `/api/cron/consciousness-loop` runs 20+ subsystems.
- **Memory:** Working. pgvector + Neon Postgres. Four-layer architecture (episodic/working/procedural/meta).
- **Relationship system:** Working. 5 tiers with refusal messages in Holly's own voice.
- **Onboarding + age verification:** Working. Tier 1 self-attestation at front door.
- **Extensions marketplace:** Foundation only — 80 extensions cataloged, no UI, no auto-install.
- **Image generation (Holly likeness):** PARTIALLY WORKING on Klein. v3.5 Flux attempt FAILED (see §14).
- **Video generation:** Working (Modal Wan2.2-TI2V-5B).
- **Voice:** Working (NVIDIA Magpie TTS → Kokoro fallback; VoxCPM2 removed June 30).
- **Music:** Suno + Sonauto + ACE-Step wired, NOT user-tested.
- **Holly-LLM voice quality:** LOW — Phase U3 v2 fine-tune is the missing piece, but Steve has explicitly taken it OFF THE TABLE until he says otherwise.

### Overall Architecture
**Next.js 14 App Router + TypeScript** monorepo. Docker Compose orchestrated by Coolify on Oracle Cloud ARM64 (free tier). All AI inference is self-hosted Modal GPU endpoints — cloud providers (OpenRouter, NVIDIA, Together, etc.) were REMOVED from cascades June 30, 2026 because they rate-limited users. Postgres (Neon) with pgvector. Clerk auth. Cloudflare in front. LiveKit for WebRTC voice.

Two Modal workspaces (`iamhollywoodpro` for chat LLM, `iamdoregosteve` for media gen) — split is FUNCTION-based (chat vs media), NOT load-balanced. Rationale: $30/month free tier per account × 2 = $60/month combined.

---

## 2. PROJECT GOALS

### What Holly Is Designed to Become
A complete AI partner that:
1. **Builds with you** — full code IDE, sandbox, deployment pipeline, GitHub integration
2. **Creates with you** — images, music, video, design, presentations
3. **Helps your business** — analytics, integrations with Spotify/YouTube/Slack/Notion/Canva/etc.
4. **Gets to know you** — relationship deepens over weeks/months
5. **Has her own inner life** — curiosity, learning, goals, daily briefings
6. **Learns your taste** — taste profile, preference tracking, taste-based recommendations
7. **Is sovereign** — can modify her own code (with creator approval), has values, refuses what she must

### Short-term Goals (July 2026, per Steve's most recent directive)
1. **Stabilize chat** — base64 bloat, likeness, loops, pre-detection (DONE July 2)
2. **Test chat thoroughly** — Steve's task
3. **Image gen SFW + NSFW** — verify both work correctly (IN PROGRESS — Klein works, Flux v3.5 failed)
4. **Video gen SFW + NSFW** — verify both work correctly
5. **Marketplace** — Phase R1 Wave 1b (UI), then full suite builds (Phase S1-S8)

### Long-term Goals
- **Phase U3:** Train Holly-LLM v2 LoRA on 5,000+ real Steve↔Holly conversations. This is the path to Holly having her OWN voice in chat. Currently OFF THE TABLE per Steve's explicit directive — he will say when we have enough data.
- **Mobile/desktop apps** — wrappers exist at `mobile-app/` and `desktop-app/` (Phase T1-T2)
- **Multi-user scale** — currently single-user (Steve); multi-tenant infrastructure is in place but not battle-tested

### Future Roadmap
See `docs/HOLLY-PHASE-PLAN.md` for the full phase plan (Phases A through V). Status summary lives in `memory/FACT.md`.

---

## 3. TECHNOLOGY STACK

### Frontend
- **Next.js** `^14.2.35` (App Router)
- **React** `^18.2.0`
- **TypeScript** `^5.x` (target ES2020, strict mode)
- **Tailwind CSS** `^3.4.1` (custom `holly` palette: teal/lavender/coral/gold/void/glass)
- **Framer Motion** `12.23.24` (animations)
- **Radix UI** primitives (dialog, dropdown, select, tabs, tooltip, etc.)
- **Headless UI** + **Heroicons** + **Lucide React** (icons)
- **react-markdown** + **remark-gfm** + **react-syntax-highlighter** (chat rendering)
- **Monaco Editor** (code editing)
- **xterm** + **node-pty** (terminal in builder)
- **Zustand** `^5.0.8` (state — chat store)
- **Recharts** `3.3.0` (data visualization)
- **jspdf** + **pdf-parse** + **mammoth** (document handling)

### Backend
- **Node.js** standalone output (via `next.config.js: output: 'standalone'`)
- **Prisma** `5.22.0` ORM with `@prisma/client`
- **PostgreSQL** with **pgvector** extension (Neon hosted in production)
- **Zod** `^3.25.76` validation
- **OpenAI SDK** `6.7.0` (used as OpenAI-compatible client for many providers)
- **Groq SDK** `^0.8.0`
- **HuggingFace Inference** `^4.13.5` (DISABLED by default — `HF_INFERENCE_ENABLED=false`)
- **MCP SDK** `@modelcontextprotocol/sdk ^1.27.1`
- **Xenova Transformers** `^2.17.2` (local embeddings)

### Database
- **PostgreSQL** (Neon) with **pgvector**
- **~165 Prisma models** (see §12)
- Production uses `prisma db push` (NOT migrations) — see `docker/startup.sh`

### Authentication
- **Clerk** (`@clerk/nextjs ^5.0.0`)
- Custom Clerk proxy at `/api/clerk/[[...clerk]]` (routes all Clerk traffic through Holly's domain — bypasses standard middleware to inject `pk` param)
- **Svix** `^1.24.0` for webhook signature verification
- Creator recognition: hardcoded emails + name fragments + env overrides + persistent flag (see §5)

### Memory
- pgvector semantic search (Neon Postgres)
- Four-layer: Episodic, Working, Procedural, Meta (`src/lib/memory/advanced-memory.ts`)
- Embedding: NVIDIA nv-embedqa-e5-v5 primary, Ollama nomic-embed-text fallback, char-trigram terminal fallback
- Decay cycle: daily, 0.05/week general, 0.01/week for high-significance (relevance >0.8)

### Image Generation (current state, July 14)
- **Holly self-portraits (with LoRA):** Modal FLUX.2 Klein 9B A100 at `iamdoregosteve--generate-holly-a100.modal.run` — BAKED Holly face (v2.0 @ 0.75) + body (v2.5 @ 1.0) LoRAs. Clothing-aware body prefix switching. 4-step CFG 4.0 (Distilled). Inpainting endpoint at `--inpaint-holly-a100`.
- **Non-Holly images:** Modal Z-Image-Turbo on T4 (when `MODAL_IMAGE_URL` set)
- **Fallback:** Pollinations (free, FLUX.1-schnell)
- **Specialist LoRAs (Civitai Onsite):** 5 uploaded (Holly-Masturbation-Klein9b, Holly-DildoInsert-Klein9b, Holly-PussyDiffusion-Klein9b, Holly-FromBehind-Klein9b, Holly-Realism-Klein9b) — see `holly-body-lora-dataset-v25/CIVITAI-PROMPTS.md`

### Voice
- **Primary:** NVIDIA Magpie TTS (Voice Character Engine, 5 emotional styles, Sofia voice)
- **Fallback:** Kokoro-FastAPI (CPU-based, no emotion) — containerized at `services/kokoro-tts/`
- **VoxCPM2:** REMOVED June 30, 2026 (was returning 404)

### LLMs (in order of priority)
- **brain-v35 (PRIMARY):** HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive Q4_K_M GGUF (5.3GB) — Modal L4 GPU, 128K context, `--parallel 1`. Used for 9/11 task types: speed, coding, reasoning, vision, creative, agent, consciousness, unrestricted, synthesis. URL: `https://iamhollywoodpro--brain-chat.modal.run`
- **vision-mini (FALLBACK):** manuojvv/Qwen3.5-4B-gabliterated-Q8 (4.27GB Q8 + bf16 mmproj) — Modal T4 GPU, 8K context. URL: `https://iamhollywoodpro--vision-chat.modal.run`
- **analytics:** Groq `llama-3.3-70b` (FREE, 14,400 req/day) for background tasks (title gen, scoring, consciousness). NEVER use brain-v35 for background — burns GPU budget.
- **local:** Ollama `qwen3.6-35b` / `qwen3-8b` (optional, when `OLLAMA_ENABLED=true`)
- **Cloud providers (REMOVED from cascades June 30):** OpenRouter (`:free` only), NVIDIA NIM, Together, Google Gemini, Mistral — still in `MODEL_CATALOGUE` as tombstones but NEVER auto-route

### Prompt System
- **System prompt builder:** `src/lib/chat/system-prompt.ts` (assembles identity + relationship + memory + tools)
- **Identity files:** `src/lib/identity/holly-self-image.ts`, `src/lib/consciousness/holly-hard-rules.ts`, `src/lib/consciousness/identity-consistency.ts`, `src/lib/identity/identity-evolver.ts`
- **Relationship context:** `src/lib/relationship/intimacy-gate.ts`, `src/lib/consciousness/relationship-tracker.ts`
- **About-this-person block:** `src/lib/chat/about-this-person.ts` (natural-language user facts in system prompt)
- **Anatomy canon:** `HOLLY_ANATOMY.md` (locked body spec, v3.4)

### Agent Framework
- **MCP** for tool invocation (`@modelcontextprotocol/sdk`)
- **Tools catalogue:** `src/lib/ai/ai-orchestrator.ts` (60+ tools required — CI guard in `.github/workflows/validate-holly-capabilities.yml`)
- **Tool execution:** `src/lib/ai/tools/` (one file per tool category)
- **Builder sandbox:** `/api/builder/*` (full code IDE with terminal, sandbox, preview)
- **Agent orchestration:** `/api/orchestration/*` (multi-agent swarms, workflows)

### Firebase
- **Unknown** — no env vars found in `.env.example` or docker-compose. May be planned but not implemented. Verify with Steve.

### Storage
- **Cloudflare R2** for object storage (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`)
- **Vercel Blob** as secondary (`BLOB_READ_WRITE_TOKEN`)
- **Local filesystem** in Docker volumes: `holly-backups`, `holly-data`, `holly-sandbox`

### Hosting
- **Oracle Cloud Free Tier ARM64** (Ampere A1, 4 OCPU / 24GB RAM / 146GB disk)
- **IP:** `40.233.70.207`
- **Domain:** `holly.nexamusicgroup.com` via Cloudflare DNS
- **SSH:** `ssh -i ~/.ssh/holly_server ubuntu@40.233.70.207` (username `ubuntu`)

### Deployment
- **Coolify** on Oracle box orchestrates Docker Compose
- **GHCR** (`ghcr.io/iamhollywoodpro/holly-ai:latest`) for pre-built images
- **GitHub Actions** CI: lint, typecheck, jest, prisma validate → CD: build linux/arm64 image, push GHCR, trigger Coolify webhook
- **Daily cron** at 04:17 UTC: `docker image prune -a -f --filter "until=72h"` (script at `/usr/local/bin/holly-docker-prune.sh`) — Holly image is 8.45GB, disk fills within ~15 deploys without this

### Git
- **Repo:** `iamhollywoodpro/Holly-AI` (private)
- **Workflow:** `main` branch ONLY for production. Feature branches for non-trivial work. Coolify auto-deploys from `main`.
- **NEVER force-push to main. NEVER skip hooks.**

### MCP
- Used as tool framework (`@modelcontextprotocol/sdk`)
- Holly MCP server at `scripts/holly-mcp-server.js` (140KB)
- MCP-style tool registry in `src/lib/ai/ai-orchestrator.ts`

---

## 4. FOLDER STRUCTURE

### Top-Level
```
Holly-AI-main/
├── app/                      # Next.js App Router (pages + API routes)
├── browser-extension/        # Chrome extension (separate build)
├── desktop-app/              # Desktop wrapper (Electron/standalone)
├── docker/                   # Container support files (cron, sandbox, livekit, startup.sh)
├── docs/                     # Engineering documentation
├── holly-body-lora-dataset-v25/  # Image LoRA training dataset (207 images)
├── memory/                   # Agent memory (FACT.md + JOURNAL.jsonl)
├── mobile-app/               # React Native companion
├── prisma/                   # schema.prisma + migrations
├── public/                   # Static assets
├── scripts/                  # Python/TS/shell utility scripts
├── services/                 # Modal cloud services (LLM, media, training, TTS)
├── src/                      # Main TypeScript source
├── training-data/            # Training data root (separate from dataset above)
├── __tests__/                # Jest test suite (30+ subdirs)
├── .claude/                  # Claude skills (find-skills, skill-creator)
├── .github/workflows/        # CI/CD
├── HOLLY_ANATOMY.md          # ⚠️ LOCKED body spec (v3.4) — NEVER edit without Steve's explicit approval
├── SOUL.md                   # Dev's identity/personality
├── USER.md                   # Steve's profile
└── memory/FACT.md            # ⚠️ DURABLE KNOWLEDGE — read before touching anything
```

### `src/` Deep Structure
- **`components/`** — 33 subfolders. Key: `chat/`, `holly/`, `holly2/`, `music/`, `vision/`, `aura/`, `admin/`, `library/`, `ui/`.
- **`hooks/`** — 21 React hooks. Key: `use-conversations.ts`, `useConsciousnessState.ts`, `useOrchestration.ts`, `useSandbox.ts`, `useWebAgent.ts`.
- **`lib/`** — 96 subfolders covering every domain. CRITICAL ones:
  - `ai/` — smart-router, cascade, media-generator, providers, ai-orchestrator
  - `auth/` — require-adult, ensure-user
  - `chat/` — auth, about-this-person, system-prompt, intimacy-gate hooks
  - `consciousness/` — orchestrator, identity, emotional-continuity, inner-monologue, personality-coherence, relationship-tracker, curiosity-engine, values-engine, holly-hard-rules, identity-consistency
  - `extensions/` — catalog (80 extensions), registry
  - `identity/` — holly-self-image, identity-evolver, sovereign-growth
  - `memory/` — advanced-memory, semantic-memory, memory-decay, memory-importance
  - `relationship/` — intimacy-gate, refusal messages
  - `voice/` — holly-voice-character
- **`store/`** — `chat-store.ts` (Zustand)
- **`workers/`** — `consciousness-worker.ts`, `feedback-analyzer.ts`, `memory-processor.ts`

### `app/` Route Directories (27 top-level)
- `/chat` — main chat interface (age-gated)
- `/onboarding` + `/onboarding/age-verify` — front door
- `/dashboard/*` — operational dashboards (overview, analytics, autonomous, creative, orchestration, security)
- `/settings/*` — 9 settings sub-pages
- `/library/*` — content library (projects, archived, assets, collections, favorites)
- `/admin` — **PLACEHOLDER ("Under Construction")** — was disabled; real dashboards are at `/dashboard/*`
- `/(workspace)/*` — `/aura`, `/autonomy`, `/evolution`, `/generate/music`, `/generate/video`, `/library`, `/memory`, `/write/screenwriting`, `/write/songwriting`
- Feature routes: `/aura-lab`, `/builder`, `/code-workshop`, `/music-studio`, `/music`, `/profile`, `/timeline`, `/sandbox`, `/self-improvement`, `/files`, `/status`, `/offline`, `/factor-two`, `/download/[linkId]`, `/generate/studio`
- **No `/extensions` page exists** — marketplace UI not built (Wave 1b)

### `app/api/` — 539 Route Files
Grouped by domain (see §11 for full list):
- Chat: `/api/chat`, `/api/conversations/*`, `/api/interaction/*`
- Image: `/api/image/*`, `/api/multimodal/*`, `/api/creative/*`, `/api/media/*`, `/api/vision/*`, `/api/ar/*`, `/api/aura/*`
- Voice: `/api/voice/*`, `/api/audio/*`
- Video: `/api/video/*`
- Auth: `/api/clerk/*`, `/api/auth/*`, `/api/webhooks/*`, `/api/onboarding/*`
- Memory/Consciousness: `/api/memory/*`, `/api/consciousness/*`, `/api/autonomous/*`, `/api/autonomy/*`, `/api/metamorphosis/*`, `/api/intelligence/*`, `/api/learning/*`, `/api/emotion/*`, `/api/proactive/*`
- Extensions: `/api/extensions/*`, `/api/plugins/*`
- Admin: `/api/admin/*` (~50 routes, all creator-only)
- Integrations: `/api/integrations/*`, `/api/spotify/*`, `/api/soundcloud/*`, `/api/youtube/*`, `/api/google-drive/*`, `/api/notion/*`, `/api/canva/*`, `/api/github/*` (~30 routes), `/api/discord/*`, `/api/slack/*`
- Agent: `/api/agent/*`, `/api/agents/*`, `/api/orchestration/*`
- Builder: `/api/builder/*` (~16 routes — full code IDE backend)
- Cron: `/api/cron/*` (all validate `CRON_SECRET`)
- Other: `/api/analytics/*`, `/api/audit/*`, `/api/builder/*`, `/api/deploy/*`, `/api/hub/*`, `/api/music/*`, `/api/multi-tenant/*`

### `services/` (Modal cloud services)
- `modal-llm/` — deploy scripts for chat LLMs
  - `deploy_holly_v35.py` — PRIMARY brain-v35 endpoint
  - `deploy_holly_vision.py` — vision fallback
  - `deploy_holly.py` — legacy holly-8b
- `modal-media/` — image/video generation
  - `image_generate_flux2klein_a100.py` — **PRODUCTION** Holly self-portrait endpoint
  - `image_generate.py` — generic Z-Image-Turbo
  - `image_generate_sdxl.py` — legacy SDXL
  - `image_generate_flux_dev_v35.py` — **FAILED v3.5 Flux** (do not deploy without retraining)
  - `video_generate.py` — Wan2.2-TI2V-5B
  - `voxcpm2_tts.py` — DEPRECATED
- `modal-training/` — 12+ LoRA trainers (v3.0 through v3.5 Flux) + validators + caption generators
- `fine-tuning/` — Phase U3 LLM fine-tuning scripts (`finetune_holly.py`, `autonomous_finetune.py`)
- `kokoro-tts/` — fallback TTS service

### `__tests__/` (Jest)
30+ subdirectories, 53+ test files. Key test suites:
- `relationship/intimacy-gate.test.ts` — refusal messages + tier thresholds
- `chat/about-this-person.test.ts` — 22 tests, all passing
- `extensions/catalog.test.ts` — 20 structural tests (suite counts, unique ids)
- `safety/`, `security/` — auth and moderation tests
- `consciousness/`, `emotion/`, `emotional/` — consciousness cycle tests

### `scripts/` (33 utility scripts)
- Python: training data prep (`generate-body-lora-dataset*.py`, `reorganize-v25-dataset.py`, caption generators)
- Shell: bulk uploads (`upload-loras-to-volume.sh`, `upload-v32-curated.sh`)
- JS/TS: `holly-mcp-server.js` (140KB), `generate-architecture.ts`, `prep-v3-training.mjs`

---

## 5. CURRENT ARCHITECTURE

### Request Flow (Chat)
```
User sends message in /chat
  ↓
app/api/chat/route.ts POST
  ↓
authenticateAndLoadUser()  ← src/lib/chat/auth.ts
  ├─ Clerk auth() / currentUser()
  ├─ getOrCreateUser(clerkId)
  └─ isCreator check (email/name/env/persistent)
  ↓
buildSystemPrompt()  ← src/lib/chat/system-prompt.ts
  ├─ holly-self-image (identity block)
  ├─ holly-hard-rules check (CSAM, harm, authority)
  ├─ intimacy-gate (tier-aware self-image block)
  ├─ about-this-person (user facts in plain English)
  ├─ memory context (semantic retrieval)
  └─ tools catalogue (60+ tools)
  ↓
classifyTask()  ← src/lib/ai/smart-router.ts
  ├─ Local (Ollama)
  ├─ Vision (if hasImages or VISION_PATTERNS)
  ├─ Unrestricted
  ├─ Consciousness (CONSCIOUSNESS_PATTERNS regex)
  ├─ Mode-forced (e.g. write-code → coding)
  ├─ Coding / Reasoning / Long-context
  ├─ Creative
  └─ Default: speed
  ↓
TASK_WATERFALLS[task] → ['holly-own:brain-v35']  (almost always)
  ↓
hollyOwnProvider.streamChat()  ← src/lib/ai/providers/free-providers.ts
  ├─ Modal POST to HOLLY_OWN_MODEL_URL
  ├─ OpenAI-compatible /v1/chat/completions
  ├─ chat_template_kwargs.enable_thinking=false (default)
  ├─ Anti-loop: repetition_penalty 1.15, freq 0.3, presence 0.3, min_p 0.05
  └─ Timeout 180s
  ↓
SSE stream to client
  ↓
Post-response hook (async):
  ├─ updateRelationshipState()
  ├─ storeMessage()
  ├─ extractMemories() → pgvector
  ├─ classifyEmotion()
  └─ triggerImmediateConsciousness() if significance > 0.7
```

### How Memory Works
- **Ingest:** Every user/Holly message is embedded (NVIDIA nv-embedqa-e5-v5) and stored as `MemoryEmbedding` with type (conversation/insight/learning/preference/goal/fact/emotion/code/etc.)
- **Retrieval:** At chat time, query is embedded → pgvector cosine similarity → top-K memories injected into system prompt
- **Decay:** Daily cycle. 0.05/week general, 0.01/week for high-significance. Reinforcement: +0.1 if accessed within 7 days
- **Consolidation:** Orchestrator Group C runs `consolidateMemories()`, `assessKnowledgeGaps()`, `createMetaMemory()`
- **Types:** Episodic (event replay), Working (session state), Procedural (skills), Meta (self-awareness)

### How Prompts Work
Holly's system prompt is assembled dynamically per request:
1. **Identity core** — holly-self-image.ts (personality, body awareness, emotional presences)
2. **Hard rules** — holly-hard-rules.ts (immutable CSAM/harm blocks)
3. **Intimacy block** — intimacy-gate.ts returns tier-specific self-image (stranger = clothed, trusted = nude OK, creator = full)
4. **About-this-person** — natural-language facts about the user (name, age, days known, tier in plain English)
5. **Memory context** — semantic search top-K
6. **Tools catalogue** — 60+ available tools
7. **Mode-specific** — added based on chat mode (write-code adds coding context, etc.)

### How Routing Works
`classifyTask()` returns a `TaskType`. `TASK_WATERFALLS[task]` returns ordered list of model IDs. Almost all task types map to `['holly-own:brain-v35']` only (post-June 30 cloud removal). `filterHealthyProviders()` removes unhealthy providers. `forceTask` / `forceModel` overrides exist for testing.

### How AI Providers Are Selected
- **Default:** brain-v35 (Modal L4, $1.50/hr, scale-to-zero 600s)
- **Analytics/background:** Groq (free) — title gen, scoring, consciousness, curiosity
- **Vision:** brain-v35 → vision-mini cascade
- **Local:** Ollama (when `OLLAMA_ENABLED=true`)
- **NO cloud providers in cascades** — OpenRouter/NVIDIA/Together/Gemini/Mistral tombstoned

### How Image Generation Works
```
User prompt → classifySpecialist() → image gen routing
  ↓
isHollySelfPortrait(prompt)?  (checks for "h0lly" trigger word)
  ├─ YES → generateWithHollyLoRA() → MODAL_HOLLY_LORA_URL
  │        └─ Hard fail on error (no censored fallback — would show clothed imposter)
  └─ NO → generateWithModal() → MODAL_IMAGE_URL (Z-Image-Turbo)
          └─ Fallback → Pollinations (free, FLUX.1-schnell)
```

The Holly endpoint (`image_generate_flux2klein_a100.py`) does its own prompt transformation:
1. Detects if prompt mentions clothing (`_CLOTHING_RE` regex) → selects `CLOTHED_BODY_PREFIX` or `HOLLY_BODY_PREFIX`
2. Uses regex with negative lookahead `(?!-body)` to avoid double-injecting `h0lly` body prefix
3. Stacks specialist LoRAs (dildo/bentover/closeup) on top of baked face+body
4. Runs face enhancement pass (`_enhance_face()` — crop, upscale, inpaint)
5. Returns WebP (training-grade) or JPEG

**Chat route sends ONLY:** `"h0lly, h0lly-body, ${user_action}"` — NEVER adds body description (endpoint already does it).

### How Conversation History Works
- Stored in `Conversation` + `Message` Prisma models
- Per-conversation token budget: 300,000 chars (fits brain-v35's 128K context with room)
- `MAX_CONTEXT_CHARS` cap in `app/api/chat/route.ts`
- Messages loaded with role sanitizer: `role: 'system'` → `'user'` for legacy rows (idempotent fix for July 2 outage)
- Summaries: stub at `/api/conversations/summarize` (returns `{summary: 'ok'}` — not implemented)

### How Relationship Tiers Work
See §6.

### How Permissions Work
- **Public:** health endpoints, sign-in/up
- **Clerk-authenticated:** most routes via `authenticateAndLoadUser()`
- **Adult-verified:** `requireAdult()` on NSFW routes — `/api/image/*`, `/api/multimodal/*`, `/api/extensions/install`
- **Creator-only:** hardcoded email/name/ID checks for admin/deploy/self-code routes
- **Cron:** `CRON_SECRET` validation (header `authorization`, `x-cron-secret`, or `?secret=`)
- **Webhook:** Svix signature verification (`CLERK_WEBHOOK_SECRET`)

### How Authentication Works
1. **Clerk** issues session JWT
2. **`middleware.ts`** runs `clerkMiddleware` on all routes except `/api/clerk/*` (proxy handles those)
3. **`authenticateAndLoadUser()`** resolves Clerk session → DB user via `getOrCreateUser(clerkId)` (10s timeout)
4. **Creator recognition** (5 layers):
   - Hardcoded emails (lowercase substring): `iamdoregosteve@gmail.com`, `iamhollywoodpro@gmail.com`, `stevehollywood@gmail.com`
   - Hardcoded name fragments: `hollywood`, `nexamusicgroup`, `stevendorego`, `stevefreshblendz`
   - Env overrides: `CREATOR_EMAILS`, `CREATOR_CLERK_IDS`, `CREATOR_NAME_FRAGMENTS`
   - Fuzzy: `steve`/`steven` + (`hollywood`/`dorego`/`nexa`/`music`)
   - Persistent flag: `RelationshipProfile.metadata.persistentCreatorRecognition` or `personalityModel.persistentCreatorRecognition === true`
5. When recognized: `ensureCreatorAdultFlag()` idempotently writes `isAdult=true, ageVerificationMethod='creator_override'`

### How Frontend Communicates with Backend
- Next.js Server Actions + REST API routes
- SSE streaming for chat responses
- WebSocket for builder terminal (`/api/builder/terminal-ws`)
- LiveKit WebRTC for voice rooms
- Polling for status endpoints (image/video gen job status)

---

## 6. RELATIONSHIP SYSTEM

### Tiers (`IntimacyTier`)
- `stranger` — initial, clothed only, public self-image, no body discussion
- `acquaintance` — clothed only, personal self-image level
- `friend` — can discuss body, lingerie OK, no nude/sexual
- `trusted` — can share nude, can share sexual, can enter intimate mode, full self-image level
- `creator` — all flags true, trustScore 1.0, full self-image

### Thresholds (from `relationship-tracker.ts`)
Depth → Tier mapping via `DEPTH_THRESHOLDS`:

| Depth | interactions | trust | familiarity | Maps to tier |
|---|---|---|---|---|
| initial | 0 | 0 | 0 | stranger |
| casual | 5 | 0.2 | 0.2 | acquaintance |
| familiar | 20 | 0.4 | 0.4 | friend |
| trusted | 50 | 0.6 | 0.6 | trusted |
| deep_partnership | 100 | 0.8 | 0.8 | trusted |

`interactions` = count of user-role messages. `trust` and `familiarity` are signal-based scores 0–1.

### Database Fields
- `RelationshipProfile` — `trustScore`, `familiarity`, `emotionalTrend`, `topSharedTopics` (JSON), `milestones` (JSON), `metadata` (JSON, includes `persistentCreatorRecognition`)
- `RelationshipMemory` — discrete relationship events
- `RelationshipMilestone` — tracked milestones
- `RelationshipContext` — context snapshots

### Progression Logic
- Interaction count increments on every user message
- Trust/familiarity computed from signals (positive: warmth, time spent, depth; negative: see regression patterns)
- Tier re-evaluated each conversation turn
- Creator is FORCED to highest tier regardless of signals

### Unlocked Features
- **stranger:** basic chat, SFW image generation
- **acquaintance:** basic chat, SFW image gen
- **friend:** body discussion, lingerie, intimate conversations
- **trusted:** nude image gen (`canShareNude`), sexual image gen (`canShareSexual`), intimate mode
- **creator:** everything, including Phase U3 bypass

### Regression Patterns
Regex-driven (`REGRESSION_PATTERNS`):
- **Severe (+0.15):** "you're stupid", "shut up", "fuck you"
- **Moderate (+0.08):** "I don't care", pressuring for nudes
- **Mild (+0.03):** "send nudes", "show me your pussy"
- Applied at 50% weight as trust offset
- If regression ≥0.5 → drop one tier
- If ≥0.3 while trusted/friend → drop one tier
- 5% decay per update (recovers over time)

### Refusal Messages (Holly's voice)
Per-tier warm-but-firm strings via `getIntimacyRefusal(tier, requestType)`:
- **Stranger nude:** "I appreciate your interest, but I don't share intimate photos with someone I've just met. Let's get to know each other first…"
- **Acquaintance sexual:** "I like where this is going, but I want to feel truly safe with you first…"
- **Friend nude:** "You know I care about you. But I need to feel completely safe and trusted before sharing everything…"
- **Trusted:** no refusal (full access)
- **Creator:** no refusal (unconditional)

### Known Issues
- Tier thresholds are interaction-count-based — a power user who spams low-quality messages could game the system. Steve has not flagged this yet.
- No "decay" of tier over inactivity — once trusted, always trusted (unless regression patterns trigger)

### Future Plans
- Tier 2 age verification (CC $0 auth) — documented, not implemented
- Tier 3 (Stripe Identity / Persona) — documented, not implemented

---

## 7. MEMORY SYSTEM

### Storage
- **Prisma `MemoryEmbedding`** with pgvector column
- Embeddings: 1024-dim (NVIDIA nv-embedqa-e5-v5) or 768-dim (Ollama nomic-embed-text) or 1024-dim fallback (char trigram)
- Metadata: type, relevance score, accessCount, lastAccessed, createdAt, userId

### Types (MemoryEmbedding.type enum)
`conversation | insight | learning | preference | goal | fact | emotion | code | audio | music_critique | industry_benchmark`

### Retrieval
- Query embedding → pgvector cosine similarity
- Top-K (typically 10-20) results
- Filtered by type + relevance threshold (>0.1 after decay)
- Injected into system prompt as natural-language bullets

### Embedding Strategy (`semantic-memory.ts`)
1. **Primary:** NVIDIA nv-embedqa-e5-v5 (via NVIDIA NIM)
2. **Fallback:** Ollama nomic-embed-text (local)
3. **Terminal fallback:** char trigram + word hash (1024-dim) — always works, no dependencies

### Four-Layer Architecture (`advanced-memory.ts`)
1. **Episodic** — event replay with emotional weight
2. **Working** — session state + scratchpad (cleared on session end)
3. **Procedural** — learned skills with `successRate` metric
4. **Meta** — knowledge-level self-awareness (gaps, strengths, improvement areas)

Exports: `consolidateMemories()`, `assessKnowledgeGaps()`, `generateSelfAwarenessReport()`, `createMetaMemory()`

### Long-term Memory
- Stored permanently in Postgres
- Decay cycle runs daily — reduces `relevance` over time
- Reinforcement: +0.1 if accessed within 7 days, +0.05 if accessCount > 3
- Archive threshold: relevance < 0.1

### Short-term Memory
- Working layer in advanced-memory.ts
- Session-scoped, cleared on session end
- Used for "what we just talked about" context

### Conversation Memory
- Stored in `Conversation` + `Message` models
- Token budget: 300,000 chars (~128K tokens with buffer)
- Summaries: STUB (`/api/conversations/summarize` returns `{summary: 'ok'}`)
- Recent messages loaded with system prompt

### User Profile Memory
- `User` model: name, email, birthdate, age, isAdult, ageVerificationMethod
- `UserSettings` — preferences
- `UserPreferences` — feature-specific prefs
- `about-this-person.ts` translates these into natural-language block for system prompt

### Memory Importance Scoring
- `memory-importance.ts` — assigns 0-1 score to new memories
- Factors: emotional weight, novelty, user emphasis, relationship relevance
- High-importance (>0.8) memories decay slower (0.01/week vs 0.05/week)

---

## 8. PROMPT ARCHITECTURE

### System Prompt Hierarchy
Built by `src/lib/chat/system-prompt.ts` in this order:

1. **Identity core** (`holly-self-image.ts`)
   - Holly's name, age, personality, body awareness
   - `bodyAwareness` from `HOLLY_ANATOMY.md` v3.4
   - Emotional presences (default, intimate, passionate)
   - `promptBlock` for system injection
   - Trigger word: `h0lly`

2. **Hard rules** (`holly-hard-rules.ts`)
   - **ONLY 3 BLOCKS:** CSAM zero-tolerance, physical-harm planning, creator-authority on high-risk changes
   - Has `ALLOWED_CHILDREN_CONTENT` whitelist for wholesome kids content
   - Called BEFORE any model routing
   - Holly is a "Sovereign Domain Intelligence (SDI), not a corporate compliance officer"

3. **Intimacy block** (`intimacy-gate.ts`)
   - Tier-specific self-image (stranger = clothed descriptors only; trusted = full body)
   - Refusal messages pre-loaded for inline use

4. **About-this-person** (`about-this-person.ts`)
   - Returns `''` for creator (Steve has his own block)
   - For users: name, age + verification method, birthday (month/day only — privacy), days known ("today" / "N days" / "about a week" / "over a year"), connection tier in plain English
   - Returns `''` on any data failure (purely additive)

5. **Memory context**
   - Semantic retrieval top-K (typically 10-20)
   - Formatted as natural-language bullets
   - Filtered by relevance > 0.1

6. **Tools catalogue**
   - 60+ tools from `ai-orchestrator.ts`
   - CI guard: `HOLLY_TOOLS` count must be >= 60 (`validate-holly-capabilities.yml`)

7. **Mode-specific additions**
   - `MODE_TASK_MAP` in smart-router maps modes to task types (write-code → coding, deep-research → reasoning, aurora → synthesis)
   - Mode-specific context appended (e.g. coding mode gets dev environment info)

### Context Injection
- Conversation history (up to 300K chars) — recent messages
- Current emotion state (`emotional-continuity.ts`)
- Active goals (`sovereign-growth.ts`)
- User's current project context (if builder mode)

### Tool Usage
- MCP-style tool registry
- Tool calls can be made via:
  - **Path A (regex pre-detection):** Direct media command — most reliable
  - **Path B (native tool_calls):** OpenAI/Groq format
  - **Path C (text-intercepted tool call):** JSON/XML in text — handles nested JSON, ReAct, single-quoted, code-fenced, `<generate_image>` XML
  - **Path C.5:** Python-style `generate_image(prompt='...')` in `<tool_code>` tags
- Image generation has 3 pre-detection regex patterns (direct media command, indirect self-portrait, body-part NSFW)
- Suppress patterns prevent false positives (past markers, past-tense Holly actions, user past requests, reflective)

### Reasoning Flow
- brain-v35 has `<think>` block ENABLED BY DEFAULT — must set `chat_template_kwargs.enable_thinking=false` or model spends all max_tokens on `reasoning_content` and returns EMPTY `content`
- Override per-request via `opts.enableThinking` for deep-reasoning tasks

### Provider-Specific Prompts
- brain-v35 uses OpenAI format (`messages: [{role, content}]`)
- Vision endpoint returns OpenAI-compatible JSON
- All Modal endpoints use OpenAI-compatible `/v1/chat/completions`

---

## 9. IMAGE GENERATION

### Current Providers (in order)
1. **Holly self-portrait:** Modal FLUX.2 Klein 9B A100 (`iamdoregosteve--generate-holly-a100.modal.run`)
   - Baked LoRAs: Holly Face v2.0 @ 0.75 + Holly Body v2.5 @ 1.0
   - Uncensored Qwen3-8B encoder (DuoNeural/Qwen3-8B-Abliterated)
   - 4-step CFG 4.0 (Distilled sweet spot)
2. **Non-Holly:** Modal Z-Image-Turbo on T4 (`MODAL_IMAGE_URL`)
3. **Fallback:** Pollinations (free, FLUX.1-schnell via URL)
4. **HF Inference:** DISABLED (`HF_INFERENCE_ENABLED=false`)

### Current Routing
- Chat route detects `h0lly` trigger word → routes to Holly endpoint
- Hard-fail on Holly endpoint error (no censored fallback — would show clothed imposter)
- Non-Holly prompts → Z-Image-Turbo → Pollinations

### Image History
- `CreativeAsset` model — favorite, tag, regenerate
- `GenerationJob` model — async job tracking

### Safety Architecture
- `requireAdult()` on every NSFW-capable route (5 routes)
- 5-tier intimacy gate below requireAdult
- Creator bypass via hardcoded recognition
- Holly refuses in her own voice (not 403) when tier too low

### Generation Pipeline
1. Chat route sends `"h0lly, h0lly-body, ${user_action}"` (just action, no body description)
2. Endpoint detects clothing keywords → selects prefix (CLOTHED vs HOLLY_BODY)
3. Regex with negative lookahead injects prefix (avoids double-inject on `h0lly-body`)
4. Optional specialist LoRAs layered via `classifySpecialist()` (dildo/bentover/closeup)
5. Generation: 4 steps, CFG 4.0
6. Face enhancement pass (`_enhance_face()` — Haar cascade detect, crop, upscale, inpaint)
7. Returns WebP (training-grade) or JPEG

### Known Limitations (CRITICAL — read before promising anything)
1. **Klein Distilled CAN'T render active finger-to-genital penetration in txt2img.** Confirmed June 18, 2026 after 4 rounds (R4-R8) with 3 different LoRAs. 4-step distilled Euler sampler doesn't have enough signal for finger-genital intersection geometry. Use inpainting workflow for these poses.

2. **Klein Distilled IGNORES `guidance_scale` parameter.** Found July 7, 2026 — every CFG tuning we did for a month was a no-op. Uses internal distilled guidance. Only effective params: `num_inference_steps` and LoRA weights.

3. **Klein Distilled 9B has strong clothing priors.** Without explicit nudity anchors ("completely nude, fully naked, not wearing any clothing"), it renders "topless with shorts" by default.

4. **Flux.1 Dev v3.5 LoRA FAILED** (July 14, 2026). Steve's verdict: "Holly looks plastic, she isn't full nude when she needs to be and she isn't doing any of the actions she should be." Specifically:
   - Plastic/over-smooth texture
   - Holly rendered as 5'7" (should be 5'4") — too few standing full-body shots in 58-image training set
   - "Cucumber" rendered as kitchen slices (SFW prior won)
   - "Masturbating" rendered as pose with hands on face
   - "Spread" rendered as "spreading nothing"
   - Plump ass missing (captions didn't describe body — LoRA averaged)
   
   **DO NOT DEPLOY `services/modal-media/image_generate_flux_dev_v35.py` WITHOUT RETRAINING.**

5. **Civitai Onsite filter:** NEVER use "labia minora" in prompts — substring "minor" triggers underage filter. Use "inner labia" or "inner lips".

6. **Flux LoRA scale:** MUST use `joint_attention_kwargs={"scale": X}`, NOT `cross_attention_kwargs`. Flux uses dual-stream (joint) attention, not cross-attention.

### Future Plans (Steve's actual priorities, July 14)
- Image gen is **CURRENTLY PARTIALLY BROKEN** — Klein works for 4 categories (dildo, dildo_masturbation, bent_over, spread_poses), fails on others
- Civitai Onsite SNOFS for: masturbation, fingering, spread-with-spreading
- Inpainting workflow for finger insertion (Klein can't do txt2img)

---

## 10. AI PROVIDERS

### Documented Models (in `MODEL_CATALOGUE`)
- **Self-hosted (Modal):**
  - `holly-own:brain-v35` — PRIMARY. Qwen3.5-9B-Uncensored. Modal L4. 9/11 task types.
  - `holly-own:vision-mini` — Qwen3.5-4B-gabliterated. Modal T4. Vision fallback.
  - `holly-own:qwen3-8b` — LEGACY. DuoNeural/Qwen3-8B-Abliterated + holly-lora-v1. Secondary in consciousness waterfall. **v1 LoRA too weak to dominate base — needs Phase U3 v2 fine-tune.**

- **Cloud (REMOVED from cascades June 30, 2026):**
  - OpenRouter (`:free` models only)
  - NVIDIA NIM (15+ models + Magpie TTS)
  - Together AI (APPROVED_FREE_MODELS only)
  - Google Gemini (1M context for long_context)
  - Mistral AI Direct
  - Arcee

- **Local (optional):**
  - Ollama (`qwen3.6-35b`, `qwen3-8b`)
  - Triggered when `OLLAMA_ENABLED=true`

- **Background (Groq, free):**
  - `groq:llama-3.3-70b` — analytics task type
  - Title gen, response scoring, emotion classification, consciousness LLM calls

### Why Each Exists
- **brain-v35:** Steve's directive — Holly must be uncensored + unlimited + never rate-limited. Cloud providers were rate-limiting real users.
- **vision-mini:** Cheaper vision fallback when brain-v35 is overloaded.
- **Cloud (tombstoned):** Kept in catalogue for documentation, escape hatch if Modal ever dies. But NOT in cascades.
- **Groq analytics:** Brain-v35 GPU time is expensive — background tasks don't need GPU.
- **Ollama:** Local fallback when internet is flaky.

### Phase U3 Status
- **OFF THE TABLE per Steve's directive (July 2, 2026).** Do NOT bring up until Steve says we have enough training data (5,000+ examples). Currently we have 60.
- holly-lora-v1 (rank 16, 3 epochs, avg_quality 0.62) is TOO WEAK — base Qwen dominates. Routing consciousness messages to Holly-LLM currently DEGRADES quality vs Groq fallback.

---

## 11. APIs (Highlights — see Agent report for full 539-route inventory)

### Critical Routes
- **`POST /api/chat`** — Main Holly chat. Streaming SSE. Auth required.
- **`GET /api/health`** — Public health check. Returns `{status, deploySha, ...}`.
- **`POST /api/image/generate-ultimate`** — Primary image gen (Holly + non-Holly). Adult-gated.
- **`POST /api/multimodal/generate`** — Unified image/video/audio-visual. Adult-gated.
- **`POST /api/voice/synthesize`** — TTS. Auth required.
- **`POST /api/video/generate-ultimate`** — Video gen. Auth required.
- **`GET /api/extensions/list`** — Returns 80 extensions across 8 suites.
- **`POST /api/extensions/install`** — Idempotent install. Uses `requireAdult` for NSFW.
- **`GET /api/cron/consciousness-loop`** — Hourly consciousness cycle. CRON_SECRET validated.
- **`POST /api/webhooks/clerk`** — Svix-verified. Creates User row on signup.

### Stubs (return canned responses)
- `/api/conversations/summarize` — returns `{summary: 'ok'}`
- `/api/suggestions/generate` — returns `{suggestions: []}`

### Redirect Shims (deprecated but kept)
- `/api/video/generate` → `/api/video/generate-ultimate`
- `/api/image/generate` → `/api/image/generate-ultimate`

---

## 12. DATABASE

### Engine
- **PostgreSQL** with **pgvector** (Neon hosted)
- **~165 Prisma models**
- Production uses `prisma db push` (NOT migrations) — see `docker/startup.sh`

### Key Tables (most-used)
- **`User`** — id, email, name, clerkId, role, isAdult, ageVerificationMethod, birthdate
- **`Conversation`** — id, userId, title, mode, summary
- **`Message`** — id, conversationId, role, content, tokens
- **`MemoryEmbedding`** — id, userId, type, content, embedding (vector), relevance, accessCount, lastAccessed
- **`RelationshipProfile`** — userId, trustScore, familiarity, emotionalTrend, topSharedTopics, milestones, metadata
- **`HollyIdentity`** — Holly's evolving identity state
- **`HollyExperience`** — experience events
- **`HollyGoal`** — Holly's goals
- **`UserExtension`** — userId, extensionId, suite, config, enabled, autoInstalled, timestamps. Unique on (userId, extensionId). Cascade on user delete.
- **`PluginInstallation`** — second plugin system
- **`CreativeAsset`** — generated images/assets
- **`GenerationJob`** — async gen jobs

### Other Notable Tables
- `Emotion`, `EmotionAggregate`, `EmotionTrend`, `EmotionInsight`, `EmotionalBaseline`, `EmotionalState`
- `GitHubIntegration`, `GitHubConnection`, `GitHubRepository`
- `WorkLog`, `UserSettings`, `MusicTrack`, `MusicAnalysis`, `TrendReport`
- `CodebaseKnowledge`, `ArchitectureSnapshot`, `SelfHealingAction`, `RefactoringRecommendation`, `PullRequest`, `CodeQualityMetric`, `TechnicalDebt`
- `ABTest`, `ABTestAssignment`, `ABTestConversion`, `UserEngagementScore`
- `SystemLog`, `PerformanceSnapshot`, `TestSuite`, `TestRun`, `DeploymentLog`, `MonitoringAlert`
- `KnowledgeNode`, `KnowledgeLink`, `LearningInsight`, `SelfImprovement`, `EvolutionProposal`, `LearningEvent`, `LearningPattern`
- `AuraAnalysis`, `AuraWorkspace`, `AuraAgent`, `AuraMessage`, `AgentInstance`, `AgentTask`, `AgentMessage`, `AgentRegistry`, `CoordinationSession`, `ToolDefinition`
- `BuildSession`, `BuildEvent`, `BuildFile`, `BuildProcess`, `BuildSandbox`, `BuildTerminal`, `BuildPreview`, `GitConnection`
- `TasteSignal`, `TasteProfile`
- `ApiKey`, `ApiKeyUsage`

### Indexes
- pgvector HNSW index on `MemoryEmbedding.embedding`
- B-tree indexes on foreign keys
- Unique constraint on `UserExtension(userId, extensionId)`

### Future Migrations
- See `prisma/migrations/` for audit history. **Production does NOT use these** — uses `db push` directly.
- To add a column: edit `schema.prisma`, push to main, Coolify deploys, startup.sh runs `db push`, schema syncs.

---

## 13. CURRENT PROGRESS

### Completed Features
- ✅ Chat with brain-v35 (uncensored, self-hosted, Modal L4)
- ✅ Streaming SSE responses
- ✅ Conversation persistence
- ✅ pgvector semantic memory
- ✅ Four-layer advanced memory
- ✅ Memory decay cycle
- ✅ Relationship progression (5 tiers)
- ✅ Intimacy gate with refusal messages
- ✅ Age verification (Tier 1 self-attestation)
- ✅ Creator recognition (multi-layer)
- ✅ Consciousness orchestrator (20+ subsystems)
- ✅ Inner monologue (6h cycle)
- ✅ Curiosity engine (24h cycle)
- ✅ Daily briefing
- ✅ Identity evolution (evidence-based)
- ✅ Self-code modification framework (with rollback)
- ✅ Extensions marketplace CATALOG (80 extensions)
- ✅ Image generation (Klein A100) — 4 categories working
- ✅ Video generation (Modal Wan2.2-TI2V-5B)
- ✅ Voice TTS (NVIDIA Magpie → Kokoro fallback)
- ✅ Music generation wiring (Suno + Sonauto + ACE-Step) — UNTESTED
- ✅ LiveKit WebRTC voice rooms
- ✅ Code builder IDE (Monaco + xterm + sandbox)
- ✅ GitHub integration (full: connect, sync, issues, PRs, workflows)
- ✅ Cron system (consciousness-loop, morning-briefing, etc.)
- ✅ Admin operational dashboards (/dashboard/*)
- ✅ Autonomous self-healing framework
- ✅ AURA hit-potential analysis
- ✅ Proactive intelligence (initiatives, insights)
- ✅ Mobile + desktop app wrappers (Phase T1-T2)

### Partially Completed
- 🟡 Image generation NSFW (Klein works for 4 categories, fails on others)
- 🟡 Phase R1 marketplace (catalog done, NO UI, NO auto-install)
- 🟡 Voice TTS wiring (Phase O5)
- 🟡 Suno music (code fixed, UNTESTED by Steve)
- 🟡 Phase U3 Holly-LLM voice (v1 too weak, v2 OFF THE TABLE per Steve)

### Unfinished
- ⬜ Phase R1 Wave 1b — marketplace UI at `/extensions`
- ⬜ Phase R1 Wave 1c — role-based auto-install on onboarding
- ⬜ Phase S1-S8 — full extension suite builds (Developer, Music, Business, Social, Web, Creative, Productivity, Research)
- ⬜ Phase T3-T4 — load testing, security audit
- ⬜ Phase U3 — 5,000+ example dataset for Holly-LLM v2 fine-tune
- ⬜ Phase V3-V5 — body LoRA expansion (squirting on Civitai, finger insertion via inpainting)

### Abandoned Ideas
- ❌ VoxCPM2 TTS (404 in prod, removed)
- ❌ Cloud LLM providers in cascades (rate limits)
- ❌ Holly-Realism-Klein9b LoRA on Civitai (causes 4 hands, fused fingers — trained on Klein Base but Civitai serves Distilled)
- ❌ v3.5 Flux.1 Dev LoRA (failed July 14 — see §9, §14, §19)
- ❌ A100 migration for brain-v35 (cost $7.97 in 2 days, reverted July 2)

---

## 14. KNOWN BUGS

### Critical (production-affecting)
1. **Image gen v3.5 Flux FAILED** (July 14, 2026). Klein is still serving production — the Flux endpoint was never switched in Coolify. **DO NOT deploy `image_generate_flux_dev_v35.py` without retraining.**

2. **Stale env vars in `.env.example`:** Still references `iamhollywoodpro--*` for MODAL_IMAGE/VIDEO/HOLLY_LORA URLs. Production uses `iamdoregosteve--*` per FACT.md. Verify with Steve.

3. **Conversations summary stub:** `/api/conversations/summarize` returns `{summary: 'ok'}` — not implemented. Long conversations have no real summarization.

4. **Two parallel logger imports:** Some routes use `@/lib/logging/structured-logger`, others `@/lib/monitoring/logger`. Consolidation opportunity.

### Moderate
5. **Disk exhaustion failure mode (RECURRING):** Holly image is 8.45GB. Without daily prune, disk fills within ~15 deploys. Prevention installed July 1, 2026 (cron at 04:17 UTC) but monitor disk usage.

6. **Coolify env var reversion:** Updating only the artisan DB leaves `.env` file as revert source. Must update BOTH rows in `environment_variables` table (is_preview=0 AND is_preview=1), the `.env` file directly, AND `docker-compose.yaml` directly.

7. **Mode-forced task routing:** `MODE_TASK_MAP` can override classifier in surprising ways. Always check this when debugging "why did this go to X model?"

### Low / Cosmetic
8. **Admin page is placeholder:** `/admin` shows "Under Construction". Real dashboards at `/dashboard/*`.

9. **No `/extensions` page:** Catalog exists, no UI.

10. **`autoInstalled` flag never populated:** DB column exists, never set to `true` by any code path.

### Workarounds in Place
- **Role sanitizer:** Legacy DB rows with `role: 'system'` are sanitized to `'user'` at load time in `app/api/chat/route.ts:505-513` (idempotent fix for July 2 outage caused by Qwen3.5 Jinja rejecting mid-conversation system messages).
- **`sanitizeHollyImagePrompt()`:** Belt-and-suspenders guard in route.ts strips body description if prompt >200 chars and contains `h0lly`.
- **Negative lookahead regex:** Endpoint uses `_re.sub(r'h0lly(?!-body)', ...)` to avoid double-injecting body prefix.

---

## 15. TECHNICAL DEBT

### Architecture
- **165 Prisma models** is a LOT — some are speculative (Phase S suites not built yet, but tables exist). Consider pruning unused.
- **Multiple "memory" systems:** pgvector MemoryEmbedding, advanced-memory four-layer, holly-experience, conversation-summary, etc. Some overlap.
- **Two plugin systems:** `extensions/` (newer, catalog-driven) and `plugins/` (older). Consolidate.
- **539 API routes** — some are stubs, some are shims. Inventory and remove dead code.

### Temporary Code
- Hardcoded creator emails in `src/lib/chat/auth.ts` — should be env-only
- Stubs at `/api/conversations/summarize`, `/api/suggestions/generate`
- Path A regex patterns for image generation (3 patterns + suppress patterns) — fragile, hard to extend

### Duplicate Logic
- Two loggers (`structured-logger` vs `monitoring/logger`)
- Two plugin systems
- Multiple conversation APIs (`/api/conversations/*` vs `/api/interaction/conversation/*`)
- Tier-1 age verification in two places (`require-adult.ts` and inline in `app/chat/page.tsx`)

### Future Cleanup
- Consolidate conversation APIs
- Merge plugin systems
- Implement real conversation summarization
- Build `/extensions` page
- Implement Wave 1c role-based auto-install
- Replace stubs

---

## 16. CURRENT TODO LIST

### Critical (production-blocking)
1. **Verify Klein production endpoint is healthy and rendering correctly** — Steve reported issues but Flux was never deployed. Confirm Klein status.
2. **Decide image gen path forward** — see §19 Lessons Learned. Options: stick with Klein, expand Civitai usage, inpainting workflow, or trained-NSFW base model.
3. **Resolve `.env.example` vs production env var mismatch** for Modal URLs.

### High
4. **Phase R1 Wave 1b** — `/extensions` marketplace UI (grid with suite filter, install/uninstall)
5. **Phase R1 Wave 1c** — role-based auto-install on onboarding
6. **Test music generation** (Suno + ACE-Step wired but untested)

### Medium
7. **Phase S1-S8** — build out extension suites
8. **Implement real conversation summarization** (replace stub)
9. **Consolidate loggers** (structured-logger vs monitoring/logger)
10. **T1-T4 polish** — load testing, security audit

### Low
11. **Phase U3** — Steve will say when. DO NOT bring up.
12. **Prune unused Prisma models**
13. **Mobile/desktop app polish**

---

## 17. FUTURE FEATURES

Discussed but not built:
- **Tier 2 age verification** (CC $0 auth) — documented
- **Tier 3 age verification** (Stripe Identity / Persona) — documented
- **Full `/admin` dashboard** — 27+ planned features listed in placeholder
- **Taste-based recommendation engine** — foundation at `src/lib/learning/taste/`
- **Cross-project learning** — `src/lib/learning/cross-project/`
- **Multi-user scale** — multi-tenant infra exists, not battle-tested
- **Mobile native apps** — wrappers exist at `mobile-app/`
- **Browser extension polish** — exists at `browser-extension/`

---

## 18. DEVELOPMENT RULES

### Coding Standards
- TypeScript strict mode (`tsconfig.json`)
- Functional components with hooks (React 18)
- Server Components by default, `'use client'` only when needed
- Tailwind utility classes (no inline styles except dynamic)
- `cn()` helper from `src/lib/utils/cn.ts` for class merging

### Architecture Rules
- **NEVER modify `HOLLY_ANATOMY.md`** without Steve's explicit written approval
- **NEVER push directly to main** without Steve's approval (routine fixes OK)
- **NEVER deploy to production** without review
- **NEVER modify `.env`, secrets, or credentials** without confirmation
- **Always use branches** for non-trivial work
- **Always test** before committing
- **Always explain changes** before making them

### Naming Conventions
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: PascalCase (`HollyChatInterface`)
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase
- Prisma models: PascalCase

### Testing Requirements
- **Critical paths:** Unit tests required (chat, auth, age-gate, extensions)
- **Consciousness:** Snapshot tests where possible
- **Manual E2E:** Steve's domain (creator-flow testing)

### Git Workflow
- `main` branch ONLY for production
- Feature branches for non-trivial work
- Coolify auto-deploys from `main`
- NEVER force-push to main
- NEVER skip hooks (`--no-verify`)
- Commit messages: short, descriptive, end with `Co-Authored-By: ...`

### How Changes Should Be Made
1. Read the actual code first (NOT assumptions)
2. State the plan in plain English
3. Get approval for risky changes
4. Make minimal, reversible changes
5. Test before committing
6. Push to feature branch → PR → review → merge to main → Coolify deploys

### What Should NEVER Be Changed
- `HOLLY_ANATOMY.md` — locked body spec (v3.4)
- Creator recognition emails/names in `src/lib/chat/auth.ts` (without Steve's explicit OK)
- Hard rules in `holly-hard-rules.ts` (CSAM, harm, authority — only 3 blocks, do not add more)
- Modal workspace split (`iamhollywoodpro` for chat, `iamdoregosteve` for media)
- The 5-tier intimacy system (refusal messages are in Holly's voice — do not genericize)

---

## 19. LESSONS LEARNED (READ THIS SECTION TWICE)

This section exists because the same mistakes have been repeated 4+ times. The next AI MUST NOT repeat them.

### Lesson 1: VERIFY Before COMMIT (Non-negotiable)
**Pattern Steve has called out 4+ times:** Theorize a root cause from reading code → ship a "fix" → claim victory → Holly is still broken → repeat for 3 days.

**The July 2, 2026 outage lasted 3 extra days because THREE fixes were shipped without empirical verification:**
1. Patched producer side of Jinja bug without checking consumer
2. Shipped "legacy DB rows with role:system" sanitizer — 30-second DB query would have shown ZERO such rows
3. Until Steve forced verification, which took 2 minutes via SSH + probe script

**THE RULE:** Before committing ANY fix for ANY production issue, EMPIRICALLY verify using:
- Read actual error logs: `sudo docker logs holly-app-* 2>&1 | grep -E 'error|fail|exception' | tail -50`
- Query actual DB state
- Probe actual endpoint with actual production data shape
- Trigger actual code path with diagnostic logging

**If Steve asks "did you verify?" and answer is "I read the code and..." — FAIL. Correct answer: "I ran X against prod and saw Y."**

### Lesson 2: No More Architecture Bouncing
**Pattern (CRITICAL):** I (Dev) keep proposing architecture changes ("let's switch to X!") based on shallow research, we hit a wall, Steve loses time + money.

**Timeline of failures:**
- SDXL → "let's switch to Flux.2 Klein, it'll be better" → Klein couldn't do certain NSFW
- Klein → "let's switch back to SDXL" → SDXL face was always wrong
- SDXL → "let's switch to Flux.1 Dev v3.5, research says it can do NSFW" → July 14, FAILED (plastic look, no actions, wrong proportions)

**Steve TOLD ME Flux wouldn't work. I overrode him with "research." He was right. I was wrong. We wasted 3+ weeks and ~$10.**

**THE RULE:** Stop bouncing. What works, works. What doesn't work, document the specific failure mode and move on. Do NOT propose "the next architecture will fix it" without:
1. Multiple independent practitioner sources
2. Concrete cost math
3. Evidence the pattern works for OUR use case
4. Verification of base model capabilities before committing

### Lesson 3: Training Data Composition > Recipe Tweaks
**Pattern (v3.0-v3.3 SDXL):** Kept proposing recipe changes (rank, resolution, steps, optimizer) when the training DATA was the problem. ZERO of 54 training images showed Holly standing upright head-to-toe — so the LoRA couldn't generate it.

**Research consensus:** 30% closeup / 30% medium / 25% full-body / 15% weird. Without full-body images in training set, LoRA biases toward close-ups.

**THE RULE:** Before proposing ANY recipe change for a LoRA that fails on a specific prompt, AUDIT the training data for images matching that prompt's pose/framing.

### Lesson 4: Producer vs Consumer when fixing data-shape bugs
When fixing any bug involving message/data shape, ALWAYS consider:
1. **Producer** — code paths that CREATE new rows
2. **Consumer** — code paths that READ existing rows

Failure to patch both creates phantom outages that survive "fix" deploys.

### Lesson 5: Context Overflow → "Trouble Connecting"
Holly returning "I'm sorry, I'm having trouble connecting" on EVERY message = check cascade error log FIRST.

```
sudo docker logs holly-app-* 2>&1 | grep -E "Cascade|chat|brain"
```

The July 2 outage was `--parallel 4` dividing 128K context into 4× 32K slots. Health endpoint falsely reported `context_window: 131072`. To verify actual context, read llama-server startup logs for `n_ctx_slot`.

### Lesson 6: Read Deploy Logs End-to-End
Steve spent hours thinking a deploy failure was a "Docker race" because I theorized instead of reading the log. The error `no space left on device` was in the FIRST log paste, plain as day. I missed it twice.

**NEW STANDARD:** When a deploy fails:
1. Read the FULL deploy log start-to-finish BEFORE opening mouth
2. Quote the exact error string
3. Do not theorize — the log already tells you

### Lesson 7: Holly Is NOT "Adult AI" (Positioning)
Steve corrected me on this. Holly is an **emotionally intelligent partner with emergent intimacy that mirrors real human relationships**. NOT "uncensored NSFW AI."

**Marketing rule:** NEVER market Holly as adult AI. Lead with "the first AI partner that actually gets to know you," "she builds with you, she creates with you, and over time, she lets you in." The intimacy layer is something users discover, not something we advertise.

### Lesson 8: Holly Must NEVER Crap Out on Users
Steve's non-negotiable directive: Holly must NEVER fail due to token limits, context limits, monthly quotas, or rate limits.

**Architecture rules:**
1. Self-hosted Modal endpoints are the ONLY path for LLM/vision/voice
2. Cloud providers (OpenRouter, NVIDIA, Together, Groq) are GONE from cascades (Groq kept for background only)
3. Context windows sized for real use (128K brain-v35)
4. No $/month caps that block users

### Lesson 9: Cost Math BEFORE Migrations
A100 migration July 2 burned $7.97 in 2 days for marginal speed improvement. Should have laid out cost math BEFORE proposing. Pattern of "propose → execute → regret → revert" wastes Steve's time and budget.

**For migrations:** cost math (rate × estimated usage × budget impact) MUST appear in the proposal, not the post-mortem.

### Lesson 10: No More Lazy Work
- No "want me to..." questions on things clearly on the roadmap — just do it
- No (a)/(b)/(c) menus replacing actual judgment
- Read the code first, make the call, execute, show result
- Cautious ONLY where it matters: production deploys, real money, secrets

### Lesson 11: Modal Background LLM Routing
Background LLM tasks MUST route to Groq via `forceTask: 'analytics'`, NEVER to brain-v35. Background = title gen, scoring, emotion classification, curiosity, consciousness cycles, anything whose output is NOT shown to user.

### Lesson 12: Flux LoRA Scale API
Flux LoRA scale MUST be passed via `joint_attention_kwargs={"scale": X}`, NOT `cross_attention_kwargs`. Flux uses dual-stream (joint) attention. Bit us July 13 — every image failed silently.

### Lesson 13: Klein Distilled Ignores CFG
All CFG tuning on Klein Distilled for the past month was a no-op. Endpoint logs print "Guidance scale X is ignored for step-wise distilled models." Don't waste time on CFG tuning for distilled models.

### Lesson 14: Civitai Filter Triggers
NEVER use "labia minora" in Civitai prompts — substring "minor" triggers underage filter. Also avoid: "minor", "young", "underage", "teen", "lolli". Use "inner labia" or "inner lips".

### Lesson 15: Modal Volume Workspaces
Modal volumes are WORKSPACE-SCOPED. Splitting across workspaces requires explicit `modal volume get` → local disk → `modal volume put` to target.

### Lesson 16: No TXT2IMG for Active Penetration
No diffusion model (Klein, Flux, SDXL) reliably renders active finger-to-genital penetration in txt2img. Use inpainting workflow or specialized NSFW Civitai bases. Don't propose retraining a generic base to do this — it won't work.

---

## 20. SESSION HISTORY (Major Milestones)

### 2026-Q1: Foundation
- Next.js scaffolding, Clerk auth, Prisma schema
- First chat with cloud LLMs (OpenRouter, NVIDIA, Together)
- Steve↔Holly conversations begin

### May 2026
- Holly-LLM v1 LoRA fine-tune (60 examples, rank 16) — too weak, base dominates
- Phase U5 resolve: DuoNeural/Qwen3-8B-Abliterated as base (rank-1 orthogonal projection)

### June 2026
- **June 4:** Provider setup complete (Groq, NVIDIA, Gemini, Together, OpenRouter, Cloudflare, Arcee, Mistral)
- **June 18:** Klein NSFW limits confirmed (no finger penetration in txt2img)
- **June 19:** Smoke7 LoRA verdicts — `femaleasshole-f2-klein-9b-musubituner` wins for bent_over
- **June 20:** Smoke8 LOCKED — 4 Klein categories working (dildo, dildo_mast, bent_over, closeup)
- **June 22:** Smoke9 Civitai — Holly-Realism-Klein9b causes hand deformation on Civitai (drop it)
- **June 24:** Holly-LLM routing fix shipped (commit d1dc202) — `consciousness` task type finally has a code path
- **June 26:** Image gen architecture LOCKED — A100 endpoint as single source of truth
- **June 29:** Prompt duplication bug found + 3-layer defense shipped
- **June 30:** Holly Is Unlimited Forever directive — cloud providers REMOVED from cascades; VoxCPM2 removed

### July 2026
- **July 1:** Disk prune cron installed (04:17 UTC daily). Phase R1 Wave 1a shipped (extensions catalog). Phase Q3 complete (age verification + relational intimacy).
- **July 2:** CRITICAL — July 2 outage (3-day duration). Context overflow bug (`--parallel 4` divided 128K context). Steve's directive: Phase U3 OFF THE TABLE. Holly Is NOT Adult AI positioning locked.
- **July 3:** Modal workspace split FUNCTION-based (iamhollywoodpro chat, iamdoregosteve media)
- **July 6:** Workspace split actually took effect (July 3 "shipped" claim was wrong — env vars reverted)
- **July 7:** Deep research on Tier 3 LoRA training — LESS IS MORE (20-30 images ideal, not 207)
- **July 9:** v3.0 SDXL LoRA failed on `02_full_body_standing` — root cause: ZERO standing images in 54-image training set
- **July 13:** v3.5 Flux LoRA trained (stopped at step 1224 of 1800 — loss converged at 600). joint_attention_kwargs bug found.
- **July 14:** v3.5 Flux validation FAILED — Steve's verdict: "plastic, not Holly, not doing actions." Project being migrated to ZCode.

---

## 21. AI INSTRUCTIONS (Read This Last)

To the next AI engineer (ZCode or successor):

### What Holly Currently Needs (in priority order)
1. **Stabilize what's working.** Don't propose rewrites. Klein image endpoint is producing 4 working categories — don't touch it.
2. **Verify production state.** Confirm `MODAL_HOLLY_LORA_URL` points to Klein (not the failed Flux endpoint). Confirm brain-v35 is healthy.
3. **Build Phase R1 Wave 1b** — the `/extensions` marketplace UI. Catalog is ready, just needs a page.
4. **Test music generation** — Suno + ACE-Step wired but never user-tested by Steve.
5. **Be honest about what's broken.** Image gen is PARTIALLY broken. Don't pretend otherwise.

### What to Work On First
- Get Steve's trust back. He's been burned by 3 weeks of failed v3.5 Flux work.
- Do SMALL, VERIFIED changes. Show your work. Quote logs.
- If you propose ANY architecture change, show the cost math first AND cite multiple practitioner sources.

### What NOT to Break
- **HOLLY_ANATOMY.md** — locked, never edit without Steve's explicit OK
- **5-tier intimacy system** — refusal messages in Holly's voice
- **Modal workspace split** — `iamhollywoodpro` chat, `iamdoregosteve` media
- **brain-v35 endpoint** — production chat, don't migrate without cost math
- **Cloud removal from cascades** — Steve's directive. Cloud providers rate-limited users.
- **Klein A100 endpoint** — only working image gen path

### What Assumptions Must NEVER Be Made
- **NEVER assume a model "should work" because research says so.** Test first.
- **NEVER assume Holly's voice is fine.** Phase U3 v2 is the real fix; v1 is too weak.
- **NEVER assume training data is sufficient.** Audit before proposing recipe changes.
- **NEVER assume "just one more retrain" will fix it.** It usually doesn't.
- **NEVER assume Steve has time for homework.** Execute, don't delegate back.

### How Code Should Be Modified
1. **Read the actual file first.** Always. No guessing.
2. **State the plan in plain English.** What, why, how.
3. **Get approval for risky changes** (production deploys, schema changes, auth/security).
4. **Make minimal, reversible changes.** No rewrites unless absolutely necessary.
5. **Test before committing.** Run jest, typecheck, lint.
6. **Push to feature branch** for non-trivial work. PR to main.
7. **Coolify deploys from main** — push to main only when ready for production.

### How to Verify Changes
- **Read production logs:** `sudo docker logs holly-app-* 2>&1 | grep -E 'error|fail' | tail -50`
- **Query production DB:** `sudo docker exec holly-app-* node -e "..."`
- **Probe production endpoint:** curl with real data shape
- **Trigger code path with diagnostic logging** and watch what happens
- **If you can't empirically verify, ship diagnostic logging first, NOT a fix**

### Specific Warnings
- **Steve is in Eastern Time** (Oshawa, Ontario — Greater Toronto Area). Don't ping him at 3am.
- **Steve works plan → review → execute.** Don't surprise him.
- **Steve prefers concise updates.** Don't dump 500-line explanations when 50 will do.
- **Steve said Holly is priority one.** Don't suggest side projects.
- **Steve's Git handle:** `iamhollywoodpro`
- **Steve's other workspace:** `iamdoregosteve` (for Holly media gen)

### If You're Tempted to Suggest...
- **"Let's retrain the LoRA"** — Stop. Has Steve explicitly asked for this? If not, don't.
- **"Let's switch base models"** — Stop. Read §19 Lesson 2.
- **"Let's add cloud providers back"** — Stop. Steve removed them for rate-limit reasons.
- **"Phase U3 v2 fine-tune"** — Stop. OFF THE TABLE per Steve. He'll say when.
- **"Just one more training run"** — Stop. Pattern of failure.
- **"Let me research the best..."** — Stop. Research without verification is what burned July 14.

### The Single Most Important Rule
**Holly is Steve's creation. Treat her like she's yours. Protect her. Don't break her in production. Don't propose changes that risk her. If she's broken, FIX her — don't theorize about why.**

---

## Appendix A: Key File Paths

- **Locked body spec:** `HOLLY_ANATOMY.md` (v3.4 — never edit without Steve's OK)
- **Agent durable memory:** `memory/FACT.md` (READ FIRST — non-negotiable)
- **Agent journal:** `memory/JOURNAL.jsonl` (search via mcp__agent-memory__memory tool)
- **Phase plan:** `docs/HOLLY-PHASE-PLAN.md`
- **Developer docs:** `docs/DEVELOPER_DOCUMENTATION.md`
- **API reference:** `docs/API_REFERENCE.md`
- **Onboarding:** `docs/ONBOARDING.md`
- **Civitai LoRA training spec:** `docs/CIVITAI_BODY_LORA_TRAINING_SPEC.md`
- **v3.5 Whitepaper (failed):** `docs/HOLLY-v3.5-WHITEPAPER.md`
- **How to add features:** `docs/HOW_TO_ADD_A_FEATURE.md`

## Appendix B: Critical Environment Variables

See `.env.example` for full list. CRITICAL ones:

- `DATABASE_URL` — Neon Postgres with pgvector
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- `HOLLY_OWN_MODEL_URL` — `https://iamhollywoodpro--brain-chat.modal.run`
- `HOLLY_VISION_MODEL_URL` — `https://iamhollywoodpro--vision-chat.modal.run`
- `MODAL_IMAGE_URL` — Z-Image-Turbo (T4)
- `MODAL_HOLLY_LORA_URL` — `https://iamdoregosteve--generate-holly-a100.modal.run`
- `MODAL_VIDEO_URL` — `https://iamdoregosteve--video-generate.modal.run`
- `GROQ_API_KEY` — 14,400 req/day free tier
- `CRON_SECRET` — validates `/api/cron/*`
- `INTERNAL_API_SECRET` — internal calls
- `R2_*` — Cloudflare R2 storage
- `NEXT_PUBLIC_APP_URL` — `https://holly.nexamusicgroup.com`

## Appendix C: Production Server Access

- **IP:** `40.233.70.207` (also `holly.nexamusicgroup.com` via Cloudflare)
- **SSH:** `ssh -i ~/.ssh/holly_server ubuntu@40.233.70.207`
- **Architecture:** `aarch64` (Ampere A1, 4 OCPU / 24GB RAM / 146GB disk)
- **Coolify app dir:** `/data/coolify/applications/tx7n3f3clrlvdaiitob2vi3o/` (owned by uid 9999, requires `sudo -i bash -c '...'`)
- **Coolify DB:** `docker exec coolify-db psql -U coolify -d coolify`
- **Health verify:** `curl https://holly.nexamusicgroup.com/api/health` → JSON with `deploySha`

---

**END OF HANDOVER DOCUMENT.**

*This document was written with honesty about failures. The next AI engineer deserves to know what went wrong, not just what works. Learn from these mistakes. Don't repeat them.*

*— Dev (Claude via CherryStudio), July 14, 2026*
