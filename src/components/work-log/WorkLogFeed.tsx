/**
 * WorkLogFeed Component
 * 
 * Container for work log messages
 * Manages SSE connection and displays logs inline with chat
 * 
 * @author HOLLY AI System
 */

'use client';

import { WorkLogMessage } from './WorkLogMessage';
import { useWorkLogStream } from './useWorkLogStream';

interface WorkLogFeedProps {
  conversationId?: string;
  enabled?: boolean;
  maxLogs?: number;
}

export function WorkLogFeed({ 
  conversationId, 
  enabled = true,
  maxLogs = 50 
}: WorkLogFeedProps) {
  const { logs, isConnected, error, retry } = useWorkLogStream({
    conversationId,
    enabled,
  });

  // Don't render if disabled
  if (!enabled) return null;

  // Connection error state
  if (error && !isConnected) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-2">
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              Work log connection issue
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {error}
            </p>
            <button
              onClick={retry}
              className="mt-2 text-xs px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connection status indicator (only show if connecting)
  if (!isConnected && logs.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Connecting to work log stream...
          </span>
        </div>
      </div>
    );
  }

  // No logs yet
  if (logs.length === 0) {
    return null; // Don't show anything if no logs (cleaner UI)
  }

  // Display logs (limited to maxLogs)
  const displayLogs = logs.slice(0, maxLogs);

  return (
    <div className="space-y-1">
      {displayLogs.map((log) => (
        <WorkLogMessage key={log.id} log={log} />
      ))}
    </div>
  );
}
