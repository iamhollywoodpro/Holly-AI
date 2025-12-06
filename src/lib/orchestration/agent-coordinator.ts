/**
 * AGENT COORDINATOR
 * Multi-agent coordination, task delegation, agent state management
 */

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
  assignments: Record<string, string[]>; // agentId -> taskIds
  estimatedTime: number;
}

// In-memory agent registry (in production, use Redis or database)
const agentRegistry: Map<string, Agent> = new Map();

/**
 * Create a new agent
 */
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

/**
 * Get agent by ID
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
  try {
    return agentRegistry.get(agentId) || null;
  } catch (error) {
    console.error('Error getting agent:', error);
    return null;
  }
}

/**
 * List agents with filters
 */
export async function listAgents(filters?: AgentFilters): Promise<Agent[]> {
  try {
    let agents = Array.from(agentRegistry.values());

    if (filters?.type) {
      agents = agents.filter((a) => a.type === filters.type);
    }

    if (filters?.status) {
      agents = agents.filter((a) => a.status === filters.status);
    }

    if (filters?.capability) {
      agents = agents.filter((a) => a.capabilities.includes(filters.capability!));
    }

    if (filters?.limit) {
      agents = agents.slice(0, filters.limit);
    }

    return agents;
  } catch (error) {
    console.error('Error listing agents:', error);
    return [];
  }
}

/**
 * Assign task to agent
 */
export async function assignTask(
  agentId: string,
  task: Task
): Promise<{ success: boolean; error?: string }> {
  try {
    const agent = agentRegistry.get(agentId);
    
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    if (agent.currentTasks.length >= agent.maxConcurrentTasks) {
      return { success: false, error: 'Agent at capacity' };
    }

    // Check if agent has required capabilities
    const hasCapabilities = task.requiredCapabilities.every((cap) =>
      agent.capabilities.includes(cap)
    );

    if (!hasCapabilities) {
      return { success: false, error: 'Agent lacks required capabilities' };
    }

    agent.currentTasks.push(task.id);
    agent.status = 'busy';

    return { success: true };
  } catch (error) {
    console.error('Error assigning task:', error);
    return { success: false, error: 'Failed to assign task' };
  }
}

/**
 * Get agent status
 */
export async function getAgentStatus(agentId: string): Promise<AgentStatus | null> {
  try {
    const agent = agentRegistry.get(agentId);
    
    if (!agent) {
      return null;
    }

    const uptime = Date.now() - agent.createdAt.getTime();
    const totalTasks = agent.completedTasks + agent.failedTasks;
    const successRate = totalTasks > 0 ? agent.completedTasks / totalTasks : 1.0;

    return {
      agentId: agent.id,
      status: agent.status,
      currentTasks: [], // Would fetch actual tasks in production
      completedTasks: agent.completedTasks,
      uptime: Math.floor(uptime / 1000), // seconds
      performance: {
        successRate,
        averageTaskTime: 0, // Would calculate from task history
      },
    };
  } catch (error) {
    console.error('Error getting agent status:', error);
    return null;
  }
}

/**
 * Coordinate multiple agents for a complex goal
 */
export async function coordinateAgents(
  agentIds: string[],
  goal: string
): Promise<CoordinationResult> {
  try {
    // Get all agents
    const agents = agentIds
      .map((id) => agentRegistry.get(id))
      .filter((a): a is Agent => a !== undefined);

    if (agents.length === 0) {
      return {
        success: false,
        plan: [],
        assignments: {},
        estimatedTime: 0,
      };
    }

    // Simple coordination: distribute work evenly
    // In production, this would use AI to analyze goal and create optimal plan
    const plan = [
      'Analyze goal requirements',
      'Decompose into subtasks',
      'Assign tasks to agents',
      'Execute in parallel',
      'Aggregate results',
    ];

    const assignments: Record<string, string[]> = {};
    agents.forEach((agent) => {
      assignments[agent.id] = [`task_for_${agent.id}`];
    });

    return {
      success: true,
      plan,
      assignments,
      estimatedTime: 300, // 5 minutes estimate
    };
  } catch (error) {
    console.error('Error coordinating agents:', error);
    return {
      success: false,
      plan: [],
      assignments: {},
      estimatedTime: 0,
    };
  }
}
