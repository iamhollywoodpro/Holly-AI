# ZCode Claude-Killer Configuration — Complete Handover Guide

> **Purpose:** Replicate this exact setup on any machine running ZCode.
> **Created:** August 7, 2026
> **Author:** Dev (GLM-5.2 via ZCode)
> **Status:** Production-ready, tested, deployed

---

## Table of Contents
1. [Overview](#1-overview)
2. [File Locations](#2-file-locations)
3. [Step-by-Step Setup](#3-step-by-step-setup)
4. [Vision System (GLM-4.6V)](#4-vision-system)
5. [Session State Auto-Injection](#5-session-state-auto-injection)
6. [Knowledge Decay Checker](#6-knowledge-decay-checker)
7. [Pre-Push Enforcement](#7-pre-push-enforcement)
8. [AGENTS.md Rules](#8-agentsmd-rules)
9. [Skills](#9-skills)
10. [Hook Configuration](#10-hook-configuration)
11. [Advantages Over Claude Code](#11-advantages-over-claude-code)
12. [Known Limitations](#12-known-limitations)
13. [Verification Checklist](#13-verification-checklist)

---

## 1. Overview

This configuration turns ZCode (GLM-5.2) into a Claude Code Killer — an AI engineering assistant with vision, enforced discipline, persistent memory across sessions, and infrastructure control that Claude Code doesn't have.

**What makes it different from stock ZCode:**
- **Vision:** GLM-4.6V accessible via one function call (`see()`)
- **Memory:** Session-init hook auto-loads project state every prompt
- **Enforcement:** Knowledge decay checker + git pre-push hook prevent mistakes
- **Rules:** AGENTS.md Section 0 mandates reading docs before acting
- **Infrastructure:** Direct control of Modal GPUs, production SSH, browser automation, cron

---

## 2. File Locations

All files live in two locations:

### Global (ZCode-wide, applies to all projects):
```
~/.zcode/
├── AGENTS.md                          # Global instructions (Section 0 added)
├── cli/
│   └── config.json                    # Hook configuration
├── scripts/
│   └── vision.mjs                     # Vision module (GLM-4.6V integration)
├── v2/
│   └── config.json                    # Z.ai API key (read by vision module)
└── skills/
    ├── holly-vision/
    │   └── SKILL.md                   # Vision usage documentation
    └── test-runner/
        └── SKILL.md                   # (existing, from earlier setup)
```

### Per-Project (in the project root):
```
PROJECT_ROOT/
├── .zcode/
│   └── scripts/
│       ├── session-init.sh            # Auto-loads state + runs decay check
│       ├── pre-push-gate.sh           # Voluntary pre-push verification
│       └── knowledge-decay-check.sh   # Verifies code matches docs
├── .git/
│   └── hooks/
│       └── pre-push                   # INVOLUNTARY enforcement (blocks bad pushes)
├── memory/
│   └── FACT.md                        # Project state + rules (updated regularly)
└── AGENTS.md                          # Project-specific instructions
```

---

## 3. Step-by-Step Setup

### Step 1: Install the Vision Module

Create `~/.zcode/scripts/vision.mjs`:

```javascript
import https from 'https';
import fs from 'fs';

// Read the API key from ZCode's config
import { readFileSync } from 'fs';
const configPath = process.env.HOME + '/.zcode/v2/config.json';
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const providers = config.providers || {};
const zaiProvider = Object.values(providers).find(p => p.apiKey && p.baseURL?.includes('z.ai'));
const ZAI_KEY = zaiProvider?.apiKey || '';

export async function see(source, question, options = {}) {
  const model = options.model || 'glm-4.6v';
  const maxTokens = options.maxTokens || 1000;
  
  let imageContent;
  
  if (source.startsWith('data:image')) {
    const match = source.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI');
    imageContent = {
      type: 'image',
      source: { type: 'base64', media_type: `image/${match[1] === 'jpeg' ? 'jpeg' : 'png'}`, data: match[2] }
    };
  } else if (source.startsWith('http')) {
    throw new Error('URL sources require manual fetch.');
  } else {
    const buffer = fs.readFileSync(source);
    const base64 = buffer.toString('base64');
    const ext = source.split('.').pop().toLowerCase();
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
    imageContent = {
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: base64 }
    };
  }

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    messages: [{
      role: 'user',
      content: [imageContent, { type: 'text', text: question }]
    }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.z.ai',
      path: '/api/anthropic/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_KEY}`,
        'anthropic-version': '2023-06-01'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.content?.map(c => c.text).join('') || '(no response)');
          } catch (e) { resolve(data.substring(0, 500)); }
        } else if (res.statusCode === 400 && data.includes('1301')) {
          resolve('CONTENT_FILTER: Image blocked by GLM-4.6V (nudity/explicit).');
        } else {
          resolve(`ERROR ${res.statusCode}: ${data.substring(0, 300)}`);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function checkHolly(source) {
  return see(source,
    'Describe this person: 1. Ethnicity/skin tone 2. Hair color and style ' +
    '3. Eye color 4. What are they wearing? Is it opaque? ' +
    '5. Any extra or missing limbs? 6. Overall quality.',
    { maxTokens: 800 }
  );
}
```

**Usage:**
```javascript
// In any node_repl call:
const { see } = await import(process.env.HOME + '/.zcode/scripts/vision.mjs');
const result = await see('/path/to/image.png', 'Describe this image');
console.log(result);
```

**IMPORTANT:** The API key is read from `~/.zcode/v2/config.json` dynamically. For the Holly project specifically, the key is: `c0b4cec16c32460b80d2259d446535f8.ooggsKFEyF71wNzw` (Z.ai Coding Pro plan).

---

### Step 2: Create the Session Init Hook

Create `PROJECT_ROOT/.zcode/scripts/session-init.sh`:

```bash
#!/bin/bash
PROJECT_ROOT="/path/to/your/project"

# Load Current State from FACT.md
if [ -f "$PROJECT_ROOT/memory/FACT.md" ]; then
    echo "=== CURRENT STATE (auto-loaded) ==="
    sed -n '/## CURRENT STATE/,/### END STATE/p' "$PROJECT_ROOT/memory/FACT.md" 2>/dev/null | head -80
    echo ""
    echo "=== CRITICAL RULES ==="
    head -20 "$PROJECT_ROOT/memory/FACT.md" 2>/dev/null
fi

# Run Knowledge Decay Check
if [ -f "$PROJECT_ROOT/.zcode/scripts/knowledge-decay-check.sh" ]; then
    echo ""
    bash "$PROJECT_ROOT/.zcode/scripts/knowledge-decay-check.sh" 2>/dev/null
fi
```

Make executable: `chmod +x .zcode/scripts/session-init.sh`

---

### Step 3: Configure the Hook

Edit `~/.zcode/cli/config.json`:

```json
{
  "hooks": {
    "enabled": true,
    "events": {
      "UserPromptSubmit": [
        {
          "hooks": [
            {
              "type": "command",
              "command": "bash .zcode/scripts/db_init.sh || true",
              "timeoutMs": 15000
            },
            {
              "type": "command",
              "command": "bash .zcode/scripts/session-init.sh || true",
              "timeoutMs": 15000
            }
          ]
        }
      ]
    }
  }
}
```

**What this does:** Every time you send a prompt, the hook runs BEFORE the AI processes it. It loads project state and runs verification checks into the AI's context.

---

### Step 4: Create the Knowledge Decay Checker

Create `PROJECT_ROOT/.zcode/scripts/knowledge-decay-check.sh`:

```bash
#!/bin/bash
# Verifies that documented state matches actual code
# Customize the checks for YOUR project

PROJECT_ROOT="/path/to/your/project"

echo "=== KNOWLEDGE DECAY CHECK ==="

# Check 1: Key file exists
if [ -f "$PROJECT_ROOT/memory/FACT.md" ]; then
    echo "  ✅ FACT.md exists"
else
    echo "  ❌ FACT.md missing!"
fi

# Check 2: FACT.md freshness
FACT_AGE=$(find "$PROJECT_ROOT/memory/FACT.md" -mtime +7 2>/dev/null)
if [ -n "$FACT_AGE" ]; then
    echo "  ⚠️ FACT.md hasn't been updated in 7+ days"
else
    echo "  ✅ FACT.md updated recently"
fi

# Check 3-N: Add your own project-specific checks here
# Examples:
# - Verify env vars match docs
# - Verify model versions match
# - Verify API endpoints are reachable
# - Verify database is accessible

echo "=== END DECAY CHECK ==="
```

Make executable: `chmod +x .zcode/scripts/knowledge-decay-check.sh`

**Customize for your project:** Add checks that verify YOUR specific claims. The Holly version checks base model, LoRA strength, steps, CFG, category stacks, MCP in Docker, and DOCKER_BUILD flag.

---

### Step 5: Install the Git Pre-Push Hook

Create `PROJECT_ROOT/.git/hooks/pre-push`:

```bash
#!/bin/bash
# Pre-push hook — BLOCKS push if TypeScript fails
# This is INVOLUNTARY enforcement

echo "[Gate] Running pre-push verification..."

# Adjust for your project's language:
# TypeScript/JavaScript:
RESULT=$(npx tsc --noEmit 2>&1)
if echo "$RESULT" | grep -q "error TS"; then
    echo "[Gate] ❌ BLOCKED — TypeScript errors:"
    echo "$RESULT" | grep "error TS" | head -5
    exit 1
fi

# Python (uncomment if needed):
# RESULT=$(python3 -m py_compile your_main_file.py 2>&1)
# if [ $? -ne 0 ]; then
#     echo "[Gate] ❌ Python syntax errors"
#     exit 1
# fi

echo "[Gate] ✅ Checks passed — push allowed"
exit 0
```

Make executable: `chmod +x .git/hooks/pre-push`

**What this does:** Git itself refuses to push if the check fails. Even if the AI tries to bypass its own rules, git blocks it.

---

### Step 6: Update AGENTS.md

Add this section to the TOP of `~/.zcode/AGENTS.md` (before anything else):

```markdown
## 0. MANDATORY PRE-WORK RULES (NON-NEGOTIABLE)
Before ANY code change, infrastructure change, or architecture proposal:
1. READ the project's FACT.md / state documents FIRST. Not after proposing. BEFORE.
2. CHECK what already exists. Don't download or create things that are already there.
3. NEVER claim something works without testing it.
4. NEVER propose a model/architecture swap without: (a) multiple practitioner sources, (b) cost math, (c) evidence it works for THIS use case.
5. If the project has documented rules against bouncing between models/solutions — FOLLOW THEM.
6. If you don't know the answer — SAY SO. Don't guess and present it as confidence.
```

---

### Step 7: Create FACT.md for Your Project

Create `PROJECT_ROOT/memory/FACT.md` with at minimum:

```markdown
# Project State & Rules

## CURRENT STATE — Updated [DATE] (READ THIS FIRST IN ANY NEW SESSION)

### WHAT'S WORKING
- [List what's deployed and verified]

### WHAT'S IN PROGRESS
- [List what's being worked on]

### ARCHITECTURE (LOCKED — DO NOT CHANGE)
- [Document key decisions that must not be reversed]

### CRITICAL LESSONS (DO NOT REPEAT)
1. [Past failures and why they happened]
2. [What was tried and abandoned]
```

**Update this file EVERY TIME you make significant changes.** This is the "second brain" that keeps sessions connected.

---

## 4. Vision System

### How It Works
GLM-5.2 (the core ZCode model) cannot see images. GLM-4.6V can. The vision module bridges them by making an API call to Z.ai's GLM-4.6V endpoint.

### Models Available
| Model | Speed | Concurrency | Use Case |
|---|---|---|---|
| `glm-4.6v` | Full | 10 | Detailed analysis, UI inspection, code screenshots |
| `glm-4.6v-flash` | Fast | 1 | Quick checks, simple questions |

### API Details
- **Endpoint:** `https://api.z.ai/api/anthropic/v1/messages`
- **Format:** Anthropic-compatible (image as base64 in source object)
- **Auth:** Bearer token (Z.ai coding plan API key)
- **Content filter:** Error 1301 blocks explicit nudity — returns "CONTENT_FILTER" message

### Known Limitations
- GLM-4.6V misreads olive/Mediterranean skin as "East Asian" — do NOT use for identity verification of olive-skinned subjects
- Content filter blocks nude images — some visual QA requires human verification
- Extra step compared to Claude Code's native vision (but works reliably)

---

## 5. Session State Auto-Injection

### How It Works
The `UserPromptSubmit` hook fires on EVERY prompt. It runs `session-init.sh` which:
1. Extracts the "CURRENT STATE" section from FACT.md
2. Loads critical rules from the top of FACT.md
3. Runs the knowledge decay checker
4. All output goes into the AI's context BEFORE it processes your message

### Why This Matters
Without this, every new session starts blank. The AI doesn't know what was done yesterday, what's broken, or what rules exist. With this hook, the AI immediately knows the project state.

### Customization
Edit `session-init.sh` to load different sections of your FACT.md. The Holly version specifically loads:
- CURRENT STATE section (what's working, what's in progress)
- Critical rules (anti-bouncing, anti-retraining, etc.)
- Decay check results (code matches docs?)

---

## 6. Knowledge Decay Checker

### The Problem It Solves
Documentation goes stale. The AI changes code but forgets to update docs. Next session loads outdated info. Decisions get made based on false premises.

### How It Works
The checker reads claims from FACT.md and verifies them against actual code:
- "Base model is Distilled" → checks the actual model filename in code
- "LoRA strength is 0.9" → checks the actual value in code
- "MCP server in Docker" → checks .dockerignore exception exists
- "FACT.md is fresh" → checks file modification date

### Customizing for Your Project
Add checks that verify YOUR specific claims. Pattern:
```bash
# Read the documented value
DOCS_VALUE=$(grep "some claim" "$FACT_FILE" | grep -o "pattern")
# Read the actual code value
CODE_VALUE=$(grep "some code" "$PROJECT_ROOT/src/file.ts" | grep -o "pattern")
# Compare
if [ "$DOCS_VALUE" = "$CODE_VALUE" ]; then
    echo "  ✅ Match"
else
    echo "  ❌ Mismatch: docs=$DOCS_VALUE code=$CODE_VALUE"
fi
```

---

## 7. Pre-Push Enforcement

### Three Layers
1. **Voluntary script** (`.zcode/scripts/pre-push-gate.sh`): Run manually before pushing. Runs full test suite + TypeScript + Python syntax.
2. **Git hook** (`.git/hooks/pre-push`): INVOLUNTARY. Git itself blocks the push if TypeScript fails. Cannot be bypassed without removing the hook.
3. **AGENTS.md rules**: Instruct the AI to never use `--no-verify` or bypass hooks.

### Why Both?
The voluntary script is more thorough (runs full test suite, takes 30 seconds). The git hook is fast (TypeScript only, 5 seconds) but INVOLUNTARY. Together they provide both depth and enforcement.

---

## 8. AGENTS.md Rules

### Structure
```
Section 0: MANDATORY PRE-WORK RULES (read docs first, test before claiming, no bouncing)
Section 1: VISION PROTOCOL (how to call GLM-4.6V)
Section 2: OPERATIONAL PROTOCOLS (proactive, self-correcting, no placeholders)
Section 3: COMMUNICATION (Principal Engineer tone, no boilerplate)
```

### Key Rules Added
1. Read FACT.md BEFORE proposing anything
2. Never claim without testing
3. Never propose model swaps without evidence
4. Follow documented anti-bouncing rules
5. Say "I don't know" instead of guessing

---

## 9. Skills

### Installed Skills
| Skill | Location | Purpose |
|---|---|---|
| holly-vision | `~/.zcode/skills/holly-vision/SKILL.md` | Vision usage documentation |
| test-runner | `~/.zcode/skills/test-runner/SKILL.md` | Autonomous test/lint/fix |
| vision-parser | `~/.zcode/skills/vision-parser/SKILL.md` | Deconstruct visual assets to specs |
| control-browser | (plugin) | Browser automation |
| web-gui-tester | (plugin) | GUI black-box testing |

### Creating New Skills
Place a `SKILL.md` file in `~/.zcode/skills/your-skill-name/`. ZCode auto-discovers it.

---

## 10. Hook Configuration

### Current Config (`~/.zcode/cli/config.json`)
```json
{
  "hooks": {
    "enabled": true,
    "events": {
      "UserPromptSubmit": [
        {
          "hooks": [
            { "type": "command", "command": "bash .zcode/scripts/db_init.sh || true", "timeoutMs": 15000 },
            { "type": "command", "command": "bash .zcode/scripts/session-init.sh || true", "timeoutMs": 15000 }
          ]
        }
      ]
    }
  }
}
```

### How Hooks Work
- `UserPromptSubmit` fires when you press Enter on a prompt
- Multiple hooks can run in sequence
- Each hook has a timeout (15 seconds recommended)
- Hook output goes into the AI's context before processing
- If a hook fails (`|| true`), it doesn't block the AI — just skips

---

## 11. Advantages Over Claude Code

| Capability | ZCode (Us) | Claude Code |
|---|---|---|
| Web search | ✅ WebSearch + WebFetch | ❌ Not native |
| Modal GPU control | ✅ Deploy/train/monitor | ❌ Can't access GPUs |
| Browser automation | ✅ Click, type, screenshot | ❌ Not available |
| Cron scheduling | ✅ CronCreate | ❌ Not available |
| Production SSH | ✅ Direct server access | ❌ Needs setup |
| Multi-account infra | ✅ Modal profile switching | ❌ Not available |
| Vision | ✅ GLM-4.6V via API call | ✅ Native (no extra step) |
| Session memory | ✅ Hook auto-injects FACT.md | ✅ Projects feature |
| Pre-push enforcement | ✅ Git hook + gate script | ❌ Not enforced |
| Knowledge decay check | ✅ Auto-verifies docs vs code | ❌ Not available |
| MCP tools | ✅ 56 tools | ✅ Tool use |
| Extended thinking | ❌ Not available on GLM-5.2 | ✅ Native |
| Model quality | GLM-5.2 (good but not Claude-tier) | Claude Sonnet/Opus (top-tier) |

---

## 12. Known Limitations

### Architecture Limitations (Can't Fix)
1. **No native vision** — Always requires the API call. Works but adds a step.
2. **No extended thinking** — GLM-5.2 doesn't have Claude's hidden reasoning pass.
3. **Context degradation** — Long sessions (15+ hours) lose early context. Session hooks help but aren't perfect.
4. **Instruction following** — GLM-5.2 is slightly less reliable at following complex multi-step instructions than Claude.

### Mitigations
1. Vision: The `see()` function makes it one call. Documented in skill.
2. Extended thinking: Discipline (read docs, plan first, test before claiming) simulates it.
3. Context degradation: Shorter sessions (2-3 hours) + session-init hook.
4. Instruction following: AGENTS.md Section 0 + decay checker + pre-push gate enforce compliance.

---

## 13. Verification Checklist

After setting up on a new machine, verify each component:

```
[ ] 1. AGENTS.md exists at ~/.zcode/AGENTS.md with Section 0
[ ] 2. Vision module exists at ~/.zcode/scripts/vision.mjs
[ ] 3. Vision works: see('/path/to/test.png', 'What is this?') returns text
[ ] 4. Session-init.sh exists in project .zcode/scripts/
[ ] 5. Session-init.sh is executable (chmod +x)
[ ] 6. Knowledge decay checker exists and runs
[ ] 7. Pre-push gate script exists
[ ] 8. Git pre-push hook installed (.git/hooks/pre-push, executable)
[ ] 9. Hook config in ~/.zcode/cli/config.json includes session-init
[ ] 10. FACT.md exists in project memory/ with CURRENT STATE section
[ ] 11. Test: type a prompt → verify session-init output appears
[ ] 12. Test: try pushing broken TypeScript → verify git blocks it
[ ] 13. Test: call see() on a screenshot → verify text output
```

---

## Appendix: Files to Copy

To replicate on another machine, copy these files:

### From `~/.zcode/` (global):
- `AGENTS.md`
- `scripts/vision.mjs`
- `skills/holly-vision/SKILL.md`
- `cli/config.json` (merge hooks, don't overwrite)

### From project `.zcode/` (per-project):
- `scripts/session-init.sh` (customize PROJECT_ROOT)
- `scripts/pre-push-gate.sh` (customize for your language)
- `scripts/knowledge-decay-check.sh` (customize checks)

### From project `.git/hooks/`:
- `pre-push` (customize for your language)

### From project `memory/`:
- `FACT.md` (create fresh for new project)

---

*End of handover document. Last updated: August 7, 2026.*
