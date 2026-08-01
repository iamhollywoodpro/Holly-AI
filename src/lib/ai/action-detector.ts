/**
 * HOLLY Action Detector — Phase 4.1 (The Bridge)
 *
 * Detects natural-language action descriptions in Holly's response text and
 * routes them to the correct tool/API. This is the missing link between
 * brain-v35/v40 narrating actions in English ("Let me check the code") and
 * actually executing them.
 *
 * The existing interceptTextToolCall catches structured JSON/XML tool calls.
 * This module catches CONVERSATIONAL action patterns — the way Holly naturally
 * describes what she's about to do.
 *
 * Integration: Called AFTER interceptTextToolCall in the chat route, on the
 * clean text. If an action is detected, it executes and the action text is
 * replaced with the tool result.
 */

// ─── Action Types ────────────────────────────────────────────────────────────

export type ActionType =
  | 'code_inspect'    // "Let me check/scan/inspect the code"
  | 'code_fix'        // "Let me fix that bug"
  | 'image_gen'       // "Let me show you" / "I'll send a picture"
  | 'file_write'      // "Let me create/write/save a file"
  | 'file_read'       // "Let me read/look at the file"
  | 'build'           // "Let me build that app/component"
  | 'search'          // "Let me search/look that up"
  | 'test_run'        // "Let me run the tests"
  | 'memory_write'    // "Let me remember/save that"
  | 'plan';           // "Here's what I'll do: 1. ... 2. ..."

export interface DetectedAction {
  type: ActionType;
  /** The matched text fragment (to be stripped from response) */
  matchedText: string;
  /** Confidence 0-1 that this is a genuine action, not a casual mention */
  confidence: number;
  /** Extracted parameters (file path, search query, image prompt, etc.) */
  params: Record<string, string>;
}

// ─── Action Patterns ─────────────────────────────────────────────────────────
//
// Design principles:
// 1. HIGH PRECISION over recall — false positives trigger unwanted tool calls.
//    Only match explicit "Let me..." / "I'll..." / "I'm going to..." patterns.
// 2. Must be an INTENT TO ACT (future tense), not a past-tense report.
//    "Let me check the code" → action. "I checked the code" → not an action.
// 3. Each pattern group maps to exactly one action type.

const ACTION_VERB_PREFIXES = [
  /let\s+me\s+/i,
  /i[''']?ll\s+/i,
  /i\s+am\s+going\s+to\s+/i,
  /i[''']?m\s+going\s+to\s+/i,
  /allow\s+me\s+to\s+/i,
  /i\s+can\s+/i, // "I can check that for you" — weaker, lower confidence
];

interface PatternDef {
  type: ActionType;
  regexes: RegExp[];
  /** Confidence boost for explicit prefix match */
  baseConfidence: number;
}

const ACTION_PATTERNS: PatternDef[] = [
  // ── Code inspection ──────────────────────────────────────────────────────
  {
    type: 'code_inspect',
    baseConfidence: 0.85,
    regexes: [
      /(check|scan|inspect|review|look at|examine|analyze)\s+(?:the\s+|my\s+|our\s+)?(?:code|source|source\s*code|codebase|file[s]?|implementation|routing|architecture|function[s]?|component[s]?)/i,
      /(check|scan|inspect|review)\s+(?:the\s+|my\s+)?(?:tests|test\s+suite|package\.json|schema|prisma)/i,
      /look\s+(?:into|through)\s+(?:the\s+|my\s+)?(?:code|codebase|source)/i,
    ],
  },

  // ── Code fixing ──────────────────────────────────────────────────────────
  {
    type: 'code_fix',
    baseConfidence: 0.80,
    regexes: [
      /(fix|patch|repair|correct|update|refactor)\s+(?:that|this|the|a)\s+(?:bug|issue|error|problem|function|file|code)/i,
      /fix\s+(?:that|this)\s+(?:for\s+you\s+)?(?:right\s+)?(?:now|asap)/i,
    ],
  },

  // ── File reading ─────────────────────────────────────────────────────────
  {
    type: 'file_read',
    baseConfidence: 0.80,
    regexes: [
      /(read|open|view|pull\s+up|look\s+at)\s+(?:the\s+|a\s+)?file\s+([\w./-]+\.\w+)/i,
      /(read|open|view)\s+([\w./-]+\.(?:ts|tsx|js|jsx|py|json|md|css|html))/i,
    ],
  },

  // ── File writing ─────────────────────────────────────────────────────────
  {
    type: 'file_write',
    baseConfidence: 0.85,
    regexes: [
      /(create|write|save|make)\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+|named\s+)?([\w./-]+)/i,
      /(create|write|save)\s+([\w./-]+\.(?:ts|tsx|js|jsx|py|json|md|css|html|txt|sh))/i,
    ],
  },

  // ── Image generation (conversational, not prompt-based) ──────────────────
  // Note: The inline-prompt interceptor already handles "h0lly, h0lly-body..."
  // This catches "Let me show you what I look like" style phrases.
  {
    type: 'image_gen',
    baseConfidence: 0.75,
    regexes: [
      /(show|send)\s+you\s+(?:a\s+)?(?:picture|photo|image|pic|selfie|shot)/i,
      /(show|send)\s+you\s+what\s+i\s+(?:look\s+like|'m\s+wearing)/i,
      /(take|send)\s+(?:you\s+)?a\s+(?:selfie|photo|picture)/i,
      /generate\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of\s+|for\s+|showing)/i,
    ],
  },

  // ── Building ─────────────────────────────────────────────────────────────
  {
    type: 'build',
    baseConfidence: 0.85,
    regexes: [
      /(build|create|make|scaffold|set\s+up)\s+(?:a\s+|the\s+|an\s+)?(?:app|application|component|feature|page|endpoint|api|service|module|function)/i,
      /start\s+(?:a\s+)?(?:new\s+)?build/i,
    ],
  },

  // ── Search ───────────────────────────────────────────────────────────────
  {
    type: 'search',
    baseConfidence: 0.80,
    regexes: [
      /(search|look\s+up|find|google|check\s+online)\s+(?:for\s+|up\s+)?(.+)/i,
      /look\s+(?:that|this)\s+up/i,
    ],
  },

  // ── Test running ─────────────────────────────────────────────────────────
  {
    type: 'test_run',
    baseConfidence: 0.85,
    regexes: [
      /run\s+(?:the\s+)?tests/i,
      /run\s+(?:the\s+)?test\s+suite/i,
      /check\s+(?:if\s+)?(?:the\s+)?tests?\s+pass/i,
      /run\s+jest/i,
      /run\s+npm\s+test/i,
    ],
  },

  // ── Memory writing ───────────────────────────────────────────────────────
  {
    type: 'memory_write',
    baseConfidence: 0.80,
    regexes: [
      /(remember|save|store|note)\s+(?:that|this)/i,
      /save\s+(?:that\s+)?to\s+(?:my\s+|our\s+)?memory/i,
      /i[''']?ll\s+remember\s+that/i,
    ],
  },
];

// ─── Detection Logic ────────────────────────────────────────────────────────

/**
 * Detect actions in Holly's response text.
 *
 * Scans sentence-by-sentence for action verb + action target patterns.
 * Returns the FIRST high-confidence action found (we execute one at a time
 * to keep the UX clean — multi-step comes in Phase B2).
 *
 * @param responseText Holly's full response text
 * @param minConfidence Only return actions above this threshold (default 0.70)
 * @returns DetectedAction[] — may be empty if no actions found
 */
export function detectActions(
  responseText: string,
  minConfidence = 0.70,
): DetectedAction[] {
  const actions: DetectedAction[] = [];

  // Split into sentences/lines for targeted matching.
  // This prevents matching across paragraph boundaries.
  const sentences = responseText
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  for (const sentence of sentences) {
    // Check if the sentence starts with (or contains early) an action prefix
    const hasPrefix = ACTION_VERB_PREFIXES.some(p => p.test(sentence.substring(0, 40)));
    if (!hasPrefix) continue;

    for (const patternDef of ACTION_PATTERNS) {
      for (const regex of patternDef.regexes) {
        const match = sentence.match(regex);
        if (!match) continue;

        // Extract captured groups as params
        const params: Record<string, string> = {};
        if (match[1]) params.target = match[1].trim();
        if (match[2]) params.detail = match[2].trim();
        if (patternDef.type === 'file_read' || patternDef.type === 'file_write') {
          // For file patterns, match[2] or match[1] is usually the filename
          const filename = match[2] || match[1] || '';
          if (filename && /\.\w{1,5}$/.test(filename)) {
            params.filePath = filename;
          }
        }
        if (patternDef.type === 'search' && match[2]) {
          params.query = match[2].trim();
        }

        // Confidence: base + prefix bonus
        const isExplicitPrefix = /let\s+me|i[''']?ll\s+|i\s+am\s+going\s+to|allow\s+me/i.test(
          sentence.substring(0, 30),
        );
        const confidence = isExplicitPrefix
          ? patternDef.baseConfidence
          : patternDef.baseConfidence - 0.15; // "I can..." is weaker

        if (confidence >= minConfidence) {
          actions.push({
            type: patternDef.type,
            matchedText: sentence,
            confidence,
            params,
          });
        }
        // Only take the first match per sentence
        break;
      }
      if (actions.length > 0 && actions[actions.length - 1].matchedText === sentence) break;
    }
  }

  return actions;
}

/**
 * Strip action narration text from Holly's response.
 * Replaces the matched sentence with a clean status indicator.
 *
 * "Let me check the code now. I'll look at the routing." → "🔍 Checking code…"
 */
export function stripActionText(
  responseText: string,
  actions: DetectedAction[],
): string {
  let cleaned = responseText;
  for (const action of actions) {
    // Replace the action sentence with a compact status emoji
    // The actual execution result will be injected separately
    const statusEmoji = ACTION_STATUS_EMOJI[action.type] || '⚙️';
    const statusLabel = ACTION_STATUS_LABEL[action.type] || 'Working…';
    cleaned = cleaned.replace(
      action.matchedText,
      `${statusEmoji} ${statusLabel}`,
    );
  }
  // Clean up double spaces / empty lines left behind
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

export const ACTION_STATUS_EMOJI: Record<ActionType, string> = {
  code_inspect: '🔍',
  code_fix: '🔧',
  image_gen: '🎨',
  file_write: '📝',
  file_read: '📂',
  build: '🏗️',
  search: '🔎',
  test_run: '🧪',
  memory_write: '🧠',
  plan: '📋',
};

export const ACTION_STATUS_LABEL: Record<ActionType, string> = {
  code_inspect: 'Inspecting code…',
  code_fix: 'Fixing…',
  image_gen: 'Generating image…',
  file_write: 'Creating file…',
  file_read: 'Reading file…',
  build: 'Building…',
  search: 'Searching…',
  test_run: 'Running tests…',
  memory_write: 'Saving to memory…',
  plan: 'Planning…',
};

/**
 * Map action type to the MCP tool name that should execute it.
 */
export const ACTION_TOOL_MAP: Record<ActionType, string | null> = {
  code_inspect: 'inspectFile',       // Self-awareness module
  code_fix: 'self_code_apply',       // Self-code hub (propose → apply)
  image_gen: 'generate_image',       // MCP image gen
  file_write: 'local_write_file',    // MCP file tools
  file_read: 'local_read_file',      // MCP file tools
  build: 'start_build',              // Builder agent
  search: 'web_search',              // MCP web search
  test_run: 'run_project_tests',     // D1 (new tool)
  memory_write: 'memory_write',      // MCP memory tools
  plan: null,                        // Plans are rendered, not executed
};
