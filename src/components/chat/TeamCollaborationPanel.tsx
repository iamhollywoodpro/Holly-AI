'use client';

import { useState, useEffect } from 'react';
import { UserGroupIcon, ChatBubbleLeftRightIcon, UserPlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Collaborator, PRComment, PRReview } from '@/types/collaboration';

interface TeamCollaborationPanelProps {
  owner: string;
  repo: string;
  onComment?: (prNumber: number) => void;
  onMention?: (username: string) => void;
  onAssign?: (issueNumber: number) => void;
  onReviewRequest?: (prNumber: number) => void;
}

interface Activity {
  id: string;
  type: 'comment' | 'review' | 'mention' | 'assignment';
  user: {
    login: string;
    avatar_url: string;
  };
  content: string;
  url: string;
  created_at: string;
  pr_number?: number;
  issue_number?: number;
}

export default function TeamCollaborationPanel({
  owner,
  repo,
  onComment,
  onMention,
  onAssign,
  onReviewRequest,
}: TeamCollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'team' | 'activity'>('team');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCollaborators();
  }, [owner, repo]);

  const fetchCollaborators = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/collaborators?owner=${owner}&repo=${repo}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const data = await response.json();
      setCollaborators(data.collaborators || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCollaborators = collaborators.filter(collab =>
    collab.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionBadge = (permissions?: any) => {
    if (!permissions) return null;
    
    if (permissions.admin) return { label: 'Admin', color: 'bg-red-100 text-red-700' };
    if (permissions.maintain) return { label: 'Maintain', color: 'bg-purple-100 text-purple-700' };
    if (permissions.push) return { label: 'Write', color: 'bg-blue-100 text-blue-700' };
    if (permissions.triage) return { label: 'Triage', color: 'bg-yellow-100 text-yellow-700' };
    if (permissions.pull) return { label: 'Read', color: 'bg-gray-100 text-gray-700' };
    
    return null;
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

  if (loading && collaborators.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading team...</p>
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
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'team'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4" />
            Team ({collaborators.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'activity'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            Activity
          </span>
        </button>
      </div>

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />

          {/* Collaborators List */}
          {filteredCollaborators.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No team members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCollaborators.map((collab) => {
                const badge = getPermissionBadge(collab.permissions);
                
                return (
                  <div
                    key={collab.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <img
                          src={collab.avatar_url}
                          alt={collab.login}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              @{collab.login}
                            </h3>
                            {badge && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.color}`}>
                                {badge.label}
                              </span>
                            )}
                            {collab.site_admin && (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-orange-100 text-orange-700">
                                Staff
                              </span>
                            )}
                          </div>
                          <a
                            href={collab.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-purple-600"
                          >
                            View profile →
                          </a>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onMention?.(collab.login)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Mention in comment"
                        >
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onAssign?.(0)} // Issue number should be dynamic
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Assign issue"
                        >
                          <UserPlusIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onReviewRequest?.(0)} // PR number should be dynamic
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Request review"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="text-center py-8 text-gray-500">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium mb-1">Activity Feed Coming Soon</p>
            <p className="text-xs">Recent comments, mentions, and assignments will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
