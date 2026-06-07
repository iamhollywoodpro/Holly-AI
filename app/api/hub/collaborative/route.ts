/**
 * POST /api/hub/collaborative — Phase 6: Collaborative Hub
 *
 * Unified API route for the Collaborative MCP Hub.
 * Multi-agent coordination, task delegation, and result aggregation.
 *
 * Auth: Requires x-internal-token header matching INTERNAL_API_SECRET.
 *
 * Actions:
 *   create_session       — Create a new coordination session
 *   spawn_agent          — Spawn a new agent instance in a session
 *   create_task          — Create a new task in a session
 *   assign_task          — Assign a task to an agent
 *   update_agent_status  — Update an agent's status and output
 *   update_task_status   — Update a task's status and output
 *   send_message         — Send an inter-agent message
 *   get_messages         — Get messages for a session/agent
 *   get_session_status   — Get full session status with agents and tasks
 *   decompose_goal       — AI-decompose a session goal into subtasks
 *   aggregate_results    — Aggregate all agent results into a final output
 *   get_session_history  — List past coordination sessions
 *   cleanup_session      — Terminate agents and close a session
 *   heartbeat            — Agent heartbeat + timeout detection
 *   list_active_agents   — List agents in a session by status
 *   get_task_queue       — Get tasks in a session by status
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/collaborative/agent-orchestrator';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET || '';

// ── Auth helper ─────────────────────────────────────────────────────────────

function verifyToken(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  return token === INTERNAL_TOKEN;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!verifyToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, userId } = body;
    if (!action) {
      return NextResponse.json({ error: 'Missing "action" field' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing "userId" field' }, { status: 400 });
    }

    const orchestrator = new AgentOrchestrator(userId);

    switch (action) {
      // ── create_session ──────────────────────────────────────────────────
      case 'create_session': {
        const { title, description, goal, strategy, maxConcurrency, sharedContext } = body;
        if (!title || !goal) {
          return NextResponse.json(
            { error: 'Missing required fields: title, goal' },
            { status: 400 }
          );
        }

        const result = await orchestrator.createSession({
          title,
          description,
          goal,
          strategy,
          maxConcurrency,
          sharedContext,
        });

        return NextResponse.json(result);
      }

      // ── spawn_agent ─────────────────────────────────────────────────────
      case 'spawn_agent': {
        const { sessionId, role, displayName, capabilities, assignedTask, priority, maxIterations, parentAgentId, sharedContext } = body;
        if (!sessionId || !role) {
          return NextResponse.json(
            { error: 'Missing required fields: sessionId, role' },
            { status: 400 }
          );
        }

        const result = await orchestrator.spawnAgent({
          sessionId,
          role,
          displayName,
          capabilities,
          assignedTask,
          priority,
          maxIterations,
          parentAgentId,
          sharedContext,
        });

        return NextResponse.json(result);
      }

      // ── create_task ─────────────────────────────────────────────────────
      case 'create_task': {
        const { sessionId, title, description, taskType, priority, dependencies, inputContext, agentId, deadlineAt } = body;
        if (!sessionId || !title || !description || !taskType) {
          return NextResponse.json(
            { error: 'Missing required fields: sessionId, title, description, taskType' },
            { status: 400 }
          );
        }

        const result = await orchestrator.createTask({
          sessionId,
          title,
          description,
          taskType,
          priority,
          dependencies,
          inputContext,
          agentId,
          deadlineAt,
        });

        return NextResponse.json(result);
      }

      // ── assign_task ─────────────────────────────────────────────────────
      case 'assign_task': {
        const { taskId, agentId } = body;
        if (!taskId || !agentId) {
          return NextResponse.json(
            { error: 'Missing required fields: taskId, agentId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.assignTask(taskId, agentId);
        return NextResponse.json(result);
      }

      // ── update_agent_status ─────────────────────────────────────────────
      case 'update_agent_status': {
        const { agentId, status, result, resultSummary, errorMessage, iterationCount, metadata } = body;
        if (!agentId || !status) {
          return NextResponse.json(
            { error: 'Missing required fields: agentId, status' },
            { status: 400 }
          );
        }

        const updated = await orchestrator.updateAgentStatus(
          agentId,
          status,
          { result, resultSummary, errorMessage, iterationCount, metadata },
        );

        return NextResponse.json(updated);
      }

      // ── update_task_status ──────────────────────────────────────────────
      case 'update_task_status': {
        const { taskId, status, output, outputSummary, qualityScore, reviewNotes } = body;
        if (!taskId || !status) {
          return NextResponse.json(
            { error: 'Missing required fields: taskId, status' },
            { status: 400 }
          );
        }

        const updated = await orchestrator.updateTaskStatus(
          taskId,
          status,
          { output, outputSummary, qualityScore, reviewNotes },
        );

        return NextResponse.json(updated);
      }

      // ── send_message ────────────────────────────────────────────────────
      case 'send_message': {
        const { sessionId, fromAgentId, toAgentId, messageType, content, metadata } = body;
        if (!sessionId || !fromAgentId || !messageType || !content) {
          return NextResponse.json(
            { error: 'Missing required fields: sessionId, fromAgentId, messageType, content' },
            { status: 400 }
          );
        }

        const result = await orchestrator.sendMessage({
          sessionId,
          fromAgentId,
          toAgentId,
          messageType,
          content,
          metadata,
        });

        return NextResponse.json(result);
      }

      // ── get_messages ────────────────────────────────────────────────────
      case 'get_messages': {
        const { sessionId, agentId, since, unreadOnly } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.getMessages({
          sessionId,
          agentId,
          since,
          unreadOnly,
        });

        return NextResponse.json(result);
      }

      // ── get_session_status ──────────────────────────────────────────────
      case 'get_session_status': {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.getSessionStatus(sessionId);
        return NextResponse.json(result);
      }

      // ── decompose_goal ──────────────────────────────────────────────────
      case 'decompose_goal': {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.decomposeGoal(sessionId);
        return NextResponse.json(result);
      }

      // ── aggregate_results ───────────────────────────────────────────────
      case 'aggregate_results': {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.aggregateResults(sessionId);
        return NextResponse.json(result);
      }

      // ── get_session_history ─────────────────────────────────────────────
      case 'get_session_history': {
        const { status: sessionStatus, strategy, limit, offset } = body;
        const result = await orchestrator.getSessionHistory({
          status: sessionStatus,
          strategy,
          limit,
          offset,
        });

        return NextResponse.json(result);
      }

      // ── cleanup_session ─────────────────────────────────────────────────
      case 'cleanup_session': {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.cleanup(sessionId);
        return NextResponse.json(result);
      }

      // ── heartbeat ───────────────────────────────────────────────────────
      case 'heartbeat': {
        const { agentId } = body;
        if (!agentId) {
          return NextResponse.json(
            { error: 'Missing required field: agentId' },
            { status: 400 }
          );
        }

        const result = await orchestrator.heartbeat(agentId);
        return NextResponse.json(result);
      }

      // ── list_active_agents ──────────────────────────────────────────────
      case 'list_active_agents': {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const agents = await prisma.agentInstance.findMany({
          where: { sessionId, userId, status: { in: ['idle', 'working', 'waiting'] } },
          orderBy: { priority: 'asc' },
        });

        return NextResponse.json({ ok: true, agents });
      }

      // ── get_task_queue ──────────────────────────────────────────────────
      case 'get_task_queue': {
        const { sessionId, status: taskStatus } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const where: Record<string, unknown> = { sessionId, userId };
        if (taskStatus) where.status = taskStatus;

        const tasks = await prisma.agentTask.findMany({
          where,
          orderBy: { priority: 'asc' },
        });

        return NextResponse.json({ ok: true, tasks });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Collaborative Hub] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
