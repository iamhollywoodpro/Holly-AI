'use client';

import { useBuilderStore, BuildEvent } from '@/lib/builder/store';

const STATUS_COLORS: Record<string, string> = {
  idle: 'text-gray-500', planning: 'text-yellow-400', building: 'text-blue-400',
  running: 'text-green-400', error: 'text-red-400', done: 'text-green-400', stopped: 'text-gray-500',
};

export function BuildStatusBar() {
  const { activeSession, sessions, setActiveSession, toggleSidebar, sidebarCollapsed, clearEvents, setFileTree } = useBuilderStore();

  async function loadSession(id: string) {
    const r = await fetch(`/api/builder/session?id=${id}`);
    const d = await r.json();
    if (d.session) {
      setActiveSession(d.session);
      clearEvents();
      setFileTree([]);
      // Load events
      if (d.session.events) {
        d.session.events.forEach((e: BuildEvent) => {
          useBuilderStore.getState().addEvent(e);
        });
      }
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-[#0a0a0c] shrink-0">
      {/* HOLLY brand */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">H</div>
        <div>
          <span className="text-xs font-semibold text-white">HOLLY</span>
          <span className="text-xs text-gray-600 ml-1.5">AI Builder</span>
        </div>
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* Session selector */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {sessions.slice(0, 5).map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                activeSession?.id === s.id
                  ? 'bg-purple-600/30 border border-purple-500/30 text-purple-300'
                  : 'bg-white/5 border border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/8'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${STATUS_COLORS[s.status] ?? 'bg-gray-500'} bg-current`} />
              <span className="max-w-[80px] truncate">{s.prompt.slice(0, 25)}…</span>
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Active session status */}
        {activeSession && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`${STATUS_COLORS[activeSession.status] ?? 'text-gray-500'} capitalize`}>
              {activeSession.status}
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600 font-mono">{activeSession.stack}</span>
          </div>
        )}

        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Show agent panel' : 'Hide agent panel'}
          className="p-1.5 text-gray-600 hover:text-gray-400 hover:bg-white/5 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={sidebarCollapsed ? 'M4 6h16M4 12h16M4 18h16' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </button>

        {/* Docs link */}
        <a
          href="/dashboard"
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          Dashboard ↗
        </a>
      </div>
    </div>
  );
}
