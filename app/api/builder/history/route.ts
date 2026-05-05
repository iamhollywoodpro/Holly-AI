/**
 * GET /api/builder/history — file change history for a session
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
  const filePath = url.searchParams.get('path');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const where: any = { sessionId };
  if (filePath) where.path = filePath;

  const history = await prisma.buildFile.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      path: true,
      content: false,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, sessionId, history, count: history.length });
}
