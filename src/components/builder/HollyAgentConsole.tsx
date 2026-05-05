'use client';

import { useEffect, useRef } from 'react';
import { useBuilderStore } from '@/lib/builder/store';
import type { BuildEvent } from '@/lib/builder/store';

const EVENT_ICONS: Record<string, string> = {
  plan: '📋', file_write: '✏️', file_delete: '🗑️',
  cmd_start: '▶️', cmd_done: '✓', log: '📟',
  error: '❌', fix: '🔧', preview_ready: '🚀',
  done: '✅', info: 'ℹ️', phase: '⚡', progress: '📊',
};

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-gray-300', warn: 'text-yellow-400',
  error: 'text-red-400', success: 'text-green-400',
};

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  init:     { label: 'Initialising', color: 'text-gray-400' },
  inspect:  { label: 'Inspecting', color: 'text-blue-400' },
  plan:     { label: 'Planning', color: 'text-purple-400' },
  scaffold: { label: 'Scaffolding', color: 'text-cyan-400' },
  install:  { label: 'Installing', color: 'text-yellow-400' },
  build:    { label: 'Building', color: 'text-orange-400' },
  verify:   { label: 'Verifying', color: 'text-teal-400' },
  fix:      { label: 'Auto-fixing', color: 'text-pink-400' },
  preview:  { label: 'Starting preview', color: 'text-indigo-400' },
  done:     { label: 'Complete', color: 'text-green-400' },
  error:    { label: 'Error', color: 'text-red-400' },
};

export function HollyAgentConsole() {
  const { events, activeSession, isStreaming } = useBuilderStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const phase = activeSession?.phase ?? 'idle';
  const phaseInfo = PHASE_LABELS[phase] ?? { label: phase, color: 'text-gray-400' };
  const progress = activeSession?.progress ?? 0;

  // Group events by phase
  const planEvent = events.find(e => e.type === 'plan');
  const fileEvents = events.filter(e => e.type === 'file_write' || e.type === 'file_delete');
  const errorEvents = events.filter(e => e.type === 'error' && e.level === 'error');
  const fixEvents = events.filter(e => e.type === 'fix');

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">H</div>
          <div>
            <div className="text-sm font-semibold text-white">HOLLY Agent</div>
            <div className="text-xs text-gray-500">Autonomous Builder</div>
          </div>
          {isStreaming && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-xs text-purple-400">Live</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {activeSession && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={phaseInfo.color}>{phaseInfo.label}</span>
              <span className="text-gray-500">{progress}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!activeSession && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-3">⚡</div>
          <p className="text-sm text-gray-400 mb-1">HOLLY is ready to build</p>
          <p className="text-xs text-gray-600">Describe what you want to create above and hit Build</p>
        </div>
      )}

      {/* Plan summary */}
      {planEvent && (
        <div className="px-3 py-2 border-b border-white/5 bg-purple-950/20">
          <div className="text-xs text-purple-400 font-medium mb-1">📋 Build Plan</div>
          <div className="text-xs text-gray-400">{planEvent.title}</div>
          {(() => {
            try {
              const p = JSON.parse(planEvent.body ?? '{}');
              return (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-400">{p.stack}</span>
                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-400">{p.files?.length ?? 0} files</span>
                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-400">port {p.port}</span>
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}

      {/* Stats row */}
      {activeSession && (
        <div className="flex border-b border-white/5">
          {[
            { label: 'Files', value: fileEvents.length, color: 'text-cyan-400' },
            { label: 'Errors', value: errorEvents.length, color: 'text-red-400' },
            { label: 'Fixes', value: fixEvents.length, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center py-2 border-r border-white/5 last:border-r-0">
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Event feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {events.filter(e => e.type !== 'state').map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function EventRow({ event }: { event: BuildEvent }) {
  const icon = EVENT_ICONS[event.type] ?? '•';
  const color = LEVEL_COLORS[event.level ?? 'info'] ?? 'text-gray-300';
  const time = new Date(event.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={`px-2 py-1.5 rounded hover:bg-white/3 group transition-colors ${event.level === 'error' ? 'bg-red-950/20' : event.level === 'success' ? 'bg-green-950/10' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${color}`}>{event.title}</div>
          {event.body && event.type !== 'plan' && (
            <div className="text-[10px] text-gray-600 mt-0.5 truncate">{event.body.slice(0, 100)}</div>
          )}
          {event.filePath && (
            <div className="text-[10px] text-blue-400 mt-0.5 font-mono truncate">{event.filePath}</div>
          )}
        </div>
        <span className="text-[9px] text-gray-700 shrink-0 group-hover:text-gray-500">{time}</span>
      </div>
    </div>
  );
}
