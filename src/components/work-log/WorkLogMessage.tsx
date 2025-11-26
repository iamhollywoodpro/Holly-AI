/**
 * WorkLogMessage Component
 * 
 * Displays a single work log entry inline with chat messages
 * Shows status icon, title, timestamp, and expandable details
 * 
 * @author HOLLY AI System
 */

'use client';

import { useState } from 'react';
import type { WorkLogEntry } from '@/lib/logging/work-log-service';

interface WorkLogMessageProps {
  log: WorkLogEntry;
  showDetails?: boolean;
}

// Status icons with colors
const STATUS_CONFIG = {
  working: {
    icon: '🔧',
    color: 'text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Working',
  },
  success: {
    icon: '✅',
    color: 'text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    label: 'Success',
  },
  warning: {
    icon: '⚠️',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    label: 'Warning',
  },
  error: {
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'Error',
  },
  info: {
    icon: '📊',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    label: 'Info',
  },
};

export function WorkLogMessage({ log, showDetails = false }: WorkLogMessageProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  
  // Use category or description to determine status config
  const statusKey = log.category || log.description?.toLowerCase() || 'info';
  const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.info;
  const hasDetails = log.details || Object.keys(log.metadata || {}).length > 0;

  // Format timestamp
  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Format metadata for display
  const formatMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== 'object') return null;
    
    const entries = Object.entries(metadata).filter(([_, value]) => value !== null && value !== undefined);
    if (entries.length === 0) return null;
    
    return entries.map(([key, value]) => {
      // Format key (camelCase → Title Case)
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      
      // Format value
      let formattedValue = value;
      if (typeof value === 'object') {
        formattedValue = JSON.stringify(value, null, 2);
      }
      
      return { key: formattedKey, value: formattedValue };
    });
  };

  const metadataEntries = formatMetadata(log.metadata);

  return (
    <div className={`${config.bgColor} rounded-lg p-3 mb-2 border border-gray-200 dark:border-gray-700 transition-all`}>
      <div className="flex items-start gap-2">
        {/* Status Icon */}
        <span className="text-xl flex-shrink-0 mt-0.5" title={config.label}>
          {config.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Timestamp */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`font-medium ${config.color}`}>
              {log.taskName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {formatTime(log.createdAt)}
            </span>
          </div>

          {/* Expandable Details */}
          {hasDetails && (
            <div className="mt-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
              >
                <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {/* Details Text */}
                  {log.details && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                      <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                        {log.details}
                      </pre>
                    </div>
                  )}

                  {/* Metadata */}
                  {metadataEntries && metadataEntries.length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                      <div className="space-y-1">
                        {metadataEntries.map(({ key, value }, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="font-semibold min-w-[100px]">{key}:</span>
                            <span className="font-mono break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
