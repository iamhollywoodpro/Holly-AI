/**
 * HOLLY ARCHITECTURE GENERATION ADMIN PANEL
 * 
 * UI component for manually triggering architecture generation
 * Shows real-time progress and status
 */

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface GenerationStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startTime?: string;
  endTime?: string;
  error?: string;
  results?: {
    architectureSnapshot: boolean;
    dependencyGraph: {
      nodes: number;
      edges: number;
    };
    codebaseKnowledge: {
      filesParsed: number;
      filesSaved: number;
    };
  };
}

export default function ArchitectureGenerationPanel() {
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/architecture/generate');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data.status);

      // If running, continue polling
      if (data.status?.status === 'running') {
        setPolling(true);
      } else {
        setPolling(false);
      }

    } catch (err) {
      console.error('Status fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Trigger generation
  const triggerGeneration = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/architecture/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }

      // Start polling for status
      setPolling(true);
      setStatus(data.status);

    } catch (err) {
      console.error('Generation trigger error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Poll status while running
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [polling]);

  // Initial status fetch on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🧠 Architecture Generation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate HOLLY's self-awareness map
          </p>
        </div>
        
        <button
          onClick={triggerGeneration}
          disabled={loading || status?.status === 'running'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading || status?.status === 'running' ? 'animate-spin' : ''}`} />
          {loading || status?.status === 'running' ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Status Display */}
      {status && (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {status.status === 'running' && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Running</span>
                </div>
              )}
              {status.status === 'completed' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Completed</span>
                </div>
              )}
              {status.status === 'failed' && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Failed</span>
                </div>
              )}
              {status.status === 'idle' && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Idle</span>
                </div>
              )}
            </div>

            {/* Progress */}
            {status.status === 'running' && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {status.currentStep}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {status.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Timing Info */}
          {status.startTime && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Started: {new Date(status.startTime).toLocaleString()}
              {status.endTime && (
                <span className="ml-4">
                  Completed: {new Date(status.endTime).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Error Message */}
          {status.status === 'failed' && status.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-300">
              {status.error}
            </div>
          )}

          {/* Results */}
          {status.status === 'completed' && status.results && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-3">
                Generation Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-green-700 dark:text-green-300 font-medium">Architecture Snapshot</p>
                  <p className="text-green-600 dark:text-green-400">
                    {status.results.architectureSnapshot ? '✅ Saved' : '❌ Failed'}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 font-medium">Dependency Graph</p>
                  <p className="text-green-600 dark:text-green-400">
                    {status.results.dependencyGraph.nodes} nodes, {status.results.dependencyGraph.edges} edges
                  </p>
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-300 font-medium">Codebase Knowledge</p>
                  <p className="text-green-600 dark:text-green-400">
                    {status.results.codebaseKnowledge.filesSaved}/{status.results.codebaseKnowledge.filesParsed} files saved
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          {status.status === 'idle' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">No generation in progress</p>
                <p>Click "Generate Now" to start, or it will run automatically at 3 AM daily.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cron Info */}
      <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Automatic Schedule:</strong> Runs daily at 3:00 AM UTC via Vercel Cron
        </p>
      </div>
    </div>
  );
}
