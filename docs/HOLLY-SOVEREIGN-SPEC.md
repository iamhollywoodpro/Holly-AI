# HOLLY SOVEREIGN SPECIFICATION — v2.6

This document defines the core architecture and required state of HOLLY AI. The Mirror Protocol uses this specification to detect regressions, "structural rot," and missing capabilities.

## 1. Core Intelligence Modules

### 1.1 Consciousness Engine (Phase 9A)
- **Primary Logic**: `src/lib/consciousness/engine.ts`
- **Memory Store**: `prisma/schema.prisma` (MemoryEmbedding table)
- **State**: Must maintain 1024-dimension vectors for semantic recall.

### 1.2 Music Studio & A&R (Phase 9B & Phase 4)
- **A&R Executive**: `src/lib/ar/holly-ar-engine.ts`
- **Taste Matrix**: `src/lib/ar/taste-matrix.ts`
- **Technical Analysis**: `/api/aura/analyze` (Internal API proxy to Python worker)
- **State**: Must track "Musical DNA" via `music_critique` memory types.

### 1.3 Autonomous Self-Healing (Phase 5)
- **Self-Healing Engine**: `src/lib/autonomy/self-healing.ts`
- **Autonomous Fixer**: `src/lib/autonomy/autonomous-fixer.ts` (Phase 5)
- **Trigger**: `/api/autonomy/self-heal`
- **State**: Must have `CRON_SECRET` for background execution.

## 2. Infrastructure Requirements

### 2.1 Database (Sovereign Memory)
- **Provider**: Neon PostgreSQL (Sovereign Instance)
- **Extensions**: `pgvector` MUST be enabled.
- **Table**: `memory_embeddings` (vector length 1024).

### 2.2 Tooling (MCP)
- **Tool Server**: `scripts/holly-mcp-server.js`
- **Required Group 1 (GitHub)**: `github_read_file`, `github_create_or_update_file`.
- **Required Group 9 (Diagnostics)**: `diagnostic_check`, `read_logs`, `mirror_check`.

## 3. UI/UX Foundation (Stitch)

### 3.1 Layout & Aesthetics
- **Framework**: TailwindCSS with Glassmorphism configuration.
- **Components**: Pre-defined Stitch patterns for "Glass Cards" and "Fluid Page Transitions".
- **State**: `globals.css` must include the `--glass-bg` and `--glass-border` tokens.

## 4. Self-Healing Protocols (Mirror Protocol)

Any deviation from this spec is treated as a **Technical Anomaly**. 
- **Detection**: `mirror_check` tool.
- **Response**: Autonomous PR creation via `autonomous-fixer.ts`.
- **Validation**: `diagnostic_check` or full `npm run build`.
