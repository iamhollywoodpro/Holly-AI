/**
 * POST   /api/builder/sandbox         — Create a new sandbox container
 * GET    /api/builder/sandbox?id=xxx   — Get sandbox status
 * DELETE /api/builder/sandbox?id=xxx   — Destroy sandbox
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getCloudSandbox } from '@/lib/builder/cloud-sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSession(userId: string, sessionId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;
  return prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await getSession(userId, sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const manager = getCloudSandbox();

  const dockerAvailable = await manager.isDockerAvailable();
  if (!dockerAvailable) {
    return NextResponse.json(
      { error: 'Docker is not available on this server. Cloud sandbox requires Docker.', fallback: 'local' },
      { status: 503 }
    );
  }

  try {
    const info = await manager.createSandbox(sessionId);
    return NextResponse.json({
      sandbox: {
        sessionId: info.sessionId,
        containerId: info.containerId,
        containerName: info.containerName,
        status: info.status,
        createdAt: info.createdAt,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('id');
  if (!sessionId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const session = await getSession(userId, sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const manager = getCloudSandbox();
  const status = await manager.getSandboxStatus(sessionId);
  const info = manager.getInfo(sessionId);

  return NextResponse.json({
    status,
    sandbox: info ? {
      sessionId: info.sessionId,
      containerId: info.containerId,
      containerName: info.containerName,
      status: info.status,
      createdAt: info.createdAt,
      lastActivityAt: info.lastActivityAt,
      ports: Object.fromEntries(info.ports),
    } : null,
    dockerAvailable: await manager.isDockerAvailable(),
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('id');
  if (!sessionId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const session = await getSession(userId, sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const manager = getCloudSandbox();
  await manager.destroySandbox(sessionId);
  return NextResponse.json({ ok: true });
}
