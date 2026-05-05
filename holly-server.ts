/**
 * HOLLY AI — WebSocket wrapper for Next.js standalone server
 *
 * WHY THIS FILE EXISTS (and why it's NOT server.ts):
 *   In Next.js standalone mode, the build generates .next/standalone/server.js —
 *   a self-contained server that does NOT include webpack (bundle5, etc.).
 *   The Dockerfile copies that file to /app/server.js via:
 *     COPY --from=builder /app/.next/standalone ./
 *   If our custom server also compiles to server.js it OVERWRITES the standalone
 *   server, causing the fatal "Cannot find module './bundle5'" crash at startup.
 *
 *   Solution: this file compiles to holly-server.js (via tsconfig.server.json).
 *   The Dockerfile CMD becomes ["node", "holly-server.js"]. This file monkey-patches
 *   http.createServer, then requires the standalone ./server.js to start Next.js,
 *   and attaches a WebSocket upgrade handler to the captured HTTP server for PTY
 *   terminal support (/api/builder/terminal-ws).
 *
 * PRODUCTION flow:
 *   1. holly-server.js starts
 *   2. Monkey-patches http.createServer to capture Next's server instance
 *   3. require('./server.js') — the standalone Next.js server starts
 *   4. WS upgrade handler attached to the captured server
 *   5. /api/builder/terminal-ws → PTY terminal; all other traffic → Next.js
 *
 * DEVELOPMENT flow:
 *   Uses next() API normally (webpack available in dev).
 *
 * Environment:
 *   PORT              (default 3000)
 *   HOSTNAME          (default 0.0.0.0)
 *   TERMINAL_TRANSPORT  set to 'ws' to enable WS terminal (default: ws)
 */

import http from 'http';
import { parse } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const dev      = process.env.NODE_ENV !== 'production';
const port     = parseInt(process.env.PORT ?? '3000', 10);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

const WS_ENABLED    = (process.env.TERMINAL_TRANSPORT ?? 'ws') === 'ws';
const WS_PATH_PREFIX = '/api/builder/terminal-ws';

// ─── PTY deps — lazy-loaded so a missing native addon degrades gracefully ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let terminalRegistry: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sandboxGetProvider: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaClient: any = null;
let clerkVerify: ((token: string) => Promise<{ sub: string } | null>) | null = null;

async function loadDeps(): Promise<boolean> {
  if (terminalRegistry) return true;
  try {
    const [tReg, sbx, db, clerk] = await Promise.all([
      import('./src/lib/builder/terminal-registry'),
      import('./src/lib/builder/sandbox-provider'),
      import('./src/lib/db'),
      import('@clerk/nextjs/server'),
    ]);
    terminalRegistry   = (tReg as any).terminalRegistry;
    sandboxGetProvider = (sbx as any).getSandboxProvider;
    prismaClient       = (db as any).prisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyClerk = clerk as any;
    if (typeof anyClerk.verifyToken === 'function') {
      clerkVerify = anyClerk.verifyToken;
    }
    return terminalRegistry?.isPtyAvailable?.() ?? false;
  } catch (e) {
    console.warn('[WS] Failed to load PTY deps:', e instanceof Error ? e.message : e);
    return false;
  }
}

// ─── WebSocket server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

async function authenticate(url: string, headers: http.IncomingHttpHeaders): Promise<string | null> {
  const parsed     = parse(url, true);
  const queryToken = parsed.query.token as string | undefined;
  const authHeader = headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = queryToken ?? bearerToken;
  if (!token) return null;

  if (clerkVerify) {
    try { return (await clerkVerify(token))?.sub ?? null; } catch { return null; }
  }
  if (dev) {
    console.warn('[WS] Clerk unavailable — accepting token in dev');
    return 'dev-user';
  }
  return null;
}

async function handleTerminalWs(
  ws: WebSocket,
  userId: string,
  sessionId: string,
  terminalId: string,
  cols: number,
  rows: number,
) {
  const send = (obj: object) => { try { ws.send(JSON.stringify(obj)); } catch {} };

  if (!terminalRegistry?.isPtyAvailable?.()) {
    send({ type: 'error', message: 'node-pty not available' });
    ws.close(); return;
  }

  let workspaceDir: string;
  try {
    const user = await prismaClient.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) { send({ type: 'error', message: 'User not found' }); ws.close(); return; }
    const session = await prismaClient.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
    if (!session) { send({ type: 'error', message: 'Session not found' }); ws.close(); return; }
    const provider = await sandboxGetProvider();
    workspaceDir = provider.workspaceDir(sessionId);
  } catch {
    send({ type: 'error', message: 'Auth check failed' });
    ws.close(); return;
  }

  terminalRegistry.close(sessionId, terminalId);
  const terminal = terminalRegistry.spawn({ terminalId, sessionId, userId, workspaceDir, cols, rows });
  if (!terminal) { send({ type: 'error', message: 'Failed to spawn PTY' }); ws.close(); return; }

  send({ type: 'ready', pid: terminal.pid, cols: terminal.cols, rows: terminal.rows });

  const unsub = terminalRegistry.subscribe(sessionId, terminalId, (data: string) => {
    if (ws.readyState === WebSocket.OPEN) send({ type: 'output', data });
  });

  terminalRegistry.onExit(sessionId, terminalId, (code: number) => {
    if (ws.readyState === WebSocket.OPEN) { send({ type: 'exit', code }); ws.close(); }
    unsub();
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; data?: string; cols?: number; rows?: number };
      if (msg.type === 'input' && msg.data)           terminalRegistry.write(sessionId, terminalId, msg.data);
      else if (msg.type === 'resize' && msg.cols && msg.rows) {
        terminalRegistry.resize(sessionId, terminalId, msg.cols, msg.rows);
        send({ type: 'resized', cols: msg.cols, rows: msg.rows });
      } else if (msg.type === 'ping') send({ type: 'pong' });
    } catch {}
  });

  ws.on('close', () => unsub());
  ws.on('error', (err) => { console.error(`[WS Terminal] ${sessionId}:${terminalId}:`, err.message); unsub(); });
}

function attachWsHandler(server: http.Server) {
  if (!WS_ENABLED) return;

  loadDeps().then(ok => {
    console.log(`[HOLLY] PTY available: ${ok}. WS terminal on ${WS_PATH_PREFIX}`);
  });

  server.on('upgrade', async (req: http.IncomingMessage, socket, head) => {
    const url = req.url ?? '/';
    if (!url.startsWith(WS_PATH_PREFIX)) {
      if (!url.includes('webpack-hmr') && !url.includes('_next')) socket.destroy();
      return;
    }

    const parsed     = parse(url, true);
    const sessionId  = parsed.query.sessionId as string;
    const terminalId = (parsed.query.terminalId as string) ?? 'main';
    const cols = parseInt((parsed.query.cols as string) ?? '120', 10);
    const rows = parseInt((parsed.query.rows as string) ?? '30', 10);

    if (!sessionId) { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }

    const userId = await authenticate(url, req.headers);
    if (!userId) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }

    const ready = await loadDeps();
    if (!ready) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n{"error":"PTY not available"}');
      socket.destroy(); return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
      handleTerminalWs(ws, userId, sessionId, terminalId, cols, rows).catch(err => {
        console.error('[WS] handleTerminalWs error:', err);
        try { ws.close(); } catch {}
      });
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!dev) {
    // ── PRODUCTION ──────────────────────────────────────────────────────────────
    // Monkey-patch http.createServer so we capture Next.js standalone's server.
    // Then require('./server.js') — the standalone server — which calls
    // http.createServer and starts listening on PORT.
    //
    // The standalone server.js does NOT use webpack so there is no bundle5 error.

    let capturedServer: http.Server | null = null;
    const _origCreate = http.createServer.bind(http);

    // @ts-ignore – overriding bound method signature
    http.createServer = function (...args: Parameters<typeof http.createServer>) {
      // @ts-ignore
      const srv = _origCreate(...args);
      capturedServer = srv;
      // Restore so subsequent calls (if any) are unaffected
      // @ts-ignore
      http.createServer = _origCreate;
      return srv;
    };

    // Set env vars before requiring standalone (it reads them synchronously)
    process.env.PORT     = String(port);
    process.env.HOSTNAME = hostname;

    // The standalone server is at /app/server.js in the Docker runner.
    // holly-server.js is the file being executed, server.js is standalone.
    const standaloneServerPath = path.join(__dirname, 'server.js');
    console.log('[HOLLY] Starting production server...');
    console.log('[HOLLY] Standalone path:', standaloneServerPath);
    console.log('[HOLLY] Node version:', process.version);
    console.log('[HOLLY] Platform:', process.platform);

    // Heartbeat log every 60s to confirm process health in long-running containers
    setInterval(() => {
      console.log(`[HOLLY] Heartbeat — Uptime: ${Math.floor(process.uptime())}s | RSS: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
    }, 60000).unref();

    try {
      require(standaloneServerPath);
      console.log('[HOLLY] Standalone server required successfully');
    } catch (err: any) {
      console.error('[HOLLY] FATAL: Failed to load standalone server:', err.message);
      if (err.code === 'MODULE_NOT_FOUND') {
        console.error('[HOLLY] This usually means Next.js standalone build failed or files are misplaced.');
      }
      process.exit(1);
    }

    // Wait for server to be captured (standalone starts async listener)
    let waited = 0;
    while (!capturedServer && waited < 15000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }

    if (capturedServer) {
      attachWsHandler(capturedServer as http.Server);
      try {
        const { attachCollabServer } = await import('./src/lib/builder/collaborative-server');
        attachCollabServer(capturedServer as http.Server);
        console.log('[HOLLY] Collaborative editing: ENABLED ✓');
      } catch (e) {
        console.warn('[HOLLY] Collaborative editing unavailable:', e instanceof Error ? e.message : e);
      }
      console.log(`[HOLLY] Ready — http://${hostname}:${port}`);
      console.log(`[HOLLY] WS terminal: ${WS_ENABLED ? 'ENABLED ✓' : 'DISABLED'}`);
    } else {
      console.warn('[HOLLY] Could not capture server instance — WS terminal unavailable');
      console.log(`[HOLLY] Ready (no WS) — http://${hostname}:${port}`);
    }
  } else {
    // ── DEVELOPMENT ─────────────────────────────────────────────────────────────
    // In dev, webpack is available so next() works fine.
    const { default: next } = await import('next');
    const app    = next({ dev: true, hostname, port });
    const handle = app.getRequestHandler();
    await app.prepare();

    const server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    attachWsHandler(server);

    try {
      const { attachCollabServer } = await import('./src/lib/builder/collaborative-server');
      attachCollabServer(server);
      console.log('[HOLLY] Collaborative editing: ENABLED ✓');
    } catch (e) {
      console.warn('[HOLLY] Collaborative editing unavailable:', e instanceof Error ? e.message : e);
    }

    server.listen(port, hostname, () => {
      console.log(`[HOLLY] Dev server ready — http://${hostname}:${port}`);
      console.log(`[HOLLY] WS terminal: ${WS_ENABLED ? 'ENABLED ✓' : 'DISABLED'}`);
    });
  }
}

main().catch(err => {
  console.error('[HOLLY] Fatal startup error:', err);
  process.exit(1);
});
