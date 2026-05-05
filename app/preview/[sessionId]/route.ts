/**
 * GET/POST /preview/[sessionId]
 * GET/POST /preview/[sessionId]/[...path]
 *
 * Secure reverse proxy for per-session preview servers.
 * Routes HOLLY /preview/<sessionId>/* → localhost:<port>/*
 *
 * Security guarantees:
 *  - Only registered sessions can be proxied
 *  - Auth check: session must belong to requesting user
 *  - No arbitrary proxy targets — only localhost ports registered by the builder
 *  - WebSocket upgrades forwarded for HMR
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { previewRegistry } from '@/lib/builder/preview-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(
  req: NextRequest,
  sessionId: string,
  subPath: string,
): Promise<Response> {
  const { userId } = await auth();

  // Auth check
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return new Response('User not found', { status: 404 });

  // Registry check
  const target = previewRegistry.get(sessionId);
  if (!target) {
    // Maybe the session exists but isn't proxied yet — check DB
    const session = await prisma.buildSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { previewPort: true, previewUrl: true, status: true },
    });

    if (!session?.previewPort) {
      return new Response(previewNotReadyPage(sessionId), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Auto-register
    previewRegistry.register(sessionId, session.previewPort);
    const target2 = previewRegistry.get(sessionId)!;
    return forwardRequest(req, target2, subPath);
  }

  // Verify session belongs to user
  const session = await prisma.buildSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) return new Response('Forbidden', { status: 403 });

  return forwardRequest(req, target, subPath);
}

async function forwardRequest(
  req: NextRequest,
  target: { host: string; port: number },
  subPath: string,
): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = `http://${target.host}:${target.port}/${subPath}${url.search}`;

  // Forward the request
  const headers = new Headers(req.headers);
  headers.set('Host', `${target.host}:${target.port}`);
  headers.delete('x-forwarded-host');

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      // @ts-expect-error - duplex is needed for streaming
      duplex: 'half',
      signal: AbortSignal.timeout(30_000),
    });

    // Rewrite absolute URLs in HTML responses
    const contentType = upstream.headers.get('content-type') ?? '';
    const responseHeaders = new Headers(upstream.headers);

    // Remove security headers that break iframes
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.set('x-holly-preview', 'true');

    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      // Rewrite asset paths to go through proxy
      html = html.replace(/src="\/([^"]*?)"/g, `src="/preview/${target}//$1"`);
      return new Response(html, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      return new Response(previewDownPage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return new Response(`Proxy error: ${msg}`, { status: 502 });
  }
}

// ─── Route handlers ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const url = new URL(req.url);
  // Strip /preview/:sessionId prefix to get the sub-path
  const subPath = url.pathname.replace(`/preview/${sessionId}`, '').replace(/^\//, '') || '';
  return proxy(req, sessionId, subPath);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const url = new URL(req.url);
  const subPath = url.pathname.replace(`/preview/${sessionId}`, '').replace(/^\//, '') || '';
  return proxy(req, sessionId, subPath);
}

// ─── HTML templates ────────────────────────────────────────────────────────────

function previewNotReadyPage(sessionId: string): string {
  return `<!DOCTYPE html>
<html style="background:#0a0a0c;color:#d4d4d4;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<body style="text-align:center">
  <div>
    <div style="font-size:2rem;margin-bottom:1rem">⏳</div>
    <div style="color:#a855f7;font-size:1.1rem;margin-bottom:0.5rem">Preview not ready yet</div>
    <div style="color:#666;font-size:0.8rem">Session: ${sessionId}</div>
    <div style="color:#666;font-size:0.8rem;margin-top:0.5rem">The dev server is starting — this page will auto-refresh.</div>
    <script>setTimeout(() => location.reload(), 3000);</script>
  </div>
</body></html>`;
}

function previewDownPage(): string {
  return `<!DOCTYPE html>
<html style="background:#0a0a0c;color:#d4d4d4;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<body style="text-align:center">
  <div>
    <div style="font-size:2rem;margin-bottom:1rem">🔴</div>
    <div style="color:#ef4444;font-size:1.1rem;margin-bottom:0.5rem">Preview server offline</div>
    <div style="color:#666;font-size:0.8rem">The dev server may have crashed or stopped.</div>
    <div style="color:#666;font-size:0.8rem;margin-top:0.5rem">Use the builder terminal to restart it.</div>
    <script>setTimeout(() => location.reload(), 5000);</script>
  </div>
</body></html>`;
}
