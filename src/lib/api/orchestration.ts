// API Client for Orchestration Dashboard
import { auth } from '@clerk/nextjs/server';

const API_BASE = '/api';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  capabilities: string[];
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
  createdAt: Date;
  lastActiveAt?: Date;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  steps: Array<{
    id: string;
    name: string;
    type: string;
    config: any;
    status: string;
  }>;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  workflowId?: string;
  estimatedTime?: number;
  actualTime?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  activeAgents: number;
  queuedTasks: number;
}

// Agents
export async function listAgents(filters?: {
  status?: string;
  type?: string;
}): Promise<Agent[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);

  const response = await fetch(`${API_BASE}/orchestration/agents?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
}

export async function getAgentStatus(agentId: string): Promise<Agent> {
  const response = await fetch(`${API_BASE}/orchestration/agents/${agentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch agent status');
  return response.json();
}

export async function createAgent(data: {
  name: string;
  type: string;
  capabilities: string[];
  config?: any;
}): Promise<Agent> {
  const response = await fetch(`${API_BASE}/orchestration/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create agent');
  return response.json();
}

// Workflows
export async function listWorkflows(filters?: {
  status?: string;
}): Promise<Workflow[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);

  const response = await fetch(`${API_BASE}/orchestration/workflows?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch workflows');
  return response.json();
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/orchestration/workflows/${workflowId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch workflow');
  return response.json();
}

export async function createWorkflow(data: {
  name: string;
  description?: string;
  steps: Array<{ name: string; type: string; config: any }>;
}): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/orchestration/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create workflow');
  return response.json();
}

export async function executeWorkflow(workflowId: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/orchestration/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to execute workflow');
  return response.json();
}

export async function pauseWorkflow(workflowId: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/orchestration/workflows/${workflowId}/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pause' }),
  });
  if (!response.ok) throw new Error('Failed to pause workflow');
  return response.json();
}

export async function resumeWorkflow(workflowId: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/orchestration/workflows/${workflowId}/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resume' }),
  });
  if (!response.ok) throw new Error('Failed to resume workflow');
  return response.json();
}

// Tasks
export async function listTasks(filters?: {
  status?: string;
  priority?: string;
  workflowId?: string;
}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.workflowId) params.append('workflowId', filters.workflowId);

  const response = await fetch(`${API_BASE}/orchestration/tasks?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
}

export async function scheduleTask(data: {
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  agentId?: string;
  workflowId?: string;
  estimatedTime?: number;
}): Promise<Task> {
  const response = await fetch(`${API_BASE}/orchestration/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to schedule task');
  return response.json();
}

// Resources
export async function getResourceUtilization(): Promise<ResourceUtilization> {
  const response = await fetch(`${API_BASE}/orchestration/resources/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch resource utilization');
  return response.json();
}
