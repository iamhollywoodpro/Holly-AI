'use client';

import { useState, useEffect } from 'react';
import { PlayIcon, XMarkIcon, ArrowPathIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Workflow, WorkflowRun } from '@/types/workflow';

interface WorkflowsPanelProps {
  owner: string;
  repo: string;
  onTriggerWorkflow?: (workflowId: number, workflowName: string) => void;
  onViewRun?: (runId: number) => void;
}

interface WorkflowWithRun extends Workflow {
  lastRun?: {
    id: number;
    status: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    html_url: string;
  } | null;
}

export default function WorkflowsPanel({ 
  owner, 
  repo,
  onTriggerWorkflow,
  onViewRun,
}: WorkflowsPanelProps) {
  const [workflows, setWorkflows] = useState<WorkflowWithRun[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'runs'>('workflows');
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);

  // Fetch workflows
  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/github/workflows?owner=${owner}&repo=${repo}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch workflows');
        }

        const data = await response.json();
        setWorkflows(data.workflows || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, [owner, repo]);

  // Fetch runs when switching to runs tab
  useEffect(() => {
    if (activeTab === 'runs') {
      fetchRuns();
    }
  }, [activeTab, selectedWorkflow]);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        per_page: '20',
      });

      if (selectedWorkflow) {
        params.append('workflow_id', selectedWorkflow.toString());
      }

      const response = await fetch(`/api/github/workflows/runs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch workflow runs');
      }

      const data = await response.json();
      setRuns(data.workflow_runs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRun = async (runId: number) => {
    try {
      const response = await fetch(`/api/github/workflows/runs/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          owner,
          repo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel workflow run');
      }

      // Refresh runs
      fetchRuns();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRerunWorkflow = async (runId: number, failedOnly: boolean = false) => {
    try {
      const response = await fetch(`/api/github/workflows/runs/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: failedOnly ? 'rerun-failed' : 'rerun',
          owner,
          repo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rerun workflow');
      }

      // Refresh runs after a moment
      setTimeout(() => fetchRuns(), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') {
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      } else if (conclusion === 'failure') {
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      } else if (conclusion === 'cancelled') {
        return <XMarkIcon className="w-5 h-5 text-gray-500" />;
      }
    } else if (status === 'in_progress') {
      return (
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      );
    } else if (status === 'queued') {
      return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
    return <ClockIcon className="w-5 h-5 text-gray-400" />;
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') return 'text-green-600 bg-green-50';
      if (conclusion === 'failure') return 'text-red-600 bg-red-50';
      if (conclusion === 'cancelled') return 'text-gray-600 bg-gray-50';
    }
    if (status === 'in_progress') return 'text-blue-600 bg-blue-50';
    if (status === 'queued') return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && workflows.length === 0 && runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'workflows'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Workflows ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab('runs')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'runs'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Recent Runs
        </button>
      </div>

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-3">
          {workflows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No workflows found in this repository</p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                      {workflow.state !== 'active' && (
                        <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                          {workflow.state}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{workflow.path}</p>
                    
                    {workflow.lastRun && (
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusIcon(workflow.lastRun.status, workflow.lastRun.conclusion)}
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(workflow.lastRun.status, workflow.lastRun.conclusion)}`}>
                          {workflow.lastRun.conclusion || workflow.lastRun.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(workflow.lastRun.created_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedWorkflow(workflow.id);
                        setActiveTab('runs');
                      }}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="View runs"
                    >
                      <ClockIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onTriggerWorkflow?.(workflow.id, workflow.name)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Trigger workflow"
                    >
                      <PlayIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === 'runs' && (
        <div className="space-y-3">
          {selectedWorkflow && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">
                Showing runs for: <span className="font-semibold">{workflows.find(w => w.id === selectedWorkflow)?.name || 'All'}</span>
              </span>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-xs text-purple-600 hover:underline"
              >
                Show all
              </button>
            </div>
          )}

          {runs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No workflow runs found</p>
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status, run.conclusion)}
                      <h3 className="font-semibold text-gray-900">{run.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(run.status, run.conclusion)}`}>
                        {run.conclusion || run.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>#{run.run_number}</span>
                      <span className="flex items-center gap-1">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{run.head_branch}</span>
                      </span>
                      <span>{formatDate(run.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <img 
                        src={run.actor.avatar_url} 
                        alt={run.actor.login}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-xs text-gray-600">{run.actor.login}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {run.status === 'in_progress' && (
                      <button
                        onClick={() => handleCancelRun(run.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancel run"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                    {run.status === 'completed' && (
                      <button
                        onClick={() => handleRerunWorkflow(run.id, run.conclusion === 'failure')}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={run.conclusion === 'failure' ? 'Rerun failed jobs' : 'Rerun workflow'}
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewRun?.(run.id)}
                      className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
