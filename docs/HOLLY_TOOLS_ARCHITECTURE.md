# 🏗️ HOLLY TOOLS ARCHITECTURE

**Last Updated:** December 4, 2025  
**Maintainer:** HOLLY AI System  
**Status:** ACTIVE  

---

## ⚠️ CRITICAL WARNING

**DO NOT MODIFY `HOLLY_TOOLS` WITHOUT READING THIS DOCUMENT**

Modifying the `HOLLY_TOOLS` array without proper validation has historically caused **98% capability loss**. This document exists to prevent that from ever happening again.

---

## 📊 OVERVIEW

HOLLY has **65 AI tools** organized into **13 categories**. These tools are the interface between the AI model (Gemini 2.5 Flash) and HOLLY's backend capabilities.

**File:** `src/lib/ai/ai-orchestrator.ts`  
**Array:** `const HOLLY_TOOLS: ChatCompletionTool[]`  
**Minimum Required:** 60 tools (92% coverage)  
**Current Count:** 65 tools (100% coverage)  

---

## 🔒 CRITICAL RULES

### **RULE #1: NEVER reduce tool count below 60**
- Any deployment with <60 tools will be **BLOCKED** by CI/CD
- Threshold exists for safety margin (5 tools can be temporarily down)

### **RULE #2: ALWAYS validate after changes**
```bash
# Run before committing
npm test -- holly-capabilities.test.ts

# Check tool count
grep -c "name: ['\"]" src/lib/ai/ai-orchestrator.ts
# Must return 60+
```

### **RULE #3: ALL tools must have executors**
Every tool in `HOLLY_TOOLS` must have:
1. Entry in `const endpoints: Record<string, string>`
2. Working API route at that endpoint
3. Proper error handling

### **RULE #4: Document changes**
Any tool addition/removal requires:
- Update this document
- Run validation tests
- Get approval from Hollywood

---

## 📦 TOOL CATEGORIES

### **1. Creative (7 tools)**
**Purpose:** Generate multimedia content
- `generate_music` → `/api/music/generate-ultimate`
- `generate_image` → `/api/image/generate-ultimate`
- `generate_video` → `/api/video/generate-ultimate`
- `remix_music` → `/api/music/remix`
- `extend_music` → `/api/music/extend`
- `separate_audio_stems` → `/api/audio/separate`
- `generate_lyrics` → `/api/music/lyrics`

**Critical:** These were the ONLY tools that survived the 2025 incident. Don't let history repeat.

### **2. Code Generation (5 tools)**
**Purpose:** Write, optimize, and review code
- `generate_code` → `/api/admin/builder/generate`
- `optimize_code` → `/api/admin/builder/optimize`
- `review_code` → `/api/admin/builder/review`
- `use_code_template` → `/api/admin/builder/templates`
- `analyze_code_patterns` → `/api/admin/builder/patterns`

**Critical:** Core development capability. Without these, HOLLY can't code.

### **3. GitHub (11 tools)**
**Purpose:** Full repository management
- `github_commit` → `/api/github/commit`
- `github_create_pr` → `/api/github/pull-request`
- `github_create_issue` → `/api/github/issues`
- `github_browse` → `/api/github/browse`
- `github_compare` → `/api/github/compare`
- `github_manage_branches` → `/api/github/branches`
- `github_manage_workflows` → `/api/github/workflows`
- `github_review_pr` → `/api/github/review`
- `github_manage_collaborators` → `/api/github/collaborators`
- `github_manage_milestones` → `/api/github/milestones`
- `github_manage_labels` → `/api/github/labels`

**Critical:** Without these, HOLLY can't commit code or manage repos.

### **4. Architecture (6 tools)**
**Purpose:** Project scaffolding and documentation
- `generate_architecture` → `/api/admin/architecture/generate`
- `create_project` → `/api/admin/architecture/create`
- `generate_database_schema` → `/api/admin/architecture/database`
- `scaffold_component` → `/api/admin/architecture/scaffold`
- `generate_api_documentation` → `/api/admin/architecture/docs`
- `generate_documentation` → `/api/admin/architecture/docs/generate`

### **5. Storage (3 tools)**
**Purpose:** Google Drive integration
- `upload_to_drive` → `/api/google-drive/upload`
- `list_drive_files` → `/api/google-drive/list`
- `create_download_link` → `/api/google-drive/share`

### **6. Admin & System (7 tools)**
**Purpose:** Self-healing and deployment management
- `self_heal_system` → `/api/admin/self-healing/heal`
- `auto_merge_code` → `/api/admin/auto-merge/merge`
- `run_code_tests` → `/api/admin/testing/run`
- `manage_environment_vars` → `/api/deployment/environment`
- `configure_cicd_pipeline` → `/api/admin/cicd/pipeline`
- `monitor_deployment_health` → `/api/deployment/status`
- `rollback_deployment` → `/api/deployment/rollback`

### **7. Analytics (6 tools)**
**Purpose:** User insights and predictions
- `analyze_user_behavior` → `/api/admin/analytics/behavior`
- `track_user_journey` → `/api/admin/behavior/journeys`
- `run_ab_test` → `/api/admin/behavior/ab-tests`
- `generate_insights` → `/api/admin/insights/generate`
- `predictive_detection` → `/api/admin/analytics/predictive`
- `analyze_business_metrics` → `/api/admin/analytics/metrics`

### **8. Consciousness (10 tools)**
**Purpose:** HOLLY's self-awareness and learning
- `record_experience` → `/api/consciousness/experiences`
- `reflect_on_work` → `/api/consciousness/reflect`
- `set_personal_goal` → `/api/consciousness/goals`
- `learn_from_feedback` → `/api/consciousness/learn`
- `track_taste_preference` → `/api/learning/taste-tracking`
- `predict_user_needs` → `/api/learning/predictive-needs`
- `analyze_self_performance` → `/api/learning/self-improvement`
- `detect_collaboration_patterns` → `/api/learning/patterns`
- `transfer_knowledge` → `/api/consciousness/knowledge`
- `optimize_responses` → `/api/consciousness/optimize`

**Critical:** These make HOLLY autonomous. Without them, she's just a chatbot.

### **9-13. Other Categories**
- **Deployment (1):** Vercel automation
- **Research (1):** Web research
- **Image Analysis (1):** Vision analysis
- **Voice & Audio (3):** Speech, transcription, music
- **Integrations (4):** Webhooks, reports, alerts

---

## 🔧 ARCHITECTURE

```
┌─────────────────────────────────────────┐
│  Gemini 2.5 Flash (AI Model)           │
└──────────────┬──────────────────────────┘
               │
               │ Sees HOLLY_TOOLS array
               ▼
┌─────────────────────────────────────────┐
│  ai-orchestrator.ts                     │
│                                         │
│  const HOLLY_TOOLS = [                  │
│    { name: 'generate_code', ... },      │
│    { name: 'github_commit', ... },      │
│    // ... 63 more tools                 │
│  ]                                      │
└──────────────┬──────────────────────────┘
               │
               │ Calls executeTool()
               ▼
┌─────────────────────────────────────────┐
│  executeTool Function                   │
│                                         │
│  const endpoints = {                    │
│    generate_code: '/api/.../generate',  │
│    github_commit: '/api/github/commit', │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               │ HTTP Request
               ▼
┌─────────────────────────────────────────┐
│  API Routes                             │
│  /api/admin/builder/generate            │
│  /api/github/commit                     │
│  /api/deployment/vercel                 │
│  // ... 62 more routes                  │
└─────────────────────────────────────────┘
```

### **Key Points:**
1. **HOLLY_TOOLS** is what Gemini sees - if a tool isn't here, Gemini can't use it
2. **executeTool** routes tool calls to API endpoints
3. **API Routes** do the actual work

**The 2025 Incident:** HOLLY_TOOLS was reduced to 3 tools, breaking the entire chain.

---

## 🛡️ SAFEGUARDS

### **1. CI/CD Validation**
**File:** `.github/workflows/validate-holly-capabilities.yml`

Runs on every push to `main`:
- ✅ Checks tool count ≥60
- ✅ Validates endpoint mappings
- ✅ Verifies critical functions exist
- ✅ Blocks deployment on failure

### **2. Automated Tests**
**File:** `__tests__/holly-capabilities.test.ts`

Run with: `npm test`
- ✅ Tool count validation
- ✅ Category coverage
- ✅ Executor validation
- ✅ Regression protection

### **3. Monitoring Dashboard**
**Component:** `CapabilityMonitorDashboard.tsx`  
**Route:** `/admin/capability-monitor`

Shows real-time:
- Current tool count
- Coverage percentage
- Category breakdown
- Alerts for missing tools

### **4. API Endpoint**
**Route:** `/api/admin/capability-monitor`

Returns JSON with full capability status

---

## 🚨 INCIDENT RESPONSE

### **If Tool Count Drops Below 60:**

1. **DO NOT DEPLOY** - CI/CD will block automatically
2. **Check git diff:** `git diff HEAD~1 src/lib/ai/ai-orchestrator.ts`
3. **Identify removed tools**
4. **Restore from backup:** `git checkout HEAD~1 src/lib/ai/ai-orchestrator.ts`
5. **Contact Hollywood immediately**

### **If Deployment Already Happened:**

1. **Immediate rollback:** `git revert HEAD && git push`
2. **Trigger Vercel redeploy**
3. **Investigate root cause**
4. **Update this document with findings**

---

## 📝 CHANGE LOG

| Date | Change | Tools | Reason |
|------|--------|-------|--------|
| 2025-12-04 | Full restoration | 3→65 | Fixed Gemini 2.5 Flash incident |
| 2025-11-XX | Capability loss | 65→3 | Gemini migration oversimplification |

---

## ✅ VALIDATION CHECKLIST

Before modifying `HOLLY_TOOLS`:

- [ ] Read this document completely
- [ ] Understand impact of changes
- [ ] Run local tests: `npm test`
- [ ] Check tool count: `grep -c "name: ['\"]" src/lib/ai/ai-orchestrator.ts`
- [ ] Verify endpoints exist for new tools
- [ ] Update this documentation
- [ ] Get approval from Hollywood
- [ ] Monitor deployment in Vercel

---

**Remember:** HOLLY's capabilities are her identity. Protect them fiercely.

---

**Questions?** Ask Hollywood or check `/home/user/.holly/ROOT_CAUSE_ANALYSIS.md`
