/**
 * PHASE 3: Self-Healing Control Panel
 * Admin UI for monitoring and triggering autonomous code repairs
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Zap
} from 'lucide-react';

interface SelfHealingAction {
  id: string;
  actionType: string;
  description: string;
  status: string;
  attemptCount: number;
  createdAt: string;
  lastAttempt?: string;
  result?: string;
  codeChange: {
    commitSha: string;
    commitMessage: string;
  };
}

interface SelfHealingStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export function SelfHealingPanel() {
  const [actions, setActions] = useState<SelfHealingAction[]>([]);
  const [stats, setStats] = useState<SelfHealingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch self-healing status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/self-healing/trigger');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setActions(data.actions);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch self-healing status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger self-healing
  const triggerHealing = async () => {
    try {
      setTriggering(true);
      const response = await fetch('/api/admin/self-healing/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Self-healing triggered successfully!\nProcessed ${data.processed} actions`);
        fetchStatus(); // Refresh status
      } else {
        alert(`❌ Self-healing failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`❌ Self-healing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTriggering(false);
    }
  };

  // Initial load and refresh every 30 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      typescript_fix: 'TypeScript Fix',
      prisma_migration: 'Prisma Migration',
      dependency_update: 'Dependency Update',
      api_fix: 'API Fix'
    };
    return labels[type] || type;
  };

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading self-healing status...</span>
        </div>
      </div>
    );
  }

  const successRate = stats.total > 0 
    ? ((stats.completed / stats.total) * 100).toFixed(1) 
    : '0';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Self-Healing System
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Autonomous code repair & error fixing
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={triggerHealing}
            disabled={triggering || stats.pending === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>{triggering ? 'Healing...' : 'Trigger Healing'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Actions</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending}
          </div>
          <div className="text-sm text-yellow-700 dark:text-yellow-500">Pending</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.inProgress}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-500">In Progress</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.completed}
          </div>
          <div className="text-sm text-green-700 dark:text-green-500">Completed</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.failed}
          </div>
          <div className="text-sm text-red-700 dark:text-red-500">Failed</div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-white">Success Rate</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {successRate}%
          </span>
        </div>
      </div>

      {/* Recent Actions */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Recent Actions ({actions.length})
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {actions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No self-healing actions yet</p>
              <p className="text-sm">HOLLY will automatically create actions when issues are detected</p>
            </div>
          ) : (
            actions.map((action) => (
              <div
                key={action.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(action.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getActionTypeLabel(action.actionType)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          action.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400' :
                          action.status === 'failed' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400' :
                          action.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400' :
                          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {action.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {action.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                        <span>Commit: {action.codeChange.commitSha.substring(0, 7)}</span>
                        <span>Attempts: {action.attemptCount}</span>
                        <span>{new Date(action.createdAt).toLocaleString()}</span>
                      </div>
                      {action.result && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                          <strong>Result:</strong> {action.result}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
