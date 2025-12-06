'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import {
  Network,
  Cpu,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Square,
  Plus,
} from 'lucide-react';

export default function OrchestrationDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orchestration Hub</h1>
          <p className="mt-2 text-gray-600">
            Manage agents, workflows, tasks, and resources.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Plus className="h-4 w-4" />
            New Workflow
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
            <Plus className="h-4 w-4" />
            Create Agent
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Agents"
          value="12"
          change="3 idle, 9 busy"
          changeType="neutral"
          icon={Network}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Running Workflows"
          value="8"
          change="2 completed today"
          changeType="positive"
          icon={Cpu}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Pending Tasks"
          value="24"
          change="5 high priority"
          changeType="neutral"
          icon={Clock}
          iconColor="text-orange-600"
        />
        <MetricCard
          title="Success Rate"
          value="94%"
          change="+2% from yesterday"
          changeType="positive"
          icon={CheckCircle}
          iconColor="text-purple-600"
        />
      </div>

      {/* Agents Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Agents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Agents</CardTitle>
              <span className="text-sm text-gray-500">12 total</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AgentItem
                name="Agent-001"
                status="busy"
                tasks={3}
                successRate={98}
              />
              <AgentItem
                name="Agent-002"
                status="idle"
                tasks={0}
                successRate={96}
              />
              <AgentItem
                name="Agent-003"
                status="busy"
                tasks={2}
                successRate={94}
              />
              <AgentItem
                name="Agent-004"
                status="busy"
                tasks={1}
                successRate={99}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resource Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ResourceBar label="CPU" value={65} color="bg-blue-500" />
              <ResourceBar label="Memory" value={52} color="bg-green-500" />
              <ResourceBar label="Storage" value={38} color="bg-purple-500" />
              <ResourceBar label="Network" value={74} color="bg-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows & Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Workflows */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Workflows</CardTitle>
              <span className="text-sm text-gray-500">8 running</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <WorkflowItem
                name="Data Processing Pipeline"
                status="running"
                progress={65}
                agent="Agent-001"
              />
              <WorkflowItem
                name="Image Generation Batch"
                status="running"
                progress={45}
                agent="Agent-003"
              />
              <WorkflowItem
                name="Report Generation"
                status="running"
                progress={80}
                agent="Agent-004"
              />
            </div>
          </CardContent>
        </Card>

        {/* Task Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Task Queue</CardTitle>
              <span className="text-sm text-gray-500">24 pending</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <TaskItem
                title="Analyze user data"
                priority="high"
                estimatedTime="5 min"
              />
              <TaskItem
                title="Generate monthly report"
                priority="normal"
                estimatedTime="10 min"
              />
              <TaskItem
                title="Process image batch"
                priority="high"
                estimatedTime="3 min"
              />
              <TaskItem
                title="Cleanup old logs"
                priority="low"
                estimatedTime="15 min"
              />
              <TaskItem
                title="Send notifications"
                priority="normal"
                estimatedTime="2 min"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AgentItem({
  name,
  status,
  tasks,
  successRate,
}: {
  name: string;
  status: 'idle' | 'busy' | 'offline';
  tasks: number;
  successRate: number;
}) {
  const statusConfig = {
    idle: { color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
    busy: { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    offline: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${config.dot}`} />
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">
            {tasks} active {tasks === 1 ? 'task' : 'tasks'} • {successRate}% success
          </p>
        </div>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${config.color}`}>
        {status}
      </span>
    </div>
  );
}

function ResourceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function WorkflowItem({
  name,
  status,
  progress,
  agent,
}: {
  name: string;
  status: string;
  progress: number;
  agent: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">Assigned to {agent}</p>
        </div>
        <div className="flex gap-1">
          <button className="rounded p-1 hover:bg-gray-100">
            <Pause className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-1 hover:bg-gray-100">
            <Square className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-purple-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  title,
  priority,
  estimatedTime,
}: {
  title: string;
  priority: 'high' | 'normal' | 'low';
  estimatedTime: string;
}) {
  const priorityConfig = {
    high: 'bg-red-100 text-red-700',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">Est. {estimatedTime}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityConfig[priority]}`}>
        {priority}
      </span>
    </div>
  );
}
