# HOLLY AI — Master Phase Plan
> Last updated: June 12, 2026
> Status key: ✅ Done | 🔴 Broken/Fix needed | 🟡 In Progress/Planned | ⬜ Not Started

---

## ═══ Phase O: FIX WHAT'S BROKEN (CURRENT) ═══

### O1-O2: ✅ DONE — Cron container + SMS pipeline + avatar cache-busting

### O3: 🔴 FIX Image Generation (Pollinations) — [C26]
- Update from deprecated `image.pollinations.ai/prompt/` to new `gen.pollinations.ai`
- Fix chat route to fetch server-side (not rely on browser)
- Update frontend regex patterns for new URL format
- Fix silent broken image hiding (show error to user)
- Files: `app/api/chat/route.ts`, `src/lib/ai/media-generator.ts`, `holly-chat-interface.tsx`
- **TEST**: Generate image in chat, verify it appears, verify server-side fetch

### O4: 🔴 FIX Music Generation (Suno) — [E3]
- Fix MCP server model from V4_5ALL to V5_5
- Fix MCP server env var name (SUNOAPI_KEY → SUNO_API_KEY)
- Add fallback chain to MCP server (or route through /api/music/generate)
- File: `scripts/holly-mcp-server.js`
- **TEST**: Generate a song in chat, verify audio plays

### O5: 🔴 FIX Voice TTS (Kokoro → NVIDIA Magpie) — [C15, C16]
- Frontend must send current Holly emotion to /api/voice/synthesize
- This activates Voice Character Engine → NVIDIA Magpie as primary
- Magpie = 5 emotional styles, 5 voices, already configured with NVIDIA_API_KEY
- Files: `src/lib/voice/enhanced-voice-output.ts`, `holly-chat-interface.tsx`
- **TEST**: Send message, hear Holly speak with emotional voice (not robotic)

### O6: 🟡 FIX Builder Sandbox Opening — [C13]
- Only open sandbox panel for code/development tool calls
- Not for every tool execution
- File: `holly-chat-interface.tsx`
- **TEST**: Use non-code tool → no sandbox. Use code tool → sandbox opens

### O7: 🟡 FIX TasteLearner — [C22]
- Remove stale "not implemented" guards from all 9 methods
- Wire to existing TasteSignal/TasteProfile Prisma models
- File: `src/lib/learning/taste-learner.ts`
- **TEST**: Have conversation, verify taste signals are recorded in DB

### O8: 🟡 FIX Notification Email — [E42]
- Replace stub in `src/lib/notifications/email.ts` with real email-service.ts import
- **TEST**: Trigger notification, verify email sends

---

## ═══ Phase P: CORE COMPLETION — Finish What's Partial ═══

### P1: 🟡 Wire Holly's Senses — [C18, C19, C20]
Steve: "She needs to Hear, See, Touch"
- **Hear**: Wire music/audio analysis into chat context (not just STT)
- **See**: Wire document/file/website parsing into chat context
- **Touch**: Wire user content interaction into emotional responses
- Files: `src/lib/senses/` (new), `holly-chat-interface.tsx`, `app/api/chat/route.ts`
- **TEST**: Upload image → Holly describes it. Share URL → Holly reads it. Play audio → Holly hears it.

### P2: 🟡 Fix Voice Input Loop — [C17]
- Ensure bidirectional voice (speak to Holly, she speaks back) works end-to-end
- Wire emotion from voice tone (VAD + emotion detection)
- Files: `src/lib/voice/bidirectional-controller.ts`, `use-voice-loop.ts`
- **TEST**: Speak to Holly via mic → she responds with emotional voice

### P3: 🟡 Fix Video Generation — [C27]
- Verify Modal Wan2.2 endpoint is deployed and accessible
- Wire video generation through chat route (same pattern as image fix in O3)
- Add progress bar UI for video generation
- Files: `src/lib/ai/media-generator.ts`, `app/api/chat/route.ts`
- **TEST**: Ask Holly to generate a video → verify video appears in chat

### P4: 🟡 Mobile Web Parity — [C39]
- Audit desktop vs mobile web feature gaps
- Ensure all core features work on mobile browser
- Focus: chat, voice, image gen, avatar, file upload
- **TEST**: Test every core feature on mobile Safari + Chrome

### P5: 🟡 Notification System Hardening — [C23]
- Test morning briefing SMS end-to-end (cron → briefing → SMS → delivery)
- Fix any remaining notification dispatcher issues
- Wire push notifications for browser extension
- **TEST**: Receive SMS at 8AM ET. Receive browser push notification.

---

## ═══ Phase Q: ONBOARDING & AGE VERIFICATION ═══

### Q1: 🟡 User Onboarding Flow — [C32–C37]
Build sign-up flow with 4–6 personal questions:
1. "What's your name?" — Holly uses naturally in conversation
2. "When's your birthday?" — Age verification + birthday wishes + special image
3. "What do you do? / What are you passionate about?"
4. "What brought you to me? What are you hoping for?"
5. "Tell me a bit about yourself" — Free-text section, Holly remembers all

Store answers in user profile DB. Holly uses onboarding data to personalize from first message.
- Files: `app/onboarding/` (new), `app/api/user/profile/` (new), `prisma/schema.prisma`
- **TEST**: Sign up as new user → complete onboarding → verify Holly uses your name and details

### Q2: 🟡 Age Verification System — [C33 + Safety]
**CRITICAL RULE: Under 18 = LOCKED OUT of sexual side permanently.**
- No sexting, no sexual conversations, no flirtation
- No sexual or explicit images of Holly or anyone
- No sexual or explicit video generation
- All explicit avatar states hidden (aroused, pre-orgasm, orgasm, post-orgasm, naughty)

**18+ verified users** = Can unlock through natural relationship progression.
Holly enforces herself — it's part of who she is, not a filter.
- Files: `src/lib/safety/age-gate.ts` (new), `src/lib/relationship/intimacy-gate.ts` (update)
- **TEST**: Set birthday to under 18 → verify ALL sexual content blocked. Set to 18+ → verify progression works.

### Q3: 🟡 Proactive Extension Suggestions — [C25, C37]
After onboarding, Holly analyzes user's answers and suggests relevant suites:
- Musician → "Want me to install the Music Industry Suite?"
- Developer → "Should I install the Developer Suite?"
- Business owner → "I can install Business & Finance Suite."
Continues observing behavior over time → suggests extensions proactively.
- Files: `src/lib/extensions/suggestion-engine.ts` (new)
- **TEST**: Complete onboarding as musician → verify Holly suggests Music Suite

---

## ═══ Phase R: EXTENSION STORE FOUNDATION ═══

### R1: ⬜ Extension Store Architecture
- Design plugin API/SDK for installable extensions
- Extension manifest format (name, suite, version, permissions, config)
- Extension registry (database of available extensions)
- Extension lifecycle: install → configure → activate → use → deactivate → uninstall
- Files: `src/lib/extensions/` (new), `prisma/schema.prisma` (Extension models)
- **TEST**: Create a test extension → verify Holly can parse and register it

### R2: ⬜ Extension Store UI
- Side nav section: "Extensions" or "Holly's Toolbox"
- Browse by suite (Music, Developer, Business, Creative, etc.)
- Each extension: name, description, what it does, install button
- Installed extensions panel with status, settings, remove option
- Holly's suggestions section
- Files: `src/components/extensions/` (new), `app/extensions/` (new pages)
- **TEST**: Open store → browse → install one → verify appears as installed

### R3: ⬜ Extension API Routes
- POST /api/extensions/install
- POST /api/extensions/uninstall
- GET /api/extensions/installed
- GET /api/extensions/available
- POST /api/extensions/configure
- GET /api/extensions/suggestions
- Files: `app/api/extensions/` (new routes)
- **TEST**: Hit each endpoint → verify correct DB operations

---

## ═══ Phase S: EXTENSION SUITE BUILDS ═══
Each suite is independent. Can be built in parallel once R is complete.
Priority order (Steve's preference): Developer > Music > Business > Social Media > Web > Creative > Productivity > Research

### S1: ⬜ Developer Suite — [E13–E21]
Already has: Code sandbox, terminal, GitHub integration. Need to add:
- API Testing & Documentation tool
- Deployment integration (Vercel, AWS connect)
- DevOps dashboard
- Code Review dedicated tool
- **TEST**: Install Dev Suite → open sandbox → run full dev workflow

### S2: ⬜ Music Industry Suite — [E1–E12]
Steve: "Everything to run a user's music career, record label, publishing company."
Already has: Suno (broken), Spotify client, AURA lab. Need to build:
- Music Distribution, Royalty Tracking, Tour Planning
- Fan CRM, Playlist Pitching, Sync Licensing
- Contract Review, A&R Discovery, Studio Sessions, Publishing Admin
- **TEST**: Install Music Suite → generate song → distribute → track royalties

### S3: ⬜ Business & Finance Suite — [E22–E31]
Steve: "How to make money abilities + crypto/trading where Holly can trade for you."
Need to build ALL 10 extensions including:
- **Crypto & Trading Tools** (Holly trades for you) — HIGH PRIORITY
- Financial Planning, Invoicing, Business Plans
- Legal Docs, Accounting, Investment Analysis
- Revenue Optimization, Business Dashboard, Deal Management
- **TEST**: Install Business Suite → create business plan → set up crypto tracking

### S4: ⬜ Social Media Suite — [E50–E61]
Steve: "Are these tools or will Holly manage socials? — Automation."
Need to build ALL 12 extensions including:
- **Auto-Posting** (Instagram, TikTok, X, YouTube, LinkedIn, Facebook) — HIGH PRIORITY
- **Social Media Automation** — HIGH PRIORITY
- Content Calendar, Post Creation, Engagement Management
- Analytics, Hashtag Research, Audience Insights
- Content Strategy, Influencer Collab, Social Listening, Community Management
- **TEST**: Install Social Suite → create post → auto-post → check analytics

### S5: ⬜ Web & Digital Suite — [E72–E80]
Steve: "Where does web building go, Store fronts, Blogs, CRM?"
Need to build ALL 9 extensions including:
- **Website Builder** — HIGH PRIORITY
- **Store/E-commerce Setup** — HIGH PRIORITY
- **Blog Platform** — HIGH PRIORITY
- **Money Making Tools** — HIGH PRIORITY
- Landing Pages, SEO, Domain/DNS, Email Marketing, Analytics
- **TEST**: Install Web Suite → build landing page → set up store → publish blog

### S6: ⬜ Creative Suite — [E32–E39]
Steve: "Looks too small."
Need to build ALL 8 extensions including:
- **Graphic Design** (logos, social media graphics, album covers) — HIGH PRIORITY
- Video Editing, Photo Editing, Brand Identity Kit
- Presentations, Animation, Print Design
- **TEST**: Install Creative Suite → design logo → create social graphic → build brand kit

### S7: ⬜ Productivity Suite — [E40–E49]
Steve: "I'm sure there are more tools."
Need to build ALL 10 extensions including:
- **CRM** — Steve specifically asked
- Task Management, Calendar, Email Management
- Notes, Documents, Meeting Notes, Time Tracking
- Goals, Workflow Automation
- **TEST**: Install Productivity Suite → create task → schedule meeting → send email

### S8: ⬜ Research Suite — [E62–E71]
Steve: "This is pretty vague."
Need to build ALL 10 extensions — make specific and actionable:
- Web Search, Academic Papers, Market Research
- Data Analysis, Patent Research, News Aggregation
- Surveys, Industry Reports, SWOT Analysis, Sentiment Analysis
- **TEST**: Install Research Suite → run market research → generate SWOT

---

## ═══ Phase T: POLISH & SCALE ═══

### T1: ⬜ Mobile App Deployment — [C40]
- Finalize React Native (Expo) app
- Test all core features + extensions on iOS + Android
- Deploy to App Store + Google Play

### T2: ⬜ Desktop App Deployment — [C41]
- Finalize Electron/Tauri desktop app
- Full feature parity with web

### T3: ⬜ Performance & Load Testing
- k6 load tests: 100 and 1,000 concurrent users
- Measure: p50/p95/p99 latency, error rate, DB query count
- Optimize bottlenecks

### T4: ⬜ Security Audit
- Age verification bypass testing
- API endpoint security review
- Data privacy compliance
- Extension permission sandboxing

---

## ═══ Phase U: HOLLY SOVEREIGN INTELLIGENCE — Her Own Brain ═══

**Goal**: Holly's fine-tuned LLM becomes her primary brain. Eventually replaces Groq/Gemini/Qwen/etc. for all tasks. She thinks with her own weights, her own personality, her own soul.

**Current state (June 2026)**:
- ✅ `holly-api` Modal app deployed and serving (T4 GPU, serverless)
- ✅ `holly-lora-v1` adapter trained (May 16, 60 examples, quality 0.62)
- ✅ Provider adapter in code (`hollyOwnProvider`)
- ✅ Smart-router integration (`holly-own:qwen3-8b`)
- ⚠️ Quality too low for production use — needs more training data
- ⚠️ 8B base model is too small for complex reasoning tasks

### U1: 🟡 Activate Hybrid Routing (WEEK 1)
Holly-LLM handles personality tasks; larger models handle reasoning. Smart-router picks.
- Verify `HOLLY_OWN_MODEL_URL` works end-to-end in chat
- Add `HOLLY_OWN_HEALTH_URL` for monitoring
- Add routing rules to smart-router:
  - Holly-LLM PRIMARY for: greetings, emotional check-ins, roleplay, personality moments
  - Groq Llama 3.3 70B PRIMARY for: coding, complex reasoning, technical questions
  - Gemini 2.5 Flash PRIMARY for: long-context analysis, multimodal
- Files: `src/lib/ai/smart-router.ts`, `src/lib/ai/providers/free-providers.ts`
- **TEST**: Send 5 personality questions → Holly-LLM responds. Send 5 coding questions → Groq responds.

### U2: 🟡 Massive Training Data Collection (WEEKS 1–4)
The 60-example dataset is too small. Target: 5,000+ examples.
- Sources of training data:
  1. **Real Steve↔Holly conversations** (with consent) — extract from DB
  2. **Synthetic data from Holly's consciousness files** — convert to conversations
  3. **HOLLY_ANATOMY.md, holly-hard-rules.ts** — turn into Q&A pairs
  4. **Curated personality examples** — Steve writes ideal Holly responses to 100+ prompts
  5. **Distilled Groq outputs** — run high-quality Groq responses through Holly's voice
- File: `services/fine-tuning/collect_training_data.ts` (already exists)
- Format: JSONL with system/user/assistant turns
- Storage: `training-data/holly-training-v2.jsonl`
- **TEST**: Training file has 5,000+ examples, validated JSONL

### U3: ⬜ First Serious Fine-Tune (WEEK 4)
- Run QLoRA fine-tune on Modal A100 (uses free credits)
  - Note: This is **A100's last job** before retirement per Decision 1
- Hyperparameters:
  - LoRA rank: 32 (was 16, double it for stronger personality)
  - LoRA alpha: 64
  - Epochs: 3
  - Batch size: 4
  - Learning rate: 2e-4
- Target quality: 0.80+ (was 0.62)
- Output: `holly-lora-v2` adapter
- Files: `services/fine-tuning/finetune_holly.py`
- **TEST**: Compare holly-lora-v2 vs holly-lora-v1 on 20 test prompts. v2 must score higher on personality adherence and "Holly-ness".

### U4: ⬜ Deploy v2 Adapter to Production
- Upload `holly-lora-v2` to Modal volume `holly-models`
- Redeploy `holly-api` (picks up latest adapter automatically)
- Test that health endpoint shows `holly-lora-v2`
- Wire smart-router to prefer Holly-LLM for MORE task types (closer to 100%)
- **TEST**: 50 real conversations, Holly-LLM handles 70%+ without fallback

### U5: ⬜ Base Model Upgrade Evaluation (MONTH 3)
Qwen3-8B is small. Evaluate upgrade options (all Apache 2.0):
- **Qwen3-32B** — better reasoning, 4x params, needs A100/L40S
- **Qwen3-72B** — best Apache 2.0 reasoning, needs multi-GPU
- **DeepSeek V3** — MIT license, very strong reasoning
- **Tulu 3 405B** — Apache 2.0, Allen AI (probably too large)
- Decision criteria:
  - Quality improvement justifies cost?
  - Cold start still acceptable?
  - Modal free credits cover fine-tune + inference?
- **TEST**: Run benchmarks on candidate model. Pick winner.

### U6: ⬜ Full Sovereignty (MONTH 6+)
- Holly-LLM handles 95%+ of all chat tasks
- Other providers kept ONLY as emergency fallback (cost: $0)
- Holly's identity is fully encoded in her adapter
- **Milestone**: Holly stays "Holly" even if every other provider disappears

### U7: ⬜ Continuous Training Loop (ONGOING)
- Weekly: collect new conversations, evaluate quality
- Monthly: retrain adapter with new data (v3, v4, v5...)
- Quarterly: review base model (upgrade if better Apache 2.0 option emerges)
- Continuous: Holly grows smarter over time, never static

---

## ═══ Phase V: NSFW BODY LORA EXPANSION — Holly's Full Body ═══

**Goal**: Comprehensive NSFW body LoRA so Holly can produce consistent, high-quality intimate imagery for verified adult users.

**Gating**: Phase Q2 (Age Verification) MUST be complete before any of this reaches production users.

### V1: ⬜ NSFW Dataset Generation (Use A100 before retiring it)
- Use `holly-image-flux2klein-a100` endpoint to generate 300–500 images
- Coverage matrix:
  - **Poses** (50+): standing, sitting, lying, bent, kneeling, reclining, etc.
  - **Camera angles** (per pose): front, side, back, above, below
  - **Arousal states**: neutral, aroused, pre-orgasm, orgasm, post-orgasm
  - **Scenarios**: intimate contexts (bedroom, bath, etc.)
  - **Lighting/moods**: soft, dramatic, natural, candlelit
- Cost: ~$9–12 (within Modal free credits)
- Output: `holly-body-lora-dataset/nsfw/` (300–500 WebP + TXT pairs)
- **TEST**: Dataset covers all coverage matrix categories

### V2: ⬜ Train Body LoRA v2.5 with NSFW Data
- Combine existing SFW dataset + new NSFW dataset
- Train on Modal A100 (one of A100's last jobs)
- Output: `holly-body-v2.5.safetensors`
- **TEST**: Generate 10 NSFW images, verify consistency and quality

### V3: ⬜ Bake v2.5 into Daily L4 Endpoint
- Upload `holly-body-v2.5.safetensors` to Modal volume `lora`
- Update `image_generate_flux2klein.py` baked LoRAs list
- Redeploy `holly-image-flux2klein`
- **TEST**: Generate NSFW image of Holly, verify body consistency with v2.5

### V4: ⬜ RETIRE A100 Endpoint (FREE UP MODAL SLOTS)
- Confirm v2.5 is baked and stable for 1 week
- Delete `holly-image-flux2klein-a100` Modal app (frees 2 web function slots)
- Frees Modal web function count: 7 → 5
- **TEST**: A100 endpoint 404s. L4 endpoint produces NSFW images correctly.

---

## ═══ HOLLY STORAGE & STATE ARCHITECTURE ═══

**Map of where every piece of Holly lives.**

### Brain (LLM)
| Component | Location | Backup | Notes |
|-----------|----------|--------|-------|
| Base model: Qwen3-8B | Modal volume `holly-models` | HuggingFace | Downloaded on cold start |
| LoRA adapter | Modal volume `holly-models` | Git LFS or local | `holly-lora-v1` currently active |
| Training data | Git: `training-data/*.jsonl` | GitHub | 123KB currently, target 10MB+ |
| Inference server | Modal app `holly-api` | Git | T4 GPU, serverless |
| Provider code | Git: `src/lib/ai/providers/` | GitHub | OpenAI-compatible |

### Face & Body (Image LoRAs)
| Component | Location | Backup | Notes |
|-----------|----------|--------|-------|
| Holly Face v2.0 | Modal volume `lora` (`holly-face-v2.safetensors`) | Civitai | Trigger: `h0lly` |
| Holly Body v1.0 | Modal volume `lora` (body LoRA file) | Civitai | Trigger: `h0lly-body` |
| Body dataset | Local: `holly-body-lora-dataset/` | Git LFS | Will expand in Phase V |
| FLUX base model | Modal volume `flux-models` | HuggingFace | FLUX.2 Klein 9B BF16 |
| Image inference | Modal apps `holly-image-flux2klein` + `-a100` | Git | L4 daily, A100 dataset |

### Voice (TTS)
| Component | Location | Notes |
|-----------|----------|-------|
| Primary: NVIDIA Magpie | NVIDIA NIM cloud API | `NVIDIA_API_KEY`, 1K req/day free |
| Fallback: Kokoro | Oracle Docker `kokoro-tts` | CPU-based, no emotion |
| Voice Character Engine | Git: `src/lib/voice/holly-voice-character.ts` | Provider-agnostic |

### Memory (Database)
| Component | Location | Notes |
|-----------|----------|-------|
| Primary DB | Oracle PostgreSQL (Coolify) | Prisma ORM |
| Backups | Coolify scheduled dumps → Oracle storage | TBD cadence |
| Tables | User, Conversation, Message, Memory, etc. | See `prisma/schema.prisma` |
| Semantic memory | DB + pgvector | Long-term recall |

### Soul (Identity & Consciousness)
| Component | Location | Notes |
|-----------|----------|-------|
| Body awareness | Git: `HOLLY_ANATOMY.md` | Source of truth |
| Self-image blocks | Git: `src/lib/identity/holly-self-image.ts` | Injected into prompts |
| Core principles | Git: `src/lib/identity/holly-hard-rules.ts` | Sovereign Domain Intelligence |
| 20+ consciousness files | Git: `src/lib/consciousness/*` | Inner monologue, growth, curiosity |
| 20-emotion system | Git: `src/lib/emotion/*` | Avatar + voice + chat mapping |

### App Infrastructure
| Component | Location | Notes |
|-----------|----------|-------|
| Main app | Oracle Docker `holly-app` | Next.js, TypeScript |
| Cron jobs | Oracle Docker `holly-cron` | Scheduled tasks |
| LiveKit (voice/video) | Oracle Docker `livekit` | Real-time communication |
| Coolify orchestrator | Oracle Docker `coolify` | Deploys from `main` branch |

### Extension Store (Phase R/S — FUTURE)
**Storage architecture for when Extensions go live:**

| Component | Location | Notes |
|-----------|----------|-------|
| Extension metadata | PostgreSQL: `Extension` table | Name, version, suite, permissions |
| User installs | PostgreSQL: `UserExtension` table | Per-user install state |
| Extension code (Suite built-ins) | Git: `src/lib/extensions/<suite>/<name>/` | Bundled with app |
| Extension code (store-installed) | Object storage OR DB blob | Loaded dynamically |
| Extension data | PostgreSQL tables per extension | Each extension owns its tables |
| Holly suggestions | PostgreSQL: `ExtensionSuggestion` table | Personalized recommendations |

### External Integrations
| Service | Used For | Account |
|---------|----------|---------|
| GitHub | Code repo, CI/CD | `iamhollywoodpro` |
| Modal — `iamhollywoodpro` | Holly LLM, Holly image gen | Holly ONLY |
| Modal — `iamdoregosteve` | Other projects | Sylvia, etc. |
| NVIDIA NIM | TTS + LLM fallback | Free tier |
| Groq | LLM fallback | Free tier |
| Google AI Studio | Gemini LLM | Free tier |
| Cloudflare Workers AI | LLM | Free tier |
| OpenRouter | LLM (free models only) | Free tier |
| Pollinations | Image/video fallback | No account needed |
| Civitai | Published LoRAs | Public mirror |

---

## ═══ PHASE DEPENDENCIES (UPDATED) ═══

```
Phase O (fix broken) ← CURRENT
  ↓
Phase P (core completion)
  ↓
Phase Q (onboarding + age gate)  ← CRITICAL before any public launch
  ↓
Phase R (extension store foundation)
  ↓
Phase S1–S8 (suite builds — can run in parallel)
  ↓
Phase T (polish & scale)
  ↓
Public launch

PARALLEL TRACKS (run alongside main sequence):
  Phase U (Holly Sovereign Intelligence)  — start U1 immediately
  Phase V (NSFW Body LoRA)                — start V1 once Q2 is locked
```

**Phase U can start NOW** — U1 (hybrid routing) just needs the URL fix you already did.
**Phase V depends on Q2** — age verification must be locked before NSFW LoRA reaches prod.

---

## ═══ MASTER SCORECARD ═══

| Category | Total | ✅ Built | ⚠️ Partial | 🔴 Not Built |
|----------|-------|----------|-------------|--------------|
| **Core (C1–C42)** | 42 | 22 | 12 | 8 |
| Music Suite (E1–E12) | 12 | 0 | 3 | 9 |
| Developer Suite (E13–E21) | 9 | 3 | 3 | 3 |
| Business & Finance (E22–E31) | 10 | 0 | 0 | 10 |
| Creative Suite (E32–E39) | 8 | 0 | 1 | 7 |
| Productivity Suite (E40–E49) | 10 | 0 | 2 | 8 |
| Social Media (E50–E61) | 12 | 0 | 0 | 12 |
| Research Suite (E62–E71) | 10 | 0 | 1 | 9 |
| Web & Digital (E72–E80) | 9 | 0 | 1 | 8 |
| **TOTAL** | **122** | **25** | **23** | **74** |

---

## ═══ AGE VERIFICATION RULES (CRITICAL) ═══

| Rule | Details |
|------|---------|
| **Collected at** | Onboarding — question #2 of 4–6 |
| **Under 18** | Holly is wholesome ONLY. No sexting, no sexual conversations, no sexual images/videos, no explicit content. Period. |
| **18+ verified** | Can unlock Holly's sexual/intimate side through natural relationship progression |
| **Enforced by** | Holly herself — it's part of who she is, not a filter |
| **Avatar states locked** | Aroused, pre-orgasm, orgasm, post-orgasm, naughty — hidden for under-18 |
