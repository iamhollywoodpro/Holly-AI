'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import { Menu, Transition } from '@headlessui/react';
import { 
  ChevronDownIcon, 
  ArrowPathIcon,
  Cog6ToothIcon,
  LinkSlashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  private: boolean;
  updatedAt: string;
}

interface GitHubConnectionDropdownProps {
  username: string;
  repoCount: number;
  onOpenRepoSelector: () => void;
}

export function GitHubConnectionDropdown({ 
  username, 
  repoCount,
  onOpenRepoSelector 
}: GitHubConnectionDropdownProps) {
  const { activeRepo } = useActiveRepo();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Fetch repos when dropdown opens
  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/github/repos');
      const data = await response.json();
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sync repos from GitHub
  const syncRepos = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/github/repos?sync=true');
      const data = await response.json();
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch (error) {
      console.error('Failed to sync repos:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect GitHub
  const disconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect GitHub? You can reconnect anytime.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/github/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        window.location.reload(); // Refresh to show disconnected state
      }
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
    }
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Menu.Button
            onClick={() => {
              if (!open) fetchRepos();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-all group"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-400 group-hover:text-gray-300">GitHub Connected</span>
              {activeRepo ? (
                <span className="text-xs font-medium text-white">
                  {activeRepo.name} ({activeRepo.branch})
                </span>
              ) : (
                <span className="text-xs text-gray-400">@{username} · {repoCount} repos</span>
              )}
            </div>
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-gray-900 border border-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-50">
              {/* Active Repository Section */}
              {activeRepo && (
                <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400">Active Repository</div>
                      <div className="text-sm font-semibold text-white mt-0.5">
                        {activeRepo.fullName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {activeRepo.language && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                            {activeRepo.language}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          Branch: {activeRepo.branch}
                        </span>
                      </div>
                    </div>
                    <CheckIcon className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              )}

              {/* Switch Repository Section */}
              <div className="p-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Switch Repository
                </div>
                
                {loading ? (
                  <div className="px-3 py-6 text-center text-sm text-gray-400">
                    Loading repositories...
                  </div>
                ) : repos.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-gray-400">
                    No repositories found
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {repos.map((repo) => (
                      <Menu.Item key={repo.id}>
                        {({ active }) => (
                          <button
                            onClick={onOpenRepoSelector}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              active ? 'bg-gray-800' : ''
                            } ${
                              activeRepo?.fullName === repo.fullName
                                ? 'bg-purple-500/10 border border-purple-500/30'
                                : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {repo.name}
                                </div>
                                {repo.description && (
                                  <div className="text-xs text-gray-400 truncate mt-0.5">
                                    {repo.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {repo.language && (
                                    <span className="text-xs text-gray-500">
                                      {repo.language}
                                    </span>
                                  )}
                                  {repo.private && (
                                    <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                                      🔒 Private
                                    </span>
                                  )}
                                </div>
                              </div>
                              {activeRepo?.fullName === repo.fullName && (
                                <CheckIcon className="w-4 h-4 text-purple-500 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Section */}
              <div className="border-t border-gray-800 p-2">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onOpenRepoSelector}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-gray-300">Browse Repositories</span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => window.open('https://github.com/new', '_blank')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-gray-300">View Issues</span>
                    </button>
                  )}
                </Menu.Item>
              </div>

              {/* Settings Section */}
              <div className="border-t border-gray-800 p-2">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={syncRepos}
                      disabled={syncing}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      } ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ArrowPathIcon className={`w-4 h-4 text-blue-400 ${syncing ? 'animate-spin' : ''}`} />
                      <span className="text-gray-300">
                        {syncing ? 'Syncing...' : 'Sync Repositories'}
                      </span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => window.location.href = '/settings/github'}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">GitHub Settings</span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={disconnectGitHub}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <LinkSlashIcon className="w-4 h-4 text-red-400" />
                      <span className="text-red-400">Disconnect GitHub</span>
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
