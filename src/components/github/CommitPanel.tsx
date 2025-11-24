'use client';

import React, { useState, useEffect } from 'react';
import { 
  X,
  GitCommit,
  History,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  User,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { 
  getCommitTypeEmoji, 
  getCommitTypeDescription,
  generateCommitMessage,
} from '@/lib/github/commit-message-generator';

interface CommitPanelProps {
  owner: string;
  repo: string;
  branch?: string;
  onClose?: () => void;
  className?: string;
}

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export default function CommitPanel({
  owner,
  repo,
  branch = 'main',
  onClose,
  className = '',
}: CommitPanelProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [limit, setLimit] = useState<number>(10);

  // Load commit history
  useEffect(() => {
    loadCommits();
  }, [owner, repo, branch, limit]);

  const loadCommits = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        branch,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/github/commit?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load commits');
      }

      if (data.success) {
        setCommits(data.commits);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load commit history');
      console.error('CommitPanel error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get commit type from message
  const getCommitType = (message: string): string => {
    const match = message.match(/^(\w+)(\([\w-]+\))?:/);
    return match ? match[1] : 'chore';
  };

  // Parse commit message parts
  const parseCommitMessage = (message: string) => {
    const lines = message.split('\n');
    const header = lines[0];
    const body = lines.slice(1).join('\n').trim();

    return { header, body };
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Commit History
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {owner}/{repo} · {branch}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCommits}
              disabled={loading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Commit List */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-gray-200 dark:border-gray-700">
          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Error</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Commit list */}
          {!loading && !error && (
            <>
              {commits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <GitCommit className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No commits found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commits.map((commit) => {
                    const { header } = parseCommitMessage(commit.message);
                    const commitType = getCommitType(header);
                    const emoji = getCommitTypeEmoji(commitType);

                    return (
                      <div
                        key={commit.sha}
                        onClick={() => setSelectedCommit(commit)}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all
                          ${selectedCommit?.sha === commit.sha
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {header}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {commit.author.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(commit.author.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <code className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                                {commit.shortSha}
                              </code>
                              {commit.stats.total > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="text-green-600 dark:text-green-400">+{commit.stats.additions}</span>
                                  {' / '}
                                  <span className="text-red-600 dark:text-red-400">-{commit.stats.deletions}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load more */}
              {commits.length >= limit && (
                <button
                  onClick={() => setLimit(limit + 10)}
                  className="w-full mt-4 py-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Load more commits
                </button>
              )}
            </>
          )}
        </div>

        {/* Commit Details */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/50">
          {selectedCommit ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Commit Details</h4>
                  <a
                    href={selectedCommit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on GitHub
                  </a>
                </div>
                <code className="block px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs">
                  {selectedCommit.sha}
                </code>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</h5>
                <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                  {(() => {
                    const { header, body } = parseCommitMessage(selectedCommit.message);
                    return (
                      <>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {header}
                        </p>
                        {body && (
                          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                            {body}
                          </pre>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Author</h5>
                <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm">
                  <p className="text-gray-900 dark:text-white font-medium">{selectedCommit.author.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCommit.author.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(selectedCommit.author.date).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedCommit.stats.total > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Changes</h5>
                  <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +{selectedCommit.stats.additions}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">additions</span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{selectedCommit.stats.deletions}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">deletions</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ 
                          width: `${(selectedCommit.stats.additions / selectedCommit.stats.total) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <GitCommit className="w-16 h-16 mb-3 opacity-30" />
              <p className="text-sm">Select a commit to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
