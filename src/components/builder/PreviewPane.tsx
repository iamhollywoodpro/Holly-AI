'use client';

import { useState, useRef, useCallback } from 'react';
import { useBuilderStore } from '@/lib/builder/store';

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

const VIEWPORTS: Record<ViewportMode, { width: string; label: string; icon: string }> = {
  desktop: { width: '100%',   label: 'Desktop', icon: '🖥️' },
  tablet:  { width: '768px',  label: 'Tablet',  icon: '📱' },
  mobile:  { width: '390px',  label: 'Mobile',  icon: '📲' },
};

export function PreviewPane() {
  const { previewUrl, activeSession, activeSessionId, rightPanelTab } = useBuilderStore();
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [key, setKey] = useState(0);
  const [starting, setStarting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refresh = useCallback(() => setKey(k => k + 1), []);

  const startPreview = useCallback(async () => {
    if (!activeSessionId || starting) return;
    setStarting(true);
    try {
      await fetch('/api/builder/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
    } finally {
      setStarting(false);
    }
  }, [activeSessionId, starting]);

  if (rightPanelTab === 'git') {
    return <GitPanel />;
  }

  if (!previewUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[#0d0d0f]">
        <div className="text-5xl mb-4">🌐</div>
        <p className="text-gray-300 text-sm font-medium mb-1">No preview running</p>
        <p className="text-gray-600 text-xs mb-6">
          {activeSession?.status === 'done' || activeSession?.status === 'running'
            ? 'Start the preview server to see your app'
            : 'Complete the build to launch a preview'}
        </p>
        {(activeSession?.status === 'done' || activeSession?.status === 'running') && (
          <button
            onClick={startPreview}
            disabled={starting}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 text-white text-sm rounded-lg transition-all"
          >
            {starting ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting…</>
            ) : (
              <><span>🚀</span> Start Preview</>
            )}
          </button>
        )}
        {!activeSession && (
          <p className="text-gray-600 text-xs">Start a build above to see a live preview here</p>
        )}
      </div>
    );
  }

  const { width } = VIEWPORTS[viewport];

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f]">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-[#0a0a0c]">
        {/* URL bar */}
        <div className="flex-1 flex items-center gap-1.5 bg-white/5 rounded px-2 py-1 border border-white/8">
          <span className="text-green-400 text-xs">●</span>
          <span className="text-xs text-gray-400 truncate font-mono">{previewUrl}</span>
        </div>

        {/* Refresh */}
        <button
          onClick={refresh}
          title="Refresh"
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Open in tab */}
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* Viewport modes */}
        <div className="flex items-center border border-white/10 rounded overflow-hidden">
          {(Object.entries(VIEWPORTS) as [ViewportMode, typeof VIEWPORTS[ViewportMode]][]).map(([mode, v]) => (
            <button
              key={mode}
              onClick={() => setViewport(mode)}
              title={v.label}
              className={`px-2 py-1 text-xs transition-colors ${viewport === mode ? 'bg-purple-600/30 text-purple-300' : 'text-gray-600 hover:text-gray-400 hover:bg-white/3'}`}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* iframe container */}
      <div className="flex-1 overflow-hidden flex items-start justify-center bg-[#111113] p-2">
        <div
          className="h-full bg-white overflow-hidden rounded shadow-2xl transition-all duration-300"
          style={{ width, maxWidth: '100%' }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            title="App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  );
}

function GitPanel() {
  const { activeSessionId } = useBuilderStore();
  const [gitData, setGitData] = useState<{ status?: string; diff?: string; branch?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);

  const load = useCallback(async () => {
    if (!activeSessionId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/builder/git?sessionId=${activeSessionId}`);
      setGitData(await r.json());
    } finally { setLoading(false); }
  }, [activeSessionId]);

  const commit = useCallback(async () => {
    if (!activeSessionId || !commitMsg.trim()) return;
    setCommitting(true);
    try {
      await fetch('/api/builder/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, message: commitMsg }),
      });
      setCommitMsg('');
      load();
    } finally { setCommitting(false); }
  }, [activeSessionId, commitMsg, load]);

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">⎇ Git Status</span>
        <button onClick={load} className="text-xs text-purple-400 hover:text-purple-300" disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {gitData ? (
        <>
          <div className="bg-white/5 rounded p-2">
            <div className="text-[10px] text-gray-500 mb-1">Branch: <span className="text-gray-300">{gitData.branch ?? 'main'}</span></div>
            <pre className="text-[10px] text-gray-400 whitespace-pre-wrap max-h-24 overflow-y-auto">{gitData.status || 'clean'}</pre>
          </div>
          {gitData.diff && (
            <div className="bg-white/5 rounded p-2 flex-1 overflow-y-auto">
              <div className="text-[10px] text-gray-500 mb-1">Diff</div>
              <pre className="text-[10px] text-gray-400 whitespace-pre-wrap">{gitData.diff.slice(0, 3000)}</pre>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="Commit message…"
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={commit}
              disabled={!commitMsg.trim() || committing}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 text-white text-xs rounded transition-colors"
            >
              {committing ? '…' : 'Commit'}
            </button>
          </div>
        </>
      ) : (
        <button onClick={load} className="text-sm text-purple-400 hover:text-purple-300 text-center mt-8">
          Load git status
        </button>
      )}
    </div>
  );
}
