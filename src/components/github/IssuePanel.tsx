'use client';

import { useState, useEffect } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import {
  XMarkIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TagIcon,
  UserGroupIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XCircleIcon as XCircleIconOutline,
} from '@heroicons/react/24/outline';
import { Issue, Label, Milestone } from '@/types/issue';

interface IssuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateIssue?: () => void;
}

export function IssuePanel({ isOpen, onClose, onCreateIssue }: IssuePanelProps) {
  const { activeRepo } = useActiveRepo();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'comments'>('created');
  
  // Bulk operations
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [bulkOperating, setBulkOperating] = useState(false);
  
  // Expanded issue details
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && activeRepo) {
      fetchIssues();
      fetchLabels();
      fetchMilestones();
    }
  }, [isOpen, activeRepo, stateFilter, labelFilter, assigneeFilter, sortBy]);

  const fetchIssues = async () => {
    if (!activeRepo) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        owner: activeRepo.owner,
        repo: activeRepo.repo,
        state: stateFilter,
        sort: sortBy,
        per_page: '50',
      });

      if (labelFilter.length > 0) {
        params.append('labels', labelFilter.join(','));
      }

      if (assigneeFilter) {
        params.append('assignee', assigneeFilter);
      }

      const response = await fetch(`/api/github/issues?${params}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to fetch issues');
        return;
      }

      setIssues(data.issues || []);
    } catch (err: any) {
      console.error('Failed to fetch issues:', err);
      setError('Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    if (!activeRepo) return;

    try {
      const response = await fetch(
        `/api/github/labels?owner=${activeRepo.owner}&repo=${activeRepo.repo}`
      );
      const data = await response.json();
      if (response.ok) {
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  };

  const fetchMilestones = async () => {
    if (!activeRepo) return;

    try {
      const response = await fetch(
        `/api/github/milestones?owner=${activeRepo.owner}&repo=${activeRepo.repo}`
      );
      const data = await response.json();
      if (response.ok) {
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error('Failed to fetch milestones:', err);
    }
  };

  const handleBulkOperation = async (operation: string, payload?: any) => {
    if (selectedIssues.size === 0 || !activeRepo) return;

    try {
      setBulkOperating(true);

      const response = await fetch('/api/github/issues/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: activeRepo.owner,
          repo: activeRepo.repo,
          issue_numbers: Array.from(selectedIssues),
          operation,
          ...payload,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Bulk operation failed');
        return;
      }

      // Clear selection and refresh
      setSelectedIssues(new Set());
      fetchIssues();
    } catch (err: any) {
      console.error('Bulk operation failed:', err);
      setError('Bulk operation failed');
    } finally {
      setBulkOperating(false);
    }
  };

  const toggleIssueSelection = (issueNumber: number) => {
    const newSelection = new Set(selectedIssues);
    if (newSelection.has(issueNumber)) {
      newSelection.delete(issueNumber);
    } else {
      newSelection.add(issueNumber);
    }
    setSelectedIssues(newSelection);
  };

  const selectAll = () => {
    if (selectedIssues.size === issues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(issues.map(i => i.number)));
    }
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
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <ExclamationCircleIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Issue Management</h2>
              {activeRepo && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeRepo.fullName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCreateIssue && (
              <button
                onClick={onCreateIssue}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                New Issue
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Bulk Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
          {/* State Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              {(['open', 'closed', 'all'] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setStateFilter(state)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    stateFilter === state
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="created">Recently Created</option>
              <option value="updated">Recently Updated</option>
              <option value="comments">Most Commented</option>
            </select>

            <button
              onClick={fetchIssues}
              disabled={loading}
              className="ml-auto p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedIssues.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {selectedIssues.size} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => handleBulkOperation('close', { state_reason: 'completed' })}
                  disabled={bulkOperating}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleBulkOperation('reopen')}
                  disabled={bulkOperating}
                  className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Reopen
                </button>
                <button
                  onClick={() => setSelectedIssues(new Set())}
                  className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && issues.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Loading issues...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <XCircleIconOutline className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
                <button
                  onClick={fetchIssues}
                  className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : issues.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ExclamationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No {stateFilter !== 'all' ? stateFilter : ''} issues found</p>
                {onCreateIssue && (
                  <button
                    onClick={onCreateIssue}
                    className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Create First Issue
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedIssues.size === issues.length && issues.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
              </div>

              {/* Issues */}
              {issues.map((issue) => (
                <div
                  key={issue.number}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIssues.has(issue.number)}
                      onChange={() => toggleIssueSelection(issue.number)}
                      className="mt-1 w-4 h-4"
                    />

                    {/* Icon */}
                    <div className={`mt-1 ${issue.state === 'open' ? 'text-green-500' : 'text-purple-500'}`}>
                      {issue.state === 'open' ? (
                        <ExclamationCircleIcon className="w-5 h-5" />
                      ) : (
                        <CheckCircleIcon className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {issue.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                            <span>#{issue.number}</span>
                            <span>•</span>
                            <span>opened by {issue.user.login}</span>
                            <span>•</span>
                            <span>{formatDate(issue.created_at)}</span>
                            {issue.comments > 0 && (
                              <>
                                <span>•</span>
                                <span>{issue.comments} comments</span>
                              </>
                            )}
                          </div>
                        </div>
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          View
                        </a>
                      </div>

                      {/* Labels */}
                      {issue.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {issue.labels.map((label: any, idx: number) => (
                            <span
                              key={idx}
                              style={{ 
                                backgroundColor: `#${label.color}20`,
                                color: `#${label.color}`,
                                borderColor: `#${label.color}40`
                              }}
                              className="px-2 py-0.5 rounded text-xs border"
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Assignees */}
                      {issue.assignees.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          <div className="flex -space-x-2">
                            {issue.assignees.slice(0, 3).map((assignee, idx) => (
                              <img
                                key={idx}
                                src={assignee.avatar_url}
                                alt={assignee.login}
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                                title={assignee.login}
                              />
                            ))}
                            {issue.assignees.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs">
                                +{issue.assignees.length - 3}
                              </div>
                            )}
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
        {!loading && !error && issues.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Showing {issues.length} {stateFilter !== 'all' ? stateFilter : ''} issue{issues.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-4">
                <span className="text-green-600 dark:text-green-400">
                  {issues.filter(i => i.state === 'open').length} Open
                </span>
                <span className="text-purple-600 dark:text-purple-400">
                  {issues.filter(i => i.state === 'closed').length} Closed
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
