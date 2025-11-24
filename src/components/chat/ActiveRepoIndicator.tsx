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
    <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <FolderIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {owner}/{repo}
        </span>
        <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">•</span>
        <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex-shrink-0">
          {branch}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          onClick={onChangeRepo}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <ArrowPathIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">Change</span>
        </button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss indicator"
          >
            <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Empty state component
export function EmptyRepoIndicator({ onSelectRepo }: { onSelectRepo: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <FolderIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 truncate">
          <span className="hidden sm:inline">No repository selected • Select one to use GitHub commands</span>
          <span className="sm:hidden">No repo • Select to use commands</span>
        </span>
      </div>

      <button
        onClick={onSelectRepo}
        className="px-2 sm:px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors flex-shrink-0"
      >
        <span className="hidden sm:inline">Select Repository</span>
        <span className="sm:hidden">Select</span>
      </button>
    </div>
  );
}
