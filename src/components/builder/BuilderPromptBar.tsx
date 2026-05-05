'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/lib/builder/store';
import type { BuildSession } from '@/lib/builder/store';

const EXAMPLES = [
  'Build me a SaaS dashboard with auth and billing',
  'Create a Next.js landing page with Tailwind',
  'Make a full-stack todo app with a REST API',
  'Build a music analytics dashboard',
  'Create a portfolio site with dark mode',
];

interface Props {
  onSessionCreated: (session: BuildSession) => void;
}

export function BuilderPromptBar({ onSessionCreated }: Props) {
  const { prompt, setPrompt, activeSession, isStreaming } = useBuilderStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  async function handleBuild() {
    if (!prompt.trim() || loading || isStreaming) return;
    setLoading(true);
    setError('');

    try {
      // 1. Create session
      const sessionRes = await fetch('/api/builder/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const { session, error: sessErr } = await sessionRes.json();
      if (sessErr) throw new Error(sessErr);

      // Notify parent → connects SSE
      onSessionCreated(session);

      // 2. Start agent
      await fetch('/api/builder/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start build');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-white/5 bg-[#0d0d0f] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleBuild()}
            onFocus={() => setShowExamples(true)}
            onBlur={() => setTimeout(() => setShowExamples(false), 200)}
            placeholder='Tell HOLLY what to build… e.g. "Build a SaaS dashboard with auth and dark mode"'
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
            disabled={isStreaming || loading}
          />
          {/* Example suggestions */}
          {showExamples && !prompt && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#16161a] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-white/5">Quick starts</div>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onMouseDown={() => { setPrompt(ex); setShowExamples(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-purple-300 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleBuild}
          disabled={!prompt.trim() || loading || isStreaming}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-150"
        >
          {loading || isStreaming ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Building…</>
          ) : (
            <><span>⚡</span> Build</>
          )}
        </button>

        {activeSession && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400 border border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${
              activeSession.status === 'running' ? 'bg-green-400 animate-pulse' :
              activeSession.status === 'building' || activeSession.status === 'planning' ? 'bg-yellow-400 animate-pulse' :
              activeSession.status === 'error' ? 'bg-red-400' :
              activeSession.status === 'done' ? 'bg-green-400' : 'bg-gray-500'
            }`} />
            <span className="capitalize">{activeSession.status}</span>
            {activeSession.progress > 0 && activeSession.progress < 100 && (
              <span className="text-purple-400">{activeSession.progress}%</span>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
