# DATABASE_USAGE — Prisma Models & Persistence
**Date:** 2026-07-14 · Read-only audit. Method: grep of model identifiers in `src/` + `app/` (`*.ts`/`*.tsx`).

## Engine & config (verified)
- **DB:** PostgreSQL + pgvector (Neon hosted). `schema.prisma:9-13`.
- **183 Prisma models** (`grep -c "^model " prisma/schema.prisma`). schema.prisma = 5,531 lines.
- **Production schema sync:** `prisma db push --skip-generate` on every container start (`docker/startup.sh:41`). Migrations (`prisma/migrations/`) are **local-dev only** — not applied in prod.
- **pgvector:** `CREATE EXTENSION IF NOT EXISTS vector` at startup (`docker/startup.sh:35-37`). HNSW index on `MemoryEmbedding.embedding`.
- **Connection pool:** `connection_limit=10&pool_timeout=20&connect_timeout=10` injected in `src/lib/db.ts:20-29`. Singleton pattern to avoid dev double-instantiation.

## Model usage summary

### Heavily used (core, production-critical)
| Model | Role |
|---|---|
| `User` | identity, age verification, creator flag |
| `Conversation`, `Message` | chat persistence |
| `MemoryEmbedding` | pgvector semantic memory |
| `RelationshipProfile`, `RelationshipMemory` | relationship tiers |
| `HollyExperience`, `HollyGoal`, `HollyIdentity` | consciousness state |
| `ConversationSummary` | (model exists; summary route is a **stub**) |
| `UserExtension` | marketplace installs |
| `GitHubConnection`, `GitHubRepository` | GitHub integration |
| `CreativeAsset`, `GenerationJob` | media library |
| `Notification` | 206 refs — heavy use |

### Used but speculative (background/analytics systems)
`Prediction`(84), `LearningEvent`(49), `LearningPattern`(50), `TasteSignal`(45), `TasteProfile`(39), `KnowledgeNode`(37), `EvolutionProposal`(30), `CodeChange`(29), `DownloadLink`(28), `ApiKey`(27), `VisualIdentity`(25), `CommunicationStyle`(23), `TestSuite`(24), `Milestone`(63), `Budget`(52), `Deployment`(314 — likely over-counted by generic word "deployment"), `EmotionalBaseline`(39), `UserPreferences`(25), `UserPreference`(27), `SelfImprovement`(21), `GeneratedCode`(20), `LearningInsight`(21), `ProactiveInsight`(17), `Transaction`(16), `AgentTask`(24).

### ZERO references in source — dead schema (39 models)
These are defined in `schema.prisma` but have **no references** in `src/` or `app/`:

```
ABTestAssignment, ABTestConversion, ArchitectureSnapshot, AuraAgent, AuraMessage,
AgentRegistry, ToolDefinition, BuildSandbox, BuildTerminal, BuildPreview, GitConnection,
ConversationSyncPoint, OnboardingState, RelationshipMilestone, TemporalEvent,
CodebaseKnowledge, MonitoringAlert, DeploymentLog, CollectionItem, CodeGenerationJob,
NarrativeTemplate, BrainstormSession, CreativeInsight, CreativeSuggestion,
RefinementHistory, SupportStrategy, EmpathyInteraction, EmotionalTrigger, UserEvent,
UserEngagementScore, UserFeedbackV2, SelfCodeRollback, EmotionLog, WorkLogStats,
RecentActivity, ProjectActivity, ProjectAsset, RefactoringRecommendation, GitHubIntegration
```

Note: `db push` means these tables **do exist in production** (created from schema) but are never read/written by code — they consume DB space and cognitive overhead. Deleting from schema would drop the (empty) tables.

### Low-confidence (1 ref — verify before touching)
`KnowledgeLink`, `CoordinationSession`, `AgentInstance`, `CreativeTemplate`, `UserJourney`, `CustomReport`, `MetricAlert` — likely relation-declaration-only or single type-only import.

### Two GitHub models — one dead
- `GitHubConnection` — **live** (26 `prisma.gitHubConnection` accessors across ~20 routes).
- `GitHubIntegration` — **0 references**. The schema block labels itself "LEGACY" but `GitHubConnection` is the one actually in use. (`GitHubIntegration` is the orphan.)

### Two plugin systems → two models (both live)
- `PluginInstallation` (15 accessors, `/api/plugins/*`) — older system.
- `UserExtension` (6 accessors, `/api/extensions/*`) — newer marketplace.

## Key fields & gates (security-relevant)
- `User.isAdult` (Boolean) + `ageVerificationMethod` + `ageVerifiedAt` + `birthdate` — gate all NSFW (`schema.prisma:25-29`).
- `RelationshipProfile.metadata` JSON includes `persistentCreatorRecognition` — **set by insecure substring/memory-scan logic** (see SECURITY_FINDINGS.md §1) — grants permanent creator status.
- `MemoryEmbedding.embedding` (Unsupported "vector") — pgvector column, HNSW-indexed.
- `DownloadLink.password` — comment says "hashed" but hashing is not verified in this audit.

## Indexes
- HNSW on `MemoryEmbedding.embedding` (pgvector).
- B-tree on FKs and `@@index` declarations throughout.
- Unique: `UserExtension(userId, extensionId)`, `GitHubRepository(userId, githubId)`, `ABTest(name)`, several per-user uniques.

## Findings
1. **183 models is far more than the product uses.** ~39 (21%) have zero code references — pure schema weight. A meaningful number are speculative Phase-4+ tables that were defined ahead of implementation.
2. **`db push` with no migration discipline** means schema drift is silent. Adding columns is "safe" (non-destructive), but there's no auditable history of prod schema state beyond git history of `schema.prisma`.
3. **`ConversationSummary` model exists but the summarize route is a stub** — the table is likely empty or stale.
4. **`GitHubIntegration` is dead** alongside its relation on `User` (`schema.prisma:38`) — cleanup candidate that also removes a DB table.
5. **Connection pool of 10** is adequate for single-user; will saturate under multi-user concurrency (see scalability barriers).

## Reproducibility
```
grep -c "^model " prisma/schema.prisma                              → 183
for m in <list>; do grep -rn "$m" src/ app/ --include=*.ts* | wc -l; done   (per-model ref counts)
```
