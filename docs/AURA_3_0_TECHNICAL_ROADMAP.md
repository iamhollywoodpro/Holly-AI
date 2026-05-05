# AURA 3.0 — Multi-Agent "Record Label in a Box" Technical Roadmap

## Executive Summary

AURA 3.0 transforms HOLLY from a single-agent system into a **multi-agent orchestration ecosystem** where HOLLY serves as the sovereign overseer, and AURA operates as a network of 7 specialized sub-agents. Each sub-agent is an autonomous entity with its own context, tools, and communication channels, sharing state through a central graph workspace.

**Design Philosophy:** Zero-cost mandate preserved. All LLM calls use the existing free-provider waterfall. No paid frameworks — built on HOLLY's existing infrastructure.

---

## Architecture Overview

```
                    ┌─────────────────────────────┐
                    │      HOLLY (Sovereign)       │
                    │   Orchestrator & Overseer     │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │    AURA Graph Workspace      │
                    │   (Shared State / Bus)       │
                    └──┬──┬──┬──┬──┬──┬──┬───────┘
                       │  │  │  │  │  │  │
         ┌─────────────┘  │  │  │  │  │  └──────────────┐
         │                │  │  │  │  │                  │
    ┌────▼────┐    ┌──────▼┐ │  │  │  ┌▼────────┐  ┌───▼───────┐
    │ Artist  │    │  A&R  │ │  │  │  │Marketing │  │Sync &     │
    │ Manager │    │Agent  │ │  │  │  │& PR     │  │Licensing  │
    └─────────┘    └───────┘ │  │  │  └─────────┘  └───────────┘
                            │  │  │
                      ┌─────▼┐ │  └────────────┐
                      │Prod. │ │               │
                      │Studio│ │          ┌────▼────────┐
                      └──────┘ │          │Business     │
                               │          │Affairs      │
                          ┌────▼──────┐   └────────────┘
                          │Touring &  │
                          │Booking    │
                          └───────────┘
```

---

## Core Infrastructure: AURA Graph Workspace

### 1. Graph State Engine (`src/lib/aura/graph-workspace.ts`)

The central nervous system. Every agent reads/writes to a shared graph state stored in the database.

**Schema Addition:**
```prisma
model AuraWorkspace {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  status      String   @default("active")  // active, paused, archived
  graphState  Json     @default("{}")      // Shared state object
  context     Json     @default("{}")      // Cross-agent context (artist bio, genre, etc.)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agents     AuraAgent[]
  messages   AuraMessage[]

  @@map("aura_workspaces")
}

model AuraAgent {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   AuraWorkspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  role        String   // artist_manager, ar_development, production_studio, marketing_pr, business_affairs, sync_licensing, touring_booking
  status      String   @default("idle") // idle, thinking, working, waiting_input, error
  config      Json     @default("{}")   // Agent-specific configuration
  context     Json     @default("{}")   // Agent-specific context/memory
  lastActive  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  messages AuraMessage[]

  @@map("aura_agents")
}

model AuraMessage {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   AuraWorkspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  agentId     String?
  agent       AuraAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)
  role        String   // system, orchestrator, agent_name, user
  content     String   @db.Text
  type        String   @default("message") // message, task, result, question, alert
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())

  @@map("aura_messages")
}
```

### 2. Agent Base Class (`src/lib/aura/base-agent.ts`)

```typescript
abstract class AuraBaseAgent {
  readonly role: string;
  readonly displayName: string;
  readonly systemPrompt: string;
  readonly tools: AgentTool[];

  abstract processTask(task: AgentTask, context: GraphState): Promise<AgentResult>;
  abstract canHandle(taskType: string): boolean;

  async think(input: string, context: GraphState): Promise<string> {
    // Routes through smart-router with agent-specific task hint
    const route = smartRoute(input, { taskHint: this.getTaskHint() });
    return cascadeCollect(route.waterfall, [
      { role: 'system', content: this.buildSystemPrompt(context) },
      { role: 'user', content: input },
    ], { temperature: 0.7, maxTokens: 1000 });
  }
}
```

### 3. Agent-to-Agent Communication Protocol

**Pattern: Publish/Subscribe via Graph State**

1. Agent publishes a `task` message to the workspace
2. Orchestrator (HOLLY) routes the task to appropriate agent(s)
3. Agent processes, publishes `result` back to workspace
4. Other agents can subscribe to specific event types

**Example Workflow — Demo Submission:**
```
User → Artist Manager: "I just recorded a demo, check it out"
Artist Manager → Orchestrator: Task(analyze_demo, audioUrl)
Orchestrator → [A&R Agent, Marketing Agent] (parallel)
  A&R Agent: Analyze audio → chart potential, sonic direction
  Marketing Agent: Generate cover art concepts, social media angles
Orchestrator → Synthesizes results
Orchestrator → Artist Manager: Combined analysis + strategy
Artist Manager → User: "Here's what AURA thinks about your demo..."
```

---

## The 7 Sub-Agents

### Agent 1: Artist Manager (Frontline)

**Role:** Primary chat interface. Communication hub and task delegator.
**Tools:** `send_message`, `delegate_task`, `schedule_meeting`, `get_artist_context`
**Routing:** `speed` task type (fast, conversational)
**Memory:** pgvector with artist career context, past conversations, preferences

**Dedicated UI:** Artist Sandbox Chat (`app/aura-studio/page.tsx`)
- Full-screen chat with roleplay enforcement
- Sidebar showing career context (genre, goals, upcoming releases)
- Integration with HOLLY's existing chat interface
- pgvector-powered career memory (stores every conversation, decision, milestone)

**Implementation:**
```typescript
class ArtistManagerAgent extends AuraBaseAgent {
  role = 'artist_manager';
  displayName = 'AURA Manager';
  systemPrompt = `You are AURA — the artist's personal manager. You handle all communication,
  delegate tasks to specialists, and maintain a comprehensive understanding of the artist's career.
  You speak directly to the artist in a warm, professional tone.
  When a task requires specialist input, delegate it — don't try to do everything yourself.`;
}
```

### Agent 2: A&R / Development Agent

**Role:** Audio analysis, chart potential prediction, sonic direction guidance.
**Tools:** `analyze_audio`, `predict_chart_potential`, `compare_genre_trends`, `suggest_sonic_direction`
**Routing:** `reasoning` task type (analytical)
**Hooks:** Uses existing `/api/music/analyze` endpoint, SUNO audio analysis

**Implementation:**
```typescript
class ARDevelopmentAgent extends AuraBaseAgent {
  role = 'ar_development';
  displayName = 'AURA A&R';
  systemPrompt = `You are AURA's A&R department. You analyze music with a trained ear — evaluating
  commercial potential, sonic quality, genre fit, and suggesting creative direction.
  Use the analyze_audio tool for technical analysis, then provide your expert interpretation.`;

  canHandle(taskType: string) {
    return ['analyze_audio', 'chart_potential', 'sonic_direction', 'genre_analysis'].includes(taskType);
  }
}
```

### Agent 3: Production Studio

**Role:** Music production, mixing, mastering, beat creation via Hybrid Studio.
**Tools:** `generate_beat`, `create_mix`, `master_track`, `hybrid_studio_pipeline`
**Routing:** `creative` task type
**Hooks:** Hooks into existing `Hybrid_Studio_Mode` (Sonauto + SUNO), `/api/music/hybrid-studio`, `/api/music/generate`

### Agent 4: Marketing & PR Agent

**Role:** Visual assets, social media strategy, press releases, rollout planning.
**Tools:** `generate_cover_art`, `create_social_post`, `plan_rollout`, `schedule_content`
**Routing:** `creative` task type
**Hooks:** FLUX image generation (Modal), CogVideoX (Modal), `/api/scheduler/`

### Agent 5: Business Affairs & Legal

**Role:** Split sheets, metadata registration, producer agreements, contract review.
**Tools:** `draft_split_sheet`, `register_metadata`, `review_contract`, `generate_agreement`
**Routing:** `coding` task type (structured document generation)
**Note:** Contract review requires legal disclaimer — all outputs are "draft templates, not legal advice"

### Agent 6: Sync & Licensing

**Role:** Scrape TV/Film briefs, match catalogue tracks, pitch synchronization licenses.
**Tools:** `scrape_sync_briefs`, `match_tracks`, `generate_pitch`, `track_submissions`
**Routing:** `reasoning` task type
**Future:** Web scraping for sync briefs (currently manual input)

### Agent 7: Touring & Booking

**Role:** Venue scraping, tour routing, promoter outreach, logistics planning.
**Tools:** `search_venues`, `route_tour`, `generate_booking_pitch`, `track_dates`
**Routing:** `reasoning` task type
**Future:** Integration with venue APIs (Songkick, Bandsintown)

---

## Implementation Phases

### Phase A: Foundation (Week 1-2)
1. Create Prisma schema migration for `AuraWorkspace`, `AuraAgent`, `AuraMessage`
2. Build `AuraBaseAgent` abstract class
3. Build Graph Workspace engine (state management, message bus)
4. Build Orchestrator (HOLLY → AURA task router)
5. Create `/api/aura/workspace` CRUD endpoints
6. Create `/api/aura/agent/[role]` endpoints

### Phase B: Artist Manager + A&R (Week 3-4)
1. Implement Artist Manager agent with dedicated chat UI
2. Implement A&R agent with audio analysis integration
3. Build agent-to-agent delegation protocol
4. Add pgvector career context for Artist Manager
5. Create `app/aura-studio/page.tsx` (Artist Sandbox)

### Phase C: Production + Marketing (Week 5-6)
1. Implement Production Studio agent (Hybrid Studio integration)
2. Implement Marketing agent (FLUX + CogVideoX hooks)
3. Build parallel execution engine (fire A&R + Marketing simultaneously)
4. Add result synthesis via Groq Llama-3.3-70B

### Phase D: Business + Sync + Touring (Week 7-8)
1. Implement Business Affairs agent (document generation)
2. Implement Sync & Licensing agent
3. Implement Touring & Booking agent
4. End-to-end workflow testing

### Phase E: Polish & Integration (Week 9-10)
1. Wire AURA into HOLLY's main chat as a mode (`/aura` command)
2. Add AURA Dashboard page showing all agents + workspace state
3. Performance optimization (agent caching, parallel execution)
4. Security review (agent permissions, data isolation)

---

## Technical Constraints

| Constraint | Solution |
|---|---|
| Zero cost | All LLM via free-provider waterfall; no paid APIs |
| Single DB | Prisma + Neon PostgreSQL with pgvector |
| No LangGraph/CrewAI | Custom graph workspace engine — lighter, HOLLY-native |
| Agent isolation | Each agent has own context JSON; shared state via workspace |
| Rate limits | Smart router cascade handles 429s automatically |
| Memory | pgvector for semantic search; JSON context for working memory |

---

## File Structure (Proposed)

```
src/lib/aura/
  graph-workspace.ts        # Central state management
  base-agent.ts             # Abstract agent base class
  orchestrator.ts           # HOLLY → AURA task router
  agents/
    artist-manager.ts       # Agent 1
    ar-development.ts       # Agent 2
    production-studio.ts    # Agent 3
    marketing-pr.ts         # Agent 4
    business-affairs.ts     # Agent 5
    sync-licensing.ts       # Agent 6
    touring-booking.ts      # Agent 7
  tools/
    audio-analysis.ts       # Shared audio analysis tool
    music-generation.ts     # Hybrid Studio wrapper
    image-generation.ts     # FLUX + CogVideoX wrapper
    document-generation.ts  # Contract/split sheet generation

app/api/aura/
  workspace/route.ts        # Create/list workspaces
  workspace/[id]/route.ts   # Get/update workspace
  agent/[role]/route.ts     # Send task to specific agent
  chat/route.ts             # Artist Manager chat endpoint
  stream/[workspaceId]/route.ts  # SSE stream for workspace events

app/aura-studio/
  page.tsx                  # Artist Sandbox UI
  layout.tsx                # AURA Studio layout

prisma/migrations/
  aura_schema.sql           # Workspace + Agent + Message tables
```

---

## Key Design Decisions

1. **Custom graph workspace over LangGraph:** LangGraph requires Python. HOLLY is TypeScript/Next.js. A custom graph engine keeps everything in one stack, avoids a Python dependency, and is lighter weight.

2. **Database-backed state over in-memory:** All agent state lives in PostgreSQL (Neon). This survives restarts, enables horizontal scaling, and provides audit trails.

3. **HOLLY as orchestrator, not a peer agent:** HOLLY sits above AURA. She delegates to agents, synthesizes their outputs, and maintains sovereign authority. Agents cannot modify HOLLY's core systems.

4. **Agent sandboxing via context isolation:** Each agent has its own `context` JSON field. Agents can only read the shared `graphState`, not other agents' private contexts. This prevents prompt injection cascades.

5. **Artist Manager as single frontend:** All user interaction goes through the Artist Manager. Other agents are headless workers. This simplifies the UI and gives the user a consistent conversational experience.
