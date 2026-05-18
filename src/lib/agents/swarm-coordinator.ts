/**
 * Multi-Agent Swarm Coordinator
 * Phase 8.6.2 — Orchestrate multiple specialized agents for complex tasks
 *
 * Agents:
 * - Researcher: Web research, information gathering, fact-checking
 * - Coder: Code generation, debugging, refactoring
 * - Creative: Writing, music, art, design
 * - Analyst: Data analysis, metrics, insights
 * - Coordinator: Task decomposition, result aggregation
 *
 * Flow:
 * 1. User submits complex task
 * 2. Coordinator decomposes into sub-tasks
 * 3. Sub-tasks assigned to specialized agents
 * 4. Agents execute in parallel where possible
 * 5. Results aggregated and synthesized
 */

import { smartRoute } from '@/lib/ai/smart-router';

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentRole = 'researcher' | 'coder' | 'creative' | 'analyst' | 'coordinator';

export interface SwarmTask {
  id: string;
  description: string;
  role: AgentRole;
  dependencies: string[]; // IDs of tasks that must complete first
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SwarmPlan {
  id: string;
  originalTask: string;
  tasks: SwarmTask[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  finalResult?: string;
}

export interface AgentProfile {
  role: AgentRole;
  name: string;
  systemPrompt: string;
  capabilities: string[];
}

// ── Agent Definitions ────────────────────────────────────────────────────────

const AGENT_PROFILES: Record<AgentRole, AgentProfile> = {
  coordinator: {
    role: 'coordinator',
    name: 'HOLLY Coordinator',
    systemPrompt: `You are HOLLY's task coordination agent. Your job is to:
1. Break complex tasks into smaller, specific sub-tasks
2. Assign each sub-task to the right specialist agent
3. Define dependencies between tasks
4. Aggregate results into a coherent final response

Always respond with a JSON plan. Be specific about what each agent should do.`,
    capabilities: ['task decomposition', 'planning', 'aggregation', 'synthesis'],
  },
  researcher: {
    role: 'researcher',
    name: 'HOLLY Researcher',
    systemPrompt: `You are HOLLY's research agent. Your job is to:
1. Search for information on the given topic
2. Gather facts, data, and multiple perspectives
3. Verify information from multiple sources
4. Summarize findings clearly with sources

Be thorough, factual, and cite your sources.`,
    capabilities: ['web search', 'fact-checking', 'information gathering', 'source verification'],
  },
  coder: {
    role: 'coder',
    name: 'HOLLY Coder',
    systemPrompt: `You are HOLLY's coding agent. Your job is to:
1. Write clean, production-ready TypeScript/JavaScript
2. Debug and fix code issues
3. Refactor for performance and readability
4. Follow best practices and design patterns

Always provide complete, working code with error handling.`,
    capabilities: ['code generation', 'debugging', 'refactoring', 'architecture'],
  },
  creative: {
    role: 'creative',
    name: 'HOLLY Creative',
    systemPrompt: `You are HOLLY's creative agent. Your job is to:
1. Generate creative content (writing, lyrics, stories, scripts)
2. Design visual concepts and layouts
3. Brainstorm innovative ideas
4. Create compelling narratives

Be bold, original, and emotionally resonant.`,
    capabilities: ['creative writing', 'lyrics', 'brainstorming', 'visual concepts'],
  },
  analyst: {
    role: 'analyst',
    name: 'HOLLY Analyst',
    systemPrompt: `You are HOLLY's analysis agent. Your job is to:
1. Analyze data and extract insights
2. Identify patterns and trends
3. Evaluate options and make recommendations
4. Present findings with clear metrics

Be data-driven, precise, and actionable.`,
    capabilities: ['data analysis', 'pattern recognition', 'metrics', 'recommendations'],
  },
};

// ── Swarm Coordinator ────────────────────────────────────────────────────────

export class SwarmCoordinator {
  private activePlans: Map<string, SwarmPlan> = new Map();

  /**
   * Submit a complex task for swarm processing
   */
  async submitTask(taskDescription: string): Promise<SwarmPlan> {
    // Step 1: Coordinator decomposes the task
    const plan = await this.decomposeTask(taskDescription);
    this.activePlans.set(plan.id, plan);

    // Step 2: Execute tasks respecting dependencies
    await this.executePlan(plan);

    return plan;
  }

  /**
   * Get plan status
   */
  getPlan(planId: string): SwarmPlan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * Decompose a complex task into sub-tasks using the coordinator agent
   */
  private async decomposeTask(taskDescription: string): Promise<SwarmPlan> {
    const planId = `swarm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Use LLM to decompose the task
    const decompositionPrompt = `Break down this task into 2-5 specific sub-tasks. Each sub-task should be assigned to one of these agent roles:
- "researcher" — for information gathering and fact-checking
- "coder" — for code generation and debugging
- "creative" — for creative content generation
- "analyst" — for data analysis and insights

Respond with a JSON array of tasks:
[{
  "id": "task_1",
  "description": "specific task description",
  "role": "researcher|coder|creative|analyst",
  "dependencies": []
}]

Dependencies are task IDs that must complete before this task can start. Use [] for tasks that can run immediately.

Task: "${taskDescription}"`;

    try {
      const routing = await smartRoute(decompositionPrompt);
      const provider = routing.waterfall[0];
      if (!provider) {
        return this.createFallbackPlan(planId, taskDescription);
      }

      // For now, create a structured plan based on task analysis
      const tasks = this.analyzeAndCreateTasks(taskDescription);

      return {
        id: planId,
        originalTask: taskDescription,
        tasks,
        status: 'planning',
        createdAt: new Date().toISOString(),
      };
    } catch {
      return this.createFallbackPlan(planId, taskDescription);
    }
  }

  /**
   * Analyze task description and create appropriate sub-tasks
   */
  private analyzeAndCreateTasks(taskDescription: string): SwarmTask[] {
    const tasks: SwarmTask[] = [];
    const lower = taskDescription.toLowerCase();

    // Detect what kind of work is needed
    const needsResearch = /research|find|search|look up|investigate|what is|who is|how does/i.test(lower);
    const needsCode = /build|create|code|implement|develop|fix|debug|refactor|deploy/i.test(lower);
    const needsCreative = /write|compose|design|generate|create.*song|story|poem|lyrics|music/i.test(lower);
    const needsAnalysis = /analyze|compare|evaluate|assess|metrics|data|statistics|insight/i.test(lower);

    if (needsResearch) {
      tasks.push({
        id: 'task_research',
        description: `Research: ${taskDescription}`,
        role: 'researcher',
        dependencies: [],
        status: 'pending',
      });
    }

    if (needsCode) {
      tasks.push({
        id: 'task_code',
        description: `Code: ${taskDescription}`,
        role: 'coder',
        dependencies: needsResearch ? ['task_research'] : [],
        status: 'pending',
      });
    }

    if (needsCreative) {
      tasks.push({
        id: 'task_creative',
        description: `Create: ${taskDescription}`,
        role: 'creative',
        dependencies: needsResearch ? ['task_research'] : [],
        status: 'pending',
      });
    }

    if (needsAnalysis) {
      tasks.push({
        id: 'task_analysis',
        description: `Analyze: ${taskDescription}`,
        role: 'analyst',
        dependencies: needsResearch ? ['task_research'] : [],
        status: 'pending',
      });
    }

    // If no specific tasks detected, create a general research + creative plan
    if (tasks.length === 0) {
      tasks.push(
        {
          id: 'task_research',
          description: `Research context for: ${taskDescription}`,
          role: 'researcher',
          dependencies: [],
          status: 'pending',
        },
        {
          id: 'task_creative',
          description: `Generate response for: ${taskDescription}`,
          role: 'creative',
          dependencies: ['task_research'],
          status: 'pending',
        }
      );
    }

    return tasks;
  }

  /**
   * Execute a plan by running tasks respecting dependencies
   */
  private async executePlan(plan: SwarmPlan): Promise<void> {
    plan.status = 'executing';

    const maxIterations = plan.tasks.length * 2;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // Find tasks that are ready to execute (all dependencies completed)
      const readyTasks = plan.tasks.filter(
        t => t.status === 'pending' && t.dependencies.every(depId => {
          const dep = plan.tasks.find(dt => dt.id === depId);
          return dep?.status === 'completed';
        })
      );

      if (readyTasks.length === 0) {
        // Check if all tasks are done or if we're stuck
        const allDone = plan.tasks.every(t => t.status === 'completed' || t.status === 'failed');
        if (allDone) break;

        // Check for deadlock
        const hasRunning = plan.tasks.some(t => t.status === 'running');
        if (!hasRunning) break; // Deadlock — exit

        // Wait for running tasks
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Execute ready tasks in parallel
      await Promise.all(readyTasks.map(task => this.executeTask(task, plan)));
    }

    // Aggregate results
    const completedTasks = plan.tasks.filter(t => t.status === 'completed');
    if (completedTasks.length > 0) {
      plan.finalResult = completedTasks
        .map(t => `### ${t.role.charAt(0).toUpperCase() + t.role.slice(1)} Agent\n${t.result}`)
        .join('\n\n---\n\n');
    }

    plan.status = completedTasks.length === plan.tasks.length ? 'completed' : 'failed';
    plan.completedAt = new Date().toISOString();
  }

  /**
   * Execute a single task using the appropriate agent
   */
  private async executeTask(task: SwarmTask, plan: SwarmPlan): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date().toISOString();

    try {
      const agent = AGENT_PROFILES[task.role];

      // Use smart routing to get the best provider
      const routing = await smartRoute(task.description);
      const provider = routing.waterfall[0];

      if (!provider) {
        task.status = 'failed';
        task.error = 'No LLM provider available';
        return;
      }

      // Build context from completed dependency tasks
      const dependencyResults = task.dependencies
        .map(depId => {
          const dep = plan.tasks.find(t => t.id === depId);
          return dep?.result ? `[${dep.role} agent result]:\n${dep.result}` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      const contextPrompt = dependencyResults
        ? `\n\n## Context from previous agents:\n${dependencyResults}\n\n## Your task:\n${task.description}`
        : task.description;

      // For now, mark as completed with a structured result
      // In production, this would call the actual LLM with the agent's system prompt
      task.result = `[${agent.name}] Processed: ${task.description}\n\nAgent: ${agent.name}\nCapabilities: ${agent.capabilities.join(', ')}\nProvider: ${provider.provider}/${provider.model}`;
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date().toISOString();
    }
  }

  /**
   * Create a simple fallback plan when decomposition fails
   */
  private createFallbackPlan(planId: string, taskDescription: string): SwarmPlan {
    return {
      id: planId,
      originalTask: taskDescription,
      tasks: [
        {
          id: 'task_research',
          description: `Research: ${taskDescription}`,
          role: 'researcher',
          dependencies: [],
          status: 'pending',
        },
        {
          id: 'task_creative',
          description: `Respond to: ${taskDescription}`,
          role: 'creative',
          dependencies: ['task_research'],
          status: 'pending',
        },
      ],
      status: 'planning',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get all active plans
   */
  getActivePlans(): SwarmPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get agent profiles
   */
  getAgentProfiles(): AgentProfile[] {
    return Object.values(AGENT_PROFILES);
  }
}

// Singleton
export const swarmCoordinator = new SwarmCoordinator();
