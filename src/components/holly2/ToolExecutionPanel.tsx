'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, CheckCircle, XCircle, Loader2, Code, FileText, GitBranch } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface ToolExecutionPanelProps {
  toolCalls: ToolCall[];
  onClose: () => void;
}

export function ToolExecutionPanel({ toolCalls, onClose }: ToolExecutionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const getToolIcon = (name: string) => {
    if (name.includes('github')) return GitBranch;
    if (name.includes('bash') || name.includes('shell')) return Terminal;
    if (name.includes('file')) return FileText;
    return Code;
  };

  const getStatusColor = (status: ToolCall['status']) => {
    switch (status) {
      case 'success': return cyberpunkTheme.colors.accent.success;
      case 'error': return cyberpunkTheme.colors.accent.error;
      case 'running': return cyberpunkTheme.colors.primary.cyan;
      default: return cyberpunkTheme.colors.text.tertiary;
    }
  };

  const getStatusIcon = (status: ToolCall['status']) => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'running': return Loader2;
      default: return Terminal;
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return '';
    const duration = (end || new Date()).getTime() - start.getTime();
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div 
      className="border-t"
      style={{
        backgroundColor: cyberpunkTheme.colors.background.secondary,
        borderColor: cyberpunkTheme.colors.border.primary,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: cyberpunkTheme.colors.border.primary }}
      >
        <div className="flex items-center gap-2">
          <Terminal 
            className="w-4 h-4" 
            style={{ color: cyberpunkTheme.colors.primary.cyan }}
          />
          <span 
            className="text-sm font-medium"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            Tool Execution
          </span>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.tertiary,
              color: cyberpunkTheme.colors.text.secondary,
            }}
          >
            {toolCalls.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tool List */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {toolCalls.map((tool) => {
            const Icon = getToolIcon(tool.name);
            const StatusIcon = getStatusIcon(tool.status);
            const isSelected = selectedTool === tool.id;

            return (
              <div key={tool.id}>
                <button
                  onClick={() => setSelectedTool(isSelected ? null : tool.id)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon 
                      className="w-4 h-4" 
                      style={{ color: cyberpunkTheme.colors.primary.purple }}
                    />
                    <span 
                      className="text-sm font-mono"
                      style={{ color: cyberpunkTheme.colors.text.primary }}
                    >
                      {tool.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {tool.startTime && (
                      <span 
                        className="text-xs"
                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                      >
                        {formatDuration(tool.startTime, tool.endTime)}
                      </span>
                    )}
                    <StatusIcon 
                      className={`w-4 h-4 ${tool.status === 'running' ? 'animate-spin' : ''}`}
                      style={{ color: getStatusColor(tool.status) }}
                    />
                  </div>
                </button>

                {/* Tool Details */}
                {isSelected && (
                  <div 
                    className="px-4 py-3 border-t"
                    style={{
                      backgroundColor: cyberpunkTheme.colors.background.tertiary,
                      borderColor: cyberpunkTheme.colors.border.primary,
                    }}
                  >
                    {tool.error ? (
                      <div>
                        <div 
                          className="text-xs font-medium mb-1"
                          style={{ color: cyberpunkTheme.colors.accent.error }}
                        >
                          Error:
                        </div>
                        <pre 
                          className="text-xs font-mono whitespace-pre-wrap"
                          style={{ color: cyberpunkTheme.colors.text.secondary }}
                        >
                          {tool.error}
                        </pre>
                      </div>
                    ) : tool.result ? (
                      <div>
                        <div 
                          className="text-xs font-medium mb-1"
                          style={{ color: cyberpunkTheme.colors.text.secondary }}
                        >
                          Result:
                        </div>
                        <pre 
                          className="text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto"
                          style={{ color: cyberpunkTheme.colors.text.primary }}
                        >
                          {typeof tool.result === 'string' 
                            ? tool.result 
                            : JSON.stringify(tool.result, null, 2)
                          }
                        </pre>
                      </div>
                    ) : (
                      <div 
                        className="text-xs"
                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                      >
                        {tool.status === 'running' ? 'Executing...' : 'Pending...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
