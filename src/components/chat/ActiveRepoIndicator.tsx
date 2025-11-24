import React from 'react';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { FolderIcon } from '@heroicons/react/24/solid';

interface ActiveRepoIndicatorProps {
  owner: string;
  repo: string;
  branch: string;
  onChangeRepo: () => void;
  onDismiss?: () => void;
}

export default function ActiveRepoIndicator({
  owner,
  repo,
  branch,
  onChangeRepo,
  onDismiss,
}: ActiveRepoIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <FolderIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {owner}/{repo}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
          {branch}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onChangeRepo}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          Change Repo
        </button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss indicator"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Empty state component
export function EmptyRepoIndicator({ onSelectRepo }: { onSelectRepo: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2">
        <FolderIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-700 dark:text-amber-300">
          No repository selected • Select one to use GitHub commands
        </span>
      </div>

      <button
        onClick={onSelectRepo}
        className="px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
      >
        Select Repository
      </button>
    </div>
  );
}
