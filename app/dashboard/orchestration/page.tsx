'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import { Cpu, Activity, Clock, PlayCircle, PauseCircle, AlertCircle, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { useAgents, useWorkflows, useTasks, useResourceUtilization } from '@/hooks/useOrchestration';

export default function OrchestrationDashboardPage() {
  const { agents, loading: agentsLoading, createAgent } = useAgents();
  const { workflows, loading: workflowsLoading, executeWorkflow, pauseWorkflow, resumeWorkflow } = useWorkflows();
  const { tasks, loading: tasksLoading, scheduleTask } = useTasks();
  const { resources, loading: resourcesLoading } = useResourceUtilization();

  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('general');
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    try {
      await createAgent({
        name: agentName,
        type: agentType,
        capabilities: ['task_execution', 'analysis'],
        config: {}
      });
      setAgentName('');
      setShowAgentForm(false);
    } catch (err) {
      console.error('Agent creation failed:', err);
    }
  };

  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      await scheduleTask({
        title: taskTitle,
        priority: taskPriority,
      });
      setTaskTitle('');
      setShowTaskForm(false);
    } catch (err) {
      console.error('Task scheduling failed:', err);
    }
  };

  const handleWorkflowAction = async (workflowId: string, action: 'execute' | 'pause' | 'resume') => {
    try {
      if (action === 'execute') await executeWorkflow(workflowId);
      else if (action === 'pause') await pauseWorkflow(workflowId);
      else if (action === 'resume') await resumeWorkflow(workflowId);
    } catch (err) {
      console.error(`Workflow ${action} failed:`, err);
    }
  };

  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'busy').length;
  const runningWorkflows = workflows.filter(w => w.status === 'running').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;

  if (agentsLoading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orchestration Hub</h1>
          <p className="mt-2 text-gray-600">
            Manage agents, workflows, tasks, and system resources.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Agents"
          value={`${activeAgents}/${agents.length}`}
          change={`${agents.length} total agents`}
          changeType="neutral"
          icon={Cpu}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Running Workflows"
          value={runningWorkflows.toString()}
          change={`${workflows.length} total`}
          changeType="neutral"
          icon={Activity}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Pending Tasks"
          value={pendingTasks.toString()}
          change={`${tasks.length} total tasks`}
          changeType="neutral"
          icon={Clock}
          iconColor="text-orange-600"
        />
        <MetricCard
          title="CPU Usage"
          value={resources ? `${resources.cpu}%` : '--'}
          change="System resources"
          changeType={resources && resources.cpu > 80 ? 'negative' : 'positive'}
          icon={Activity}
          iconColor="text-purple-600"
        />
      </div>

      {/* Resource Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          {resourcesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : !resources ? (
            <div className="py-8 text-center text-gray-500">
              No resource data available
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">CPU</span>
                  <span className="text-sm font-medium text-gray-900">{resources.cpu}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${
                      resources.cpu > 80 ? 'bg-red-500' :
                      resources.cpu > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${resources.cpu}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Memory</span>
                  <span className="text-sm font-medium text-gray-900">{resources.memory}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${
                      resources.memory > 80 ? 'bg-red-500' :
                      resources.memory > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${resources.memory}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Storage</span>
                  <span className="text-sm font-medium text-gray-900">{resources.storage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${
                      resources.storage > 80 ? 'bg-red-500' :
                      resources.storage > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${resources.storage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Network</span>
                  <span className="text-sm font-medium text-gray-900">{resources.network}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${
                      resources.network > 80 ? 'bg-red-500' :
                      resources.network > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${resources.network}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agents & Workflows */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agent Status</CardTitle>
              <button 
                onClick={() => setShowAgentForm(!showAgentForm)}
                className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                New Agent
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {showAgentForm && (
              <form onSubmit={handleCreateAgent} className="mb-4 p-4 border border-gray-200 rounded-lg space-y-3">
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Agent name..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
                <select 
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="general">General</option>
                  <option value="creative">Creative</option>
                  <option value="analytical">Analytical</option>
                  <option value="security">Security</option>
                </select>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    Create
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAgentForm(false)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {agentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : agents.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No agents yet. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {agents.slice(0, 5).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-yellow-500' :
                        agent.status === 'idle' ? 'bg-gray-400' :
                        'bg-red-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                        <p className="text-xs text-gray-500">{agent.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">{agent.performance.tasksCompleted} tasks</p>
                      <p className="text-xs text-gray-500">{agent.performance.successRate}% success</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Workflows */}
        <Card>
          <CardHeader>
            <CardTitle>Active Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            {workflowsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No workflows created yet
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.slice(0, 5).map((workflow) => (
                  <div
                    key={workflow.id}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{workflow.name}</p>
                        <p className="text-xs text-gray-500">{workflow.steps.length} steps</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        workflow.status === 'running' ? 'bg-green-100 text-green-700' :
                        workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                        workflow.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        workflow.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {workflow.status}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{workflow.progress}% complete</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2">
                      {workflow.status === 'draft' && (
                        <button 
                          onClick={() => handleWorkflowAction(workflow.id, 'execute')}
                          className="flex items-center gap-1 rounded border border-green-600 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                        >
                          <PlayCircle className="h-3 w-3" />
                          Start
                        </button>
                      )}
                      {workflow.status === 'running' && (
                        <button 
                          onClick={() => handleWorkflowAction(workflow.id, 'pause')}
                          className="flex items-center gap-1 rounded border border-yellow-600 px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50"
                        >
                          <PauseCircle className="h-3 w-3" />
                          Pause
                        </button>
                      )}
                      {workflow.status === 'paused' && (
                        <button 
                          onClick={() => handleWorkflowAction(workflow.id, 'resume')}
                          className="flex items-center gap-1 rounded border border-green-600 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                        >
                          <PlayCircle className="h-3 w-3" />
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task Queue</CardTitle>
            <button 
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {showTaskForm && (
            <form onSubmit={handleScheduleTask} className="mb-4 p-4 border border-gray-200 rounded-lg space-y-3">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
              <select 
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Schedule
                </button>
                <button 
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No tasks in queue
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : task.status === 'failed' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'running' ? 'bg-yellow-100 text-yellow-700' :
                      task.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
