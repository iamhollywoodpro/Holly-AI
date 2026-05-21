/**
 * Phase 20: Advanced Reasoning Chains
 *
 * For complex tasks, Holly plans multi-step reasoning chains —
 * thinking about the problem, breaking it down, solving sub-problems,
 * synthesizing — visible to the user as a live thinking process.
 *
 * This engine:
 * 1. Detects when a query needs multi-step reasoning
 * 2. Plans the reasoning chain (decomposition)
 * 3. Executes each step with the appropriate model
 * 4. Streams intermediate steps to the frontend
 * 5. Synthesizes a final response
 */

import { smartRoute, type TaskType } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ── Types ──────────────────────────────────────────────────────────────

export interface ReasoningStep {
  id: string;
  type: 'decompose' | 'analyze' | 'research' | 'solve' | 'verify' | 'synthesize';
  title: string;
  prompt: string;
  result?: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  durationMs?: number;
}

export interface ReasoningChain {
  id: string;
  query: string;
  steps: ReasoningStep[];
  finalAnswer?: string;
  totalDurationMs?: number;
  status: 'planning' | 'executing' | 'complete' | 'failed';
}

export interface ReasoningChainSSE {
  type: 'reasoning_step' | 'reasoning_complete' | 'reasoning_error';
  step?: ReasoningStep;
  chain?: ReasoningChain;
  error?: string;
}

// ── Complexity Detection ───────────────────────────────────────────────

const COMPLEXITY_SIGNALS = [
  /\b(analyze|break down|step by step|explain in detail|deep dive)\b/i,
  /\b(compare|contrast|pros and cons|trade.?offs|evaluate)\b/i,
  /\b(plan|strategy|roadmap|architecture|design)\b.*\b(system|project|solution|approach)\b/i,
  /\b(why|how does|what causes|what would happen if)\b/i,
  /\b(debug|troubleshoot|root cause|investigate)\b/i,
  /\b(optimize|improve|refactor|redesign)\b/i,
  /\b(research|investigate|explore|survey)\b/i,
  /\b(multi.?step|complex|complicated|comprehensive)\b/i,
];

const SIMPLE_SIGNALS = [
  /^(what|who|when|where|how|is|are|do|does|can|will)\b.{0,30}\?$/i,
  /^(hi|hello|hey|thanks|ok|yes|no|sure|got it)\b/i,
  /^(define|what is|what's|who is|when did)\b.{0,40}$/i,
];

/**
 * Determine if a query needs multi-step reasoning.
 * Returns confidence 0-1.
 */
export function needsReasoningChain(query: string): { needed: boolean; confidence: number } {
  const trimmed = query.trim();

  // Short queries rarely need chains
  if (trimmed.length < 20) {
    return { needed: false, confidence: 0.9 };
  }

  // Explicit simple signals
  if (SIMPLE_SIGNALS.some(p => p.test(trimmed))) {
    return { needed: false, confidence: 0.85 };
  }

  // Count complexity signals
  const signalCount = COMPLEXITY_SIGNALS.filter(p => p.test(trimmed)).length;
  const wordCount = trimmed.split(/\s+/).length;

  // Long queries are more likely complex
  const lengthBoost = Math.min(wordCount / 100, 0.3);

  const confidence = Math.min(signalCount * 0.25 + lengthBoost, 0.95);

  return {
    needed: confidence >= 0.4,
    confidence,
  };
}

// ── Chain Planning ─────────────────────────────────────────────────────

const DECOMPOSITION_PROMPT = `You are Holly's reasoning planner. Given a complex query, break it into 2-5 discrete reasoning steps.

For each step, provide:
- type: one of "decompose" | "analyze" | "research" | "solve" | "verify" | "synthesize"
- title: short label (3-6 words)
- prompt: the specific sub-question or task for this step

IMPORTANT: Respond with ONLY a valid JSON array. No markdown, no explanation.
Example:
[{"type":"analyze","title":"Analyze requirements","prompt":"What are the key requirements and constraints?"},{"type":"solve","title":"Generate solution","prompt":"Based on the analysis, propose a solution"}]`;

/**
 * Plan a reasoning chain for a complex query.
 * Uses a fast model to decompose the problem into steps.
 */
export async function planReasoningChain(
  query: string,
): Promise<ReasoningStep[]> {
  const routing = await smartRoute(query, { forceTask: 'reasoning' as TaskType });
  const waterfall = routing.waterfall;

  const messages: ChatMessage[] = [
    { role: 'system', content: DECOMPOSITION_PROMPT },
    { role: 'user', content: `Query: ${query}\n\nBreak this into reasoning steps.` },
  ];

  try {
    const result = await cascadeCollect(waterfall, messages, {
      maxTokens: 1000,
      temperature: 0.3,
    });

    if (!result?.text) {
      return getDefaultChain(query);
    }

    // Parse JSON from response (handle markdown wrapping)
    let jsonStr = result.text.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error('Not an array');

    return parsed.slice(0, 5).map((step: any, i: number) => ({
      id: `step-${i + 1}`,
      type: step.type || 'analyze',
      title: step.title || `Step ${i + 1}`,
      prompt: step.prompt || step.description || '',
      status: 'pending' as const,
    }));
  } catch {
    return getDefaultChain(query);
  }
}

function getDefaultChain(query: string): ReasoningStep[] {
  return [
    { id: 'step-1', type: 'analyze', title: 'Analyze the problem', prompt: `Analyze this query in detail: ${query}`, status: 'pending' },
    { id: 'step-2', type: 'solve', title: 'Develop solution', prompt: 'Based on the analysis, develop a comprehensive solution.', status: 'pending' },
    { id: 'step-3', type: 'synthesize', title: 'Synthesize answer', prompt: 'Combine all findings into a clear, complete answer.', status: 'pending' },
  ];
}

// ── Chain Execution ────────────────────────────────────────────────────

/**
 * Execute a reasoning chain, streaming each step's progress.
 * The callback receives SSE events for each step.
 */
export async function executeReasoningChain(
  query: string,
  chain: ReasoningChain,
  onStep: (event: ReasoningChainSSE) => void,
  systemPrompt: string,
  conversationHistory: ChatMessage[],
): Promise<string> {
  const startTime = Date.now();
  let accumulatedContext = '';

  chain.status = 'executing';

  for (const step of chain.steps) {
    step.status = 'running';
    onStep({ type: 'reasoning_step', step });

    const stepStart = Date.now();

    try {
      // Build step-specific messages
      const stepMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6),
        {
          role: 'user',
          content: step.prompt + (accumulatedContext
            ? `\n\nContext from previous steps:\n${accumulatedContext}`
            : ''),
        },
      ];

      const routing = await smartRoute(step.prompt, { forceTask: 'reasoning' as TaskType });

      const result = await cascadeCollect(routing.waterfall, stepMessages, {
        maxTokens: 2000,
        temperature: 0.4,
      });

      step.result = result.text || 'No result';
      step.status = 'complete';
      step.durationMs = Date.now() - stepStart;

      // Accumulate context for next steps
      accumulatedContext += `\n### ${step.title}\n${step.result}\n`;

      onStep({ type: 'reasoning_step', step });
    } catch (error) {
      step.status = 'failed';
      step.durationMs = Date.now() - stepStart;
      step.result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      onStep({ type: 'reasoning_error', error: step.result, step });
    }
  }

  // Synthesize final answer
  const synthStep: ReasoningStep = {
    id: 'synthesize',
    type: 'synthesize',
    title: 'Final Synthesis',
    prompt: `Based on all reasoning steps, provide a comprehensive answer to: ${query}`,
    status: 'running',
  };

  onStep({ type: 'reasoning_step', step: synthStep });
  const synthStart = Date.now();

  const synthMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Original question: ${query}\n\nReasoning chain results:\n${accumulatedContext}\n\nProvide a comprehensive final answer.` },
  ];

  const synthRouting = await smartRoute(query, { forceTask: 'reasoning' as TaskType });
  const synthResult = await cascadeCollect(synthRouting.waterfall, synthMessages, {
    maxTokens: 3000,
    temperature: 0.3,
  });

  synthStep.result = synthResult.text || 'Unable to synthesize answer.';
  synthStep.status = 'complete';
  synthStep.durationMs = Date.now() - synthStart;

  chain.finalAnswer = synthStep.result;
  chain.totalDurationMs = Date.now() - startTime;
  chain.status = 'complete';

  onStep({ type: 'reasoning_step', step: synthStep });
  onStep({ type: 'reasoning_complete', chain });

  return chain.finalAnswer;
}

// ── Stats ──────────────────────────────────────────────────────────────

let chainCount = 0;
let totalStepsRun = 0;
let totalChainMs = 0;

export function getReasoningStats() {
  return {
    totalChains: chainCount,
    totalSteps: totalStepsRun,
    avgChainMs: chainCount > 0 ? Math.round(totalChainMs / chainCount) : 0,
  };
}

/**
 * Run a full reasoning chain with tracking.
 */
export async function runReasoningChain(
  query: string,
  onStep: (event: ReasoningChainSSE) => void,
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<string> {
  chainCount++;
  const chain: ReasoningChain = {
    id: `chain-${Date.now()}`,
    query,
    steps: [],
    status: 'planning',
  };

  // Plan
  chain.steps = await planReasoningChain(query);
  onStep({ type: 'reasoning_step', step: { id: 'plan', type: 'decompose', title: 'Planning reasoning steps', prompt: '', status: 'complete' } });

  totalStepsRun += chain.steps.length;

  // Execute
  const answer = await executeReasoningChain(
    query,
    chain,
    onStep,
    systemPrompt,
    conversationHistory as ChatMessage[],
  );
  totalChainMs += chain.totalDurationMs || 0;

  return answer;
}
