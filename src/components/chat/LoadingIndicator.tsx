import React, { useEffect, useState } from 'react';
import { BoltIcon } from '@heroicons/react/24/outline';

interface LoadingIndicatorProps {
  type: 'thinking' | 'context';
  message?: string;
  duration?: number; // Show extended message after X milliseconds
  cancellable?: boolean;
  onCancel?: () => void;
}

export default function LoadingIndicator({
  type,
  message,
  duration = 3000,
  cancellable = false,
  onCancel,
}: LoadingIndicatorProps) {
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setShowExtendedMessage(true);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  if (type === 'thinking') {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="inline-block w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="inline-block w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Thinking...
        </span>
      </div>
    );
  }

  // Context type - show what HOLLY is doing
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <BoltIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-pulse" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message || 'Processing your request...'}
        </span>
      </div>

      {/* Extended message after duration */}
      {showExtendedMessage && (
        <div className="ml-8 text-xs text-gray-500 dark:text-gray-400 animate-fade-in">
          This might take a moment...
        </div>
      )}

      {/* Cancel button for long operations */}
      {cancellable && onCancel && (
        <button
          onClick={onCancel}
          className="ml-8 mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          Cancel operation
        </button>
      )}
    </div>
  );
}

// Skeleton UI for loading lists (workflows, issues, etc.)
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to get loading message based on action
export function getLoadingMessage(action: string): { type: 'thinking' | 'context'; message?: string } {
  // Style A: Simple thinking for regular conversation
  if (action === 'chat' || action === 'conversation') {
    return { type: 'thinking' };
  }

  // Style B: Context-aware for actions and creative tasks
  const contextMessages: Record<string, string> = {
    // GitHub Actions
    fetch_workflows: 'Fetching GitHub workflows...',
    analyze_runs: 'Analyzing workflow runs...',
    fetch_logs: 'Retrieving workflow logs...',
    trigger_workflow: 'Triggering workflow...',

    // Team Collaboration
    fetch_team: 'Loading team members...',
    fetch_comments: 'Fetching PR comments...',
    fetch_reviews: 'Loading code reviews...',

    // Issue Management
    search_issues: 'Searching issues...',
    create_issue: 'Creating issue...',
    update_issue: 'Updating issue...',
    fetch_labels: 'Loading labels...',

    // Creative Tasks
    generate_image: 'Generating image...',
    create_video: 'Creating video...',
    compose_music: 'Composing music...',
    design_logo: 'Designing logo...',
    build_website: 'Building website...',

    // Repository
    fetch_repos: 'Loading repositories...',
    sync_repo: 'Syncing repository...',
    clone_repo: 'Cloning repository...',

    // General
    processing: 'Processing your request...',
    uploading: 'Uploading files...',
    downloading: 'Downloading files...',
  };

  return {
    type: 'context',
    message: contextMessages[action] || 'Working on it...',
  };
}
