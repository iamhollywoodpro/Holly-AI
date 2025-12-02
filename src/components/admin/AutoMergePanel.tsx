/**
 * Auto-Merge PR Panel
 * Phase 4A - UI for auto-merge PR system
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, GitMerge, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface PullRequest {
  id: string;
  prNumber: number;
  prUrl: string;
  title: string;
  description: string | null;
  branch: string;
  autoMergeable: boolean;
  safetyScore: number;
  riskFactors: string[];
  checksStatus: string;
  status: string;
  merged: boolean;
  mergedAt: Date | null;
  rolledBack: boolean;
  createdAt: Date;
  selfHealingAction?: {
    healingType: string;
    issueType: string;
    status: string;
  };
}

interface AutoMergeStats {
  total: number;
  autoMergeable: number;
  merged: number;
  rolledBack: number;
  avgSafetyScore: number;
}

export function AutoMergePanel() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [stats, setStats] = useState<AutoMergeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState<{ [key: number]: boolean }>({});
  const [merging, setMerging] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchPRs();
  }, []);

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/auto-merge/list');
      const data = await response.json();
      
      if (data.success) {
        setPrs(data.prs || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluatePR = async (prNumber: number) => {
    setEvaluating(prev => ({ ...prev, [prNumber]: true }));
    try {
      const response = await fetch('/api/admin/auto-merge/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update PR in list
        setPrs(prev => prev.map(pr => 
          pr.prNumber === prNumber ? data.pr : pr
        ));
      }
    } catch (error) {
      console.error('Error evaluating PR:', error);
    } finally {
      setEvaluating(prev => ({ ...prev, [prNumber]: false }));
    }
  };

  const mergePR = async (prNumber: number) => {
    if (!confirm(`Are you sure you want to auto-merge PR #${prNumber}?`)) {
      return;
    }

    setMerging(prev => ({ ...prev, [prNumber]: true }));
    try {
      const response = await fetch(`/api/admin/auto-merge/merge/${prNumber}`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchPRs(); // Refresh list
      } else {
        alert(`Failed to merge: ${data.error}`);
      }
    } catch (error) {
      console.error('Error merging PR:', error);
      alert('Failed to merge PR');
    } finally {
      setMerging(prev => ({ ...prev, [prNumber]: false }));
    }
  };

  const rollbackPR = async (prNumber: number) => {
    const reason = prompt('Enter rollback reason:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/auto-merge/rollback/${prNumber}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Rollback PR created: ${data.revertPRUrl}`);
        fetchPRs();
      }
    } catch (error) {
      console.error('Error rolling back PR:', error);
    }
  };

  const getSafetyColor = (score: number) => {
    if (score >= 0.85) return 'text-green-600';
    if (score >= 0.65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (pr: PullRequest) => {
    if (pr.rolledBack) return <XCircle className="w-5 h-5 text-red-500" />;
    if (pr.merged) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (pr.status === 'closed') return <XCircle className="w-5 h-5 text-gray-500" />;
    return <Clock className="w-5 h-5 text-blue-500" />;
  };

  if (loading && prs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading PRs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total PRs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <GitMerge className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto-Mergeable</p>
                <p className="text-2xl font-bold text-green-600">{stats.autoMergeable}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Merged</p>
                <p className="text-2xl font-bold text-blue-600">{stats.merged}</p>
              </div>
              <GitMerge className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rolled Back</p>
                <p className="text-2xl font-bold text-red-600">{stats.rolledBack}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Safety</p>
                <p className={`text-2xl font-bold ${getSafetyColor(stats.avgSafetyScore)}`}>
                  {(stats.avgSafetyScore * 100).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* PRs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Pull Requests</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {prs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pull requests found
            </div>
          ) : (
            prs.map(pr => (
              <div key={pr.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(pr)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <a
                          href={pr.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          #{pr.prNumber}
                        </a>
                        <span className="text-gray-900">{pr.title}</span>
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">
                          Branch: <code className="bg-gray-100 px-1 rounded">{pr.branch}</code>
                        </span>
                        
                        <span className={`font-medium ${getSafetyColor(pr.safetyScore)}`}>
                          Safety: {(pr.safetyScore * 100).toFixed(0)}%
                        </span>

                        {pr.selfHealingAction && (
                          <span className="text-blue-600">
                            🔧 {pr.selfHealingAction.healingType}
                          </span>
                        )}

                        {pr.autoMergeable && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                            Auto-Mergeable
                          </span>
                        )}

                        {pr.merged && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                            Merged
                          </span>
                        )}

                        {pr.rolledBack && (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-medium">
                            Rolled Back
                          </span>
                        )}
                      </div>

                      {pr.riskFactors.length > 0 && (
                        <div className="mt-2 flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                          <div className="text-sm text-gray-600">
                            {pr.riskFactors.map((risk, i) => (
                              <div key={i}>• {risk}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!pr.merged && !pr.rolledBack && (
                      <>
                        <button
                          onClick={() => evaluatePR(pr.prNumber)}
                          disabled={evaluating[pr.prNumber]}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          {evaluating[pr.prNumber] ? 'Evaluating...' : 'Re-evaluate'}
                        </button>

                        {pr.autoMergeable && (
                          <button
                            onClick={() => mergePR(pr.prNumber)}
                            disabled={merging[pr.prNumber]}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {merging[pr.prNumber] ? 'Merging...' : 'Auto-Merge'}
                          </button>
                        )}
                      </>
                    )}

                    {pr.merged && !pr.rolledBack && (
                      <button
                        onClick={() => rollbackPR(pr.prNumber)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
