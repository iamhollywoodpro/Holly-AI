"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, Terminal, FileCode, Github } from "lucide-react";

export interface ToolExecution {
  id: string;
  toolName: string;
  status: 'start' | 'complete' | 'error';
  result?: any;
  timestamp: Date;
}

interface ToolExecutionPanelProps {
  executions: ToolExecution[];
}

const toolIcons: Record<string, any> = {
  github_read_file: Github,
  github_write_file: Github,
  github_list_files: Github,
  bash_execute: Terminal,
  file_read: FileCode,
  file_write: FileCode,
  file_list: FileCode,
};

const toolEmojis: Record<string, string> = {
  github_read_file: '📖',
  github_write_file: '💾',
  github_list_files: '📁',
  bash_execute: '💻',
  file_read: '📄',
  file_write: '✏️',
  file_list: '📂',
};

const toolLabels: Record<string, string> = {
  github_read_file: 'Reading file from GitHub',
  github_write_file: 'Writing file to GitHub',
  github_list_files: 'Listing GitHub files',
  bash_execute: 'Executing bash command',
  file_read: 'Reading file',
  file_write: 'Writing file',
  file_list: 'Listing files',
};

export default function ToolExecutionPanel({ executions }: ToolExecutionPanelProps) {
  if (executions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-gray-200">Tool Execution</h3>
      </div>
      
      <div className="space-y-2">
        {executions.map((execution) => {
          const Icon = toolIcons[execution.toolName] || Terminal;
          const emoji = toolEmojis[execution.toolName] || '🔧';
          const label = toolLabels[execution.toolName] || execution.toolName;
          
          return (
            <div
              key={execution.id}
              className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {execution.status === 'start' && (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                )}
                {execution.status === 'complete' && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                {execution.status === 'error' && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              {/* Tool Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm font-medium text-gray-200">
                    {label}
                  </span>
                </div>

                {/* Tool Details */}
                {execution.status === 'complete' && execution.result && (
                  <div className="mt-2 p-2 bg-gray-900 rounded border border-gray-600">
                    <pre className="text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(execution.result, null, 2)}
                    </pre>
                  </div>
                )}

                {execution.status === 'error' && execution.result && (
                  <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-700">
                    <p className="text-xs text-red-300">
                      {execution.result}
                    </p>
                  </div>
                )}

                {execution.status === 'start' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Executing...
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 text-xs text-gray-500">
                {execution.timestamp.toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
