'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useBuilderStore } from '@/lib/builder/store';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(m => m.default),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

export function CodeEditorPane() {
  const {
    openFiles, activeFilePath, setActiveFile, closeFile,
    updateFileContent, markFileDirty, resolveConflict,
    fileEditorState, activeSessionId,
  } = useBuilderStore();

  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTabs = [...openFiles.keys()];
  const activeContent = activeFilePath ? openFiles.get(activeFilePath) ?? '' : '';
  const activeEditorState = activeFilePath ? fileEditorState.get(activeFilePath) : undefined;

  function detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', css: 'css', scss: 'scss', html: 'html',
      json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
      sh: 'shell', sql: 'sql', rs: 'rust', go: 'go',
    };
    return map[ext] ?? 'plaintext';
  }

  // Auto-reload stale file from server
  const reloadStaleFile = useCallback(async () => {
    if (!activeFilePath || !activeSessionId || !activeEditorState?.isStale) return;
    try {
      const r = await fetch(`/api/builder/files?sessionId=${activeSessionId}&path=${encodeURIComponent(activeFilePath)}`);
      const d = await r.json();
      if (d.content !== undefined) {
        useBuilderStore.getState().openFile(activeFilePath, d.content);
      }
    } catch { /* ignore */ }
  }, [activeFilePath, activeSessionId, activeEditorState?.isStale]);

  useEffect(() => {
    if (activeEditorState?.isStale && !activeEditorState.isDirty) {
      reloadStaleFile();
    }
  }, [activeEditorState?.isStale, activeEditorState?.isDirty, reloadStaleFile]);

  function handleChange(value: string | undefined) {
    if (!activeFilePath || value === undefined) return;
    updateFileContent(activeFilePath, value);
    markFileDirty(activeFilePath, true);

    // Auto-save after 1.5s
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!activeSessionId || !activeFilePath) return;
      setSaving(true);
      try {
        await fetch('/api/builder/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId, path: activeFilePath, content: value }),
        });
        markFileDirty(activeFilePath, false);
      } finally {
        setSaving(false);
      }
    }, 1500);
  }

  if (!activeFilePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#0d0d0f]">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-gray-400 text-sm mb-2">No file open</p>
        <p className="text-gray-600 text-xs">Select a file from the explorer or start a build</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/5 overflow-x-auto scrollbar-none bg-[#0a0a0c]">
        {openTabs.map(path => {
          const name = path.split('/').pop() ?? path;
          const isActive = path === activeFilePath;
          const state = fileEditorState.get(path);
          return (
            <div
              key={path}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border-r border-white/5 cursor-pointer whitespace-nowrap group min-w-0 ${
                isActive ? 'bg-[#0d0d0f] text-gray-200 border-t border-t-purple-500' : 'text-gray-500 hover:bg-white/3 hover:text-gray-300'
              }`}
              onClick={() => setActiveFile(path)}
            >
              {state?.hasConflict && <span title="Conflict — HOLLY updated this file">⚡</span>}
              {state?.isDirty && !state.hasConflict && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" title="Unsaved changes" />}
              {state?.isStale && !state.isDirty && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" title="Updated by HOLLY" />}
              <span className="truncate max-w-[120px]">{name}</span>
              <button
                onClick={e => { e.stopPropagation(); closeFile(path); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-gray-500 ml-1 flex-shrink-0"
              >×</button>
            </div>
          );
        })}
        {saving && (
          <div className="ml-auto px-3 py-2 text-[10px] text-gray-600 flex items-center gap-1 shrink-0">
            <span className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse" />
            saving
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center px-3 py-1 text-[10px] text-gray-600 border-b border-white/5 bg-[#0a0a0c]">
        {activeFilePath.split('/').map((part, i, arr) => (
          <span key={i}>
            <span className={i === arr.length - 1 ? 'text-gray-400' : ''}>{part}</span>
            {i < arr.length - 1 && <span className="mx-1 text-gray-700">/</span>}
          </span>
        ))}
        {activeEditorState?.isDirty && <span className="ml-2 text-yellow-600">● modified</span>}
        {activeEditorState?.isStale && !activeEditorState.isDirty && <span className="ml-2 text-blue-500 cursor-pointer" onClick={reloadStaleFile}>↻ updated by HOLLY — click to reload</span>}
      </div>

      {/* Conflict banner */}
      {activeEditorState?.hasConflict && (
        <div className="flex items-center gap-3 px-3 py-2 bg-yellow-950/40 border-b border-yellow-700/40 text-xs text-yellow-300">
          <span>⚡ HOLLY updated this file, but you have unsaved changes.</span>
          <button
            onClick={() => activeFilePath && resolveConflict(activeFilePath, true)}
            className="px-2 py-0.5 bg-yellow-700/40 hover:bg-yellow-700/60 rounded text-yellow-200"
          >
            Keep mine
          </button>
          <button
            onClick={() => activeFilePath && resolveConflict(activeFilePath, false)}
            className="px-2 py-0.5 bg-blue-700/40 hover:bg-blue-700/60 rounded text-blue-200"
          >
            Accept HOLLY&apos;s
          </button>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={detectLanguage(activeFilePath)}
          value={activeContent}
          theme="vs-dark"
          onChange={handleChange}
          options={{
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
            suggest: { showMethods: true, showFunctions: true, showConstructors: true },
          }}
        />
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="h-full bg-[#0d0d0f] flex items-center justify-center">
      <div className="text-gray-600 text-sm">Loading editor…</div>
    </div>
  );
}
