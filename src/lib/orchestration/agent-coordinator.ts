/**
 * AGENT COORDINATOR — Real subagent orchestration
 *
 * Uses Holly's smart-router + cascade to decompose goals into subtasks,
 * assign them to specialized agents, and execute in parallel.
 *
 * Each "agent" is a role-specific LLM call with a tailored system prompt.
 * Results are aggregated into a final coordinated response.
 */

import { smartRoute, type TaskType } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export interface AgentConfig {
  name: string;
  type: string;
  capabilities: string[];
  maxConcurrentTasks?: number;
  priority?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline';
  currentTasks: string[];
  maxConcurrentTasks: number;
  completedTasks: number;
  failedTasks: number;
  createdAt: Date;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: string;
  requiredCapabilities: string[];
  assignedAgent?: string;
  status: string;
}

export interface AgentFilters {
  type?: string;
  status?: string;
  capability?: string;
  limit?: number;
}

export interface AgentStatus {
  agentId: string;
  status: string;
  currentTasks: Task[];
  completedTasks: number;
  uptime: number;
  performance: {
    successRate: number;
    averageTaskTime: number;
  };
}

export interface CoordinationResult {
  success: boolean;
  plan: string[];
  subtaskResults: Array<{ step: string; result: string; success: boolean }>;
  finalSynthesis: string;
  assignments: Record<string, string[]>;
  estimatedTime: number;
}

const agentRegistry: Map<string, Agent> = new Map();

const AGENT_SPECIALIZATIONS: Record<string, { taskType: TaskType; systemPrompt: string }> = {
  researcher: {
    taskType: 'reasoning',
    systemPrompt: `You are a research agent. Analyze the given subtask thoroughly. Find relevant information, identify patterns, and present findings clearly. Be concise but comprehensive. Focus on facts and evidence.`,
  },
  coder: {
    taskType: 'coding',
    systemPrompt: `You are a coding agent. Analyze the technical subtask, identify the solution approach, and provide specific implementation details. Include code snippets where relevant. Think about edge cases and error handling.`,
  },
  analyst: {
    taskType: 'reasoning',
    systemPrompt: `You are an analysis agent. Break down the subtask into components, evaluate each component, and synthesize your findings. Use logical reasoning and provide clear conclusions.`,
  },
  creative: {
    taskType: 'creative',
    systemPrompt: `You are a creative agent. Approach the subtask with imagination and originality. Generate novel ideas, explore different perspectives, and produce creative output that is both innovative and practical.`,
  },
  synthesizer: {
    taskType: 'reasoning',
    systemPrompt: `You are a synthesis agent. Your job is to combine multiple agent results into a single coherent response. Resolve contradictions, highlight agreements, and create a unified output that is greater than the sum of its parts.`,
  },
};

export async function createAgent(
  config: AgentConfig
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  try {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const agent: Agent = {
      id: agentId,
      name: config.name,
      type: config.type,
      capabilities: config.capabilities,
      status: 'idle',
      currentTasks: [],
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      completedTasks: 0,
      failedTasks: 0,
      createdAt: new Date(),
    };

    agentRegistry.set(agentId, agent);
    return { success: true, agentId };
  } catch (error) {
    console.error('Error creating agent:', error);
    return { success: false, error: 'Failed to create agent' };
  }
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  return agentRegistry.get(agentId) || null;
}

export async function listAgents(filters?: AgentFilters): Promise<Agent[]> {
  let agents = Array.from(agentRegistry.values());

  if (filters?.type) agents = agents.filter((a) => a.type === filters.type);
  if (filters?.status) agents = agents.filter((a) => a.status === filters.status);
  if (filters?.capability) agents = agents.filter((a) => a.capabilities.includes(filters.capability!));
  if (filters?.limit) agents = agents.slice(0, filters.limit);

  return agents;
}

export async function assignTask(
  agentId: string,
  task: Task
): Promise<{ success: boolean; error?: string }> {
  const agent = agentRegistry.get(agentId);
  if (!agent) return { success: false, error: 'Agent not found' };
  if (agent.currentTasks.length >= agent.maxConcurrentTasks) return { success: false, error: 'Agent at capacity' };

  const hasCapabilities = task.requiredCapabilities.every((cap) => agent.capabilities.includes(cap));
  if (!hasCapabilities) return { success: false, error: 'Agent lacks required capabilities' };

  agent.currentTasks.push(task.id);
  agent.status = 'busy';
  return { success: true };
}

export async function getAgentStatus(agentId: string): Promise<AgentStatus | null> {
  const agent = agentRegistry.get(agentId);
  if (!agent) return null;

  const totalTasks = agent.completedTasks + agent.failedTasks;
  const successRate = totalTasks > 0 ? agent.completedTasks / totalTasks : 1.0;

  return {
    agentId: agent.id,
    status: agent.status,
    currentTasks: [],
    completedTasks: agent.completedTasks,
    uptime: Math.floor((Date.now() - agent.createdAt.getTime()) / 1000),
    performance: { successRate, averageTaskTime: 0 },
  };
}

async function runAgentSubtask(
  agentType: string,
  subtaskDescription: string,
): Promise<{ result: string; success: boolean }> {
  const spec = AGENT_SPECIALIZATIONS[agentType] || AGENT_SPECIALIZATIONS.analyst;

  try {
    const route = smartRoute(subtaskDescription, { forceTask: spec.taskType });

    const { text } = await cascadeCollect(
      route.waterfall,
      [
        { role: 'system', content: spec.systemPrompt },
        { role: 'user', content: subtaskDescription },
      ],
      { temperature: 0.7, maxTokens: 2048 },
    );

    return { result: text || 'No output from agent', success: true };
  } catch (err: any) {
    return { result: `Agent error: ${err.message}`, success: false };
  }
}

async function decomposeGoal(goal: string): Promise<string[]> {
  const route = smartRoute(goal, { forceTask: 'reasoning' });

  try {
    const { text } = await cascadeCollect(
      route.waterfall,
      [
        {
          role: 'system',
          content: `You are a task decomposition engine. Break the given goal into 2-5 concrete, actionable subtasks.
Each subtask should be independent and specific enough for a specialist agent to execute.
Respond ONLY with a JSON array of strings. No explanation, no markdown, just the array.
Example: ["Research X", "Implement Y", "Test Z"]`,
        },
        { role: 'user', content: goal },
      ],
      { temperature: 0.3, maxTokens: 1024 },
    );

    const jsonMatch = (text || '[]').match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5).map(String);
      }
    }
  } catch (err) {
    console.error('[AgentCoordinator] Decomposition failed:', err);
  }

  return [
    `Analyze the goal: ${goal}`,
    `Research relevant information for: ${goal}`,
    `Synthesize findings and produce a final result for: ${goal}`,
  ];
}

function classifySubtask(subtask: string): string {
  const lower = subtask.toLowerCase();
  if (/\b(code|implement|build|program|function|debug|fix|api|component|script)\b/.test(lower)) return 'coder';
  if (/\b(research|find|search|look up|investigate|explore|discover)\b/.test(lower)) return 'researcher';
  if (/\b(analyze|evaluate|assess|compare|review|examine)\b/.test(lower)) return 'analyst';
  if (/\b(create|write|design|compose|brainstorm|imagine|invent)\b/.test(lower)) return 'creative';
  return 'analyst';
}

export async function coordinateAgents(
  _agentIds: string[],
  goal: string,
): Promise<CoordinationResult> {
  const startTime = Date.now();

  try {
    const subtasks = await decomposeGoal(goal);

    const plan = subtasks.map((s, i) => `Step ${i + 1}: ${s}`);

    const subtaskPromises = subtasks.map(async (subtask) => {
      const agentType = classifySubtask(subtask);
      const result = await runAgentSubtask(agentType, subtask);
      return { step: subtask, ...result };
    });

    const subtaskResults = await Promise.all(subtaskPromises);

    const synthesisInput = subtaskResults
      .map((r, i) => `## Subtask ${i + 1}: ${r.step}\n**Agent**: ${classifySubtask(r.step)}\n**Result**:\n${r.result}`)
      .join('\n\n---\n\n');

    let finalSynthesis = '';
    try {
      const synthRoute = smartRoute(goal, { forceTask: 'reasoning' });
      const { text } = await cascadeCollect(
        synthRoute.waterfall,
        [
          {
            role: 'system',
            content: AGENT_SPECIALIZATIONS.synthesizer.systemPrompt,
          },
          {
            role: 'user',
            content: `Original goal: ${goal}\n\nHere are the results from multiple specialist agents:\n\n${synthesisInput}\n\nSynthesize these into a single coherent response that fully addresses the original goal.`,
          },
        ],
        { temperature: 0.5, maxTokens: 4096 },
      );
      finalSynthesis = text || 'Synthesis failed — see individual results above.';
    } catch {
      finalSynthesis = subtaskResults.map((r) => r.result).join('\n\n');
    }

    const assignments: Record<string, string[]> = {};
    subtasks.forEach((subtask, i) => {
      const agentType = classifySubtask(subtask);
      const key = `${agentType}_${i}`;
      assignments[key] = [subtask];
    });

    return {
      success: true,
      plan,
      subtaskResults,
      finalSynthesis,
      assignments,
      estimatedTime: Math.round((Date.now() - startTime) / 1000),
    };
  } catch (error: any) {
    console.error('[AgentCoordinator] Coordination failed:', error);
    return {
      success: false,
      plan: [],
      subtaskResults: [],
      finalSynthesis: `Coordination failed: ${error.message}`,
      assignments: {},
      estimatedTime: Math.round((Date.now() - startTime) / 1000),
    };
  }
}
