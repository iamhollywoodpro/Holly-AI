'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, TagIcon } from '@heroicons/react/24/outline';
import { Issue, Label, Milestone } from '@/types/issue';

interface IssueManagementPanelProps {
  owner: string;
  repo: string;
  onCreateIssue?: () => void;
  onViewIssue?: (issueNumber: number) => void;
}

export default function IssueManagementPanel({
  owner,
  repo,
  onCreateIssue,
  onViewIssue,
}: IssueManagementPanelProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [milestoneFilter, setMilestoneFilter] = useState<string>('');

  useEffect(() => {
    fetchIssues();
    fetchLabels();
    fetchMilestones();
  }, [owner, repo, stateFilter, labelFilter, milestoneFilter]);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        state: stateFilter,
        per_page: '50',
      });

      if (labelFilter.length > 0) {
        params.append('labels', labelFilter.join(','));
      }

      if (milestoneFilter) {
        params.append('milestone', milestoneFilter);
      }

      const response = await fetch(`/api/github/issues?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }

      const data = await response.json();
      setIssues(data.issues || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
    try {
      const response = await fetch(
        `/api/github/labels?owner=${owner}&repo=${repo}`
      );

      if (response.ok) {
        const data = await response.json();
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await fetch(
        `/api/github/milestones?owner=${owner}&repo=${repo}`
      );

      if (response.ok) {
        const data = await response.json();
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error('Error fetching milestones:', err);
    }
  };

  const handleCloseIssue = async (issueNumber: number) => {
    try {
      const response = await fetch(`/api/github/issues/${issueNumber}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          state_reason: 'completed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to close issue');
      }

      // Refresh issues
      fetchIssues();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleLabelFilter = (labelName: string) => {
    if (labelFilter.includes(labelName)) {
      setLabelFilter(labelFilter.filter(l => l !== labelName));
    } else {
      setLabelFilter([...labelFilter, labelName]);
    }
  };

  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    issue.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.state === 'open').length,
    closed: issues.filter(i => i.state === 'closed').length,
  };

  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">
              {stats.open} Open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">
              {stats.closed} Closed
            </span>
          </div>
        </div>
        <button
          onClick={onCreateIssue}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          New Issue
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        {/* State Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStateFilter('open')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              stateFilter === 'open'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setStateFilter('closed')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              stateFilter === 'closed'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Closed
          </button>
          <button
            onClick={() => setStateFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              stateFilter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        </div>

        {/* Label Filter */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.slice(0, 8).map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabelFilter(label.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                  labelFilter.includes(label.name)
                    ? 'ring-2 ring-purple-500 ring-offset-1'
                    : ''
                }`}
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                }}
              >
                <TagIcon className="w-3 h-3" />
                {label.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-2">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium mb-1">No issues found</p>
            <p className="text-xs">Try adjusting your filters or create a new issue</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer"
              onClick={() => onViewIssue?.(issue.number)}
            >
              <div className="flex items-start gap-3">
                {issue.state === 'open' ? (
                  <ExclamationCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 hover:text-purple-600">
                      {issue.title}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      #{issue.number}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-600">
                    <span>opened {formatDate(issue.created_at)}</span>
                    <span>by @{issue.user.login}</span>
                    
                    {issue.comments > 0 && (
                      <>
                        <span>•</span>
                        <span>{issue.comments} comment{issue.comments !== 1 ? 's' : ''}</span>
                      </>
                    )}

                    {issue.assignees.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {issue.assignees.slice(0, 3).map((assignee) => (
                            <img
                              key={assignee.id}
                              src={assignee.avatar_url}
                              alt={assignee.login}
                              className="w-5 h-5 rounded-full border border-white"
                              title={assignee.login}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {issue.labels.map((label: any) => (
                        <span
                          key={label.id}
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {issue.milestone && (
                    <div className="mt-2 text-xs text-gray-600">
                      📍 {issue.milestone.title}
                    </div>
                  )}
                </div>

                {issue.state === 'open' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseIssue(issue.number);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Close issue"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
