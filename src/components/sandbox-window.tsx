"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  X, Maximize2, Minimize2, Terminal, FileText, Code,
  ChevronRight, ChevronDown, Play, CheckCircle2, XCircle,
  Loader2, FileCode, FolderOpen, PanelLeftClose, PanelLeftOpen,
  GitBranch, Clock, AlertCircle
} from "lucide-react";

// Lazy-load Monaco Editor (heavy — only loads when sandbox opens)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then(m => m.default),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

function EditorSkeleton() {
  return (
    <div className="h-full w-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading editor…
      </div>
    </div>
  );
}

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

// ── Viewport detection hook ──────────────────────────────────────────────
function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// ── Helper: detect Monaco language from file path ──────────────────────────
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown',
    py: 'python', rs: 'rust', go: 'go', sql: 'sql', yaml: 'yaml', yml: 'yaml',
    prisma: 'prisma', graphql: 'graphql', sh: 'shell', bash: 'shell',
    dockerfile: 'dockerfile', txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

// ── Helper: try to extract code content from tool output ───────────────────
function extractCodeFromOutput(output: SandboxOutput): { code: string; filePath: string } | null {
  try {
    const parsed = JSON.parse(output.content);
    // github_read_file result
    if (parsed?.content) {
      const filePath = parsed.path || parsed.filePath || '';
      return { code: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content, null, 2), filePath };
    }
    // Tool result with content array
    if (Array.isArray(parsed?.content) && parsed.content[0]?.text) {
      const text = parsed.content[0].text;
      try {
        const inner = JSON.parse(text);
        if (inner?.content && typeof inner.content === 'string') {
          return { code: inner.content, filePath: inner.path || inner.filePath || '' };
        }
        if (inner?.result?.content) {
          return { code: inner.result.content, filePath: inner.result.path || '' };
        }
      } catch {
        // Not JSON — might be raw code
        if (text.length > 50 && (text.includes('import ') || text.includes('function ') || text.includes('const ') || text.includes('export '))) {
          return { code: text, filePath: '' };
        }
      }
    }
    // Raw code detection
    if (typeof parsed === 'string' && parsed.length > 100) {
      return { code: parsed, filePath: '' };
    }
  } catch {
    // Not JSON — check if it looks like code
    const c = output.content;
    if (c.length > 100 && (c.includes('import ') || c.includes('function ') || c.includes('const ') || c.includes('export ') || c.includes('<'))) {
      return { code: c, filePath: '' };
    }
  }
  return null;
}

// ── Tool execution entry component ─────────────────────────────────────────
function ToolEntry({ output, index, isSelected, onClick }: {
  output: SandboxOutput; index: number; isSelected: boolean; onClick: () => void;
}) {
  const isStart = output.content.includes('⏳') || output.content.includes('Starting');
  const isError = output.type === 'stderr';
  const hasCode = extractCodeFromOutput(output) !== null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-xs border-b border-gray-800/50 transition-colors ${
        isSelected ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">
          {isStart ? <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" /> :
           isError ? <XCircle className="w-3 h-3 text-red-400" /> :
           hasCode ? <FileCode className="w-3 h-3 text-blue-400" /> :
           <CheckCircle2 className="w-3 h-3 text-green-400" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-mono truncate ${isError ? 'text-red-300' : hasCode ? 'text-blue-300' : 'text-gray-300'}`}>
            {output.content.substring(0, 120).replace(/\n/g, ' ')}
          </div>
          <div className="text-gray-600 mt-0.5 flex items-center gap-2">
            <Clock className="w-2.5 h-2.5" />
            {new Date(output.timestamp).toLocaleTimeString()}
            {hasCode && <span className="text-blue-500">• has code</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Sandbox Component ─────────────────────────────────────────────────
export default function SandboxWindow({
  isOpen,
  onClose,
  currentAction,
  files = [],
  terminalOutput = [],
  preview,
}: SandboxWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number>(-1);
  const [editorCode, setEditorCode] = useState<string>('');
  const [editorFilePath, setEditorFilePath] = useState<string>('');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [splitRatio, setSplitRatio] = useState(0.4); // 40% left, 60% right
  const [activeLeftTab, setActiveLeftTab] = useState<'activity' | 'files'>('activity');
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isDraggingSplit = useRef(false);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Auto-select latest entry with code
  useEffect(() => {
    if (terminalOutput.length > 0) {
      // Find the most recent entry with code
      for (let i = terminalOutput.length - 1; i >= 0; i--) {
        const extracted = extractCodeFromOutput(terminalOutput[i]);
        if (extracted) {
          setSelectedEntryIndex(i);
          setEditorCode(extracted.code);
          setEditorFilePath(extracted.filePath);
          break;
        }
      }
    }
  }, [terminalOutput]);

  // Handle selected entry change
  const handleEntryClick = useCallback((index: number) => {
    setSelectedEntryIndex(index);
    const extracted = extractCodeFromOutput(terminalOutput[index]);
    if (extracted) {
      setEditorCode(extracted.code);
      setEditorFilePath(extracted.filePath);
    }
  }, [terminalOutput]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobile) return; // No drag resize on mobile
    isDraggingSplit.current = true;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.7, ratio)));
    };
    const handleMouseUp = () => {
      isDraggingSplit.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isMobile]);

  // Detect language for Monaco
  const editorLanguage = useMemo(() => getLanguageFromPath(editorFilePath), [editorFilePath]);

  // File tree from files prop
  const fileTree = useMemo(() => {
    return files.map(f => ({
      ...f,
      name: f.path.split('/').pop() || f.path,
      depth: f.path.split('/').length - 1,
    }));
  }, [files]);

  if (!isOpen) return null;

  // Mobile: stacked layout, desktop: side-by-side
  const mainLayoutClass = isMobile
    ? 'flex flex-col'
    : 'flex flex-1 overflow-hidden';

  const leftPanelStyle = isMobile
    ? { height: leftPanelOpen ? '45%' : '0px', minHeight: leftPanelOpen ? '150px' : '0px' }
    : { width: `${splitRatio * 100}%`, minWidth: '200px' };

  const leftPanelClass = isMobile
    ? 'flex flex-col border-b border-[#333] bg-[#252526] overflow-hidden flex-shrink-0 transition-[height] duration-200'
    : 'flex flex-col border-r border-[#333] bg-[#252526] overflow-hidden flex-shrink-0';

  const splitterClass = isMobile
    ? 'hidden' // Hide splitter on mobile (panels stack vertically)
    : 'w-1 bg-[#333] hover:bg-[#007acc] cursor-col-resize transition-colors flex-shrink-0';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#1e1e1e] border-t border-[#333] ${
        isMaximized ? "fixed inset-0 z-50" : "relative"
      }`}
      style={!isMaximized ? { height: isMobile ? '50vh' : '320px' } : undefined}
    >
      {/* ── Title Bar (VS Code style) ──────────────────────────────────────── */}
      <div className="flex items-center justify-between h-9 bg-[#323233] border-b border-[#252526] px-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Activity bar icons */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={leftPanelOpen ? 'Hide panel' : 'Show panel'}
          >
            {leftPanelOpen ? (
              <PanelLeftClose className="w-4 h-4 text-gray-400" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#66CCCC]" />
            <span className="text-xs font-medium text-gray-300">
              HOLLY Sandbox
            </span>
          </div>
          {currentAction && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <GitBranch className="w-2.5 h-2.5" />
              {currentAction}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className={mainLayoutClass}>
        {/* ── Left Panel: Activity / Files ─────────────────────────────────── */}
        {leftPanelOpen && (
          <>
            <div
              className={leftPanelClass}
              style={leftPanelStyle}
            >
              {/* Left panel tabs */}
              <div className="flex items-center border-b border-[#333] bg-[#252526] flex-shrink-0">
                <button
                  onClick={() => setActiveLeftTab('activity')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-b-2 transition-colors ${
                    activeLeftTab === 'activity'
                      ? 'border-b-[#66CCCC] text-white'
                      : 'border-b-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  Activity
                </button>
                <button
                  onClick={() => setActiveLeftTab('files')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-b-2 transition-colors ${
                    activeLeftTab === 'files'
                      ? 'border-b-[#66CCCC] text-white'
                      : 'border-b-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <FolderOpen className="w-3 h-3" />
                  Files
                  {files.length > 0 && (
                    <span className="text-gray-600">({files.length})</span>
                  )}
                </button>
              </div>

              {/* Activity tab content */}
              {activeLeftTab === 'activity' && (
                <div className="flex-1 overflow-y-auto" ref={terminalRef}>
                  {terminalOutput.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs gap-2 p-4">
                      <Terminal className="w-6 h-6 opacity-50" />
                      <span>Waiting for HOLLY to start working…</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800/30">
                      {terminalOutput.map((output, index) => (
                        <ToolEntry
                          key={index}
                          output={output}
                          index={index}
                          isSelected={selectedEntryIndex === index}
                          onClick={() => handleEntryClick(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Files tab content */}
              {activeLeftTab === 'files' && (
                <div className="flex-1 overflow-y-auto">
                  {fileTree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs gap-2 p-4">
                      <FileText className="w-6 h-6 opacity-50" />
                      <span>No files yet</span>
                    </div>
                  ) : (
                    <div className="py-1">
                      {fileTree.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (file.content) {
                              setEditorCode(file.content);
                              setEditorFilePath(file.path);
                              setSelectedEntryIndex(-1);
                            }
                          }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-800/50 transition-colors ${
                            editorFilePath === file.path ? 'bg-gray-800/50 text-white' : 'text-gray-400'
                          }`}
                          style={{ paddingLeft: `${12 + file.depth * 12}px` }}
                        >
                          {file.type === "directory" ? (
                            <ChevronRight className="w-3 h-3 text-[#66CCCC] flex-shrink-0" />
                          ) : (
                            <FileCode className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{file.name}</span>
                          {file.size && (
                            <span className="text-gray-600 ml-auto flex-shrink-0">
                              {(file.size / 1024).toFixed(1)}K
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Resizable Splitter ──────────────────────────────────────────── */}
            <div
              className={splitterClass}
              onMouseDown={handleMouseDown}
            />
          </>
        )}

        {/* ── Right Panel: Monaco Editor ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Editor breadcrumb / file path */}
          <div className="flex items-center h-7 bg-[#252526] border-b border-[#333] px-3 flex-shrink-0">
            {editorFilePath ? (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                {editorFilePath.split('/').map((segment, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-gray-600" />}
                    <span className={i === arr.length - 1 ? 'text-gray-200' : ''}>{segment}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-gray-600">No file open</span>
            )}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            {editorCode ? (
              <MonacoEditor
                height="100%"
                language={editorLanguage}
                value={editorCode}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: isMobile ? 10 : 12,
                  lineNumbers: isMobile ? 'off' : 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 8 },
                  renderLineHighlight: 'line',
                  folding: !isMobile,
                  glyphMargin: false,
                  overviewRulerBorder: false,
                  scrollbar: {
                    verticalScrollbarSize: isMobile ? 6 : 8,
                    horizontalScrollbarSize: isMobile ? 6 : 8,
                  },
                }}
              />
            ) : preview ? (
              <div className="h-full overflow-y-auto p-4 bg-[#1e1e1e]">
                {preview.type === "image" && (
                  <img src={preview.content} alt="Preview" className="max-w-full h-auto rounded" />
                )}
                {preview.type === "code" && (
                  <pre className="text-xs text-gray-300 font-mono bg-[#252526] p-4 rounded overflow-x-auto">
                    {preview.content}
                  </pre>
                )}
                {preview.type === "text" && (
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{preview.content}</div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-600">
                <Code className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Code will appear here</p>
                <p className="text-xs text-gray-700 mt-1">
                  When HOLLY reads or writes files, the code shows in this editor
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Bar (VS Code style) ─────────────────────────────────────── */}
      <div className="flex items-center justify-between h-6 bg-[#007acc] px-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-white/90">
            <GitBranch className="w-3 h-3" />
            main
          </span>
          {terminalOutput.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-white/90">
              <Terminal className="w-3 h-3" />
              {terminalOutput.length} events
            </span>
          )}
          {currentAction && (
            <span className="text-[10px] text-white/70 truncate max-w-[200px]">
              {currentAction}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {editorFilePath && (
            <span className="text-[10px] text-white/90">
              {editorLanguage}
            </span>
          )}
          {editorCode && (
            <span className="text-[10px] text-white/90">
              {editorCode.split('\n').length} lines
            </span>
          )}
          <span className="text-[10px] text-white/70">UTF-8</span>
        </div>
      </div>
    </div>
  );
}
