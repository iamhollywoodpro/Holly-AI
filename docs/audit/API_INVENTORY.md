# API_INVENTORY — Route Census
**Date:** 2026-07-14 · Read-only audit.

**Totals:** 539 route files (`app/api/**/route.ts`). ~525 production logic, 7 confirmed stubs, 0 shims/dormant-empty, ~7 image-gen routes that overlap.

## Authentication distribution (verified by grep)
| Auth type | Routes | Notes |
|---|---|---|
| Clerk `auth()` / `currentUser()` | 443 | dominant |
| `authenticateAndLoadUser` | 3 | `chat`, `relationship`, `auth/verify-age` |
| `requireAdult` (18+ gate) | 5 | `image/{generate,generate-multi,generate-ultimate}`, `multimodal/generate`, `extensions/install` |
| `isCreator` inline check | 7 | chat, health/chat, image/*, multimodal, self-code, verify-age |
| `CRON_SECRET` | 23 | all `cron/*` + several `autonomy/*`, `background-learning`, etc. |
| `INTERNAL_API_SECRET` | 10 | `hub/*`, `audio/analyze`, `aura/analyze`, `deploy/trigger`, `self-code` |
| **Public / no auth** | ~20 | OAuth callbacks, webhooks (signature-verified), **+ `admin/architecture/*` cluster (trusts body.userId — SECURITY FINDING)** |

---

## Critical routes (the ones that matter most)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/chat` | POST | auth+requireAdult+isCreator | Main Holly chat (1783 lines), SSE streaming, image-gen, intimacy gate |
| `/api/health` | GET | CRON_SECRET | Health check w/ deploySha |
| `/api/image/generate-ultimate` | POST | requireAdult+isCreator | Canonical image gen |
| `/api/multimodal/generate` | POST | requireAdult+isCreator | Unified image/video |
| `/api/voice/synthesize` | POST | Clerk | TTS |
| `/api/video/generate-ultimate` | POST | Clerk | Video gen |
| `/api/conversations/[id]/messages` | GET/POST | Clerk | Message CRUD |
| `/api/extensions/{list,installed,install,uninstall}` | GET/POST | Clerk (+requireAdult on install) | Marketplace |
| `/api/cron/consciousness-loop` | GET/POST | CRON_SECRET | Hourly consciousness cycle |
| `/api/webhooks/clerk` | POST | Svix sig | Creates User on signup |
| `/api/webhooks/github` | POST/GET | sig (weak default secret) | Self-healing triggers |
| `/api/self-code` | GET/POST | INTERNAL_API_SECRET+isCreator | **Exploitable** — see SECURITY_FINDINGS.md |
| `/api/admin/migrate` | POST | Clerk + hardcoded `'HOLLY-DEPLOY-2024'` | Runs `prisma migrate` |

---

## Routes by domain (full list grouped)

### Chat & Conversations
- `/api/chat`
- `/api/conversations` (list/create), `/[id]` (CRUD), `/[id]/messages`, `/[id]/pin`, `/[id]/unpin`, `/[id]/summarize`, `/generate-title`, `/sync`, `/summarize` (**stub**), `/cleanup`
- `/api/backup/conversations`
- `/api/interaction/conversation`, `/conversations`, `/[id]`, `/[id]/context`, `/[id]/message` (overlapping second API — see DEAD_CODE_CANDIDATES.md)
- `/api/synthesis`, `/api/suggestions/generate` (**stub**)
- `/api/onboarding/{start,status,message}`

### Image (11 overlapping routes)
`/api/image/{generate,generate-ultimate,generate-multi}`, `/api/creative/image/{generate,[id]/regenerate,[id]/status}`, `/api/creative/images`, `/api/media/generate-image`, `/api/artists/generate-image`, `/api/admin/creative/image`, `/api/moderation/image`

### Video
`/api/video/{generate,generate-ultimate,generate-multi}`, `/api/media/{generate-video,music-video}`, `/api/multimodal/{music-video,status}`, `/api/admin/creative/video`

### Voice / Audio / Music
- Voice: `/api/voice/{synthesize,stream,stream-tts,batch,command,room,livekit,pipeline,personality,transcribe}`
- Audio: `/api/audio/{analyze,analyze-advanced,transcribe,stem-separate,stem-status,holly-analyze}`
- Music: `/api/music/{generate,extend,generate-lyrics,generate-cover,hybrid-studio,sonauto,callback,status}`, `/api/music-manager/email`
- AURA: `/api/aura/{analyze,aura-analyze,status/[jobId],result/[jobId]}`, `/api/hub/aura/*`

### Memory / Knowledge / Consciousness
`/api/memory`, `/api/memory/{semantic,export,import,migrate-pgvector}`, `/api/intelligence/{knowledge,learning,prediction,task,graph}/*`, `/api/consciousness/{goals,instance}`, `/api/metamorphosis/*`, `/api/evolution/dashboard`

### Autonomy / Agents / Self-improvement
`/api/autonomous/*` (incl. **stubs**: `goals/set`, `guidance/request`), `/api/autonomy/*`, `/api/agents/*`, `/api/agent/run`, `/api/self-improvement/*`, `/api/self-code`, `/api/self-sovereign`, `/api/goals/*`, `/api/orchestration/*`

### Builder / Code-gen
`/api/builder/*` (16 routes), `/api/code-gen`, `/api/code-generation/{generate,modify,test}`, `/api/code/{generate(**stub**),optimize(**stub**),review(**stub**),analyze-fix,scaffold}`, `/api/sandbox/*`, `/api/system/{file,tools}/*`

### Integrations (OAuth pattern)
GitHub (33 routes), Spotify, SoundCloud, YouTube, Google-Drive, Dropbox, Slack, Notion, Canva, Apple-Music, Instagram, TikTok

### Admin (~44 routes)
`/api/admin/{abtest,alerts,analytics,architecture/*,auto-merge,builder,cicd,cleanup-users,code-review,config/update,creative/*,dashboards,docs,export-training-data,insights,integrations,knowledge,metrics,migrate,model-update,monitoring,notifications,optimize-db,predictive-detection,reports,self-healing,services,sms-test,storage,testing}`

### Cron (11 routes, all CRON_SECRET)
`/api/cron/{collective-intelligence,consciousness-loop,deep-sleep,evolve,identity-evolve,morning-briefing,prewarm(**no auth!**),push-pending,resonance-recalc,study-sessions,tool-discovery}`

### Other
`/api/{feedback,background-learning,study,initiative,proactive,realtime,ui,upload,write,design,projects,project-context,web-agent,download-link,work-log,visual-identity,vision,ar,collective,developer,settings,multimodal,metrics,usage,resources,multi-tenant,emotion}`

---

## Actively-used vs lightly-used

**Most actively used (real logic, central to product):**
- `/api/chat` — the product
- `/api/conversations/*` — persistence layer
- `/api/image/generate-ultimate` — image gen (mobile app calls this)
- `/api/github/*` — 33 routes, real GitHub integration
- `/api/builder/*` — full IDE
- `/api/health` — deploy verification
- `/api/extensions/*` — marketplace foundation

**Lightly used / speculative (large surface, low signal):**
- `/api/admin/*` (44 routes) — many have weak/no auth and likely low traffic
- `/api/autonomous/*`, `/api/orchestration/*` — agent swarm features, uncertain real usage
- `/api/metamorphosis/*`, `/api/evolution/*` — self-awareness dashboards
- `/api/learning/*`, `/api/intelligence/*`, `/api/analytics/*` — analytics/profiling, largely background
- The 11 overlapping image routes — only `/api/image/generate-ultimate` is canonical

---

## Findings
1. **539 routes is a very large surface.** ~80% are real but many serve speculative/Phase-4+ features with thin usage.
2. **Auth is inconsistent.** 14 admin routes trust Clerk `userId` alone (no creator/role gate) — see SECURITY_FINDINGS.md.
3. **`/api/cron/prewarm` has zero auth** — anyone can trigger it.
4. **Stubs are few (7) but notable** — especially `/api/conversations/summarize` (affects long-conversation UX).
5. **Heavy route duplication** in image (11) and code-gen (4 trees) — consolidation candidates.
