'use client';

import { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface Deployment {
  id: string;
  url: string;
  state: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  createdAt: number;
  readyAt?: number;
  commit: {
    sha: string | null;
    message: string | null;
    author: string | null;
  };
  target: string;
  duration: number | null;
}

interface DeploymentHistoryProps {
  onRollback?: (deploymentId: string) => void;
}

export function DeploymentHistory({ onRollback }: DeploymentHistoryProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [currentProduction, setCurrentProduction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vercel/rollback?limit=15');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setDeployments(data.deployments);
      setCurrentProduction(data.currentProduction);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deployment history');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback to this deployment?')) {
      return;
    }

    try {
      setRollingBack(deploymentId);
      
      const response = await fetch('/api/vercel/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId,
          targetEnvironment: 'production',
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        alert(`Rollback failed: ${data.error || 'Unknown error'}`);
        return;
      }

      alert('✅ Rollback successful! Production is now running the selected deployment.');
      onRollback?.(deploymentId);
      fetchDeployments(); // Refresh list
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setRollingBack(null);
    }
  };

  const getStateIcon = (state: Deployment['state']) => {
    switch (state) {
      case 'READY':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'ERROR':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'BUILDING':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'QUEUED':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      case 'CANCELED':
        return <XCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStateColor = (state: Deployment['state']) => {
    switch (state) {
      case 'READY':
        return 'text-green-400';
      case 'ERROR':
        return 'text-red-400';
      case 'BUILDING':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-400">Loading deployment history...</div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-800/50 rounded-lg animate-pulse mt-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-400">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <div className="text-sm font-semibold text-white">Deployment History</div>
          <div className="text-xs text-gray-500">Last 15 deployments</div>
        </div>
        <button
          onClick={fetchDeployments}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Deployments List */}
      <div className="space-y-2 px-4 pb-4 max-h-96 overflow-y-auto">
        {deployments.map((deployment) => {
          const isCurrentProd = deployment.id === currentProduction;
          const canRollback = deployment.state === 'READY' && !isCurrentProd;

          return (
            <div
              key={deployment.id}
              className={`
                bg-gray-800/50 rounded-lg p-3 border transition-all
                ${isCurrentProd 
                  ? 'border-green-500/50 bg-green-500/10' 
                  : 'border-gray-700/50 hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* State Icon */}
                  {getStateIcon(deployment.state)}

                  {/* Deployment Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${getStateColor(deployment.state)}`}>
                        {deployment.state}
                      </span>
                      {deployment.commit.sha && (
                        <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded">
                          {deployment.commit.sha.substring(0, 7)}
                        </span>
                      )}
                      {deployment.target === 'production' && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          Production
                        </span>
                      )}
                      {isCurrentProd && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                          ✓ Current
                        </span>
                      )}
                    </div>

                    {deployment.commit.message && (
                      <div className="text-sm text-white mb-1 line-clamp-1">
                        {deployment.commit.message.split('\n')[0]}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(deployment.createdAt)}</span>
                      {deployment.duration && (
                        <span>• {formatDuration(deployment.duration)}</span>
                      )}
                      {deployment.commit.author && (
                        <span>• {deployment.commit.author}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rollback Button */}
                {canRollback && (
                  <button
                    onClick={() => handleRollback(deployment.id)}
                    disabled={rollingBack === deployment.id}
                    className="px-3 py-1.5 text-xs font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded border border-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {rollingBack === deployment.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        Rolling back...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-3 h-3" />
                        Rollback
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Warning for old deployments */}
              {canRollback && deployment.createdAt < Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                <div className="mt-2 flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 rounded p-2">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>This deployment is over 7 days old. Proceed with caution.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
