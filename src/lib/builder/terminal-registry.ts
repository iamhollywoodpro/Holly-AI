/**
 * HOLLY AI Builder — Terminal Session Registry
 *
 * Manages PTY terminal sessions keyed by (sessionId + terminalId).
 * Each terminal gets its own node-pty instance bound to the sandbox workspace.
 *
 * Supports:
 *  - spawn / resize / write / close
 *  - data listener broadcast
 *  - TTL-based cleanup (no zombie PTYs)
 */

import os from 'os';
import path from 'path';

// node-pty types (installed via npm install node-pty)
// We import dynamically to avoid hard failures on platforms without native bindings.
let pty: typeof import('node-pty') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pty = require('node-pty');
} catch {
  console.warn('[TerminalRegistry] node-pty not available — terminals will be unavailable');
}

const TERMINAL_TTL_MS = 30 * 60 * 1000; // 30 min idle TTL

export interface TerminalSession {
  id: string;
  sessionId: string;        // builder session
  userId: string;
  pid: number;
  cols: number;
  rows: number;
  createdAt: number;
  lastActivity: number;
  listeners: Set<(data: string) => void>;
  exitListeners: Set<(code: number) => void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ptyProcess: any;          // IPty from node-pty
}

class TerminalRegistry {
  private sessions = new Map<string, TerminalSession>();

  key(sessionId: string, terminalId: string) { return `${sessionId}:${terminalId}`; }

  spawn(opts: {
    terminalId: string;
    sessionId: string;
    userId: string;
    workspaceDir: string;
    cols?: number;
    rows?: number;
    shell?: string;
  }): TerminalSession | null {
    if (!pty) return null;

    const { terminalId, sessionId, userId, workspaceDir, cols = 120, rows = 30, shell } = opts;

    // Kill existing if same key
    this.close(sessionId, terminalId);

    const shellExe = shell ?? (os.platform() === 'win32' ? 'cmd.exe' : (process.env.SHELL ?? '/bin/bash'));
    const cwd = fsExistsSync(workspaceDir) ? workspaceDir : os.tmpdir();

    const ptyProc = pty!.spawn(shellExe, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env as Record<string, string>,
        TERM: 'xterm-256color',
        HOME: cwd,
        HOLLY_SESSION: sessionId,
      },
    });

    const session: TerminalSession = {
      id: terminalId,
      sessionId,
      userId,
      pid: ptyProc.pid,
      cols,
      rows,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      listeners: new Set(),
      exitListeners: new Set(),
      ptyProcess: ptyProc,
    };

    const k = this.key(sessionId, terminalId);
    this.sessions.set(k, session);

    ptyProc.onData((data: string) => {
      session.lastActivity = Date.now();
      session.listeners.forEach(fn => { try { fn(data); } catch {} });
    });

    ptyProc.onExit(({ exitCode }: { exitCode: number }) => {
      session.exitListeners.forEach(fn => { try { fn(exitCode); } catch {} });
      this.sessions.delete(k);
    });

    return session;
  }

  write(sessionId: string, terminalId: string, data: string): boolean {
    const s = this.sessions.get(this.key(sessionId, terminalId));
    if (!s) return false;
    s.lastActivity = Date.now();
    try { s.ptyProcess.write(data); return true; } catch { return false; }
  }

  resize(sessionId: string, terminalId: string, cols: number, rows: number): boolean {
    const s = this.sessions.get(this.key(sessionId, terminalId));
    if (!s) return false;
    try {
      s.ptyProcess.resize(Math.max(10, cols), Math.max(5, rows));
      s.cols = cols; s.rows = rows;
      return true;
    } catch { return false; }
  }

  subscribe(sessionId: string, terminalId: string, fn: (data: string) => void): () => void {
    const s = this.sessions.get(this.key(sessionId, terminalId));
    if (!s) return () => {};
    s.listeners.add(fn);
    return () => s.listeners.delete(fn);
  }

  onExit(sessionId: string, terminalId: string, fn: (code: number) => void): () => void {
    const s = this.sessions.get(this.key(sessionId, terminalId));
    if (!s) return () => {};
    s.exitListeners.add(fn);
    return () => s.exitListeners.delete(fn);
  }

  close(sessionId: string, terminalId: string): void {
    const k = this.key(sessionId, terminalId);
    const s = this.sessions.get(k);
    if (s) {
      try { s.ptyProcess.kill(); } catch {}
      this.sessions.delete(k);
    }
  }

  closeAll(sessionId: string): void {
    for (const [k, s] of this.sessions) {
      if (s.sessionId === sessionId) {
        try { s.ptyProcess.kill(); } catch {}
        this.sessions.delete(k);
      }
    }
  }

  get(sessionId: string, terminalId: string): TerminalSession | undefined {
    return this.sessions.get(this.key(sessionId, terminalId));
  }

  isPtyAvailable(): boolean { return pty !== null; }

  /** Periodic TTL sweep — call from a setInterval */
  sweepExpired(): void {
    const now = Date.now();
    for (const [k, s] of this.sessions) {
      if (now - s.lastActivity > TERMINAL_TTL_MS) {
        try { s.ptyProcess.kill(); } catch {}
        this.sessions.delete(k);
        console.log(`[TerminalRegistry] Swept expired terminal ${k}`);
      }
    }
  }
}

const globalKey = '__holly_terminal_registry__';
export const terminalRegistry: TerminalRegistry =
  (globalThis as Record<string, unknown>)[globalKey] as TerminalRegistry ??
  (() => {
    const r = new TerminalRegistry();
    (globalThis as Record<string, unknown>)[globalKey] = r;
    // Sweep expired every 10 minutes
    setInterval(() => r.sweepExpired(), 10 * 60 * 1000).unref?.();
    return r;
  })();

function fsExistsSync(p: string): boolean {
  try { require('fs').statSync(p); return true; } catch { return false; }
}
