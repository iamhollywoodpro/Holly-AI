"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminalRegistry = void 0;
const os_1 = __importDefault(require("os"));
// node-pty types (installed via npm install node-pty)
// We import dynamically to avoid hard failures on platforms without native bindings.
let pty = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pty = require('node-pty');
}
catch {
    console.warn('[TerminalRegistry] node-pty not available — terminals will be unavailable');
}
const TERMINAL_TTL_MS = 30 * 60 * 1000; // 30 min idle TTL
class TerminalRegistry {
    constructor() {
        this.sessions = new Map();
    }
    key(sessionId, terminalId) { return `${sessionId}:${terminalId}`; }
    spawn(opts) {
        if (!pty)
            return null;
        const { terminalId, sessionId, userId, workspaceDir, cols = 120, rows = 30, shell } = opts;
        // Kill existing if same key
        this.close(sessionId, terminalId);
        const shellExe = shell ?? (os_1.default.platform() === 'win32' ? 'cmd.exe' : (process.env.SHELL ?? '/bin/bash'));
        const cwd = fsExistsSync(workspaceDir) ? workspaceDir : os_1.default.tmpdir();
        const ptyProc = pty.spawn(shellExe, [], {
            name: 'xterm-256color',
            cols,
            rows,
            cwd,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                HOME: cwd,
                HOLLY_SESSION: sessionId,
            },
        });
        const session = {
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
        ptyProc.onData((data) => {
            session.lastActivity = Date.now();
            session.listeners.forEach(fn => { try {
                fn(data);
            }
            catch { } });
        });
        ptyProc.onExit(({ exitCode }) => {
            session.exitListeners.forEach(fn => { try {
                fn(exitCode);
            }
            catch { } });
            this.sessions.delete(k);
        });
        return session;
    }
    write(sessionId, terminalId, data) {
        const s = this.sessions.get(this.key(sessionId, terminalId));
        if (!s)
            return false;
        s.lastActivity = Date.now();
        try {
            s.ptyProcess.write(data);
            return true;
        }
        catch {
            return false;
        }
    }
    resize(sessionId, terminalId, cols, rows) {
        const s = this.sessions.get(this.key(sessionId, terminalId));
        if (!s)
            return false;
        try {
            s.ptyProcess.resize(Math.max(10, cols), Math.max(5, rows));
            s.cols = cols;
            s.rows = rows;
            return true;
        }
        catch {
            return false;
        }
    }
    subscribe(sessionId, terminalId, fn) {
        const s = this.sessions.get(this.key(sessionId, terminalId));
        if (!s)
            return () => { };
        s.listeners.add(fn);
        return () => s.listeners.delete(fn);
    }
    onExit(sessionId, terminalId, fn) {
        const s = this.sessions.get(this.key(sessionId, terminalId));
        if (!s)
            return () => { };
        s.exitListeners.add(fn);
        return () => s.exitListeners.delete(fn);
    }
    close(sessionId, terminalId) {
        const k = this.key(sessionId, terminalId);
        const s = this.sessions.get(k);
        if (s) {
            try {
                s.ptyProcess.kill();
            }
            catch { }
            this.sessions.delete(k);
        }
    }
    closeAll(sessionId) {
        for (const [k, s] of this.sessions) {
            if (s.sessionId === sessionId) {
                try {
                    s.ptyProcess.kill();
                }
                catch { }
                this.sessions.delete(k);
            }
        }
    }
    get(sessionId, terminalId) {
        return this.sessions.get(this.key(sessionId, terminalId));
    }
    isPtyAvailable() { return pty !== null; }
    /** Periodic TTL sweep — call from a setInterval */
    sweepExpired() {
        const now = Date.now();
        for (const [k, s] of this.sessions) {
            if (now - s.lastActivity > TERMINAL_TTL_MS) {
                try {
                    s.ptyProcess.kill();
                }
                catch { }
                this.sessions.delete(k);
                console.log(`[TerminalRegistry] Swept expired terminal ${k}`);
            }
        }
    }
}
const globalKey = '__holly_terminal_registry__';
exports.terminalRegistry = globalThis[globalKey] ??
    (() => {
        const r = new TerminalRegistry();
        globalThis[globalKey] = r;
        // Sweep expired every 10 minutes
        setInterval(() => r.sweepExpired(), 10 * 60 * 1000).unref?.();
        return r;
    })();
function fsExistsSync(p) {
    try {
        require('fs').statSync(p);
        return true;
    }
    catch {
        return false;
    }
}
