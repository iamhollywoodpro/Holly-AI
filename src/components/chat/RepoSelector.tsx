'use client';

import { useState, useEffect } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepo';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

export function RepoSelector() {
  const { activeRepo, setActiveRepo, clearActiveRepo } = useActiveRepo();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

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
    
    setActiveRepo({
      owner,
      repo: name,
      name: repo.name,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      language: repo.language || undefined,
      description: repo.description || undefined,
      url: repo.htmlUrl,
    });
  };

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
                <span className="text-xs text-gray-500">
                  Branch: {activeRepo.defaultBranch}
                </span>
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
    </div>
  );
}
