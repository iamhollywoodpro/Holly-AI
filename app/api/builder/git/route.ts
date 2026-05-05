/**
 * GET  /api/builder/git?sessionId= — git status + diff
 * POST /api/builder/git — commit changes
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { gitStatus, gitDiff, gitCommit } from '@/lib/builder/sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session?.workspaceDir) return NextResponse.json({ status: 'no workspace' });

  const [status, diff] = await Promise.all([
    gitStatus(session.workspaceDir).catch(() => 'unavailable'),
    gitDiff(session.workspaceDir).catch(() => ''),
  ]);

  return NextResponse.json({ status, diff, branch: session.branch ?? 'main', repoUrl: session.repoUrl });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId, message } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Workspace not ready' }, { status: 404 });

  const result = await gitCommit(session.workspaceDir, message ?? 'update by HOLLY');
  return NextResponse.json({ ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr });
}
