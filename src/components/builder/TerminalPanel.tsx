'use client';

/**
 * HOLLY AI Builder — Interactive Terminal Panel
 *
 * Transport priority:
 *   1. WebSocket + node-pty (full PTY — interactive, live stdin/stdout)
 *   2. REST fallback (buffered, still functional)
 *
 * xterm.js is loaded dynamically to avoid SSR issues.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useBuilderStore } from '@/lib/builder/store';

// ─── xterm.js dynamic import helpers ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XTerminal = any;

async function loadXterm(): Promise<{ Terminal: XTerminal; FitAddon: XTerminal }> {
  const [{ Terminal }, { FitAddon }] = await Promise.all([
    import('xterm'),
    import('xterm-addon-fit'),
  ]);
  return { Terminal, FitAddon };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalPanel() {
  const {
    terminalHistory, appendTerminal, clearTerminal,
    activeSessionId, bottomPanelTab, events,
  } = useBuilderStore();

  // WS state
  const wsRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<XTerminal | null>(null);
  const [wsMode, setWsMode] = useState<'connecting' | 'connected' | 'disconnected' | 'unavailable'>('disconnected');
  const [ptyAvailable, setPtyAvailable] = useState<boolean | null>(null);

  // REST fallback state
  const [cmd, setCmd] = useState('');
  const [running, setRunning] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── Probe PTY availability ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    fetch(`/api/builder/terminal-session?sessionId=${activeSessionId}`)
      .then(r => r.json())
      .then(d => setPtyAvailable(d.ptyAvailable === true))
      .catch(() => setPtyAvailable(false));
  }, [activeSessionId]);

  // ─── WebSocket + xterm.js setup ───────────────────────────────────────────
  const connectWs = useCallback(async () => {
    if (!activeSessionId || ptyAvailable !== true) return;
    if (!containerRef.current) return;

    setWsMode('connecting');

    // Spawn terminal session server-side
    const spawnRes = await fetch('/api/builder/terminal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeSessionId, terminalId: 'main', cols: 120, rows: 30 }),
    }).then(r => r.json()).catch(() => null);

    if (!spawnRes?.wsUrl) {
      setPtyAvailable(false);
      setWsMode('unavailable');
      return;
    }

    // If server reports PTY unavailable, fall back immediately
    if (spawnRes.ptyAvailable === false) {
      setPtyAvailable(false);
      setWsMode('unavailable');
      return;
    }

    // Load xterm
    const { Terminal, FitAddon } = await loadXterm().catch(() => ({ Terminal: null, FitAddon: null }));
    if (!Terminal) { setWsMode('unavailable'); return; }

    // Destroy old instance
    if (xtermRef.current) { try { xtermRef.current.dispose(); } catch {} }
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }

    const term = new Terminal({
      theme: { background: '#0a0a0c', foreground: '#d4d4d4', cursor: '#a855f7', selectionBackground: '#a855f740' },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    xtermRef.current = term;
    fitRef.current = fit;

    // Construct ws:// URL — append token so server.ts can authenticate the
    // upgrade (cookies are NOT sent on WebSocket handshake requests).
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let wsPath = `${spawnRes.wsUrl}&cols=${term.cols}&rows=${term.rows}`;
    if (spawnRes.token) wsPath += `&token=${encodeURIComponent(spawnRes.token)}`;
    const wsUrl = `${proto}://${location.host}${wsPath}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsMode('connected');
      term.writeln('\x1b[32m● HOLLY interactive terminal connected\x1b[0m');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; data?: string; code?: number; message?: string };
        if (msg.type === 'output' && msg.data) term.write(msg.data);
        if (msg.type === 'exit') {
          term.writeln(`\r\n\x1b[33m[Process exited with code ${msg.code}]\x1b[0m`);
          setWsMode('disconnected');
        }
        if (msg.type === 'error') {
          term.writeln(`\r\n\x1b[31m[Error: ${msg.message}]\x1b[0m`);
        }
      } catch {}
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31m[WebSocket error — falling back to REST mode]\x1b[0m');
      setWsMode('disconnected');
      setPtyAvailable(false);
    };

    ws.onclose = () => {
      setWsMode('disconnected');
    };

    // Term input → WS
    term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Resize
    term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // Heartbeat
    const hb = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
    ws.addEventListener('close', () => clearInterval(hb));

  }, [activeSessionId, ptyAvailable]);

  // Connect when PTY is confirmed available and session is active
  useEffect(() => {
    if (ptyAvailable === true && activeSessionId && bottomPanelTab === 'terminal') {
      connectWs();
    }
    return () => {
      if (wsRef.current) { try { wsRef.current.close(); } catch {} }
      if (xtermRef.current) { try { xtermRef.current.dispose(); } catch {} }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptyAvailable, activeSessionId]);

  // Fit on panel resize
  useEffect(() => {
    const obs = new ResizeObserver(() => { try { fitRef.current?.fit(); } catch {} });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── REST fallback ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  async function runCmd() {
    if (!cmd.trim() || !activeSessionId || running) return;
    const command = cmd.trim();
    setCmdHistory(h => [command, ...h.slice(0, 49)]);
    setCmd(''); setHistIdx(-1); setRunning(true);
    appendTerminal(`$ ${command}`);
    try {
      const r = await fetch('/api/builder/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, command }),
      });
      const d = await r.json();
      if (d.stdout) appendTerminal(d.stdout);
      if (d.stderr) appendTerminal(`[stderr] ${d.stderr}`);
      if (d.error) appendTerminal(`[error] ${d.error}`);
    } catch (e) {
      appendTerminal(`[error] ${e instanceof Error ? e.message : 'Request failed'}`);
    } finally { setRunning(false); }
  }

  // ─── Render: Problems tab ─────────────────────────────────────────────────
  const errorEvents = events.filter(e => e.level === 'error');
  if (bottomPanelTab === 'problems') {
    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#0a0a0c]">
        {errorEvents.length === 0 ? (
          <div className="text-center text-gray-600 text-xs mt-4">No problems detected</div>
        ) : errorEvents.map((e, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-red-950/20 border border-red-900/30 rounded text-xs">
            <span>❌</span>
            <div>
              <div className="text-red-400 font-medium">{e.title}</div>
              {e.body && <div className="text-gray-500 mt-0.5 text-[10px]">{e.body.slice(0, 200)}</div>}
              {e.filePath && <div className="text-blue-400 mt-0.5 font-mono text-[10px]">{e.filePath}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Render: Logs tab ─────────────────────────────────────────────────────
  if (bottomPanelTab === 'logs') {
    const logEvents = events.filter(e => e.type === 'log' || e.type === 'cmd_done' || e.type === 'cmd_start');
    return (
      <div className="flex-1 overflow-y-auto p-2 bg-[#0a0a0c] font-mono">
        {logEvents.map((e, i) => (
          <div key={i} className={`text-[10px] py-0.5 ${e.level === 'error' ? 'text-red-400' : e.level === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
            <span className="text-gray-700 mr-2">{new Date(e.ts).toLocaleTimeString()}</span>
            {e.title}
            {e.body && <span className="text-gray-700 ml-2">{e.body.slice(0, 80)}</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    );
  }

  // ─── Render: Terminal tab ─────────────────────────────────────────────────

  // WS/PTY mode — render xterm container
  if (ptyAvailable === true) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0c]">
        {/* Status bar */}
        <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 text-[10px]">
          <span className={`w-2 h-2 rounded-full ${
            wsMode === 'connected' ? 'bg-green-400' :
            wsMode === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-600'
          }`} />
          <span className="text-gray-500">
            {wsMode === 'connected' ? 'PTY connected' :
             wsMode === 'connecting' ? 'Connecting…' :
             wsMode === 'disconnected' ? 'Disconnected' : 'Unavailable'}
          </span>
          <div className="flex-1" />
          {wsMode === 'disconnected' && (
            <button onClick={connectWs} className="text-purple-400 hover:text-purple-300 text-[10px]">
              Reconnect
            </button>
          )}
          {wsMode === 'connected' && (
            <button
              onClick={() => { if (wsRef.current) wsRef.current.close(); }}
              className="text-gray-600 hover:text-gray-400 text-[10px]"
            >
              Disconnect
            </button>
          )}
        </div>
        {/* xterm.js container */}
        <div ref={containerRef} className="flex-1 overflow-hidden p-1" style={{ minHeight: 0 }} />
      </div>
    );
  }

  // REST fallback mode
  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      {/* REST mode indicator */}
      {ptyAvailable === false && (
        <div className="px-3 py-1 bg-yellow-950/30 border-b border-yellow-900/30 text-[10px] text-yellow-400">
          ⚡ REST terminal mode (node-pty unavailable — install it for live PTY)
        </div>
      )}
      {/* Output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-5">
        {terminalHistory.length === 0 ? (
          <div className="text-gray-700 text-center mt-2">Terminal ready — run commands in your workspace</div>
        ) : terminalHistory.map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith('$ ') ? 'text-purple-400 font-bold' :
              line.startsWith('[error]') || line.startsWith('[stderr]') ? 'text-red-400' :
              'text-gray-400'
            }
          >
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
        <span className="text-purple-400 font-mono text-xs shrink-0">
          {activeSessionId ? '~/workspace $' : '$'}
        </span>
        <input
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { runCmd(); return; }
            if (e.key === 'ArrowUp') { const idx = Math.min(histIdx + 1, cmdHistory.length - 1); setHistIdx(idx); setCmd(cmdHistory[idx] ?? ''); }
            if (e.key === 'ArrowDown') { const idx = Math.max(histIdx - 1, -1); setHistIdx(idx); setCmd(idx === -1 ? '' : cmdHistory[idx]); }
            if (e.key === 'l' && e.ctrlKey) { clearTerminal(); e.preventDefault(); }
          }}
          placeholder={activeSessionId ? 'Run a command in your workspace…' : 'No active workspace'}
          disabled={!activeSessionId || running}
          className="flex-1 bg-transparent text-xs text-gray-300 font-mono placeholder-gray-700 focus:outline-none"
        />
        {running && <span className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin shrink-0" />}
      </div>
    </div>
  );
}
