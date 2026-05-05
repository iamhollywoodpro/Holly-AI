"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Loader2, XCircle } from "lucide-react";

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
  status: "pending" | "running" | "success" | "error";
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface ToolVisualizerProps {
  toolCalls: ToolCall[];
}

export default function ToolVisualizer({ toolCalls }: ToolVisualizerProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (id: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTools(newExpanded);
  };

  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 my-4">
      {toolCalls.map((tool) => {
        const isExpanded = expandedTools.has(tool.id);
        const duration = tool.endTime
          ? ((tool.endTime - tool.startTime) / 1000).toFixed(2)
          : null;

        return (
          <div
            key={tool.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            {/* Tool Header */}
            <button
              onClick={() => toggleTool(tool.id)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              {/* Expand/Collapse Icon */}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}

              {/* Status Icon */}
              {tool.status === "pending" && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              )}
              {tool.status === "running" && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
              {tool.status === "success" && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {tool.status === "error" && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}

              {/* Tool Name */}
              <span className="font-medium text-gray-900">{tool.name}</span>

              {/* Duration */}
              {duration && (
                <span className="text-xs text-gray-500 ml-auto">
                  {duration}s
                </span>
              )}

              {/* Status Badge */}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  tool.status === "pending"
                    ? "bg-gray-100 text-gray-600"
                    : tool.status === "running"
                    ? "bg-blue-100 text-blue-600"
                    : tool.status === "success"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {tool.status}
              </span>
            </button>

            {/* Tool Details (Expanded) */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                {/* Arguments */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Arguments
                  </div>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                </div>

                {/* Result */}
                {tool.result && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Result
                    </div>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {typeof tool.result === "string"
                        ? tool.result
                        : JSON.stringify(tool.result, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {tool.error && (
                  <div>
                    <div className="text-xs font-semibold text-red-500 uppercase mb-1">
                      Error
                    </div>
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {tool.error}
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div className="text-xs text-gray-500">
                  Started: {new Date(tool.startTime).toLocaleTimeString()}
                  {tool.endTime && (
                    <>
                      {" • "}
                      Ended: {new Date(tool.endTime).toLocaleTimeString()}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
