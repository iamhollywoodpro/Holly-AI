# Holly AI — New Developer Onboarding

Everything you need to go from zero to first PR.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 18.0.0 | `nvm install 18 && nvm use 18` |
| npm | >= 9.0.0 | Comes with Node 18+ |
| PostgreSQL | >= 14 | Local or [Neon](https://neon.tech) (recommended) |
| Git | Latest | `brew install git` (macOS) |
| VS Code | Latest | With extensions: Prisma, ESLint, Prettier, TypeScript |

---

## First Setup (15 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/iamhollywoodpro/Holly-AI.git
cd Holly-AI
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with credentials. **Minimum required:**

```env
# Database (use Neon free tier for local dev)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Clerk Authentication (free tier at clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# LLM Providers (at least one)
GROQ_API_KEY="gsk_..."
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 — you should see the Holly landing page.

### 5. Verify Everything Works

```bash
# TypeScript check
npx tsc --noEmit

# Run all tests
npx jest

# Lint
npm run lint
```

All tests should pass. If they don't, check your `.env.local` setup.

---

## Codebase Tour

### Directory Layout

```
Holly-AI/
├── app/                    # Next.js App Router — pages and API routes
│   ├── api/                # 90+ API route directories
│   ├── (workspace)/        # Main app pages (aura, memory, write, etc.)
│   ├── chat/               # Chat interface
│   ├── dashboard/          # Dashboard with tabs
│   ├── settings/           # User settings pages
│   └── ...                 # Feature pages
│
├── src/
│   ├── components/         # React components (50+ directories)
│   │   ├── holly/          # Holly's visual identity (orb, aura, emotions)
│   │   ├── chat/           # Chat interface components
│   │   ├── admin/          # Admin panel components
│   │   ├── builder/        # App builder workspace
│   │   ├── ui/             # Base UI primitives (button, card, dialog, etc.)
│   │   └── ...             # Feature components
│   │
│   ├── lib/                # Core business logic (~90 directories)
│   │   ├── ai/             # LLM cascade, smart router, providers
│   │   ├── chat/           # Chat pipeline (auth, context, prompts, background tasks)
│   │   ├── consciousness/  # Consciousness orchestrator + subsystems
│   │   ├── memory/         # 4-layer memory system
│   │   ├── plugins/        # Plugin system + implementations
│   │   ├── security/       # Rate limiting, audit, compliance
│   │   ├── integrations/   # External service clients (email, SMS, calendar)
│   │   ├── music/          # Music generation (SUNO, Sonauto, Spotify, etc.)
│   │   ├── visual/         # Visual identity engine
│   │   └── ...             # Many more subsystems
│   │
│   ├── hooks/              # React hooks
│   ├── store/              # Zustand state (chat-store.ts)
│   ├── types/              # TypeScript type definitions
│   └── styles/             # CSS files (themes, accessibility, animations)
│
├── __tests__/              # Test suites (48 files, 2,069+ tests)
├── prisma/                 # Database schema
├── docs/                   # Documentation
├── mobile-app/             # Expo React Native mobile app
├── browser-extension/      # Chrome extension
├── docker/                 # Docker + Coolify deployment
└── services/               # External services (Kokoro TTS, Modal media)
```

### Key Files to Know

| File | What it does |
|------|-------------|
| `app/api/chat/route.ts` | Main chat endpoint — Smart Router, streaming, tool calling |
| `src/lib/ai/smart-router.ts` | Routes tasks to the best free LLM provider |
| `src/lib/ai/cascade.ts` | Waterfall fallback across LLM providers |
| `src/lib/chat/context-loader.ts` | Assembles context from 25+ sources for each message |
| `src/lib/chat/prompt-builder.ts` | Builds the system prompt with personality + context |
| `src/lib/chat/background-tasks.ts` | Post-response async work (memory, learning, emotions) |
| `src/lib/consciousness/consciousness-orchestrator.ts` | Holly's consciousness loop (40+ subsystems) |
| `src/lib/memory/advanced-memory.ts` | 4-layer memory: Episodic, Working, Procedural, Meta |
| `src/lib/db.ts` | Prisma singleton — import this for database access |
| `src/lib/plugins/plugin-system.ts` | Plugin architecture (permissions, hooks, lifecycle) |
| `src/lib/visual/visual-identity-engine.ts` | Generates CSS vars, gradients, particles, form shapes |
| `src/components/holly/useVisualIdentity.tsx` | React context for Holly's living visual presence |
| `src/components/holly/holly-chat-interface.tsx` | Main chat UI (3,360 lines — needs breaking up) |
| `middleware.ts` | Root middleware — Clerk auth, rate limiting |
| `jest.config.js` | Jest config with ts-jest, path aliases |
| `next.config.js` | Next.js config (standalone output, ARM64 optimization) |

### Path Aliases

Only one alias exists:

```typescript
// This:
import { something } from '@/lib/my-module';

// Resolves to:
import { something } from './src/lib/my-module';
```

---

## Architecture

### How a Chat Message Flows

```
User types message
  → Component sends POST /api/chat
  → auth() validates Clerk session
  → context-loader fetches 25+ context sources in parallel
  → prompt-builder assembles system prompt
  → smart-router selects best free LLM provider
  → cascade tries providers until one responds
  → Response streams back via SSE
  → background-tasks runs async (memory extraction, emotion detection, learning)
```

### Consciousness Loop

Runs hourly via cron (`/api/cron/consciousness-loop`):

```
For each active user:
  → Inner monologue (Holly thinks about recent conversations)
  → Unsupervised learning (extracts patterns)
  → Identity evolution (personality adapts)
  → Memory decay (consolidates/forgets)
  → Dream mode (creative associations during idle)
```

### LLM Provider Cascade

Holly uses **only free-tier** LLM providers:

1. **Groq** (Llama 3.3 70B) — primary, fastest
2. **NVIDIA NIM** (DeepSeek V4) — fallback
3. **Google Gemini** (2.5 Flash) — fallback
4. **OpenRouter** — fallback
5. **Ollama** (local) — last resort

The Smart Router selects based on task type: speed, coding, reasoning, vision, creative, agent.

---

## Development Conventions

### TypeScript

- **Strict mode** is enabled — no `any` types
- Define explicit return types for exported functions
- Use interfaces for objects, types for unions
- Import Prisma from `@/lib/db`

### API Routes

- Every user-facing route starts with `await auth()`
- Return `{ error: string }` for errors
- Return `{ success: true, ...data }` for success
- Always use `try/catch` with proper error responses
- Dynamic segments: `{ params }: { params: { id: string } }`

### Components

- `'use client'` directive required for client components
- Use Tailwind CSS — no custom CSS files unless absolutely needed
- Handle loading, error, and empty states
- Use `framer-motion` for animations

### Testing

- Jest + ts-jest with `node` environment
- Mock `@/lib/db` at the top of every test file
- Test files go in `__tests__/<category>/`
- Run `npx jest` before every commit — all 2,069+ tests must pass
- Coverage threshold: 50% (branches, functions, lines, statements)

### Database

- Prisma schema is the single source of truth (`prisma/schema.prisma`)
- Use `npx prisma db push` for development
- Use `npx prisma migrate deploy` for production
- Always include `userId` ownership checks in service layer

### Git

- Create feature branches: `feature/my-feature`
- Write clear commit messages: "Add feature: what it does"
- Run `npx jest` before pushing
- All PRs require tests to pass on CI (GitHub Actions)

---

## Common Tasks

### Run the Dev Server

```bash
npm run dev
# Starts on http://localhost:3000
```

### Run Tests

```bash
# All tests
npx jest

# Specific file
npx jest __tests__/ai/smart-router.test.ts

# With coverage
npx jest --coverage

# Watch mode
npm run test:watch
```

### Type Check

```bash
npx tsc --noEmit
```

### Lint

```bash
npm run lint
```

### Database Operations

```bash
# Push schema changes
npx prisma db push

# Regenerate Prisma client
npx prisma generate

# Open database GUI
npx prisma studio

# Reset database (DESTRUCTIVE)
npx prisma db push --force-reset
```

### Build for Production

```bash
npm run build
```

---

## Your First PR

A good first contribution could be:

1. **Fix a bug** — look for issues labeled `bug` on GitHub
2. **Add a test** — find untested service files in `src/lib/`
3. **Break up a large file** — `holly-modes.ts` (1,003 lines), `crisis-detection.ts` (1,147 lines), `holly-chat-interface.tsx` (3,360 lines)
4. **Add a plugin** — follow the plugin system pattern in `src/lib/plugins/`

### PR Checklist

- [ ] Tests pass locally (`npx jest`)
- [ ] TypeScript is clean (`npx tsc --noEmit`)
- [ ] No `console.log` in production code
- [ ] No secrets or API keys in code
- [ ] Feature branch (not main)
- [ ] Clear commit messages

---

## Getting Help

- **Codebase questions:** Search `src/lib/` for the relevant service — most files are well-documented
- **Architecture questions:** Read `docs/adr/` for decision records
- **API questions:** See `docs/API_REFERENCE.md` for endpoint documentation
- **"How do I add X?":** See `docs/HOW_TO_ADD_A_FEATURE.md` for step-by-step guides

---

## Key Numbers

| Metric | Value |
|--------|-------|
| API routes | 530+ across 90 categories |
| Tests | 2,069+ across 48 suites |
| Components | 50+ directories |
| Service files | ~90 directories in `src/lib/` |
| LLM providers | 20+ free-tier models |
| Integration tests | 267 tests across 16 integrations |
| Test coverage threshold | 50% |
