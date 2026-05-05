'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/builder/store';
import type { FileNode } from '@/lib/builder/store';

const FILE_ICONS: Record<string, string> = {
  typescript: '🔷', typescriptreact: '⚛️', javascript: '🟡', javascriptreact: '⚛️',
  python: '🐍', css: '🎨', scss: '🎨', html: '🌐', json: '📋',
  markdown: '📝', yaml: '⚙️', bash: '🖥️', plaintext: '📄', sql: '🗄️',
  rust: '🦀', go: '🐹',
};

export function WorkspaceFileExplorer() {
  const { fileTree, activeSessionId, openFile, activeFilePath } = useBuilderStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  if (!activeSessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <span className="text-2xl mb-2">📁</span>
        <p className="text-xs text-gray-600">No workspace yet</p>
      </div>
    );
  }

  if (fileTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <span className="text-2xl mb-2 animate-pulse">⚙️</span>
        <p className="text-xs text-gray-600">Building…</p>
      </div>
    );
  }

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  async function handleFileClick(node: FileNode) {
    if (node.isDirectory) { toggleDir(node.path); return; }
    try {
      const r = await fetch(`/api/builder/files?sessionId=${activeSessionId}&path=${encodeURIComponent(node.path)}`);
      const d = await r.json();
      if (d.content !== undefined) openFile(node.path, d.content);
    } catch { /* ignore */ }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-2 py-2 border-b border-white/5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Explorer</span>
      </div>
      <div className="py-1">
        {fileTree.map(node => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expandedDirs}
            activeFilePath={activeFilePath}
            onFileClick={handleFileClick}
          />
        ))}
      </div>
    </div>
  );
}

function FileTreeNode({
  node, depth, expanded, activeFilePath, onFileClick,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  activeFilePath: string | null;
  onFileClick: (n: FileNode) => void;
}) {
  const isExpanded = expanded.has(node.path);
  const isActive = activeFilePath === node.path;
  const icon = node.isDirectory
    ? (isExpanded ? '📂' : '📁')
    : (FILE_ICONS[node.language ?? ''] ?? '📄');

  return (
    <>
      <button
        onClick={() => onFileClick(node)}
        className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-xs text-left hover:bg-white/5 transition-colors group ${isActive ? 'bg-purple-600/20 text-purple-300' : 'text-gray-400'}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="text-sm shrink-0">{icon}</span>
        <span className={`truncate ${node.isDirectory ? 'font-medium text-gray-300' : ''}`}>{node.name}</span>
        {!node.isDirectory && node.size !== undefined && (
          <span className="ml-auto text-[9px] text-gray-700 group-hover:text-gray-500 shrink-0">
            {node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(1)}K`}
          </span>
        )}
      </button>
      {node.isDirectory && isExpanded && node.children?.map(child => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          activeFilePath={activeFilePath}
          onFileClick={onFileClick}
        />
      ))}
    </>
  );
}
