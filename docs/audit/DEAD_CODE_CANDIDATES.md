# DEAD_CODE_CANDIDATES — Duplicates, Unused Models, Stubs, Dormant Code
**Date:** 2026-07-14 · Read-only audit. Method: grep-based reference counting over `src/` + `app/`. **Nothing deleted during this audit** — these are candidates for Steve to approve for cleanup.

---

## 1. Duplicate systems (both live — consolidation candidates)

### a. Two plugin/extension systems
| System | Model | Routes | Catalog |
|---|---|---|---|
| `src/lib/extensions/` (newer, Phase R1) | `UserExtension` | `/api/extensions/*` (4 routes) | 80 extensions / 8 suites (`catalog.ts`) |
| `src/lib/plugins/` (older) | `PluginInstallation` | `/api/plugins/*` (13 routes) | in-memory `PluginRegistry` + 6 implementations |

Both are active and serve overlapping "add-on" concepts with different APIs, models, and code. Genuine duplication.

### b. Two+ logger systems
| Logger | Importers |
|---|---|
| `src/lib/monitoring/logger.ts` | 27 (most used) |
| `src/lib/logging/structured-logger.ts` | 12 |
| `src/lib/logger.ts` | 6 |
| `src/lib/logging.ts` | 1 |

Effectively **four** logger entry points. Consolidation candidate.

### c. Two conversation APIs (both write the same tables)
- `/api/conversations/*` (10 routes) — Prisma direct on `Conversation`/`Message`.
- `/api/interaction/conversation(s)/*` (7 routes) — via `conversation-manager.ts`, which **also** writes `prisma.conversation`/`prisma.message`.

Same storage, overlapping CRUD. Notably `/api/chat` imports neither.

### d. Multiple code-gen paths
| Path | Status |
|---|---|
| `/api/code-gen` | ✅ real (`src/lib/code-gen.ts`, 209 lines) |
| `/api/code-generation/{generate,modify,test}` | ✅ real (`src/lib/code-generation/`) |
| `/api/code/{generate,optimize,review}` | ⬛ **stubs** (superseded) |
| `/api/code/{analyze-fix,scaffold}` | ✅ real |
| `/api/builder/*` | ✅ separate IDE subsystem (not a duplicate) |

Plus two confusingly-similar libs: `src/lib/code-gen.ts` vs `src/lib/code-generation/`.

### e. 11 overlapping image-gen routes
Only `/api/image/generate-ultimate` is canonical (mobile app uses it). The other 10 (`/api/creative/image/*`, `/api/media/generate-image`, `/api/artists/generate-image`, `/api/admin/creative/image`, etc.) overlap.

---

## 2. Dead Prisma models (zero references in `src/`/`app/`) — 39 models

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

- These tables **exist in production** (created via `db push`) but are never read/written.
- `GitHubIntegration` is the orphaned GitHub model (`GitHubConnection` is the live one).
- Removing from `schema.prisma` + `db push` would drop the (presumably empty) tables. **Verify emptiness with a DB query before any removal.**

Low-confidence (1 ref — verify before touching): `KnowledgeLink`, `CoordinationSession`, `AgentInstance`, `CreativeTemplate`, `UserJourney`, `CustomReport`, `MetricAlert`.

---

## 3. Confirmed stub routes (return canned data)

| Route | Returns |
|---|---|
| `/api/conversations/summarize` | `{summary:'ok'}` |
| `/api/suggestions/generate` | `{suggestions:[]}` |
| `/api/code/generate` | hardcoded `console.log('Hello from HOLLY!')` |
| `/api/code/optimize` | echoes input, `['Code is already optimized']` |
| `/api/code/review` | hardcoded `score:85, issues:[]` |
| `/api/autonomous/goals/set` | fabricated `goal_<timestamp>` |
| `/api/autonomous/guidance/request` | fabricated `req_<timestamp>` |

The `code/*` stubs are superseded by real implementations (`/api/code-gen`, `/api/code-generation/*`).

---

## 4. Dormant / abandoned code

| Item | Evidence | Notes |
|---|---|---|
| VoxCPM2 TTS | `services/modal-media/voxcpm2_tts.py` + env `VOXCPM2_TTS_URL` (still in `.env.example:133`) | Removed from voice pipeline; no code path uses it. |
| v3.5 Flux image | `image_generate_flux_dev_v35.py`, `train_holly_v35_flux.py`, `services/modal-training/*` | FAILED July 14; never deployed. Training scripts (v3.0-v3.5) are historical. |
| Cloud LLM cascades | `MODEL_CATALOGUE` entries for OpenRouter/NVIDIA/Together/Mistral/Google/Arcee | Tombstoned by design (kept for documentation/escape-hatch). |
| holly-lora-v1 (LLM) | `holly-own:qwen3-8b` in catalogue, not in waterfalls | "Too weak"; Phase U3 blocked by Steve. |
| Holly-Realism-Klein9b LoRA (Civitai) | documented in FACT.md | Causes hand deformation on Civitai; abandoned. |
| `deploy_holly.py` (legacy 8b) | `services/fine-tuning/` | Superseded by brain-v35. |

---

## 5. Stale / inconsistent configuration

| Item | Issue |
|---|---|
| `.env.example` Modal media URLs | Point to `iamhollywoodpro--*`; production uses `iamdoregosteve--*` (FACT.md). Anyone copying `.env.example` gets wrong workspace. |
| `.env.example` voice section | Documents VoxCPM2 as "PRIMARY" (`:119`) — it's been removed. Misleads new setup. |
| `MODAL_VIDEO_URL` comment | Says "Wan2.2-TI2V-5B"; actual endpoint runs CogVideoX-5B. |
| `HOLLY_VISION_MODEL_URL` | Referenced in `free-providers.ts:653` but **absent from `.env.example`**. |
| `ARCEE_API_KEY` / `ARCEE_BASE_URL` | Provider adapter exists, no `.env.example` entry. |
| `SUNO_BASE_URL` | In `.env.example:51` but route hardcodes `https://api.sunoapi.org` (`music/generate/route.ts:11`) — unused. |
| ESLint config | v9/flat-config incompatibility — lint doesn't run (`next lint` fails, CI tolerates with `\|\| true`). |

---

## 6. Inconsistencies that aren't dead code but increase maintenance cost
- **Creator identity duplication:** hardcoded emails/names in `auth.ts` AND `CREATOR_USER_ID` default in `holly-self-awareness.ts:39` AND env overrides AND DB persistent flag — 5 layers, inconsistent.
- **Two CF env var formats:** `CF_ACCOUNT_ID`+`CF_AI_TOKEN` (legacy `providers/index.ts`) vs combined `CF_ACCOUNT_ID_CF_AI_TOKEN` (`free-providers.ts`).
- **`autoInstalled` flag** on `UserExtension` — column exists, never set true by any code path (handover §14.10).
- **Admin page placeholder** — `/admin` shows "Under Construction"; real dashboards at `/dashboard/*`.

---

## 7. Summary of cleanup opportunities (by impact)

| Priority | Candidate | Risk |
|---|---|---|
| High value, low risk | Remove 7 stub routes (or implement them) | Low — superseded |
| High value, low risk | Fix `.env.example` stale URLs + voice section | Low — docs only |
| Medium | Consolidate 2 logger systems → 1 | Medium — many importers |
| Medium | Consolidate 2 plugin systems | Medium — both have users (routes) |
| Medium | Remove dead `GitHubIntegration` model | Low — 0 refs (verify empty table) |
| Medium | Drop 39 zero-reference models | Medium — verify each is truly empty in prod DB first |
| Medium | Consolidate conversation APIs | Medium — `/api/chat` doesn't use either |
| Low | Delete VoxCPM2 + v3.5 Flux files | Low — dormant; keep for reference if desired |
| Low | Fix ESLint v9 config | Low — tooling |

**No deletions performed.** All candidates require Steve's approval and verification of prod DB state before removal.
