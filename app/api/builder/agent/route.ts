/**
 * POST /api/builder/agent — kick off the autonomous builder agent
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { runBuilderAgent } from '@/lib/builder/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  if (['building', 'running'].includes(session.status)) {
    return NextResponse.json({ error: 'Session already running' }, { status: 409 });
  }

  // Run agent in background — don't await (SSE stream delivers progress)
  runBuilderAgent(sessionId).catch(err => {
    console.error('[BuilderAgent] Unhandled error:', err);
  });

  return NextResponse.json({ ok: true, sessionId, message: 'Agent started — connect to /api/builder/stream/:sessionId for live updates' });
}
