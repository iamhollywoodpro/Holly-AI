'use client';

import { useState, useEffect } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import {
  XMarkIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowsRightLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  draft: boolean;
  url: string;
  head: string;
  base: string;
  user: {
    login: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  labels: string[];
}

interface PRListPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PRListPanel({ isOpen, onClose }: PRListPanelProps) {
  const { activeRepo } = useActiveRepo();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);

  // Fetch pull requests when panel opens or filter changes
  useEffect(() => {
    if (isOpen && activeRepo) {
      fetchPullRequests();
    }
  }, [isOpen, activeRepo, filter]);

  const fetchPullRequests = async () => {
    if (!activeRepo) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/github/pull-request?owner=${activeRepo.owner}&repo=${activeRepo.repo}&state=${filter}&per_page=20`
      );
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to fetch pull requests');
        return;
      }

      setPullRequests(data.pullRequests || []);
    } catch (err: any) {
      console.error('Failed to fetch PRs:', err);
      setError('Failed to fetch pull requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPullRequests();
  };

  const getStateColor = (pr: PullRequest) => {
    if (pr.draft) return 'text-gray-400';
    if (pr.state === 'closed') {
      return pr.mergedAt ? 'text-purple-400' : 'text-red-400';
    }
    return 'text-green-400';
  };

  const getStateIcon = (pr: PullRequest) => {
    if (pr.draft) return <ClockIcon className="w-5 h-5" />;
    if (pr.state === 'closed') {
      return pr.mergedAt ? <ArrowsRightLeftIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />;
    }
    return <CheckCircleIcon className="w-5 h-5" />;
  };

  const getStateLabel = (pr: PullRequest) => {
    if (pr.draft) return 'Draft';
    if (pr.state === 'closed') {
      return pr.mergedAt ? 'Merged' : 'Closed';
    }
    return 'Open';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks}w ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
              <ArrowsRightLeftIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Pull Requests</h2>
              {activeRepo && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeRepo.fullName}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            {(['open', 'closed', 'all'] as const).map((state) => (
              <button
                key={state}
                onClick={() => setFilter(state)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === state
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="ml-auto p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* PR List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && pullRequests.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Loading pull requests...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : pullRequests.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ArrowsRightLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No {filter !== 'all' ? filter : ''} pull requests found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pullRequests.map((pr) => (
                <div
                  key={pr.number}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedPR(selectedPR?.number === pr.number ? null : pr)}
                >
                  {/* PR Header */}
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${getStateColor(pr)}`}>
                      {getStateIcon(pr)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                            {pr.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className={getStateColor(pr)}>{getStateLabel(pr)}</span>
                            <span>•</span>
                            <span>#{pr.number}</span>
                            <span>•</span>
                            <span>by {pr.user.login}</span>
                            <span>•</span>
                            <span>{formatDate(pr.updatedAt)}</span>
                          </div>
                        </div>
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          View
                        </a>
                      </div>

                      {/* Branch Info */}
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                          {pr.head}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded">
                          {pr.base}
                        </span>
                      </div>

                      {/* Labels */}
                      {pr.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pr.labels.map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {selectedPR?.number === pr.number && pr.body && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {pr.body}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {!loading && !error && pullRequests.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Showing {pullRequests.length} {filter !== 'all' ? filter : ''} pull request{pullRequests.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-4">
                <span className="text-green-600 dark:text-green-400">
                  {pullRequests.filter(pr => pr.state === 'open' && !pr.draft).length} Open
                </span>
                <span className="text-gray-400">
                  {pullRequests.filter(pr => pr.draft).length} Draft
                </span>
                <span className="text-purple-600 dark:text-purple-400">
                  {pullRequests.filter(pr => pr.mergedAt).length} Merged
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {pullRequests.filter(pr => pr.state === 'closed' && !pr.mergedAt).length} Closed
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
