/**
 * POST /api/builder/preview — start / restart preview server + register proxy
 * DELETE /api/builder/preview?sessionId= — stop preview + unregister proxy
 * GET /api/builder/preview?sessionId= — get preview status
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { detectFramework, detectOpenPort, startDevServer, stopProcess, waitForPort, isProcessRunning } from '@/lib/builder/sandbox';
import { emit } from '@/lib/builder/event-bus';
import { previewRegistry } from '@/lib/builder/preview-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREVIEW_PROXY_ENABLED = process.env.PREVIEW_PROXY_ENABLED !== 'false';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const running = isProcessRunning(`preview-${sessionId}`);
  const proxyTarget = previewRegistry.get(sessionId);

  return NextResponse.json({
    running,
    previewUrl: PREVIEW_PROXY_ENABLED
      ? `/preview/${sessionId}`
      : session.previewUrl,
    previewPort: session.previewPort,
    proxyEnabled: PREVIEW_PROXY_ENABLED,
    proxyRegistered: !!proxyTarget,
    status: session.status,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Session not found or workspace not ready' }, { status: 404 });

  // Stop existing if running
  const pid = `preview-${sessionId}`;
  if (isProcessRunning(pid)) stopProcess(pid);
  previewRegistry.unregister(sessionId);

  const fw = await detectFramework(session.workspaceDir);
  const port = await detectOpenPort([fw.port, 3001, 3002, 4000, 5000]);

  emit(sessionId, { type: 'info', title: `Starting preview on port ${port}`, command: fw.devCommand, level: 'info' });

  const cmd = fw.devCommand.replace(/port[= ]\d+/i, `port=${port}`).replace(/-p \d+/, `-p ${port}`);

  startDevServer(pid, cmd, session.workspaceDir, line => {
    emit(sessionId, { type: 'log', title: 'Server', body: line.trim(), level: 'info' });
  });

  const started = await waitForPort(port, 30000);

  // Register in preview proxy registry
  if (started) {
    previewRegistry.register(sessionId, port);
  }

  // Determine public preview URL
  const previewUrl = PREVIEW_PROXY_ENABLED
    ? `/preview/${sessionId}`
    : `http://localhost:${port}`;

  await prisma.buildSession.update({
    where: { id: sessionId },
    data: { previewUrl, previewPort: port, status: started ? 'running' : session.status },
  });

  if (started) {
    emit(sessionId, {
      type: 'preview_ready',
      title: '🚀 Preview ready',
      body: previewUrl,
      previewUrl,
      level: 'success',
    });
  } else {
    emit(sessionId, { type: 'error', title: 'Preview server failed to start', level: 'error' });
  }

  return NextResponse.json({ ok: started, previewUrl, port, proxyEnabled: PREVIEW_PROXY_ENABLED });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  stopProcess(`preview-${sessionId}`);
  previewRegistry.unregister(sessionId);

  await prisma.buildSession.update({
    where: { id: sessionId },
    data: { status: 'done' },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
