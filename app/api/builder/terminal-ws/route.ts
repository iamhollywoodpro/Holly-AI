/**
 * GET /api/builder/terminal-ws?sessionId=&terminalId=&token=
 *
 * WebSocket terminal endpoint.
 *
 * ── How it works ──────────────────────────────────────────────────────────────
 * WebSocket upgrades (HTTP 101) CANNOT be handled in Next.js 14 App Router
 * Route Handlers — the framework strips the raw socket before the handler runs.
 *
 * The upgrade is intercepted at the HTTP server level in server.ts (custom
 * Next.js server) which uses the 'ws' library to complete the handshake and
 * hands the connection to terminal-registry.ts / node-pty.
 *
 * This route handler exists for two reasons:
 *   1. Returns a 426 with a clear error message if hit via plain HTTP (not WS)
 *   2. Lets Next.js include the path in the build manifest so it is never
 *      accidentally removed by tree-shaking.
 *
 * ── Wire protocol ─────────────────────────────────────────────────────────────
 * client → server  { type: 'input',  data: string }
 *                  { type: 'resize', cols: number, rows: number }
 *                  { type: 'ping' }
 *
 * server → client  { type: 'ready',   pid: number, cols: number, rows: number }
 *                  { type: 'output',  data: string }
 *                  { type: 'exit',    code: number }
 *                  { type: 'resized', cols: number, rows: number }
 *                  { type: 'pong' }
 *                  { type: 'error',   message: string }
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 * Pass a Clerk session token in the query string:
 *   ?token=<clerk_session_token>
 * or in the Authorization header:
 *   Authorization: Bearer <clerk_session_token>
 *
 * Cookies are NOT sent with WebSocket upgrade requests from the browser, so the
 * token must be passed explicitly. The TerminalPanel component fetches a short-
 * lived token via /api/builder/terminal-session and appends it to the WS URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { terminalRegistry } from '@/lib/builder/terminal-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const isUpgrade = req.headers.get('upgrade')?.toLowerCase() === 'websocket';

  if (isUpgrade) {
    // The custom server (server.ts) should have intercepted this.
    // If we reach here it means the app is running with `next start` (no custom
    // server). Return a helpful error so the client falls back to REST mode.
    return NextResponse.json(
      {
        error: 'WebSocket upgrade not supported in this deployment mode',
        hint: 'Start the server with `node server.js` instead of `next start`',
        ptyAvailable: terminalRegistry.isPtyAvailable(),
        fallback: 'rest',
      },
      { status: 503 }
    );
  }

  // Plain HTTP GET — status probe
  return NextResponse.json({
    endpoint: '/api/builder/terminal-ws',
    protocol: 'websocket',
    ptyAvailable: terminalRegistry.isPtyAvailable(),
    note: 'Connect via WebSocket with ?sessionId=&terminalId=&token=<clerk_token>',
  });
}
