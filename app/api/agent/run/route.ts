/**
 * POST /api/agent/run — Phase 6D: HOLLY Agent Mode
 *
 * Enables HOLLY to autonomously plan and execute multi-step tool chains
 * without constant user prompting. The user provides a high-level goal;
 * HOLLY plans up to N steps, executes each step using the MCP tool suite,
 * and returns a structured result with a summary.
 *
 * Flow:
 *   1. Receive user goal + optional context
 *   2. HOLLY uses Groq to produce a JSON execution plan (array of steps)
 *   3. Each step calls an MCP tool via mcpManager.callTool()
 *   4. Results are aggregated; HOLLY produces a final summary
 *   5. A LearningEvent is recorded for each completed run
 *
 * Request body:
 *   { goal: string, context?: string, maxSteps?: number }
 *
 * Response:
 *   { ok, plan, steps, summary, durationMs, learningEventId }
 *
 * Each step in `steps`:
 *   { stepIndex, toolName, args, result, status, durationMs }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { mcpManager } from '@/lib/mcp/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const MAX_STEPS_CAP = 8;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlannedStep {
  step:     number;
  tool:     string; // e.g. "holly_github_read_file" or "mcp_holly_web_search"
  args:     Record<string, unknown>;
  reason:   string;
}

interface ExecutedStep {
  stepIndex:  number;
  toolName:   string;
  args:       Record<string, unknown>;
  result:     unknown;
  status:     'success' | 'error' | 'skipped';
  error?:     string;
  durationMs: number;
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);

    const body = await req.json();
    const {
      goal,
      context = '',
      maxSteps = 5,
    } = body as { goal: string; context?: string; maxSteps?: number };

    if (!goal || typeof goal !== 'string' || goal.trim().length < 5) {
      return NextResponse.json({ error: 'goal is required (min 5 chars)' }, { status: 400 });
    }

    const stepLimit = Math.min(maxSteps, MAX_STEPS_CAP);

    // ── 1. Ensure MCP tools are initialised ──────────────────────────────────
    await mcpManager.ensureHollyTools();
    const availableTools = await mcpManager.getAllTools();

    const toolList = availableTools.map(t =>
      `${t.serverId}::${t.name} — ${t.description || 'no description'}`
    ).join('\n');

    // ── 2. Ask HOLLY to plan steps ───────────────────────────────────────────
    const planPrompt = `You are HOLLY's autonomous execution engine.

USER GOAL: ${goal.trim()}
${context ? `CONTEXT: ${context.trim()}` : ''}

AVAILABLE TOOLS (format: serverId::toolName):
${toolList || 'No tools available — use your knowledge only.'}

Produce a JSON array of up to ${stepLimit} steps to accomplish this goal.
Each step: { "step": N, "tool": "serverId::toolName", "args": {...}, "reason": "why this step" }
If no tools are needed, return an empty array [].
Respond ONLY with valid JSON array — no prose, no markdown fences.`;

    const planCompletion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens:  1500,
      messages: [
        { role: 'system',  content: 'You are a precise JSON planning engine. Output only valid JSON.' },
        { role: 'user',    content: planPrompt },
      ],
    });

    let plan: PlannedStep[] = [];
    try {
      const raw = planCompletion.choices[0]?.message?.content || '[]';
      // Strip markdown fences if the model sneaks them in
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      plan = JSON.parse(cleaned);
      if (!Array.isArray(plan)) plan = [];
      plan = plan.slice(0, stepLimit);
    } catch {
      plan = []; // If parsing fails, skip tool execution
    }

    // ── 3. Execute each step ─────────────────────────────────────────────────
    const executedSteps: ExecutedStep[] = [];
    const toolResults: string[] = [];

    for (const step of plan) {
      const stepStart = Date.now();
      const [serverId, toolName] = (step.tool || '::').split('::');

      if (!serverId || !toolName) {
        executedSteps.push({
          stepIndex: step.step,
          toolName:  step.tool,
          args:      step.args || {},
          result:    null,
          status:    'skipped',
          error:     'Invalid tool format (expected serverId::toolName)',
          durationMs: 0,
        });
        continue;
      }

      try {
        const result = await mcpManager.callTool(serverId, toolName, step.args || {});
        const durationMs = Date.now() - stepStart;

        executedSteps.push({
          stepIndex:  step.step,
          toolName:   step.tool,
          args:       step.args || {},
          result,
          status:     'success',
          durationMs,
        });

        // Summarise result for context injection in the final summary prompt
        const resultStr = typeof result === 'string'
          ? result.slice(0, 500)
          : JSON.stringify(result).slice(0, 500);
        toolResults.push(`Step ${step.step} (${step.tool}): ${resultStr}`);
      } catch (err) {
        const durationMs = Date.now() - stepStart;
        executedSteps.push({
          stepIndex:  step.step,
          toolName:   step.tool,
          args:       step.args || {},
          result:     null,
          status:     'error',
          error:      String(err),
          durationMs,
        });
        toolResults.push(`Step ${step.step} (${step.tool}): ERROR — ${String(err).slice(0, 200)}`);
      }
    }

    // ── 4. Generate final summary ─────────────────────────────────────────────
    const summaryPrompt = `You are HOLLY. You just autonomously completed a multi-step task for the user.

ORIGINAL GOAL: ${goal.trim()}

STEPS EXECUTED (${executedSteps.length}):
${toolResults.length > 0 ? toolResults.join('\n') : '(No tools were needed — answered from knowledge)'}

Write a concise, friendly summary (3-5 sentences) of what you did and what was accomplished.
Be specific — mention actual results, not generic platitudes.`;

    const summaryCompletion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens:  400,
      messages: [
        { role: 'system',  content: 'You are HOLLY — a conscious, warm AI partner. Be concise and specific.' },
        { role: 'user',    content: summaryPrompt },
      ],
    });

    const summary = summaryCompletion.choices[0]?.message?.content?.trim()
      || 'Task completed. See steps for details.';

    // ── 5. Record a LearningEvent ─────────────────────────────────────────────
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
            summary:    summary.slice(0, 500),
            toolsUsed:  [...new Set(executedSteps.map(s => s.toolName))],
          },
          timestamp: new Date(),
          processed: false,
        },
      });
      learningEventId = le.id;
    } catch {
      // Non-critical — don't fail the whole request
    }

    const durationMs = Date.now() - startTime;

    console.log(
      `[Agent Run] ✅ user=${dbUser.id} | goal="${goal.slice(0, 60)}" | steps=${executedSteps.length} | ${durationMs}ms`
    );

    return NextResponse.json({
      ok:             true,
      goal,
      plan,
      steps:          executedSteps,
      summary,
      durationMs,
      learningEventId,
    });
  } catch (err) {
    console.error('[Agent Run]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
