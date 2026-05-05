/**
 * POST /api/builder/terminal-session — get a WS token + ws URL for xterm.js
 * GET  /api/builder/terminal-session — probe PTY availability + active status
 * DELETE /api/builder/terminal-session — close a terminal session
 *
 * Flow:
 *   1. TerminalPanel calls POST with { sessionId, terminalId, cols, rows }
 *   2. This route validates auth + session ownership, then returns:
 *        { ptyAvailable, wsUrl, token }
 *      where `token` is the Clerk session token to pass as ?token= on the WS URL.
 *      (Cookies are NOT sent with WS upgrade requests, so the token must travel
 *      in the URL query string where server.ts reads it.)
 *   3. TerminalPanel opens  wss://host/api/builder/terminal-ws?sessionId=...&token=...
 *   4. server.ts intercepts the HTTP upgrade, verifies the token, spawns the PTY.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { terminalRegistry } from '@/lib/builder/terminal-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── POST — initialise / reconnect ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId, terminalId = 'main', cols = 120, rows = 30 } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const ptyAvailable = terminalRegistry.isPtyAvailable();

  // Fetch a short-lived Clerk session token so the browser can authenticate
  // the WebSocket connection (cookies don't travel with WS upgrade requests).
  // getToken() returns the session JWT — safe to pass in query params over TLS.
  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    // getToken() may fail in some Clerk versions — WS auth will use dev fallback
  }

  const wsUrl = `/api/builder/terminal-ws?sessionId=${sessionId}&terminalId=${terminalId}`;

  return NextResponse.json({
    ptyAvailable,
    terminalId,
    cols,
    rows,
    wsUrl,
    token,  // client appends ?token=<this> to wsUrl
    message: ptyAvailable
      ? 'PTY available — connect via WebSocket'
      : 'node-pty not available — falling back to REST terminal mode',
  });
}

// ─── GET — status probe ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId  = url.searchParams.get('sessionId');
  const terminalId = url.searchParams.get('terminalId') ?? 'main';

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const t = terminalRegistry.get(sessionId, terminalId);
  return NextResponse.json({
    ptyAvailable: terminalRegistry.isPtyAvailable(),
    active: !!t,
    pid: t?.pid,
    cols: t?.cols,
    rows: t?.rows,
    wsUrl: `/api/builder/terminal-ws?sessionId=${sessionId}&terminalId=${terminalId}`,
  });
}

// ─── DELETE — close terminal ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId  = url.searchParams.get('sessionId');
  const terminalId = url.searchParams.get('terminalId') ?? 'main';

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  terminalRegistry.close(sessionId, terminalId);
  return NextResponse.json({ ok: true });
}
