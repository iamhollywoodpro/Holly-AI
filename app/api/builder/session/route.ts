/**
 * POST /api/builder/session — create a new build session
 * GET  /api/builder/session — list user's sessions
 * DELETE /api/builder/session?id=xxx — delete a session
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { destroyWorkspace } from '@/lib/builder/sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { prompt, projectType, stack, repoUrl } = await req.json();
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const session = await prisma.buildSession.create({
    data: {
      userId: user.id,
      prompt: prompt.trim(),
      projectType: projectType ?? 'webapp',
      stack: stack ?? 'nextjs',
      repoUrl: repoUrl ?? null,
      status: 'idle',
      phase: 'init',
    },
  });

  return NextResponse.json({ session }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ sessions: [] });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (id) {
    const session = await prisma.buildSession.findFirst({
      where: { id, userId: user.id },
      include: {
        events: { orderBy: { createdAt: 'asc' }, take: 500 },
        files: { orderBy: { createdAt: 'asc' }, select: { id: true, path: true, action: true, language: true, createdAt: true } },
        processes: true,
      },
    });
    return NextResponse.json({ session });
  }

  const sessions = await prisma.buildSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, prompt: true, status: true, phase: true, progress: true, stack: true, projectType: true, previewUrl: true, createdAt: true },
  });

  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (session.workspaceDir) {
    await destroyWorkspace(session.id).catch(() => {});
  }

  await prisma.buildSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
