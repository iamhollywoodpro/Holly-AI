/**
 * AgentOrchestrator — Phase 6: Collaborative Sense
 *
 * Multi-agent coordination engine that manages sessions, agents, tasks,
 * and inter-agent communication. Uses the Smart Router for AI-powered
 * goal decomposition and result aggregation.
 *
 * All methods are async, take userId via constructor, and return
 * { ok: true, data } | { ok: false, error: string }.
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ─── Result type ──────────────────────────────────────────────────────────────

export type OrchestratorResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string };

// ─── Input option types ───────────────────────────────────────────────────────

export interface CreateSessionOpts {
  title:          string;
  description?:   string;
  goal:           string;
  strategy?:      string;
  maxConcurrency?: number;
  sharedContext?:  Record<string, unknown>;
}

export interface SpawnAgentOpts {
  sessionId:      string;
  role:           string;
  displayName?:   string;
  capabilities?:  string[];
  assignedTask?:  string;
  priority?:      number;
  maxIterations?: number;
  parentAgentId?: string;
  sharedContext?: Record<string, unknown>;
}

export interface CreateTaskOpts {
  sessionId:     string;
  title:         string;
  description:   string;
  taskType:      string;
  priority?:     number;
  dependencies?: string[];
  inputContext?:  Record<string, unknown>;
  agentId?:      string;
  deadlineAt?:   Date;
}

export interface UpdateAgentStatusOpts {
  result?:         string;
  resultSummary?:  string;
  errorMessage?:   string;
  iterationCount?: number;
  metadata?:       Record<string, unknown>;
}

export interface UpdateTaskStatusOpts {
  output?:        string;
  outputSummary?: string;
  qualityScore?:  number;
  reviewNotes?:   string;
}

export interface SendMessageOpts {
  sessionId:   string;
  fromAgentId: string;
  toAgentId?:  string;
  messageType: string;
  content:     string;
  metadata?:   Record<string, unknown>;
}

export interface GetMessagesOpts {
  sessionId:   string;
  agentId?:    string;
  since?:      Date;
  unreadOnly?: boolean;
}

export interface GetSessionHistoryOpts {
  status?:   string;
  strategy?: string;
  limit?:    number;
  offset?:   number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class AgentOrchestrator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ── 1. createSession ──────────────────────────────────────────────────────

  async createSession(
    opts: CreateSessionOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      const session = await prisma.coordinationSession.create({
        data: {
          userId: this.userId,
          title:         opts.title,
          description:   opts.description ?? null,
          goal:          opts.goal,
          strategy:      opts.strategy ?? 'hierarchical',
          status:        'active',
          sharedContext: opts.sharedContext ?? {},
          maxConcurrency: opts.maxConcurrency ?? 5,
          totalAgents:   0,
          completedAgents: 0,
          failedAgents:  0,
          metadata:      {},
          startedAt:     new Date(),
        },
      });
      return { ok: true, data: session as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] createSession failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 2. spawnAgent ─────────────────────────────────────────────────────────

  async spawnAgent(

    opts: SpawnAgentOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      // Verify session exists and belongs to user
      const session = await prisma.coordinationSession.findFirst({
        where: { id: opts.sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      const agent = await prisma.agentInstance.create({
        data: {
          userId: this.userId,
          sessionId:      opts.sessionId,
          parentAgentId:  opts.parentAgentId ?? null,
          displayName:    opts.displayName ?? `${opts.role}-${Date.now()}`,
          role:           opts.role,
          status:         'idle',
          capabilities:   opts.capabilities ?? [],
          assignedTask:   opts.assignedTask ?? null,
          priority:       opts.priority ?? 5,
          maxIterations:  opts.maxIterations ?? 10,
          iterationCount: 0,
          sharedContext:  opts.sharedContext ?? {},
          metadata:       {},
          startedAt:      new Date(),
          lastHeartbeat:  new Date(),
        },
      });

      // Increment totalAgents on the session
      await prisma.coordinationSession.update({
        where: { id: opts.sessionId },
        data: { totalAgents: { increment: 1 } },
      });

      return { ok: true, data: agent as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] spawnAgent failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 3. createTask ─────────────────────────────────────────────────────────

  async createTask(

    opts: CreateTaskOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      // Verify session exists
      const session = await prisma.coordinationSession.findFirst({
        where: { id: opts.sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      // If agentId provided, verify it belongs to the session
      if (opts.agentId) {
        const agent = await prisma.agentInstance.findFirst({
          where: { id: opts.agentId, sessionId: opts.sessionId, userId: this.userId },
        });
        if (!agent) {
          return { ok: false, error: 'Agent not found in this session' };
        }
      }

      const task = await prisma.agentTask.create({
        data: {
          userId: this.userId,
          sessionId:     opts.sessionId,
          agentId:       opts.agentId ?? null,
          title:         opts.title,
          description:   opts.description,
          taskType:      opts.taskType,
          status:        opts.agentId ? 'claimed' : 'pending',
          priority:      opts.priority ?? 5,
          dependencies:  opts.dependencies ?? [],
          inputContext:  opts.inputContext ?? {},
          assignedAt:    opts.agentId ? new Date() : null,
          deadlineAt:    opts.deadlineAt ?? null,
        },
      });

      // If auto-assigned, update agent status
      if (opts.agentId) {
        await prisma.agentInstance.update({
          where: { id: opts.agentId },
          data: { status: 'busy', assignedTask: opts.title },
        });
      }

      return { ok: true, data: task as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] createTask failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 4. assignTask ─────────────────────────────────────────────────────────

  async assignTask(

    taskId: string,
    agentId: string,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      // Verify task and agent belong to user
      const task = await prisma.agentTask.findFirst({ where: { id: taskId, userId: this.userId } });
      if (!task) {
        return { ok: false, error: 'Task not found or access denied' };
      }

      const agent = await prisma.agentInstance.findFirst({
        where: { id: agentId, userId: this.userId, sessionId: task.sessionId },
      });
      if (!agent) {
        return { ok: false, error: 'Agent not found in this session' };
      }

      if (task.status !== 'pending') {
        return { ok: false, error: `Task cannot be assigned — current status: ${task.status}` };
      }

      const updated = await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status:    'claimed',
          agentId,
          assignedAt: new Date(),
        },
      });

      // Mark agent as busy
      await prisma.agentInstance.update({
        where: { id: agentId },
        data: { status: 'busy', assignedTask: task.title },
      });

      return { ok: true, data: updated as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] assignTask failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 5. updateAgentStatus ──────────────────────────────────────────────────

  async updateAgentStatus(

    agentId: string,
    status: string,
    opts?: UpdateAgentStatusOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      const agent = await prisma.agentInstance.findFirst({
        where: { id: agentId, userId: this.userId },
        include: { subTasks: true },
      });
      if (!agent) {
        return { ok: false, error: 'Agent not found or access denied' };
      }

      const updateData: Record<string, unknown> = { status };

      if (opts?.result !== undefined)         updateData.result = opts.result;
      if (opts?.resultSummary !== undefined)  updateData.resultSummary = opts.resultSummary;
      if (opts?.errorMessage !== undefined)   updateData.errorMessage = opts.errorMessage;
      if (opts?.iterationCount !== undefined) updateData.iterationCount = opts.iterationCount;
      if (opts?.metadata !== undefined)       updateData.metadata = opts.metadata;

      // Handle terminal states
      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();

        // Update session counters
        const field = status === 'completed' ? 'completedAgents' : 'failedAgents';
        await prisma.coordinationSession.update({
          where: { id: agent.sessionId },
          data: { [field]: { increment: 1 } },
        });
      }

      if (status === 'completed' && opts?.result) {
        updateData.resultSummary = opts.resultSummary ?? opts.result.slice(0, 500);
      }

      const updated = await prisma.agentInstance.update({
        where: { id: agentId },
        data: updateData,
      });

      return { ok: true, data: updated as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] updateAgentStatus failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 6. updateTaskStatus ───────────────────────────────────────────────────

  async updateTaskStatus(

    taskId: string,
    status: string,
    opts?: UpdateTaskStatusOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      const task = await prisma.agentTask.findFirst({ where: { id: taskId, userId: this.userId } });
      if (!task) {
        return { ok: false, error: 'Task not found or access denied' };
      }

      const updateData: Record<string, unknown> = { status };

      if (opts?.output !== undefined)        updateData.output = opts.output;
      if (opts?.outputSummary !== undefined)  updateData.outputSummary = opts.outputSummary;
      if (opts?.qualityScore !== undefined)   updateData.qualityScore = opts.qualityScore;
      if (opts?.reviewNotes !== undefined)    updateData.reviewNotes = opts.reviewNotes;

      if (status === 'in_progress' && !task.startedAt) {
        updateData.startedAt = new Date();
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();

        if (opts?.output && !opts?.outputSummary) {
          updateData.outputSummary = opts.output.slice(0, 500);
        }
      }

      // If task is completed, check if the agent can go back to idle
      if (status === 'completed' && task.agentId) {
        const remainingTasks = await prisma.agentTask.count({
          where: {
            agentId: task.agentId,
            status: { in: ['claimed', 'in_progress'] },
          },
        });
        if (remainingTasks <= 1) {
          // This was the last active task
          await prisma.agentInstance.update({
            where: { id: task.agentId },
            data: { status: 'idle', assignedTask: null },
          });
        }
      }

      const updated = await prisma.agentTask.update({
        where: { id: taskId },
        data: updateData,
      });

      return { ok: true, data: updated as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] updateTaskStatus failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 7. sendMessage ────────────────────────────────────────────────────────

  async sendMessage(

    opts: SendMessageOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      // Verify session
      const session = await prisma.coordinationSession.findFirst({
        where: { id: opts.sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      // Verify fromAgentId belongs to this session
      const fromAgent = await prisma.agentInstance.findFirst({
        where: { id: opts.fromAgentId, sessionId: opts.sessionId, userId: this.userId },
      });
      if (!fromAgent) {
        return { ok: false, error: 'Sender agent not found in this session' };
      }

      // Verify toAgentId if provided
      if (opts.toAgentId) {
        const toAgent = await prisma.agentInstance.findFirst({
          where: { id: opts.toAgentId, sessionId: opts.sessionId, userId: this.userId },
        });
        if (!toAgent) {
          return { ok: false, error: 'Recipient agent not found in this session' };
        }
      }

      const message = await prisma.agentMessage.create({
        data: {
          fromAgentId: opts.fromAgentId,
          toAgentId:   opts.toAgentId ?? null,
          sessionId:   opts.sessionId,
          userId: this.userId,
          messageType: opts.messageType,
          content:     opts.content,
          metadata:    opts.metadata ?? {},
        },
      });

      return { ok: true, data: message as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] sendMessage failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 8. getMessages ────────────────────────────────────────────────────────

  async getMessages(

    opts: GetMessagesOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>[]>> {
    try {
      // Verify session
      const session = await prisma.coordinationSession.findFirst({
        where: { id: opts.sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      const where: Record<string, unknown> = {
        sessionId: opts.sessionId,
        userId: this.userId,
      };

      if (opts.agentId) {
        where.OR = [
          { fromAgentId: opts.agentId },
          { toAgentId: opts.agentId },
        ];
      }

      if (opts.since) {
        where.createdAt = { gte: opts.since };
      }

      if (opts.unreadOnly) {
        where.readAt = null;
      }

      const messages = await prisma.agentMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 200,
      });

      // Mark unread messages as read (only those addressed to the given agent)
      if (opts.agentId) {
        await prisma.agentMessage.updateMany({
          where: {
            sessionId: opts.sessionId,
            toAgentId: opts.agentId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
      }

      return { ok: true, data: messages as unknown as Record<string, unknown>[] };
    } catch (error) {
      console.error('[AgentOrchestrator] getMessages failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 9. getSessionStatus ───────────────────────────────────────────────────

  async getSessionStatus(

    sessionId: string,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      const session = await prisma.coordinationSession.findFirst({
        where: { id: sessionId, userId: this.userId },
        include: {
          agents: true,
          tasks: true,
        },
      });

      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      // Get message counts
      const messageCount = await prisma.agentMessage.count({
        where: { sessionId },
      });

      const unreadCount = await prisma.agentMessage.count({
        where: { sessionId, readAt: null },
      });

      const summary = {
        session:   session as unknown as Record<string, unknown>,
        agents:    (session as unknown as { agents?: unknown[] }).agents ?? [],
        tasks:     (session as unknown as { tasks?: unknown[] }).tasks ?? [],
        messages: {
          total:   messageCount,
          unread:  unreadCount,
        },
        progress: {
          totalAgents:    session.totalAgents,
          completedAgents: session.completedAgents,
          failedAgents:   session.failedAgents,
          completionPct:  session.totalAgents > 0
            ? Math.round((session.completedAgents / session.totalAgents) * 100)
            : 0,
        },
      };

      return { ok: true, data: summary };
    } catch (error) {
      console.error('[AgentOrchestrator] getSessionStatus failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 10. decomposeGoal ─────────────────────────────────────────────────────

  async decomposeGoal(

    sessionId: string,
  ): Promise<OrchestratorResult<{ tasks: Array<{ title: string; description: string; taskType: string; priority: number }> }>> {
    try {
      const session = await prisma.coordinationSession.findFirst({
        where: { id: sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      // Get existing agents to understand team composition
      const agents = await prisma.agentInstance.findMany({
        where: { sessionId },
      });

      const agentRoles = agents.map(a => `${a.displayName} (${a.role}, caps: ${(a.capabilities as string[])?.join(', ') || 'general'})`).join('\n');

      const userPrompt = `Goal: ${session.goal}\n\nStrategy: ${session.strategy}\n\nAvailable agents:\n${agentRoles || 'No agents yet — suggest roles too.'}\n\nShared context: ${JSON.stringify(session.sharedContext)}\n\nDecompose this goal into 3-8 specific subtasks. Return ONLY the JSON array.`;

      const prompt: ChatMessage[] = [
        { role: 'system', content: `You are a task decomposition specialist. Analyze the given goal and break it into concrete, actionable subtasks. Return ONLY a valid JSON array of objects with fields: title, description, taskType (one of: research, coding, analysis, creative, review, coordination), priority (1-10, 10 = highest). Be specific and practical.` },
        { role: 'user', content: userPrompt },
      ];

      const route = await smartRoute(userPrompt, { forceTask: 'agent' });
      const { text } = await cascadeCollect(route.waterfall, prompt);

      // Parse the AI response — try to extract JSON array
      let tasks: Array<{ title: string; description: string; taskType: string; priority: number }>;
      try {
        // Try direct parse first
        tasks = JSON.parse(text);
      } catch {
        // Try extracting JSON from markdown code block
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          return { ok: false, error: 'AI did not return valid task decomposition' };
        }
        tasks = JSON.parse(jsonMatch[0]);
      }

      if (!Array.isArray(tasks) || tasks.length === 0) {
        return { ok: false, error: 'AI returned empty or invalid task list' };
      }

      return { ok: true, data: { tasks } };
    } catch (error) {
      console.error('[AgentOrchestrator] decomposeGoal failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 11. aggregateResults ──────────────────────────────────────────────────

  async aggregateResults(

    sessionId: string,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      const session = await prisma.coordinationSession.findFirst({
        where: { id: sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      // Collect all completed agent results
      const agents = await prisma.agentInstance.findMany({
        where: { sessionId, status: { in: ['completed', 'idle'] } },
      });

      // Collect all completed task results
      const tasks = await prisma.agentTask.findMany({
        where: { sessionId, status: 'completed' },
      });

      if (agents.length === 0 && tasks.length === 0) {
        return { ok: false, error: 'No completed agents or tasks to aggregate' };
      }

      const agentResults = agents
        .filter(a => a.result)
        .map(a => `### ${a.displayName} (${a.role})\n${a.result}`)
        .join('\n\n');

      const taskResults = tasks
        .filter(t => t.output)
        .map(t => `### ${t.title}\n${t.output}`)
        .join('\n\n');

      const synthesisPrompt = `Original goal: ${session.goal}\n\nStrategy: ${session.strategy}\n\n## Agent Results\n${agentResults || 'No agent results.'}\n\n## Task Results\n${taskResults || 'No task results.'}\n\nSynthesize a comprehensive final result that addresses the original goal.`;

      const prompt: ChatMessage[] = [
        { role: 'system', content: `You are a result synthesis specialist. Combine multiple agent and task results into a coherent, comprehensive final result. Maintain the original goal in mind and highlight key findings, decisions, and action items.` },
        { role: 'user', content: synthesisPrompt },
      ];

      const route = await smartRoute(synthesisPrompt, { forceTask: 'reasoning' });
      const { text: synthesis } = await cascadeCollect(route.waterfall, prompt);

      // Update session with final result
      const updated = await prisma.coordinationSession.update({
        where: { id: sessionId },
        data: {
          status:        'completed',
          finalResult:   synthesis,
          resultSummary: synthesis.slice(0, 1000),
          completedAt:   new Date(),
        },
      });

      return { ok: true, data: updated as unknown as Record<string, unknown> };
    } catch (error) {
      console.error('[AgentOrchestrator] aggregateResults failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 12. getSessionHistory ─────────────────────────────────────────────────

  async getSessionHistory(

    opts?: GetSessionHistoryOpts,
  ): Promise<OrchestratorResult<Record<string, unknown>[]>> {
    try {
      const where: Record<string, unknown> = { userId: this.userId };

      if (opts?.status)   where.status   = opts.status;
      if (opts?.strategy) where.strategy = opts.strategy;

      const sessions = await prisma.coordinationSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take:    opts?.limit  ?? 20,
        skip:    opts?.offset ?? 0,
        include: {
          _count: {
            select: { agents: true, tasks: true },
          },
        },
      });

      return { ok: true, data: sessions as unknown as Record<string, unknown>[] };
    } catch (error) {
      console.error('[AgentOrchestrator] getSessionHistory failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 13. cleanup ───────────────────────────────────────────────────────────

  async cleanup(

    sessionId: string,
  ): Promise<OrchestratorResult<Record<string, unknown>>> {
    try {
      const session = await prisma.coordinationSession.findFirst({
        where: { id: sessionId, userId: this.userId },
      });
      if (!session) {
        return { ok: false, error: 'Session not found or access denied' };
      }

      // Terminate all running agents
      const terminatedAgents = await prisma.agentInstance.updateMany({
        where: {
          sessionId,
          status: { in: ['idle', 'busy', 'running'] },
        },
        data: {
          status:      'terminated',
          completedAt: new Date(),
        },
      });

      // Cancel all pending / in-progress tasks
      const cancelledTasks = await prisma.agentTask.updateMany({
        where: {
          sessionId,
          status: { in: ['pending', 'claimed', 'in_progress'] },
        },
        data: {
          status:      'cancelled',
          completedAt: new Date(),
        },
      });

      // Close the session
      const updated = await prisma.coordinationSession.update({
        where: { id: sessionId },
        data: {
          status:      'closed',
          completedAt: new Date(),
        },
      });

      return {
        ok: true,
        data: {
          session:         updated as unknown as Record<string, unknown>,
          terminatedAgents: terminatedAgents.count,
          cancelledTasks:   cancelledTasks.count,
        },
      };
    } catch (error) {
      console.error('[AgentOrchestrator] cleanup failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ── 14. heartbeat ─────────────────────────────────────────────────────────

  async heartbeat(

    agentId: string,
  ): Promise<OrchestratorResult<{
    alive: boolean;
    timedOutAgents: string[];
  }>> {
    try {
      const agent = await prisma.agentInstance.findFirst({
        where: { id: agentId, userId: this.userId },
      });
      if (!agent) {
        return { ok: false, error: 'Agent not found or access denied' };
      }

      // Update this agent's heartbeat
      await prisma.agentInstance.update({
        where: { id: agentId },
        data: { lastHeartbeat: new Date() },
      });

      // Check for timed-out agents in the same session (no heartbeat in 5 min)
      const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;
      const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

      const timedOutAgents = await prisma.agentInstance.findMany({
        where: {
          sessionId: agent.sessionId,
          status: { in: ['idle', 'busy', 'running'] },
          lastHeartbeat: { lt: cutoff },
        },
        select: { id: true },
      });

      // Mark timed-out agents as failed
      if (timedOutAgents.length > 0) {
        const timedOutIds = timedOutAgents.map(a => a.id);

        await prisma.agentInstance.updateMany({
          where: { id: { in: timedOutIds } },
          data: {
            status:       'failed',
            errorMessage: 'Heartbeat timeout — agent unresponsive',
            completedAt:  new Date(),
          },
        });

        // Update session failed count
        await prisma.coordinationSession.update({
          where: { id: agent.sessionId },
          data: { failedAgents: { increment: timedOutIds.length } },
        });

        return {
          ok: true,
          data: { alive: true, timedOutAgents: timedOutIds },
        };
      }

      return { ok: true, data: { alive: true, timedOutAgents: [] } };
    } catch (error) {
      console.error('[AgentOrchestrator] heartbeat failed:', error);
      return { ok: false, error: (error as Error).message };
    }
  }
}
