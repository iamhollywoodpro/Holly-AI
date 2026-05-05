'use client';

import { useActiveRepos } from '@/hooks/useActiveRepos';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Repository Tabs Component
 * Shows all active repositories as tabs for quick switching
 * Supports multi-repository workflows (microservices, monorepos)
 */
export function RepoTabs() {
  const { activeRepos, currentRepoId, setCurrentRepo, removeRepo } = useActiveRepos();

  // Don't show if no repos or only one repo
  if (activeRepos.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/50 overflow-x-auto">
      <div className="text-xs text-gray-500 font-semibold whitespace-nowrap">
        Active Repos:
      </div>
      <div className="flex gap-2">
        {activeRepos.map((repo) => {
          const isActive = repo.fullName === currentRepoId;
          
          return (
            <button
              key={repo.fullName}
              onClick={() => setCurrentRepo(repo.fullName)}
              className={`
                group relative flex items-center gap-2 px-3 py-1.5 rounded-lg 
                border transition-all whitespace-nowrap text-sm
                ${isActive
                  ? 'bg-purple-500/20 border-purple-500/50 text-white'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600'
                }
              `}
            >
              {/* Repo Icon */}
              <span className="text-xs">
                {repo.private ? '🔒' : '📦'}
              </span>

              {/* Repo Name */}
              <div className="flex flex-col items-start">
                <span className="font-semibold">
                  {repo.name}
                </span>
                {repo.branch && (
                  <span className="text-[10px] text-gray-500">
                    ⚡ {repo.branch}
                  </span>
                )}
              </div>

              {/* Language Badge */}
              {repo.language && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-700/50 text-gray-400 rounded">
                  {repo.language}
                </span>
              )}

              {/* Close Button */}
              {activeRepos.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRepo(repo.fullName);
                  }}
                  className="ml-1 p-0.5 rounded hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from active repos"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Info Badge */}
      {activeRepos.length > 1 && (
        <div className="text-xs text-gray-600 bg-gray-800/30 px-2 py-1 rounded whitespace-nowrap">
          {activeRepos.length} repos
        </div>
      )}
    </div>
  );
}
