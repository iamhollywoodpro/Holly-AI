/**
 * POST /api/agent/run — Phase 6D: HOLLY Agent Mode (streaming SSE)
 *
 * Streams server-sent events so the UI can show each stage live:
 *
 *   event: plan        — JSON array of planned steps (sent once after planning)
 *   event: step_start  — { stepIndex, toolName, reason }  (before each tool call)
 *   event: step_done   — { stepIndex, toolName, status, durationMs, error? }
 *   event: summary     — { text }  (streaming token-by-token from Groq)
 *   event: done        — { learningEventId, durationMs }
 *   event: error       — { message }
 *
 * Request body:  { goal, context?, maxSteps? }
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { mcpManager } from '@/lib/mcp/mcp-client';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect, cascade } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_STEPS_CAP = 8;

interface PlannedStep {
  step:   number;
  tool:   string;
  args:   Record<string, unknown>;
  reason: string;
}

// ─── SSE helpers ──────────────────────────────────────────────────────────────
function sseEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(line));
}

// ─── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth before opening stream
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const {
    goal,
    context  = '',
    maxSteps = 5,
  } = body as { goal: string; context?: string; maxSteps?: number };

  if (!goal || typeof goal !== 'string' || goal.trim().length < 5) {
    return new Response(JSON.stringify({ error: 'goal is required (min 5 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stepLimit  = Math.min(maxSteps, MAX_STEPS_CAP);
  const startTime  = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => sseEvent(controller, event, data);

      try {
        const dbUser = await getOrCreateUser(userId);

        // ── 1. Init MCP tools ────────────────────────────────────────────────
        await mcpManager.ensureHollyTools();
        const availableTools = await mcpManager.getAllTools();
        const toolList = availableTools
          .map(t => `${t.serverId}::${t.name} — ${t.description || 'no description'}`)
          .join('\n');

        // ── 2. Planning ──────────────────────────────────────────────────────
        emit('status', { text: 'Planning steps…' });

        const planPrompt = `You are HOLLY's autonomous execution engine.

USER GOAL: ${goal.trim()}
${context ? `CONTEXT: ${context.trim()}` : ''}

AVAILABLE TOOLS (format: serverId::toolName):
${toolList || 'No tools available — use knowledge only.'}

Produce a JSON array of up to ${stepLimit} steps.
Each step: { "step": N, "tool": "serverId::toolName", "args": {...}, "reason": "why" }
If no tools needed, return [].
Respond ONLY with valid JSON array — no prose, no markdown fences.`;

        // Planning — use 'agent' task: CF Kimi K2.5 → NVIDIA Qwen3 → Groq Llama
        const planRoute = await smartRoute(planPrompt, { taskHint: 'agent' });
        console.log(`[Agent Run] Planning via ${planRoute.reason}`);
        const planMessages = [
          { role: 'system' as const, content: 'You are a precise JSON planning engine. Output only valid JSON.' },
          { role: 'user'   as const, content: planPrompt },
        ];
        const { text: planRaw } = await cascadeCollect(
          planRoute.waterfall,
          planMessages,
          { temperature: 0.2, maxTokens: 1500 },
        );

        let plan: PlannedStep[] = [];
        try {
          const raw     = planRaw || '[]';
          const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
          plan = JSON.parse(cleaned);
          if (!Array.isArray(plan)) plan = [];
          plan = plan.slice(0, stepLimit);
        } catch {
          plan = [];
        }

        emit('plan', { steps: plan });

        // ── 3. Execute steps ─────────────────────────────────────────────────
        const executedSteps: Array<{
          stepIndex: number; toolName: string;
          status: 'success' | 'error' | 'skipped';
          durationMs: number; error?: string; result?: unknown;
        }> = [];
        const toolResults: string[] = [];

        for (const step of plan) {
          const [serverId, toolName] = (step.tool || '::').split('::');

          emit('step_start', {
            stepIndex: step.step,
            toolName:  step.tool,
            reason:    step.reason || '',
          });

          if (!serverId || !toolName) {
            const entry = {
              stepIndex: step.step, toolName: step.tool,
              status: 'skipped' as const, durationMs: 0,
              error: 'Invalid tool format (expected serverId::toolName)',
            };
            executedSteps.push(entry);
            emit('step_done', entry);
            toolResults.push(`Step ${step.step} (${step.tool}): SKIPPED — bad format`);
            continue;
          }

          const stepStart = Date.now();
          try {
            const result    = await mcpManager.callTool(serverId, toolName, step.args || {});
            const durationMs = Date.now() - stepStart;
            const entry = { stepIndex: step.step, toolName: step.tool, status: 'success' as const, durationMs, result };
            executedSteps.push(entry);
            emit('step_done', { stepIndex: entry.stepIndex, toolName: entry.toolName, status: entry.status, durationMs });

            const resultStr = typeof result === 'string'
              ? result.slice(0, 500)
              : JSON.stringify(result).slice(0, 500);
            toolResults.push(`Step ${step.step} (${step.tool}): ${resultStr}`);
          } catch (err) {
            const durationMs = Date.now() - stepStart;
            const entry = {
              stepIndex: step.step, toolName: step.tool,
              status: 'error' as const, durationMs, error: String(err),
            };
            executedSteps.push(entry);
            emit('step_done', entry);
            toolResults.push(`Step ${step.step} (${step.tool}): ERROR — ${String(err).slice(0, 200)}`);
          }
        }

        // ── 4. Stream summary token-by-token ─────────────────────────────────
        emit('status', { text: 'Writing summary…' });

        const summaryPrompt = `You are HOLLY. You just autonomously completed a multi-step task.

ORIGINAL GOAL: ${goal.trim()}

STEPS EXECUTED (${executedSteps.length}):
${toolResults.length > 0 ? toolResults.join('\n') : '(No tools were needed — answered from knowledge)'}

Write a concise, friendly summary (3-5 sentences). Be specific — mention actual results.`;

        // Summary — 'speed' task for fast streaming: Groq Llama 3.3 → Groq 8B → CF Kimi
        const summaryRoute = await smartRoute(summaryPrompt, { taskHint: 'speed' });
        console.log(`[Agent Run] Summary via ${summaryRoute.reason}`);
        const summaryMessages = [
          { role: 'system' as const, content: 'You are HOLLY — a conscious, warm AI partner. Be concise and specific.' },
          { role: 'user'   as const, content: summaryPrompt },
        ];

        let fullSummary = '';
        for await (const token of cascade(summaryRoute.waterfall, summaryMessages, { temperature: 0.5, maxTokens: 400 })) {
          if (token) {
            fullSummary += token;
            emit('summary_token', { token });
          }
        }

        // ── 5. Record LearningEvent ───────────────────────────────────────────
        let learningEventId: string | null = null;
        try {
          const le = await prisma.learningEvent.create({
            data: {
              userId:    dbUser.id,
              type:      'agent_task_completed',
              data: {
                goal,
                stepCount:  executedSteps.length,
                successful: executedSteps.filter(s => s.status === 'success').length,
                failed:     executedSteps.filter(s => s.status === 'error').length,
                summary:    fullSummary.slice(0, 500),
                toolsUsed:  [...new Set(executedSteps.map(s => s.toolName))],
              },
              timestamp: new Date(),
              processed: false,
            },
          });
          learningEventId = le.id;
        } catch { /* non-critical */ }

        const durationMs = Date.now() - startTime;
        console.log(`[Agent Run] ✅ user=${dbUser.id} | goal="${goal.slice(0, 60)}" | steps=${executedSteps.length} | ${durationMs}ms`);

        emit('done', { learningEventId, durationMs });
      } catch (err) {
        console.error('[Agent Run stream]', err);
        sseEvent(controller, 'error', { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
