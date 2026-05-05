/**
 * POST /api/builder/format — run Prettier on a file or the project
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { runCommand } from '@/lib/builder/sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId, filePath, write } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const target = filePath || '.';
  const writeFlag = write ? ' --write' : ' --check';
  const result = await runCommand(sessionId, `npx prettier ${target}${writeFlag}`);

  return NextResponse.json({
    ok: result.exitCode === 0,
    sessionId,
    target,
    write: !!write,
    stdout: result.stdout.slice(0, 65536),
    stderr: result.stderr.slice(0, 65536),
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });
}
