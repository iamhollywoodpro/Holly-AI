/**
 * POST /api/builder/lint — run ESLint on a file or the project
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

  const { sessionId, filePath, fix } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const target = filePath || '.';
  const fixFlag = fix ? ' --fix' : '';
  const result = await runCommand(sessionId, `npx eslint ${target}${fixFlag} --format json 2>/dev/null || true`);

  let lintResults;
  try {
    lintResults = JSON.parse(result.stdout);
  } catch {
    lintResults = { raw: result.stdout, stderr: result.stderr };
  }

  return NextResponse.json({
    ok: result.exitCode === 0,
    sessionId,
    target,
    results: lintResults,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });
}
