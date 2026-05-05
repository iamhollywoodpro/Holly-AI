/**
 * HOLLY AI — Custom Next.js Server (Development / Reference)
 *
 * PURPOSE:
 *   This is the main Next.js server that handles HTTP traffic and WebSocket
 *   upgrades for the Builder PTY terminal (/api/builder/terminal-ws).
 *
 * PRODUCTION (Docker):
 *   The Dockerfile compiles holly-server.ts → holly-server.js and uses that
 *   as CMD because the standalone output already provides server.js from
 *   .next/standalone/server.js. holly-server.js wraps the standalone server
 *   and attaches the WebSocket handler without overwriting it.
 *
 * DEVELOPMENT:
 *   npx ts-node --project tsconfig.server.json server.ts
 *   (webpack is available in dev so next() works fine here)
 *
 * Environment:
 *   PORT              (default 3000)
 *   HOSTNAME          (default 0.0.0.0)
 *   TERMINAL_TRANSPORT  set to 'ws' to enable WS terminal (default: ws)
 */

import http from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';

const dev      = process.env.NODE_ENV !== 'production';
const port     = parseInt(process.env.PORT ?? '3000', 10);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

const app    = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const WS_ENABLED     = (process.env.TERMINAL_TRANSPORT ?? 'ws') === 'ws';
const WS_PATH_PREFIX = '/api/builder/terminal-ws';

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
    const anyClerk = clerk as any;
    if (typeof anyClerk.verifyToken === 'function') clerkVerify = anyClerk.verifyToken;
    return terminalRegistry?.isPtyAvailable?.() ?? false;
  } catch (e) {
    console.warn('[WS] Failed to load PTY deps:', e instanceof Error ? e.message : e);
    return false;
  }
}

const wss = new WebSocketServer({ noServer: true });

async function authenticate(url: string, headers: http.IncomingHttpHeaders): Promise<string | null> {
  const parsed = parse(url, true);
  const token  = (parsed.query.token as string) ?? (headers['authorization']?.startsWith('Bearer ') ? headers['authorization'].slice(7) : undefined);
  if (!token) return null;
  if (clerkVerify) { try { return (await clerkVerify(token))?.sub ?? null; } catch { return null; } }
  return dev ? 'dev-user' : null;
}

async function handleTerminalWs(ws: WebSocket, userId: string, sessionId: string, terminalId: string, cols: number, rows: number) {
  const send = (obj: object) => { try { ws.send(JSON.stringify(obj)); } catch {} };
  if (!terminalRegistry?.isPtyAvailable?.()) { send({ type: 'error', message: 'node-pty not available' }); ws.close(); return; }
  let workspaceDir: string;
  try {
    const user = await prismaClient.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) { send({ type: 'error', message: 'User not found' }); ws.close(); return; }
    const session = await prismaClient.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
    if (!session) { send({ type: 'error', message: 'Session not found' }); ws.close(); return; }
    workspaceDir = (await sandboxGetProvider()).workspaceDir(sessionId);
  } catch { send({ type: 'error', message: 'Auth check failed' }); ws.close(); return; }
  terminalRegistry.close(sessionId, terminalId);
  const terminal = terminalRegistry.spawn({ terminalId, sessionId, userId, workspaceDir, cols, rows });
  if (!terminal) { send({ type: 'error', message: 'Failed to spawn PTY' }); ws.close(); return; }
  send({ type: 'ready', pid: terminal.pid, cols: terminal.cols, rows: terminal.rows });
  const unsub = terminalRegistry.subscribe(sessionId, terminalId, (data: string) => { if (ws.readyState === WebSocket.OPEN) send({ type: 'output', data }); });
  terminalRegistry.onExit(sessionId, terminalId, (code: number) => { if (ws.readyState === WebSocket.OPEN) { send({ type: 'exit', code }); ws.close(); } unsub(); });
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as any;
      if (msg.type === 'input' && msg.data) terminalRegistry.write(sessionId, terminalId, msg.data);
      else if (msg.type === 'resize' && msg.cols && msg.rows) { terminalRegistry.resize(sessionId, terminalId, msg.cols, msg.rows); send({ type: 'resized', cols: msg.cols, rows: msg.rows }); }
      else if (msg.type === 'ping') send({ type: 'pong' });
    } catch {}
  });
  ws.on('close', () => unsub());
  ws.on('error', (err) => { console.error(`[WS] ${sessionId}:${terminalId}:`, err.message); unsub(); });
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  if (WS_ENABLED) {
    loadDeps().then(ok => console.log(`[HOLLY] PTY available: ${ok}`));
    server.on('upgrade', async (req, socket, head) => {
      const url = req.url ?? '/';
      if (!url.startsWith(WS_PATH_PREFIX)) { if (!url.includes('webpack-hmr') && !url.includes('_next')) socket.destroy(); return; }
      const parsed = parse(url, true);
      const sessionId = parsed.query.sessionId as string;
      const terminalId = (parsed.query.terminalId as string) ?? 'main';
      const cols = parseInt((parsed.query.cols as string) ?? '120', 10);
      const rows = parseInt((parsed.query.rows as string) ?? '30', 10);
      if (!sessionId) { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }
      const userId = await authenticate(url, req.headers);
      if (!userId) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }
      const ready = await loadDeps();
      if (!ready) { socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n'); socket.destroy(); return; }
      wss.handleUpgrade(req, socket, head, (ws) => { wss.emit('connection', ws, req); handleTerminalWs(ws, userId, sessionId, terminalId, cols, rows).catch(() => { try { ws.close(); } catch {} }); });
    });
  }

  server.listen(port, hostname, () => {
    console.log(`[HOLLY] Server ready on http://${hostname}:${port}`);
    console.log(`[HOLLY] WS terminal: ${WS_ENABLED ? 'ENABLED ✓' : 'DISABLED'}`);
  });
});
