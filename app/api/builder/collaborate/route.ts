/**
 * GET  /api/builder/collaborate — List active collaboration sessions / get session info
 * POST /api/builder/collaborate — Create a new collaboration session
 * DELETE /api/builder/collaborate?sessionId=xxx — End a collaboration session
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  try {
    const { getCollabServer } = await import('@/lib/builder/collaborative-server');

    if (sessionId) {
      const session = await prisma.buildSession.findFirst({
        where: { id: sessionId, userId: user.id },
        select: { id: true, prompt: true, status: true, phase: true, createdAt: true },
      });
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      const roomInfo = getCollabServer().getRoomInfo(sessionId);
      return NextResponse.json({
        session,
        collaboration: roomInfo ?? { participantCount: 0, participants: [] },
      });
    }

    const activeSessions = getCollabServer().getActiveSessions();
    return NextResponse.json({ activeSessions });
  } catch {
    return NextResponse.json({ activeSessions: [], collaboration: null });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const { sessionId } = body;

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true, prompt: true, status: true },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const wsProtocol = (process.env.NODE_ENV === 'production' || req.headers.get('x-forwarded-proto') === 'https')
    ? 'wss' : 'ws';
  const host = req.headers.get('host') ?? 'localhost:3000';

  return NextResponse.json({
    sessionId: session.id,
    wsUrl: `${wsProtocol}://${host}/ws/collaborate?sessionId=${session.id}`,
    status: 'active',
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  try {
    const { getCollabServer } = await import('@/lib/builder/collaborative-server');
    getCollabServer().closeRoom(sessionId);
  } catch {}

  return NextResponse.json({ ok: true });
}
