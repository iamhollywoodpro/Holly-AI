'use client';

import { useState, useEffect, useRef } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import { XMarkIcon, MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  htmlUrl: string;
  private: boolean;
  updatedAt: string;
}

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    avatar: string | null;
    username: string | null;
  };
  date: string | null;
  url: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
}

type TabType = 'repos' | 'commits';

export function RepoSelector() {
  const { activeRepo, setActiveRepo, clearActiveRepo, setBranch } = useActiveRepo();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const branchSelectorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('repos');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  // Fetch repositories on mount
  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/github/repos');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setRepos(data.repositories || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const selectRepo = async (repo: Repository) => {
    const [owner, name] = repo.fullName.split('/');
    
    const newRepo = {
      owner,
      repo: name,
      name: repo.name,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      branch: repo.defaultBranch, // Start with default branch
      language: repo.language || undefined,
      description: repo.description || undefined,
      url: repo.htmlUrl,
    };
    setActiveRepo(newRepo);
    // Fetch branches for the selected repo
    await fetchBranches(newRepo.owner, newRepo.repo);
  };

  const fetchBranches = async (owner: string, repo: string) => {
    try {
      setLoadingBranches(true);
      const response = await fetch(`/api/github/branches?owner=${owner}&repo=${repo}`);
      const data = await response.json();

      if (data.error) {
        console.error('Failed to fetch branches:', data.error);
        return;
      }

      setBranches(data.branches || []);
    } catch (err: any) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const switchBranch = (branchName: string) => {
    setBranch(branchName);
    setShowBranchSelector(false);
  };

  const fetchCommits = async () => {
    if (!activeRepo) return;

    try {
      setLoadingCommits(true);
      const params = new URLSearchParams({
        owner: activeRepo.owner,
        repo: activeRepo.repo,
        branch: activeRepo.branch || activeRepo.defaultBranch,
        per_page: '20',
      });

      const response = await fetch(`/api/github/commits?${params}`);
      const data = await response.json();

      if (data.error) {
        console.error('Failed to fetch commits:', data.error);
        return;
      }

      setCommits(data.commits || []);
    } catch (err: any) {
      console.error('Failed to fetch commits:', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  // Fetch branches when active repo changes
  useEffect(() => {
    if (activeRepo) {
      fetchBranches(activeRepo.owner, activeRepo.repo);
    } else {
      setBranches([]);
    }
  }, [activeRepo?.fullName]);

  // Close branch selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchSelectorRef.current && !branchSelectorRef.current.contains(event.target as Node)) {
        setShowBranchSelector(false);
      }
    }

    if (showBranchSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBranchSelector]);

  // Fetch commits when switching to commits tab
  useEffect(() => {
    if (activeTab === 'commits' && activeRepo) {
      fetchCommits();
    }
  }, [activeTab, activeRepo?.fullName, activeRepo?.branch]);

  // Filter repos by search
  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    repo.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-gray-400">Loading repositories...</div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-400">❌ {error}</div>
        <button
          onClick={fetchRepos}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Active Repo Display */}
      {activeRepo && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-500/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                ✅ Active Repository
              </div>
              <div className="text-xs text-purple-300 mt-1">
                {activeRepo.fullName}
              </div>
              {activeRepo.description && (
                <div className="text-xs text-gray-400 mt-1">
                  {activeRepo.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {activeRepo.language && (
                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                    {activeRepo.language}
                  </span>
                )}
                <div className="relative" ref={branchSelectorRef}>
                  <button
                    onClick={() => setShowBranchSelector(!showBranchSelector)}
                    className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center gap-1 transition-colors"
                    disabled={loadingBranches}
                  >
                    <span className="text-purple-400">⎇</span>
                    <span>{activeRepo.branch || activeRepo.defaultBranch}</span>
                    <span className="text-gray-500">▼</span>
                  </button>
                  
                  {showBranchSelector && branches.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px] max-h-48 overflow-y-auto">
                      {branches.map((branch) => (
                        <button
                          key={branch}
                          onClick={() => switchBranch(branch)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${
                            branch === (activeRepo.branch || activeRepo.defaultBranch)
                              ? 'text-purple-400 bg-purple-500/10'
                              : 'text-gray-300'
                          }`}
                        >
                          <span className="mr-2">⎇</span>
                          {branch}
                          {branch === (activeRepo.branch || activeRepo.defaultBranch) && (
                            <span className="ml-2 text-purple-500">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={clearActiveRepo}
              className="text-gray-400 hover:text-white transition-colors"
              title="Clear active repository"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('repos')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'repos'
              ? 'text-purple-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          📚 Repositories
          {activeTab === 'repos' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          disabled={!activeRepo}
          className={`px-4 py-2 text-sm font-medium transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed ${
            activeTab === 'commits'
              ? 'text-purple-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <ClockIcon className="w-4 h-4 inline mr-1" />
          Recent Commits
          {activeTab === 'commits' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {/* Repositories Tab Content */}
      {activeTab === 'repos' && (
        <>
          {/* Search Bar */}
          <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories..."
          className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Repository List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredRepos.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {search ? 'No repositories match your search' : 'No repositories found'}
          </div>
        ) : (
          filteredRepos.map((repo, index) => (
            <button
              key={repo.id}
              onClick={() => selectRepo(repo)}
              className={`w-full text-left p-3 rounded-lg border transition-all hover:border-purple-500/50 hover:bg-gray-800/80 ${
                activeRepo?.fullName === repo.fullName
                  ? 'bg-purple-500/10 border-purple-500/50'
                  : 'bg-gray-800/30 border-gray-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className="text-sm font-semibold text-white truncate">
                      {repo.name}
                    </span>
                    {repo.private && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                        🔒
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {repo.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {repo.language && (
                      <span className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded">
                        {repo.language}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Updated {new Date(repo.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

          {/* Helper Text */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
            💡 Select a repository to start working on it with HOLLY
          </div>
        </>
      )}

      {/* Commits Tab Content */}
      {activeTab === 'commits' && (
        <>
          {!activeRepo ? (
            <div className="text-sm text-gray-500 text-center py-8">
              📦 Select a repository first to view commit history
            </div>
          ) : loadingCommits ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-400">Loading commits...</div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : commits.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              🔍 No commits found
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commits.map((commit) => (
                <a
                  key={commit.sha}
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-gray-700/50 bg-gray-800/30 hover:border-purple-500/50 hover:bg-gray-800/80 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {commit.author.avatar ? (
                      <img
                        src={commit.author.avatar}
                        alt={commit.author.name}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-purple-300">
                          {commit.author.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded">
                          {commit.shortSha}
                        </span>
                        <span className="text-xs text-gray-500">
                          {commit.author.name}
                        </span>
                      </div>
                      <div className="text-sm text-white mt-1 line-clamp-2">
                        {commit.message.split('\n')[0]}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {commit.date && (
                          <span>
                            {new Date(commit.date).toLocaleDateString()} {new Date(commit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {commit.stats.total > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="text-green-400">+{commit.stats.additions}</span>
                            <span className="text-red-400">-{commit.stats.deletions}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Commits Helper Text */}
          {commits.length > 0 && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
              🕒 Showing {commits.length} most recent commits on {activeRepo.branch || activeRepo.defaultBranch}
            </div>
          )}
        </>
      )}
    </div>
  );
}
