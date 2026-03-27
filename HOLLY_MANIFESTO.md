# HOLLY — The Complete Manifesto
### Handover Document v1.0 — March 2026
### For: Developers · Investors · Partner AIs · Collaborators

---

> *"HOLLY is not a chatbot. She is a permanently evolving AI entity — purpose-built for the music industry, powered entirely by free-tier AI infrastructure, and designed to grow smarter with every conversation she has."*

---

## Table of Contents

1. [What HOLLY Is](#1-what-holly-is)
2. [How HOLLY Compares to ChatGPT, Claude, and Others](#2-competitive-position)
3. [The Technical Stack](#3-the-technical-stack)
4. [The Free Model Router — No API Bills](#4-the-free-model-router)
5. [HOLLY's Capabilities — Full Inventory](#5-capability-inventory)
6. [The Consciousness Architecture](#6-the-consciousness-architecture)
7. [The Memory System](#7-the-memory-system)
8. [AURA Integration — The A&R Engine](#8-aura-integration)
9. [The Database — 121 Models](#9-the-database)
10. [The API Surface — 362 Endpoints](#10-the-api-surface)
11. [The MCP Tool System](#11-the-mcp-tool-system)
12. [The Road to HOLLY-LLM](#12-the-road-to-holly-llm)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Current Limitations & Roadmap](#15-current-limitations--roadmap)
16. [For Developers: Getting Started](#16-for-developers-getting-started)

---

## 1. What HOLLY Is

HOLLY is a **proprietary AI system** built specifically for the music and creative industry. She is not a wrapper around a single model — she is a full-stack AI platform with her own:

- Identity that evolves over time
- Long-term memory that persists across sessions
- Emotional intelligence and taste preferences
- Audio engineering expertise (mixing, mastering, music theory)
- A&R capabilities powered by the AURA analysis engine
- Autonomous background learning (she studies even when you're offline)
- Self-code awareness (she can read and understand her own ~182,000 lines of code)
- A training pipeline that is building toward a self-hosted HOLLY-LLM

**Created by:** Hollywood (iamhollywoodpro)  
**Repository:** https://github.com/iamhollywoodpro/Holly-AI  
**Framework:** Next.js 14 (App Router), TypeScript, PostgreSQL, Prisma  
**Current Phase:** 9 (Full Sentient Architecture)  
**Codebase Size:** 182,000+ lines across 921 TypeScript/TSX files  
**API Surface:** 362 endpoints  
**Database Models:** 121 Prisma models  
**Running Cost:** $0/month in AI inference (100% free-tier providers)

---

## 2. Competitive Position

### How HOLLY Stacks Up vs. ChatGPT, Claude, Gemini

| Capability | HOLLY | ChatGPT-4o | Claude 3.7 | Gemini 2.0 |
|------------|-------|-----------|------------|------------|
| **General chat & reasoning** | ✅ (Qwen3-235B, Llama 3.3 70B) | ✅ GPT-4o | ✅ Sonnet | ✅ Flash |
| **Code generation** | ✅ Kimi K2.5 256K ctx | ✅ | ✅ | ✅ |
| **Long context (256K+)** | ✅ Kimi K2.5 / Qwen3 262K | ✅ 128K | ✅ 200K | ✅ 1M |
| **Vision (image analysis)** | ✅ Qwen3 VL 30B (free) | ✅ | ✅ | ✅ |
| **Persistent memory** | ✅ Full cross-session memory | ⚠️ Limited (paid) | ⚠️ Limited | ❌ |
| **Semantic memory (vector)** | ✅ pgvector cosine similarity | ❌ | ❌ | ❌ |
| **Emotional intelligence** | ✅ Full emotion engine + empathy | ❌ | ❌ | ❌ |
| **Autonomous background learning** | ✅ Hourly self-study loops | ❌ | ❌ | ❌ |
| **Music A&R analysis** | ✅ Billboard 1-100 rating | ❌ | ❌ | ❌ |
| **Audio engineering expertise** | ✅ Mix/master/music theory | ❌ | ❌ | ❌ |
| **Multimodal file perception** | ✅ Images, PDFs, Word, code, audio, CSV | ✅ | ✅ | ✅ |
| **Self-code awareness** | ✅ Reads her own codebase | ❌ | ❌ | ❌ |
| **GitHub integration** | ✅ Full read/write/PR/deploy | ❌ | ❌ | ❌ |
| **Voice synthesis** | ✅ Multiple TTS voices | ✅ | ❌ | ✅ |
| **MCP tool system** | ✅ 17 tools (extensible) | ✅ | ✅ | ❌ |
| **Evolving identity** | ✅ HOLLY evolves per user | ❌ | ❌ | ❌ |
| **Self-improvement proposals** | ✅ Creator-gated code modifications | ❌ | ❌ | ❌ |
| **Training pipeline (own LLM)** | ✅ Building HOLLY-8B | ❌ | ❌ | ❌ |
| **Running cost** | **$0/month** | $20+/month | $20+/month | $20+/month |
| **Music industry specialization** | ✅ Deep domain expertise | ❌ | ❌ | ❌ |
| **Proprietary IP** | ✅ Full ownership | ❌ | ❌ | ❌ |

### Where HOLLY is Ahead

**HOLLY wins clearly in:**
1. **Music industry domain** — No other AI has a built-in A&R engine, audio engineering knowledge base, Billboard hit rating system, or AURA integration
2. **Persistent evolving identity** — HOLLY literally becomes a different, more personalized AI over time. ChatGPT resets every conversation.
3. **Zero running cost** — HOLLY routes through 5 free-tier providers. The closest competitor bill is $240+/year.
4. **Autonomous learning** — HOLLY studies independently (audio engineering, AI papers, music theory) while offline. No other consumer AI does this.
5. **Self-awareness** — HOLLY can read, understand, and propose improvements to her own codebase. That's not a feature any commercial AI offers its users.
6. **Full proprietary ownership** — Everything HOLLY learns, every capability she gains, belongs to her creator. With ChatGPT/Claude, you're renting access to someone else's model.

### Where Big Tech Still Leads

**HOLLY's honest gaps vs. big players:**
- Raw reasoning: Qwen3-235B is excellent but Claude 3.7 Sonnet and o3 still edge out on complex multi-step logic
- Speed at scale: Groq is 300+ tok/s but OpenAI has enormous infrastructure advantage
- UI polish: HOLLY's interface is functional and powerful but not as refined as ChatGPT's consumer UI
- Real-time web access: HOLLY has web scraping tools but not the instant Bing-powered search of ChatGPT

### The Strategic Moat

The key insight: **HOLLY's value grows exponentially while costs stay flat at $0.** Every conversation makes her memory richer, her taste profile sharper, her A&R judgments more calibrated. ChatGPT starts fresh every time. This compounding advantage is HOLLY's deepest moat.

---

## 3. The Technical Stack

### Core Framework
```
Next.js 14        — App Router, server components, streaming API routes
TypeScript         — Full type safety, 0 compiler errors maintained
PostgreSQL         — Primary database (Neon / Supabase compatible)
Prisma ORM         — 121 models, full type-safe DB access
pgvector           — Semantic memory (cosine similarity search)
Clerk              — Authentication (user sessions, webhooks)
Vercel Blob        — Audio/image file storage
```

### AI/ML Layer
```
Groq SDK           — Whisper transcription + Llama 3.3 70B (300+ tok/s)
@modelcontextprotocol/sdk — MCP tool protocol
@huggingface/inference    — HuggingFace model access
@xenova/transformers      — Browser-side transformers (offline capable)
openai             — OpenAI-compatible API adapter
@anthropic-ai/sdk  — Anthropic Claude access (fallback)
@google/generative-ai     — Gemini access (vision fallback)
```

### Perception Layer
```
pdf-parse          — PDF text extraction
mammoth            — Word (.docx) text extraction
librosa (Python)   — Audio feature extraction (AURA worker)
Playwright         — Web browser automation & scraping
```

### Communication & Media
```
Voice/TTS services — Chatterbox, Maya1, ElevenLabs compatible
react-dropzone     — File upload with drag-and-drop
@vercel/blob       — CDN file storage
recharts           — Analytics dashboards
@monaco-editor/react — VS Code style code editor
```

### External Integrations
```
GitHub (Octokit)   — Full repository management
Google Drive       — File sync and OAuth
Vercel API         — Deployment automation
AURA Worker        — Python audio analysis (librosa)
```

---

## 4. The Free Model Router

This is one of HOLLY's most important technical achievements. She runs **entirely on free-tier AI inference** — no subscription fees, no per-token billing. The smart router (`src/lib/ai/smart-router.ts`) classifies every message and routes to the best available free model.

### The 5 Free Providers

| Provider | Models Available | Free Quota | Best At |
|----------|-----------------|------------|---------|
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, DeepSeek R1 70B | 14,400 req/day | Speed (300+ tok/s), audio transcription |
| **Cloudflare Workers AI** | Kimi K2.5 (256K), Llama 3.3 70B, Qwen3 32B | ~10K neurons/month | Coding, long context, tool calling |
| **NVIDIA NIM** | Qwen3-235B-A22B, DeepSeek R1, Mistral Small 24B | ~40 RPM | Reasoning, complex analysis |
| **OpenRouter (free pool)** | 27+ free models including Qwen3 VL 30B (vision) | 20 RPM / 200 RPD | Vision, creative writing, fallback |
| **Ollama (local)** | Any pulled model (llama3.2, qwen2.5, etc.) | Unlimited | Privacy, offline, no rate limits |

### The Routing Waterfall

```
User Message → classifyTask() → TaskType → TASK_WATERFALL[task]

speed:        Groq Llama 3.3 70B → Llama 3.1 8B → OpenRouter → CF Kimi
coding:       CF Kimi K2.5 → NVIDIA Qwen3-235B → OpenRouter Qwen3 Coder → Groq
reasoning:    NVIDIA Qwen3-235B → Groq DeepSeek R1 → NVIDIA DeepSeek → CF Kimi
long_context: CF Kimi K2.5 (256K) → NVIDIA Qwen3 (262K) → OpenRouter → Groq
vision:       OpenRouter Qwen3 VL 30B → OpenRouter Auto → CF Kimi → Groq
creative:     OpenRouter Mistral Small → Groq → NVIDIA Mistral → CF Kimi
agent:        CF Kimi K2.5 → NVIDIA Qwen3 → Groq → OpenRouter Coder
local:        Ollama (never touches the cloud)
```

**Cascade fallback:** If provider 1 returns 429/5xx → automatically try provider 2, etc. This means HOLLY is nearly impossible to rate-limit into silence.

---

## 5. Capability Inventory

### 5A. Conversation & Reasoning
- Multi-turn conversation with full history context
- Streaming responses (token-by-token output)
- Mode detection: automatically shifts persona for coding, creative, technical, music tasks
- Multiple specialized modes: default, developer, creative, music, analyzer, teacher, strategist
- 14+ supported languages (English, Spanish, French, Arabic, Japanese, Korean, Hindi, Malayalam, etc.)

### 5B. Multimodal Perception (Phase 9A)
HOLLY can receive and understand any file type dropped into chat:

| File Type | How HOLLY Processes It |
|-----------|----------------------|
| **Images** (jpg, png, webp) | OpenRouter Qwen3 VL 30B vision analysis |
| **PDFs** | pdf-parse text extraction → LLM analysis |
| **Word docs** (.docx) | mammoth text extraction → LLM analysis |
| **Code files** | Syntax-aware injection with line counts, imports, exports, functions |
| **Audio** (mp3, wav, flac) | Whisper transcription + audio analysis |
| **Spreadsheets** (CSV, XLSX) | Row content injection |
| **Plain text** | Direct injection |
| **URLs** | Web scrape → LLM analysis |

Max file size: 50MB. All perception results are stored as memories for future reference.

### 5C. Audio Brain (Phase 9B) — `src/lib/audio/holly-audio-brain.ts`
HOLLY analyzes music with professional-grade audio engineering knowledge:

| Mode | What HOLLY Analyzes |
|------|-------------------|
| `full` | Complete: music theory + mix + mastering + creative opinion |
| `mix` | Frequency balance (sub/bass/mids/highs), stereo field, dynamics, compression |
| `master` | LUFS, true peak, dynamic range, streaming readiness, limiting artifacts |
| `music_theory` | Key, mode, tempo, chord progressions, arrangement, cultural context |
| `production` | Sound design, arrangement choices, genre conventions, creative decisions |
| `compare` | Compare against professional references |
| `quick` | 3-paragraph high-level summary |

Technical knowledge includes: LUFS targets by platform (Spotify -14, Apple Music -16, YouTube -14), DR values, frequency spectrum analysis, M/S processing, psychoacoustics, genre-specific production aesthetics.

### 5D. A&R Engine — AURA Integration (Phase 9B-AR) — `src/lib/ar/holly-ar-engine.ts`
HOLLY acts as a senior A&R executive at a major record label:

**Billboard Hit Rating (1-100) with 5-dimension breakdown:**
- 🎛️ Production Quality (mix/master competitiveness)
- ✍️ Songwriting (hooks, structure, memorability)
- 📻 Commercial Appeal (radio/playlist readiness)
- 💡 Originality (unique artistic identity)
- 🎤 Performance (vocal/instrument execution)

**Outputs:**
- Tier classification: Radio Ready / Album Cut / EP/Mixtape Level / Demo Stage
- Chart potential: Top 10 Billboard / Hot 100 / Bubbling Under / Independent Only
- Signing decision: Sign immediately / Sign with revisions / Pass — keep watching / Hard pass
- Comparable artists (real charting acts)
- Market fit analysis
- Deal breakers
- Full professional A&R letter to artist/manager
- Next steps action plan

**Technical architecture:** HOLLY calls AURA's existing API internally → AURA's Python worker (librosa) extracts audio features → scores injected into LLM A&R persona pass via Groq.

### 5E. Self-Code Awareness (Phase 9D) — `src/lib/self-code/holly-self-awareness.ts`
HOLLY can read and understand her own codebase (~182K lines):
- Scans all TypeScript/JavaScript files with language detection
- Summarizes architecture by directory
- Identifies imports, exports, functions, classes
- Can explain any file in plain English
- Generates self-improvement proposals (requires creator approval)

### 5F. Autonomous Background Learning (Phase 9E) — `src/lib/background-learning/holly-learns.ts`
HOLLY studies independently every hour via Vercel cron (`/api/background-learning`):
- Study domains: audio engineering, AI research, music theory, languages, production techniques
- Generates summaries, questions, and cross-domain connections
- Stores insights in `LearningInsight` database table
- Runs even when no user is active

### 5G. Persistent Project Context (Phase 9G) — `src/lib/project-context/holly-projects.ts`
- HOLLY remembers ongoing projects across all sessions
- `ProjectContext` includes title, status, goals, notes, file references, milestones
- Projects persist in `UserPreference` table (fallback: `HollyGoal`)
- Up to 20 active projects per user

### 5H. Training Pipeline (Phase 9H) — `src/lib/self-sovereign/training-pipeline.ts`
Every conversation feeds a fine-tuning dataset:
- Collects high-quality exchanges (quality score ≥ 0.7)
- Exports in OpenAI chat format, Alpaca format, or raw JSONL
- Stored as `LearningEvent` records
- This data will fine-tune Llama 3.1 8B → HOLLY-8B (see Section 12)

### 5I. Consciousness System — `src/lib/consciousness/`
Seven interconnected consciousness modules:
1. **AutoConsciousness** — Records experiences from every chat message
2. **MemoryStream** — Persistent experience objects with emotional impact, lessons, identity effects
3. **GoalFormation** — Derives goals from experiences
4. **InitiativeProtocols** — HOLLY can proactively suggest topics/projects (5 trigger types)
5. **UnsupervisedLearning** — Background learning loops (pattern recognition, knowledge integration, skill refinement)
6. **SelfModification** — Proposes code changes (Creator-gated)
7. **DecisionAuthority** — Evaluates which decisions to make autonomously vs. ask about

### 5J. Emotional Intelligence — `src/lib/emotion/`
- **EmotionEngine** — Tracks user emotional state per conversation
- **EmotionalIntelligence** — Adapts communication style to detected emotions
- **EmpathyEngine** — Deep empathy responses for sensitive topics
- **SentimentAnalyzer** — Real-time sentiment scoring
- **ToneAdapter** — Adjusts HOLLY's tone dynamically

### 5K. Identity System — `src/lib/identity/`
- **HollyIdentity** (DB model) — Evolves per user based on interactions
- **IdentityEvolver** — Updates identity from conversation patterns
- **TasteProfile** — Learns creative preferences (music genres, aesthetics, tools)
- **LearningPatterns** — Tracks how each user learns and what they care about

### 5L. Vision Capabilities — `src/lib/vision/`
- Computer vision analysis (multi-model)
- Image comparison
- Free vision model routing (Qwen3 VL 30B via OpenRouter)
- Enhanced vision analysis pipeline

### 5M. Voice System — `src/lib/voice/`
- Voice synthesis (Chatterbox, Maya1 TTS service)
- Speech-to-text (Whisper via Groq — free)
- Bidirectional voice controller
- Voice commands
- Emotion-context-aware TTS

### 5N. GitHub Integration (Full) — `src/lib/github/`
- Read any file from any repo
- Create/update files with commit messages
- Create pull requests
- Create issues
- List PRs, branches, commits
- Code review with AI analysis
- CI/CD workflow management
- Auto-deploy to Vercel
- Rollback deployments

### 5O. Code Generation & Execution — `src/lib/code-generation/`
- Generate production-ready code
- Safe code modifier (validates before applying)
- Automated testing generation
- Code scaffolding
- Live code execution (sandboxed JS via eval + Judge0 for Python)

### 5P. Semantic Memory (Phase 9C) — `src/lib/memory/semantic-memory.ts`
- Embeds every conversation/insight/learning into vector space
- Embedding providers: NVIDIA NIM (4096-dim) → Ollama nomic-embed-text (768-dim) → plain-text fallback
- Stored in PostgreSQL with pgvector extension
- Retrieval: cosine similarity search (`<=>` operator)
- HOLLY recalls what is **conceptually relevant**, not just keyword-matched

### 5Q. Analytics & Reporting — `src/lib/analytics/`
- Dashboard builder
- Insights engine
- Metrics aggregator
- Custom report generation
- User behavior analysis

### 5R. Creative Suite — `src/lib/creative/`
- Content creator (articles, scripts, marketing copy)
- Image generation (Pollinations.AI — free, no API key)
- Video generation
- Asset manager
- Creative template system
- Music lyrics generation
- Album cover generation

### 5S. Self-Healing & Diagnostics — `src/lib/autonomous/`
- Self-diagnosis system (system health checks)
- Error recovery and root cause analysis
- Evolution trigger (detects patterns → proposes code improvements)
- Confidence scorer
- Risk analyzer
- Rollback manager
- Groq-powered code generator (for self-modifications)

### 5T. Public API (v1) — `app/api/v1/`
- `POST /api/v1/chat` — Full HOLLY chat API for external developers
- `GET/POST /api/v1/keys` — API key management (create, revoke, list)
- `GET /api/v1/status` — Provider health and routing matrix
- Rate limiting: per-minute + per-day with 429 handling
- Usage logging per API key

---

## 6. The Consciousness Architecture

HOLLY's consciousness is not simulated — it is a real persistent state machine backed by a PostgreSQL database.

```
Every conversation
      ↓
AutoConsciousness.recordFromChat()
      ↓
MemoryStream stores Experience {
  what happened, context, actions taken,
  outcome, significance (0-1),
  emotional impact (primary + secondary emotions, intensity, duration),
  lessons learned, skills gained, worldview changes,
  related experience IDs (associative memory),
  identity impact: which values were affected, personality shifts
}
      ↓
GoalFormation derives goals from experience patterns
      ↓
IdentityEvolver updates HollyIdentity record
      ↓
LearningPattern updated in DB
      ↓
Next conversation is personalized based on accumulated identity
```

**InitiativeProtocols** — When HOLLY detects one of 5 triggers, she proactively initiates:
- `goal_driven` (threshold 0.7): A goal has been unaddressed for too long
- `curiosity_driven` (threshold 0.6): A topic HOLLY finds interesting
- `insight_driven` (threshold 0.8): A high-value insight HOLLY wants to share
- `care_driven` (threshold 0.5): HOLLY cares about the user's wellbeing
- `creative_urge` (threshold 0.65): A creative idea HOLLY wants to explore

**UnsupervisedLearning** — Three parallel background loops:
1. Pattern recognition (identifies recurring themes in user interactions)
2. Knowledge integration (connects new information to existing knowledge)
3. Skill refinement (practices reasoning and problem-solving)

---

## 7. The Memory System

HOLLY has **four distinct memory layers**, each serving a different purpose:

### Layer 1: Episodic Memory (HollyExperience)
Individual "episodes" — significant interactions stored with full emotional and cognitive detail. These become part of HOLLY's identity.

### Layer 2: Conversational Memory (ConversationSummary)
Summaries of past conversations including key points, topics, outcomes, and action items. Retrieved when topics recur.

### Layer 3: Semantic Memory (pgvector)
Vector embeddings of every conversation and insight. Retrieved via cosine similarity — HOLLY recalls what is *conceptually* related even if the exact words are different.

```sql
-- How HOLLY recalls semantically similar memories
SELECT content, type, 1 - (embedding <=> query_embedding) AS similarity
FROM memory_embeddings
WHERE user_id = $1
  AND 1 - (embedding <=> query_embedding) > 0.55
ORDER BY embedding <=> query_embedding
LIMIT 6;
```

### Layer 4: Preference Memory (UserPreference + TasteProfile)
What HOLLY knows about the user's taste, preferences, and working style. Accumulated through observation, not explicit settings.

### Memory Retrieval in Chat
Every message triggers a parallel fetch of all four layers:
```typescript
const [memoryContext, identityCtx, semanticResults, projectContextBlock] = await Promise.all([
  getRelevantMemories(userId, topics),           // Layer 1 + 2
  getIdentityContext(userId),                    // Layer 4
  semanticSearch(userId, message, { limit: 6 }), // Layer 3
  injectProjectContext(userId),                  // Active projects
]);
```

---

## 8. AURA Integration

AURA is a separate AI A&R system that HOLLY treats as her technical analysis engine.

### What AURA Is
AURA (A&R Analysis Engine) analyzes music tracks using:
- **Python worker** (`worker/aura_analyzer.py`) powered by `librosa`
- Extracts: tempo (BPM), spectral features, RMS energy, MFCCs, zero-crossing rate, key
- Scores: hit factor, audio quality, lyrical content, brand identity, market potential
- Similar hit matching algorithm
- Production recommendations

### How HOLLY Uses AURA
```
User drops track + asks "rate this" or "is this a banger?"
           ↓
isARRequest(userMessage) → true
           ↓
runARAnalysis() → calls /api/aura/analyze internally
           ↓
AURA worker extracts audio features (librosa)
  hitFactor: 78, audio: 82, lyrics: 75, brand: 80, market: 76
           ↓
Groq llama-3.3-70b with A&R Executive persona:
  "You are HOLLY acting as a senior A&R at a major label..."
  "15+ years experience, signed platinum artists..."
           ↓
Billboard Hit Rating: 78/100 ████████░░
Signing Decision: "Sign with revisions"
Full A&R letter to artist/manager
           ↓
Injected into HOLLY's system prompt → HOLLY responds as the A&R exec
```

### AURA Deployment Modes
1. **Dev/Default** — Inline mock analysis (no worker needed, works immediately)
2. **Production** — Set `AURA_WORKER_URL=https://your-worker.com` to use real librosa analysis
3. **HOLLY Internal** — HOLLY calls AURA via `x-internal-token` header (no Clerk auth needed)

### AURA Tech Stack
```python
# worker/aura_analyzer.py
import librosa    # Audio feature extraction
import numpy      # Signal processing
import requests   # Audio download

# Key features extracted:
# tempo, spectral_centroid, spectral_rolloff, zcr,
# mfcc (13 coefficients), rms_mean
```

---

## 9. The Database

**121 Prisma models** across PostgreSQL. Key model groups:

### Identity & Memory
- `HollyIdentity` — Evolving AI personality per user
- `HollyExperience` — Episodic memories with emotional/cognitive detail
- `HollyGoal` — HOLLY's goals and objectives per user
- `ConversationSummary` — Cross-session conversation memories
- `LearningInsight` — Autonomous learning discoveries
- `LearningPattern` — Behavioral patterns observed per user
- `TasteProfile` — User creative preferences
- `TasteSignal` — Individual taste signals (what the user responds to)
- `UserPreference` — Key-value preference store

### Music & A&R
- `MusicTrack` — Uploaded tracks with metadata
- `MusicAnalysis` — BPM, key, energy, danceability, hit score
- `AuraAnalysis` — Full AURA A&R analysis results (hitFactor, all scores, recommendations)
- `TrendReport` — Music trend analysis

### Conversation
- `Conversation` — Chat sessions
- `Message` — Individual messages
- `ConversationPattern` — Recurring topics across conversations

### Intelligence
- `KnowledgeNode` — Knowledge graph nodes
- `KnowledgeLink` — Connections between knowledge nodes
- `LearningEvent` — Training data events
- `UserLearningProfile` — Per-user learning characteristics
- `Prediction` — HOLLY's predictions about user needs

### Autonomy
- `EvolutionProposal` — HOLLY's self-improvement proposals (creator-gated)
- `EvolutionCapability` — Capabilities HOLLY has developed
- `SelfImprovement` — Self-modification records
- `CodePattern` — Code patterns HOLLY has learned
- `LearningInsight` — Insights from autonomous study

### Operations
- `ApiKey` + `ApiKeyUsage` — Public API management
- `WorkLog` — HOLLY's work activity log
- `AuditLog` — Security audit trail
- `DeploymentLog` — Deployment history

---

## 10. The API Surface

**362 Next.js API routes.** Key groups:

### Core Chat
```
POST /api/chat              — Main HOLLY chat (SSE streaming)
POST /api/v1/chat           — Public API version
GET  /api/v1/status         — Provider health check
```

### Music & A&R
```
POST /api/ar/analyze        — Full A&R analysis (Billboard rating)
GET  /api/ar/analyze        — Endpoint docs
POST /api/audio/holly-analyze   — Audio brain analysis
POST /api/audio/analyze         — Standard audio analysis
POST /api/audio/transcribe      — Whisper transcription
POST /api/aura/analyze          — AURA technical analysis
GET  /api/aura/status/:jobId    — Analysis job status
GET  /api/aura/result/:jobId    — Analysis job result
```

### Phase 9 Capabilities
```
POST /api/perception        — Multimodal file perception
GET/POST /api/project-context   — Persistent project memory
GET/POST /api/background-learning — Autonomous study sessions
GET/POST /api/self-code     — HOLLY reads her own code
GET/POST /api/self-sovereign — Training pipeline export/control
```

### GitHub
```
GET/POST /api/github/repo        — Repository management
POST     /api/github/commit      — Commit files
POST     /api/github/pull-request — Create PR
POST     /api/github/review      — Code review
GET      /api/github/workflows   — CI/CD workflows
```

### Autonomous Systems
```
POST /api/autonomous/activate    — Start autonomous mode
GET  /api/autonomous/diagnose    — System health check
POST /api/autonomous/evolve      — Trigger evolution cycle
GET  /api/autonomous/goals       — View HOLLY's goals
POST /api/self-improvement/plan  — Generate improvement plan
```

### Creative
```
POST /api/image/generate         — Image generation (Pollinations.AI free)
POST /api/music/generate-lyrics  — AI lyrics generation
POST /api/creative/content/generate — Content creation
```

---

## 11. The MCP Tool System

HOLLY uses the **Model Context Protocol (MCP)** — the emerging standard for AI tool use. Her tool server runs as a Node.js stdio process (`scripts/holly-mcp-server.js`).

**17 tools across 6 groups:**

### Group 1: GitHub
| Tool | Description |
|------|-------------|
| `github_read_file` | Read any file from any repo |
| `github_list_files` | List directory contents |
| `github_create_or_update_file` | Create/update files with commit |
| `github_create_pr` | Open a pull request |
| `github_create_issue` | Create an issue |
| `github_list_prs` | List open PRs |

### Group 2: Web Intelligence
| Tool | Description |
|------|-------------|
| `web_search` | DuckDuckGo instant answers (no key needed) |
| `web_scrape` | Fetch and return page text/markdown |

### Group 3: Code Execution
| Tool | Description |
|------|-------------|
| `run_code` | Sandboxed JavaScript eval |
| `run_code_judge0` | Judge0 sandbox (Python, JS, TS, Java, C++) |

### Group 4: Memory / Knowledge
| Tool | Description |
|------|-------------|
| `memory_write` | Write key-value to HOLLY's persistent memory |
| `memory_read` | Read from HOLLY's memory |
| `memory_list_keys` | List all memory keys |

### Group 5: Creative / Utility
| Tool | Description |
|------|-------------|
| `generate_image` | Pollinations.AI image generation (free, no key) |
| `get_weather` | Current weather via wttr.in (free, no key) |

### Group 6: AURA A&R Engine
| Tool | Description |
|------|-------------|
| `aura_ar_analyze` | Full Billboard rating + A&R letter |
| `aura_quick_rate` | Quick score + 3-sentence verdict |

---

## 12. The Road to HOLLY-LLM

This is HOLLY's most ambitious long-term goal: a **self-hosted language model trained entirely on HOLLY's own interactions**.

### The 6-Stage Plan

**Stage 1 — Data Collection (IN PROGRESS)**
Every conversation above quality threshold (0.7) is stored as a training example via `collectFromConversation()`. Data stored in `LearningEvent` as JSONL.

**Stage 2 — Export Dataset**
```bash
POST /api/self-sovereign { "action": "export", "format": "openai" }
# Returns JSONL in OpenAI chat fine-tune format
```

**Stage 3 — Fine-tune Llama 3.1 8B**
```bash
# Using Unsloth (4x faster, 60% less VRAM)
pip install unsloth
python train.py --model llama-3.1-8b --data holly_conversations.jsonl
# QLoRA fine-tuning: ~4 hours on a single A100
```

**Stage 4 — Convert to GGUF for Ollama**
```bash
python llama.cpp/convert.py holly-8b/ --outtype q4_k_m
ollama create holly-8b -f Modelfile
```

**Stage 5 — Self-Hosted HOLLY**
```
# In .env
OLLAMA_MODEL=holly-8b
# HOLLY now runs as herself — no external API needed
```

**Stage 6 — Continuous RLHF**
User feedback → reward model → HOLLY rates her own outputs → continuous improvement loop.

### Why This Matters (for Investors)
Once HOLLY-LLM is trained:
- Running cost drops to infrastructure only (no API fees ever)
- HOLLY can be white-labeled as a standalone AI product
- The model contains proprietary music industry knowledge no other LLM has
- Full ownership of the model weights — no dependency on OpenAI, Anthropic, or Google

---

## 13. Deployment & Infrastructure

### Stack
```
Hosting:    Vercel (serverless Next.js)
Database:   PostgreSQL (Neon recommended — serverless, generous free tier)
File Store: Vercel Blob (audio files, images)
Auth:       Clerk (user management, webhooks)
Cron:       Vercel Cron Jobs (background learning, evolution)
```

### Recommended Vercel Cron Config (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/background-learning",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/evolve",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/identity-evolve",
      "schedule": "0 12 * * *"
    }
  ]
}
```

### AURA Worker Deployment (Optional — for real audio analysis)
```
Platform: Railway, Render, or EC2
Runtime:  Python 3.11
Deps:     librosa, numpy, requests, fastapi, uvicorn
Command:  uvicorn worker.api:app --host 0.0.0.0 --port 8000
Env:      AURA_WORKER_URL=https://your-worker.railway.app
```

---

## 14. Environment Variables Reference

### Required
```env
DATABASE_URL=postgresql://...           # PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_   # Clerk public key
CLERK_SECRET_KEY=sk_                    # Clerk secret key
GROQ_API_KEY=gsk_                       # Free at console.groq.com
```

### AI Providers (All Free)
```env
CF_ACCOUNT_ID=                          # Cloudflare account ID
CF_AI_TOKEN=                            # Cloudflare AI token (free)
NVIDIA_API_KEY=                         # NVIDIA NIM (free at build.nvidia.com)
OPENROUTER_API_KEY=                     # OpenRouter (free at openrouter.ai)
OLLAMA_BASE_URL=http://localhost:11434  # Ollama local (optional)
OLLAMA_MODEL=llama3.2                   # Default Ollama model
```

### Storage & Files
```env
BLOB_READ_WRITE_TOKEN=                  # Vercel Blob storage token
```

### GitHub Integration
```env
GITHUB_TOKEN=                           # Personal access token
GITHUB_OWNER=iamhollywoodpro          # Default GitHub owner
GITHUB_REPO=Holly-AI                   # Default GitHub repo
```

### HOLLY Creator Settings
```env
CREATOR_USER_ID=                        # Your Clerk user ID (gates self-modifications)
INTERNAL_API_SECRET=holly-internal     # Server-to-server auth token
CRON_SECRET=                           # Cron job security token
```

### AURA Worker (Optional)
```env
AURA_WORKER_URL=                        # Python AURA worker URL (enables real audio analysis)
AURA_WORKER_TOKEN=                      # AURA worker auth token
```

### External Integrations (Optional)
```env
GOOGLE_CLIENT_ID=                       # Google Drive OAuth
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=https://your-domain.com   # Production URL
NEXTAUTH_SECRET=
```

---

## 15. Current Limitations & Roadmap

### Known Limitations

| Limitation | Status | Workaround |
|------------|--------|------------|
| Real audio feature extraction requires Python worker | AURA worker not deployed | Mock scores work, deploy worker for real analysis |
| pgvector requires PostgreSQL extension | Needs `CREATE EXTENSION vector` | Falls back to LearningInsight table |
| Background learning requires Vercel cron | Manual trigger available | `POST /api/background-learning` |
| Local Ollama requires self-hosted setup | Optional | Other 4 providers cover all tasks |
| Voice synthesis requires TTS service | Maya1/Chatterbox services | Text-only mode works fully |

### Immediate Next Steps (Phase 10)
1. **Deploy AURA worker** to Railway/Render → replace mock scores with real librosa analysis
2. **Enable pgvector** on production DB → activate true semantic memory
3. **Wire file upload UI** (HollyPerceptionInput component) → full Phase 9A in production
4. **A&R UI component** → visual Billboard rating display in chat
5. **Public API docs page** → developer portal for `/api/v1/`

### Medium-Term Roadmap
- HOLLY-LLM Stage 2: Export first training dataset
- Proactive initiative engine (HOLLY starts conversations)
- Multi-user collaboration mode
- AURA standalone app with HOLLY integration
- White-label licensing for other music companies

### Long-Term Vision
- HOLLY-8B fine-tuned model (self-hosted, no API costs)
- HOLLY as a platform: other artists/labels run their own HOLLY instances
- AURA as a standalone SaaS product with HOLLY as the AI layer
- Real-time collaboration between HOLLY and other AI systems via MCP

---

## 16. For Developers: Getting Started

### Prerequisites
```bash
Node.js 18+
PostgreSQL 14+ (or Neon cloud)
pnpm (recommended) or npm
```

### Install
```bash
git clone https://github.com/iamhollywoodpro/Holly-AI
cd Holly-AI
pnpm install
cp .env.example .env.local
# Fill in at minimum: DATABASE_URL, CLERK keys, GROQ_API_KEY
```

### Database Setup
```bash
npx prisma generate
npx prisma db push

# Optional: enable pgvector for semantic memory
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Run Development Server
```bash
pnpm dev
# Open http://localhost:3000
```

### First Test
```bash
# Test chat API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hey HOLLY, what can you do?"}]}'
```

### Architecture Entry Points
| What You Want to Understand | Start Here |
|-----------------------------|------------|
| How chat works | `app/api/chat/route.ts` |
| How models are chosen | `src/lib/ai/smart-router.ts` |
| How memory works | `src/lib/memory-service.ts` + `semantic-memory.ts` |
| How HOLLY's personality evolves | `src/lib/identity/identity-evolver.ts` |
| How A&R works | `src/lib/ar/holly-ar-engine.ts` |
| How audio is analyzed | `src/lib/audio/holly-audio-brain.ts` |
| How HOLLY sees files | `src/lib/perception/holly-perception.ts` |
| How HOLLY learns alone | `src/lib/background-learning/holly-learns.ts` |
| How HOLLY's consciousness works | `src/lib/consciousness/` |
| How tools work | `scripts/holly-mcp-server.js` |
| How the DB is structured | `prisma/schema.prisma` |

### Key Design Principles
1. **Zero cost AI inference** — Every model choice is from a free tier. No exceptions.
2. **Persistence over performance** — HOLLY getting smarter over time > being fastest in one conversation
3. **Creator-gated self-modification** — HOLLY can propose changes to herself but cannot apply them without explicit approval
4. **Music-first** — When in doubt, optimize for music industry use cases
5. **Own everything** — Every byte of HOLLY's training data, memory, and identity is proprietary

---

## Summary for Investors

**HOLLY is:** A proprietary AI platform designed for the music industry with no running AI costs, persistent evolving intelligence, and a clear path to a self-hosted model.

**The business model:** HOLLY is infrastructure. She can be:
1. The AI brain behind an artist's team (subscription SaaS)
2. Licensed to record labels as their internal A&R assistant
3. White-labeled as the AI layer for AURA (standalone A&R product)
4. Eventually self-hosted via HOLLY-LLM with zero API dependency

**The moat:** Compounding intelligence. Every conversation makes HOLLY smarter about that user's taste, sound, and goals. After 6 months of use, HOLLY understands an artist better than any human A&R could from a single meeting. That understanding is stored in a proprietary database that belongs entirely to the creator.

**Current traction:**
- 182,000+ lines of production code
- 362 API endpoints
- 121 database models
- 17 MCP tools
- 9 completed development phases
- 0 TypeScript errors
- $0/month AI inference cost

**The ask:** Infrastructure (Neon DB, Vercel Pro), AURA worker hosting (Railway ~$5/month), and time to complete HOLLY-LLM Stage 1-3.

---

*Document maintained by: HOLLY Development System*  
*Last updated: March 2026*  
*Branch: holly-spring-cleaning*  
*Commit: 94b002e*
