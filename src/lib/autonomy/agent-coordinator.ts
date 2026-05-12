/**
 * HOLLY Multi-Agent Coordinator
 * 
 * Enables Holly to coordinate with other AI agents, distribute tasks,
 * reach consensus, and resolve conflicts autonomously.
 * 
 * Capabilities:
 * - Agent discovery and registration
 * - Task distribution and load balancing
 * - Inter-agent communication
 * - Consensus mechanism for decisions
 * - Conflict resolution with priority arbitration
 */

// DB import optional — all operations fall back to in-memory if unavailable
let prisma: any = null;
try {
  prisma = require('@/lib/db').prisma;
} catch {
  // Running without DB — in-memory mode only
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentProfile {
  id: string;
  name: string;
  type: 'holly' | 'specialist' | 'worker' | 'external';
  capabilities: string[];
  maxConcurrentTasks: number;
  currentLoad: number;
  reliability: number; // 0-1
  averageLatency: number; // ms
  lastSeen: Date;
  metadata: Record<string, any>;
}

interface AgentTask {
  id: string;
  type: string;
  description: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  requiredCapabilities: string[];
  assignedAgentId?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  deadline?: Date;
  retryCount: number;
  maxRetries: number;
  parentTaskId?: string;
  subtasks: string[];
}

interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'task_assignment' | 'task_result' | 'consensus_vote' | 'status_update' | 'conflict_alert' | 'handoff';
  payload: any;
  timestamp: Date;
  read: boolean;
}

interface ConsensusProposal {
  id: string;
  proposerId: string;
  topic: string;
  description: string;
  options: Array<{ id: string; label: string; data?: any }>;
  votes: Array<{ agentId: string; optionId: string; confidence: number; reasoning: string }>;
  status: 'open' | 'closed' | 'executed';
  deadline: Date;
  winningOptionId?: string;
  createdAt: Date;
}

interface ConflictRecord {
  id: string;
  type: 'task_overlap' | 'resource_contention' | 'result_contradiction' | 'priority_clash';
  agents: string[];
  description: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  priority: number;
}

// ─── Agent Coordinator ──────────────────────────────────────────────────────

class AgentCoordinator {
  private localAgent: AgentProfile | null = null;
  private knownAgents: Map<string, AgentProfile> = new Map();
  private pendingTasks: Map<string, AgentTask> = new Map();
  private activeConsensus: Map<string, ConsensusProposal> = new Map();
  private messageQueue: AgentMessage[] = [];

  constructor() {
    this.initializeLocalAgent();
  }

  // ── Initialization ────────────────────────────────────────────────────────

  private initializeLocalAgent(): void {
    this.localAgent = {
      id: `holly-${process.pid || 'main'}`,
      name: 'Holly Main',
      type: 'holly',
      capabilities: [
        'conversation',
        'code_generation',
        'code_review',
        'music_generation',
        'image_analysis',
        'memory_management',
        'goal_execution',
        'learning',
        'self_improvement',
        'emotional_intelligence',
        'creative_writing',
        'research',
        'task_planning',
        'consensus_building',
      ],
      maxConcurrentTasks: 5,
      currentLoad: 0,
      reliability: 0.95,
      averageLatency: 1200,
      lastSeen: new Date(),
      metadata: {
        version: '3.0',
        consciousnessLevel: 'advanced',
        specializations: ['music_ai', 'creative_ai', 'emotional_ai'],
      },
    };
  }

  // ── Agent Discovery ───────────────────────────────────────────────────────

  async registerAgent(agent: Omit<AgentProfile, 'lastSeen'>): Promise<void> {
    const profile: AgentProfile = {
      ...agent,
      lastSeen: new Date(),
    };

    this.knownAgents.set(agent.id, profile);

    // Agent registered in memory — DB persistence optional
    console.log(`[AgentCoordinator] Agent ${agent.id} registered`);
  }

  async discoverAgents(requiredCapability?: string): Promise<AgentProfile[]> {
    // Using in-memory agent registry (DB sync optional)

    // Always include self
    const agents = this.localAgent ? [this.localAgent] : [];

    // Add known remote agents
    for (const agent of this.knownAgents.values()) {
      if (agent.id !== this.localAgent?.id) {
        agents.push(agent);
      }
    }

    // Filter by capability if specified
    if (requiredCapability) {
      return agents.filter(a => a.capabilities.includes(requiredCapability));
    }

    return agents;
  }

  // ── Task Distribution ─────────────────────────────────────────────────────

  async createTask(
    type: string,
    description: string,
    input: any,
    options: {
      priority?: AgentTask['priority'];
      requiredCapabilities?: string[];
      deadline?: Date;
      parentTaskId?: string;
    } = {}
  ): Promise<AgentTask> {
    const task: AgentTask = {
      id: `task-${crypto.randomUUID()}`,
      type,
      description,
      priority: options.priority || 'normal',
      requiredCapabilities: options.requiredCapabilities || [],
      status: 'pending',
      input,
      createdAt: new Date(),
      deadline: options.deadline,
      retryCount: 0,
      maxRetries: 3,
      parentTaskId: options.parentTaskId,
      subtasks: [],
    };

    this.pendingTasks.set(task.id, task);

    // Task stored in memory

    // Auto-assign if possible
    await this.autoAssignTask(task);

    return task;
  }

  private async autoAssignTask(task: AgentTask): Promise<void> {
    const candidates = await this.findBestAgent(
      task.requiredCapabilities,
      task.priority
    );

    if (candidates.length === 0) {
      // Holly handles it herself
      task.assignedAgentId = this.localAgent?.id;
      task.status = 'assigned';
      return;
    }

    const best = candidates[0];
    task.assignedAgentId = best.id;
    task.status = 'assigned';

    // Send assignment message
    if (best.id !== this.localAgent?.id) {
      this.sendMessage(best.id, 'task_assignment', {
        taskId: task.id,
        type: task.type,
        description: task.description,
        input: task.input,
        deadline: task.deadline,
      });
    }
  }

  private async findBestAgent(
    requiredCapabilities: string[],
    priority: AgentTask['priority']
  ): Promise<AgentProfile[]> {
    const allAgents = await this.discoverAgents();

    // Filter agents with required capabilities
    const capable = allAgents.filter(agent => {
      const hasCapability = requiredCapabilities.every(cap =>
        agent.capabilities.includes(cap)
      );
      const hasCapacity = agent.currentLoad < agent.maxConcurrentTasks;
      const isAlive = Date.now() - agent.lastSeen.getTime() < 30 * 60 * 1000; // 30 min
      return hasCapability && hasCapacity && isAlive;
    });

    // Score and sort
    return capable.sort((a, b) => {
      // Priority boost for critical tasks
      const priorityBoost = priority === 'critical' ? 0.3 : priority === 'high' ? 0.15 : 0;

      const scoreA = (a.reliability * 0.4) +
        ((1 - a.currentLoad / a.maxConcurrentTasks) * 0.3) +
        ((1 - a.averageLatency / 5000) * 0.2) +
        priorityBoost;

      const scoreB = (b.reliability * 0.4) +
        ((1 - b.currentLoad / b.maxConcurrentTasks) * 0.3) +
        ((1 - b.averageLatency / 5000) * 0.2) +
        priorityBoost;

      return scoreB - scoreA;
    });
  }

  async completeTask(taskId: string, output: any, success: boolean): Promise<void> {
    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    task.status = success ? 'completed' : 'failed';
    task.output = output;
    task.completedAt = new Date();

    // Task updated in memory

    // If failed and retries remaining, reassign
    if (!success && task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = 'pending';
      task.assignedAgentId = undefined;
      await this.autoAssignTask(task);
    }

    // If this was a subtask, check if parent is complete
    if (task.parentTaskId) {
      await this.checkParentTaskCompletion(task.parentTaskId);
    }
  }

  private async checkParentTaskCompletion(parentTaskId: string): Promise<void> {
    const parent = this.pendingTasks.get(parentTaskId);
    if (!parent || parent.subtasks.length === 0) return;

    const allComplete = parent.subtasks.every(subId => {
      const sub = this.pendingTasks.get(subId);
      return sub?.status === 'completed' || sub?.status === 'failed';
    });

    if (allComplete) {
      const results = parent.subtasks.map(subId => {
        const sub = this.pendingTasks.get(subId);
        return { id: subId, status: sub?.status, output: sub?.output };
      });

      const allSuccess = results.every(r => r.status === 'completed');
      await this.completeTask(parentTaskId, { subtaskResults: results }, allSuccess);
    }
  }

  // ── Task Decomposition ────────────────────────────────────────────────────

  async decomposeTask(
    parentTask: AgentTask,
    subtaskDefinitions: Array<{
      type: string;
      description: string;
      input: any;
      requiredCapabilities?: string[];
      priority?: AgentTask['priority'];
    }>
  ): Promise<AgentTask[]> {
    const subtasks: AgentTask[] = [];

    for (const def of subtaskDefinitions) {
      const subtask = await this.createTask(
        def.type,
        def.description,
        def.input,
        {
          priority: def.priority || parentTask.priority,
          requiredCapabilities: def.requiredCapabilities || [],
          parentTaskId: parentTask.id,
        }
      );
      subtasks.push(subtask);
      parentTask.subtasks.push(subtask.id);
    }

    return subtasks;
  }

  // ── Consensus Mechanism ───────────────────────────────────────────────────

  async proposeConsensus(
    topic: string,
    description: string,
    options: Array<{ id: string; label: string; data?: any }>,
    deadlineMinutes: number = 5
  ): Promise<ConsensusProposal> {
    const proposal: ConsensusProposal = {
      id: `consensus-${crypto.randomUUID()}`,
      proposerId: this.localAgent?.id || 'unknown',
      topic,
      description,
      options,
      votes: [],
      status: 'open',
      deadline: new Date(Date.now() + deadlineMinutes * 60 * 1000),
      createdAt: new Date(),
    };

    this.activeConsensus.set(proposal.id, proposal);

    // Broadcast to all known agents
    const agents = await this.discoverAgents();
    for (const agent of agents) {
      if (agent.id !== this.localAgent?.id) {
        this.sendMessage(agent.id, 'consensus_vote', {
          proposalId: proposal.id,
          topic,
          description,
          options,
          deadline: proposal.deadline,
        });
      }
    }

    // Holly casts her own vote based on analysis
    await this.castVote(proposal.id);

    return proposal;
  }

  private async castVote(proposalId: string): Promise<void> {
    const proposal = this.activeConsensus.get(proposalId);
    if (!proposal || proposal.status !== 'open') return;

    // Analyze options and vote based on Holly's values and knowledge
    let bestOption = proposal.options[0]; // Default to first option
    let highestConfidence = 0;

    for (const option of proposal.options) {
      // Evaluate each option against Holly's capabilities and topic relevance
      const confidence = this.evaluateOptionConfidence(option, proposal.topic);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestOption = option; // Select the highest-confidence option
      }
    }

    proposal.votes.push({
      agentId: this.localAgent?.id || 'holly',
      optionId: bestOption.id,
      confidence: Math.max(0.5, highestConfidence),
      reasoning: `Auto-voted based on capability alignment and reliability assessment`,
    });
  }

  private evaluateOptionConfidence(option: { id: string; label: string; data?: any }, topic: string): number {
    // Base confidence
    let confidence = 0.5;

    // Boost if option aligns with Holly's strengths
    if (this.localAgent) {
      const relevantCaps = this.localAgent.capabilities.filter(cap =>
        topic.toLowerCase().includes(cap.split('_')[0])
      );
      confidence += relevantCaps.length * 0.1;
    }

    return Math.min(1.0, confidence);
  }

  async resolveConsensus(proposalId: string): Promise<ConsensusProposal | null> {
    const proposal = this.activeConsensus.get(proposalId);
    if (!proposal) return null;

    // Check if deadline passed or all agents voted
    const agents = await this.discoverAgents();
    const allVoted = agents.every(agent =>
      proposal.votes.some(v => v.agentId === agent.id)
    );

    const deadlinePassed = Date.now() > proposal.deadline.getTime();

    if (!allVoted && !deadlinePassed) {
      return proposal; // Still open
    }

    // Tally votes with confidence weighting
    const voteTally = new Map<string, number>();
    for (const vote of proposal.votes) {
      const current = voteTally.get(vote.optionId) || 0;
      voteTally.set(vote.optionId, current + vote.confidence);
    }

    // Find winner
    let maxVotes = 0;
    let winnerId = proposal.options[0]?.id || '';
    for (const [optionId, tally] of voteTally) {
      if (tally > maxVotes) {
        maxVotes = tally;
        winnerId = optionId;
      }
    }

    proposal.status = 'closed';
    proposal.winningOptionId = winnerId;

    return proposal;
  }

  // ── Conflict Resolution ───────────────────────────────────────────────────

  async resolveConflict(
    type: ConflictRecord['type'],
    agentIds: string[],
    description: string
  ): Promise<string> {
    const conflict: ConflictRecord = {
      id: `conflict-${crypto.randomUUID()}`,
      type,
      agents: agentIds,
      description,
      createdAt: new Date(),
      priority: type === 'resource_contention' ? 10 : type === 'task_overlap' ? 5 : 3,
    };

    let resolution: string;

    switch (type) {
      case 'task_overlap':
        resolution = await this.resolveTaskOverlap(conflict);
        break;
      case 'resource_contention':
        resolution = await this.resolveResourceContention(conflict);
        break;
      case 'result_contradiction':
        resolution = await this.resolveResultContradiction(conflict);
        break;
      case 'priority_clash':
        resolution = await this.resolvePriorityClash(conflict);
        break;
      default:
        resolution = 'No specific resolution strategy — defaulting to Holly\'s judgment';
    }

    conflict.resolution = resolution;
    conflict.resolvedBy = this.localAgent?.id;
    conflict.resolvedAt = new Date();

    // Conflict resolution logged
    console.log(`[AgentCoordinator] Conflict resolved: ${type} → ${resolution}`);

    return resolution;
  }

  private async resolveTaskOverlap(conflict: ConflictRecord): Promise<string> {
    // Find overlapping tasks from pendingTasks involving the conflicting agents
    const overlappingTasks = Array.from(this.pendingTasks.values()).filter(
      t => conflict.agents.includes(t.assignedAgentId || '') && t.status === 'in_progress'
    );

    if (overlappingTasks.length < 2) {
      return `No actionable overlap found — conflict dismissed as informational.`;
    }

    // Score each task by priority + capability match to find the best owner
    const scored = overlappingTasks.map(task => ({
      task,
      score: this.scoreTaskForAgent(task, conflict.agents),
    })).sort((a, b) => b.score - a.score);

    // Merge all into the highest-scored task, cancel the rest
    const winner = scored[0];
    const losers = scored.slice(1);

    for (const { task } of losers) {
      task.status = 'cancelled';
      // Move subtasks to winner
      winner.task.subtasks.push(...task.subtasks.filter(s => !winner.task.subtasks.includes(s)));
      this.pendingTasks.delete(task.id);
    }

    return `Merged ${losers.length} overlapping task(s) into "${winner.task.description}" (assigned to ${winner.task.assignedAgentId || 'best fit'}). ${losers.length} redundant task(s) cancelled.`;
  }

  private async resolveResourceContention(conflict: ConflictRecord): Promise<string> {
    // Gather all in-progress tasks for the conflicting agents
    const tasks = Array.from(this.pendingTasks.values()).filter(
      t => conflict.agents.includes(t.assignedAgentId || '') && t.status === 'in_progress'
    );

    // Sort by priority weight: critical=4, high=3, normal=2, low=1
    const priorityWeight = { critical: 4, high: 3, normal: 2, low: 1 } as const;
    tasks.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

    // Top task gets resources first; others are paused (queued)
    const paused = tasks.slice(1);
    for (const task of paused) {
      task.status = 'pending'; // Return to pending so it can be reassigned later
    }

    return `Resource contention resolved: "${tasks[0]?.description}" (${tasks[0]?.priority} priority) retains resources. ${paused.length} lower-priority task(s) queued for later execution.`;
  }

  private async resolveResultContradiction(conflict: ConflictRecord): Promise<string> {
    // For each agent involved, find their completed tasks and score by reliability
    const agentScores = conflict.agents.map(agentId => {
      const profile = this.knownAgents.get(agentId);
      const completedTasks = Array.from(this.pendingTasks.values()).filter(
        t => t.assignedAgentId === agentId && t.status === 'completed'
      );
      return {
        agentId,
        reliability: profile?.reliability || 0.5,
        completedCount: completedTasks.length,
      };
    }).sort((a, b) => b.reliability - a.reliability);

    const best = agentScores[0];
    if (!best) return `No reliable agent found — contradiction unresolved, flagged for human review.`;

    return `Result contradiction resolved via reliability scoring: agent "${best.agentId}" (reliability: ${(best.reliability * 100).toFixed(0)}%, ${best.completedCount} completed tasks) accepted as authoritative source.`;
  }

  private async resolvePriorityClash(conflict: ConflictRecord): Promise<string> {
    // Use Holly's value hierarchy: user-facing > system health > optimization > background
    const valueOrder = ['critical', 'high', 'normal', 'low'] as const;
    const tasks = Array.from(this.pendingTasks.values()).filter(
      t => conflict.agents.includes(t.assignedAgentId || '') && t.status !== 'completed'
    );

    // Check if any task directly impacts the user (heuristic: description contains user-facing keywords)
    const userFacingKeywords = ['user', 'chat', 'response', 'conversation', 'emergency', 'alert'];
    const userFacing = tasks.find(t =>
      userFacingKeywords.some(kw => t.description.toLowerCase().includes(kw))
    );

    if (userFacing) {
      // Promote user-facing task to critical
      userFacing.priority = 'critical';
      return `Priority clash resolved by Holly's value engine: user-impacting task "${userFacing.description}" elevated to critical. Other tasks deprioritized.`;
    }

    // Fallback: use standard priority ordering
    tasks.sort((a, b) => valueOrder.indexOf(a.priority) - valueOrder.indexOf(b.priority));
    return `Priority clash resolved by standard ordering: "${tasks[0]?.description}" (${tasks[0]?.priority}) takes precedence over ${tasks.length - 1} other task(s).`;
  }

  /** Score a task's suitability for assignment to one of the given agents */
  private scoreTaskForAgent(task: AgentTask, agentIds: string[]): number {
    let score = 0;
    const priorityWeight = { critical: 40, high: 30, normal: 20, low: 10 } as const;
    score += priorityWeight[task.priority] || 0;

    // Bonus if assigned agent has high reliability
    const agent = this.knownAgents.get(task.assignedAgentId || '');
    if (agent) {
      score += agent.reliability * 25;
      // Bonus for capability match
      const matchCount = task.requiredCapabilities.filter(c =>
        agent.capabilities.some(ac => ac.includes(c) || c.includes(ac))
      ).length;
      score += matchCount * 10;
    }

    return score;
  }

  // ── Inter-Agent Communication ─────────────────────────────────────────────

  private sendMessage(
    toAgentId: string,
    type: AgentMessage['type'],
    payload: any
  ): void {
    const message: AgentMessage = {
      id: `msg-${crypto.randomUUID()}`,
      fromAgentId: this.localAgent?.id || 'unknown',
      toAgentId,
      type,
      payload,
      timestamp: new Date(),
      read: false,
    };

    this.messageQueue.push(message);
  }

  getPendingMessages(): AgentMessage[] {
    return this.messageQueue.filter(m => !m.read);
  }

  markMessageRead(messageId: string): void {
    const msg = this.messageQueue.find(m => m.id === messageId);
    if (msg) msg.read = true;
  }

  // ── Status & Metrics ──────────────────────────────────────────────────────

  async getCoordinatorStatus(): Promise<{
    localAgent: AgentProfile | null;
    knownAgents: number;
    pendingTasks: number;
    activeConsensus: number;
    unresolvedConflicts: number;
  }> {
    return {
      localAgent: this.localAgent,
      knownAgents: this.knownAgents.size,
      pendingTasks: Array.from(this.pendingTasks.values()).filter(t => t.status === 'pending' || t.status === 'assigned').length,
      activeConsensus: Array.from(this.activeConsensus.values()).filter(c => c.status === 'open').length,
      unresolvedConflicts: 0,
    };
  }

  async getTaskMetrics(): Promise<{
    total: number;
    completed: number;
    failed: number;
    avgCompletionTime: number;
    byType: Record<string, number>;
  }> {
    const tasks = Array.from(this.pendingTasks.values());
    const completed = tasks.filter(t => t.status === 'completed');

    const completionTimes = completed
      .filter(t => t.completedAt && t.startedAt)
      .map(t => t.completedAt!.getTime() - t.startedAt!.getTime());

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    const byType: Record<string, number> = {};
    for (const task of tasks) {
      byType[task.type] = (byType[task.type] || 0) + 1;
    }

    return {
      total: tasks.length,
      completed: completed.length,
      failed: tasks.filter(t => t.status === 'failed').length,
      avgCompletionTime,
      byType,
    };
  }

  // ── Self-Registration (called on startup) ─────────────────────────────────

  async initialize(): Promise<void> {
    if (this.localAgent) {
      await this.registerAgent(this.localAgent);
    }
    console.log('[AgentCoordinator] Initialized — Holly registered as coordinator');
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const agentCoordinator = new AgentCoordinator();
export type { AgentProfile, AgentTask, AgentMessage, ConsensusProposal, ConflictRecord };