"use client";

import { useState, useEffect, useRef } from "react";
import { X, Maximize2, Minimize2, Terminal, FileText, Image, Code } from "lucide-react";

export interface SandboxFile {
  path: string;
  type: "file" | "directory";
  content?: string;
  size?: number;
}

export interface SandboxOutput {
  type: "stdout" | "stderr" | "info";
  content: string;
  timestamp: number;
}

export interface SandboxWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentAction?: string;
  files?: SandboxFile[];
  terminalOutput?: SandboxOutput[];
  preview?: {
    type: "image" | "code" | "text";
    content: string;
  };
}

export default function SandboxWindow({
  isOpen,
  onClose,
  currentAction,
  files = [],
  terminalOutput = [],
  preview,
}: SandboxWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "terminal" | "preview">("terminal");
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col ${
        isMaximized
          ? "inset-4"
          : "bottom-4 right-4 w-[600px] h-[400px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-gray-200">
            HOLLY Sandbox
          </span>
          {currentAction && (
            <span className="text-xs text-gray-400">
              • {currentAction}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-850 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("terminal")}
          className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${
            activeTab === "terminal"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Terminal className="w-3 h-3" />
          Terminal
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${
            activeTab === "files"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <FileText className="w-3 h-3" />
          Files ({files.length})
        </button>
        {preview && (
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${
              activeTab === "preview"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {preview.type === "image" && <Image className="w-3 h-3" />}
            {preview.type === "code" && <Code className="w-3 h-3" />}
            {preview.type === "text" && <FileText className="w-3 h-3" />}
            Preview
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Terminal Tab */}
        {activeTab === "terminal" && (
          <div
            ref={terminalRef}
            className="h-full overflow-y-auto p-4 font-mono text-xs text-green-400 bg-gray-900"
          >
            {terminalOutput.length === 0 ? (
              <div className="text-gray-500">
                Waiting for HOLLY to start working...
              </div>
            ) : (
              terminalOutput.map((output, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    output.type === "stderr"
                      ? "text-red-400"
                      : output.type === "info"
                      ? "text-blue-400"
                      : "text-green-400"
                  }`}
                >
                  <span className="text-gray-600">
                    [{new Date(output.timestamp).toLocaleTimeString()}]
                  </span>{" "}
                  {output.content}
                </div>
              ))
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="h-full overflow-y-auto p-4">
            {files.length === 0 ? (
              <div className="text-gray-500 text-sm">No files yet</div>
            ) : (
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800 rounded text-sm"
                  >
                    {file.type === "directory" ? (
                      <span className="text-blue-400">📁</span>
                    ) : (
                      <span className="text-gray-400">📄</span>
                    )}
                    <span className="text-gray-300 flex-1">{file.path}</span>
                    {file.size && (
                      <span className="text-gray-500 text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && preview && (
          <div className="h-full overflow-y-auto p-4">
            {preview.type === "image" && (
              <img
                src={preview.content}
                alt="Preview"
                className="max-w-full h-auto rounded"
              />
            )}
            {preview.type === "code" && (
              <pre className="text-xs text-gray-300 font-mono bg-gray-800 p-4 rounded overflow-x-auto">
                {preview.content}
              </pre>
            )}
            {preview.type === "text" && (
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {preview.content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
