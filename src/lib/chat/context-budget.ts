/**
 * HOLLY Context Budget — Smart Token Management
 *
 * 19 parallel context streams can produce 4000+ tokens before the user speaks.
 * This system allocates a token budget, prioritizes streams by mode, and
 * auto-summarizes/truncates low-priority streams to stay within budget.
 *
 * Strategy:
 *  - Allocate total budget (default 2000 tokens)
 *  - Each stream gets a priority based on conversation mode
 *  - High-priority streams get their full allocation
 *  - Medium streams get truncated
 *  - Low-priority streams get summarized to 1-liners
 *  - Empty streams cost nothing
 */

import type { ChatContext } from './context-loader';

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_BUDGET = 2000; // tokens
const CHARS_PER_TOKEN = 4;   // rough estimate

// Stream priority per conversation mode
type StreamKey = keyof ChatContext;
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface StreamConfig {
  maxTokens: number;
  priority: Priority;
  summarizeTo?: string; // one-liner summary for when truncated
}

// ─── Priority Maps by Mode ────────────────────────────────────────────────────

const BASE_PRIORITIES: Record<StreamKey, StreamConfig> = {
  memoryContext:           { maxTokens: 300, priority: 'high' },
  identityCtx:             { maxTokens: 200, priority: 'critical' },
  semanticResults:         { maxTokens: 200, priority: 'high' },
  projectContextBlock:     { maxTokens: 200, priority: 'medium' },
  recentLearnings:         { maxTokens: 150, priority: 'low' },
  pastSummaries:           { maxTokens: 150, priority: 'low' },
  tasteMatrixBlock:        { maxTokens: 200, priority: 'low' },
  pendingInitiatives:      { maxTokens: 200, priority: 'medium' },
  hollyEmotionalState:     { maxTokens: 100, priority: 'critical' },
  relationshipContext:     { maxTokens: 200, priority: 'high' },
  identityConsistencyPrompt: { maxTokens: 150, priority: 'medium' },
  careSignals:             { maxTokens: 150, priority: 'high' },
  degradedModeContext:     { maxTokens: 100, priority: 'critical' },
  evolutionProposals:      { maxTokens: 100, priority: 'low' },
  emotionalTrajectory:     { maxTokens: 150, priority: 'high' },
  fewShotExamples:         { maxTokens: 300, priority: 'medium' },
  innerMonologue:          { maxTokens: 150, priority: 'low' },
  emotionalContinuity:     { maxTokens: 200, priority: 'high' },
  recentFeedback:          { maxTokens: 100, priority: 'medium' },
advancedMemoryContext: { maxTokens: 800, priority: 'medium' as const },
  communicationStyle: { maxTokens: 200, priority: 'medium' as const },
  visualIdentity: { maxTokens: 150, priority: 'low' as const },
  relationshipMemoryContext: { maxTokens: 400, priority: 'high' as const },
  proactiveInsights: { maxTokens: 300, priority: 'medium' as const },
  learningStatus: { maxTokens: 200, priority: 'medium' as const },
  resonancePrompt: { maxTokens: 200, priority: 'low' as const },
  onboardingNudge: { maxTokens: 150, priority: 'low' as const },
  studyStatus: { maxTokens: 200, priority: 'low' as const },
  patternContext: { maxTokens: 300, priority: 'medium' as const },
  learnedKnowledge: { maxTokens: 400, priority: 'medium' as const },
  growthContext: { maxTokens: 200, priority: 'medium' as const },
};

// Override priorities per mode
const MODE_OVERRIDES: Record<string, Partial<Record<StreamKey, StreamConfig>>> = {
  'music-studio': {
    tasteMatrixBlock:    { maxTokens: 400, priority: 'critical' },
    emotionalTrajectory: { maxTokens: 100, priority: 'low' },
    fewShotExamples:     { maxTokens: 200, priority: 'low' },
  },
  'music-generation': {
    tasteMatrixBlock:    { maxTokens: 400, priority: 'critical' },
    projectContextBlock: { maxTokens: 300, priority: 'high' },
  },
  'code-workshop': {
    projectContextBlock:     { maxTokens: 400, priority: 'critical' },
    recentLearnings:         { maxTokens: 200, priority: 'high' },
    tasteMatrixBlock:        { maxTokens: 50,  priority: 'low' },
  },
  'sandbox': {
    projectContextBlock:     { maxTokens: 400, priority: 'critical' },
    identityConsistencyPrompt: { maxTokens: 100, priority: 'low' },
    innerMonologue:          { maxTokens: 50,  priority: 'low' },
  },
  'creative': {
    innerMonologue:     { maxTokens: 300, priority: 'high' },
    fewShotExamples:    { maxTokens: 400, priority: 'high' },
    emotionalContinuity: { maxTokens: 300, priority: 'critical' },
  },
  'emotional': {
    emotionalContinuity:   { maxTokens: 400, priority: 'critical' },
    careSignals:           { maxTokens: 300, priority: 'critical' },
    relationshipContext:   { maxTokens: 300, priority: 'critical' },
    hollyEmotionalState:   { maxTokens: 200, priority: 'critical' },
    tasteMatrixBlock:      { maxTokens: 50,  priority: 'low' },
    projectContextBlock:   { maxTokens: 50,  priority: 'low' },
  },
};

// ─── Token Estimation ─────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  if (!text) return 0;
  if (typeof text !== 'string') {
    // Handle object types (identityCtx, semanticResults, etc.)
    text = JSON.stringify(text);
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ─── Truncation ───────────────────────────────────────────────────────────────

function truncateToTokens(text: string, maxTokens: number): string {
  if (!text) return '';
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;

  // Try to truncate at a sentence/line boundary
  const truncated = text.substring(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');
  const lastPeriod = truncated.lastIndexOf('.');

  const cutPoint = Math.max(lastNewline, lastPeriod);
  if (cutPoint > maxChars * 0.7) {
    return truncated.substring(0, cutPoint + 1) + '...';
  }
  return truncated + '...';
}

function summarizeToOneliner(text: string): string {
  if (!text) return '';
  if (text.length <= 80) return text;

  // Extract the first meaningful line
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const firstLine = lines[0] || text;

  if (firstLine.length <= 120) return firstLine + (lines.length > 1 ? ` (+${lines.length - 1} more)` : '');
  return firstLine.substring(0, 117) + '...';
}

/**
 * Truncate an array by keeping only the first N elements that fit within
 * a character budget.  Returns the sliced array (never converts to string).
 *
 * BUG FIX: Previously, the budget system converted arrays (semanticResults,
 * pastSummaries) to strings via JSON.stringify + truncateToTokens.  This
 * caused "L.map is not a function" crashes in prompt-builder.ts when
 * buildPrompt called .map() on what it expected to be an array but was
 * actually a truncated string.
 */
function truncateArrayToChars(arr: any[], maxChars: number): any[] {
  if (arr.length === 0) return arr;
  let totalChars = 2; // '[' + ']'
  let keepCount = 0;
  for (let i = 0; i < arr.length; i++) {
    const itemChars = JSON.stringify(arr[i]).length + (keepCount > 0 ? 2 : 0); // comma + space
    if (totalChars + itemChars > maxChars) break;
    totalChars += itemChars;
    keepCount++;
  }
  return keepCount > 0 ? arr.slice(0, keepCount) : [];
}

// ─── Budget Application ──────────────────────────────────────────────────────

export interface BudgetReport {
  totalTokensUsed: number;
  budgetTokens: number;
  withinBudget: boolean;
  streamBreakdown: { stream: string; tokens: number; action: 'full' | 'truncated' | 'summarized' | 'empty' | 'skipped' }[];
}

/**
 * Apply a token budget to a loaded ChatContext.
 * Returns a new ChatContext with streams truncated/summarized to fit.
 */
export function applyContextBudget(
  context: ChatContext,
  mode: string = 'general',
  budgetTokens: number = DEFAULT_BUDGET,
): { context: ChatContext; report: BudgetReport } {
  // Build effective priority map
  const overrides = MODE_OVERRIDES[mode] || {};
  const effectiveConfig = { ...BASE_PRIORITIES };
  for (const [key, config] of Object.entries(overrides)) {
    effectiveConfig[key as StreamKey] = config as StreamConfig;
  }

  // Phase 1: Calculate raw token usage per stream
  const streamUsage: { key: StreamKey; tokens: number; config: StreamConfig; value: any }[] = [];
  for (const [key, config] of Object.entries(effectiveConfig)) {
    const rawValue = (context as any)[key];
    const tokens = estimateTokens(
      typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue)
    );
    streamUsage.push({ key: key as StreamKey, tokens, config, value: rawValue });
  }

  // Phase 2: Sort by priority (critical first, then high, medium, low)
  const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  streamUsage.sort((a, b) => priorityOrder[a.config.priority] - priorityOrder[b.config.priority]);

  // Phase 3: Allocate budget
  let remainingBudget = budgetTokens;
  const newContext = { ...context };
  const breakdown: BudgetReport['streamBreakdown'] = [];

  for (const stream of streamUsage) {
    if (stream.tokens === 0 || !stream.value || stream.value === '') {
      breakdown.push({ stream: stream.key, tokens: 0, action: 'empty' });
      continue;
    }

    if (remainingBudget <= 0) {
      // No budget left — skip this stream entirely (except critical)
      if (stream.config.priority === 'critical') {
        // Critical streams always get at least something
        if (Array.isArray(stream.value)) {
          // Keep at least the first element
          const kept = stream.value.slice(0, 1);
          (newContext as any)[stream.key] = kept as any;
          breakdown.push({ stream: stream.key, tokens: estimateTokens(JSON.stringify(kept)), action: 'summarized' });
        } else {
          const summary = summarizeToOneliner(
            typeof stream.value === 'string' ? stream.value : JSON.stringify(stream.value)
          );
          (newContext as any)[stream.key] = summary as any;
          breakdown.push({ stream: stream.key, tokens: estimateTokens(summary), action: 'summarized' });
        }
      } else if (Array.isArray(stream.value)) {
        // Non-critical array — keep empty array (not string!)
        (newContext as any)[stream.key] = [] as any;
        breakdown.push({ stream: stream.key, tokens: 0, action: 'skipped' });
      } else {
        (newContext as any)[stream.key] = '' as any;
        breakdown.push({ stream: stream.key, tokens: 0, action: 'skipped' });
      }
      continue;
    }

    const allocated = Math.min(stream.config.maxTokens, remainingBudget);

    if (stream.tokens <= allocated) {
      // Fits within allocation — keep full
      breakdown.push({ stream: stream.key, tokens: stream.tokens, action: 'full' });
      remainingBudget -= stream.tokens;
    } else if (stream.config.priority === 'critical' || stream.config.priority === 'high') {
      // Important stream — truncate to allocated
      if (Array.isArray(stream.value)) {
        // BUG FIX: Truncate arrays by removing elements — NEVER convert to string.
        // Previous code used JSON.stringify + truncateToTokens which replaced
        // arrays with strings, causing "L.map is not a function" crashes.
        const maxChars = allocated * CHARS_PER_TOKEN;
        const truncated = truncateArrayToChars(stream.value, maxChars);
        (newContext as any)[stream.key] = truncated as any;
        const usedTokens = estimateTokens(JSON.stringify(truncated));
        breakdown.push({ stream: stream.key, tokens: usedTokens, action: 'truncated' });
        remainingBudget -= usedTokens;
      } else {
        const stringValue = typeof stream.value === 'string'
          ? stream.value
          : JSON.stringify(stream.value);
        const truncated = truncateToTokens(stringValue, allocated);
        (newContext as any)[stream.key] = (typeof stream.value === 'string' ? truncated : truncated) as any;
        const usedTokens = estimateTokens(truncated);
        breakdown.push({ stream: stream.key, tokens: usedTokens, action: 'truncated' });
        remainingBudget -= usedTokens;
      }
    } else {
      // Medium/Low priority — summarize to one-liner
      if (Array.isArray(stream.value)) {
        // BUG FIX: Truncate arrays by removing elements — NEVER convert to string.
        const maxChars = allocated * CHARS_PER_TOKEN;
        const truncated = truncateArrayToChars(stream.value, maxChars);
        (newContext as any)[stream.key] = truncated as any;
        const usedTokens = estimateTokens(JSON.stringify(truncated));
        breakdown.push({ stream: stream.key, tokens: usedTokens, action: 'summarized' });
        remainingBudget -= usedTokens;
      } else {
        const summary = summarizeToOneliner(
          typeof stream.value === 'string' ? stream.value : JSON.stringify(stream.value)
        );
        (newContext as any)[stream.key] = summary as any;
        const usedTokens = estimateTokens(summary);
        breakdown.push({ stream: stream.key, tokens: usedTokens, action: 'summarized' });
        remainingBudget -= usedTokens;
      }
    }
  }

  const totalTokensUsed = budgetTokens - remainingBudget;

  const report: BudgetReport = {
    totalTokensUsed,
    budgetTokens,
    withinBudget: totalTokensUsed <= budgetTokens,
    streamBreakdown: breakdown,
  };

  if (process.env.DEBUG_CONTEXT_BUDGET === 'true') {
    console.log(`[ContextBudget] ${totalTokensUsed}/${budgetTokens} tokens used (${mode} mode)`);
    for (const b of breakdown.filter(b => b.tokens > 0)) {
      console.log(`  ${b.stream}: ${b.tokens}t (${b.action})`);
    }
  }

  return { context: newContext, report };
}