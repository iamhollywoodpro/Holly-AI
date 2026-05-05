/**
 * POST /api/builder/terminal — execute a command in the workspace sandbox
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { runCommand } from '@/lib/builder/sandbox';
import { emit } from '@/lib/builder/event-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BLOCKED = ['rm -rf /', 'sudo', 'chmod 777 /', ':(){:|:&};:', '> /dev/sda', 'mkfs'];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { sessionId, command, timeoutMs } = await req.json();
  if (!sessionId || !command) return NextResponse.json({ error: 'sessionId and command required' }, { status: 400 });

  // Safety
  if (BLOCKED.some(b => command.includes(b))) {
    return NextResponse.json({ error: 'Command blocked for safety' }, { status: 403 });
  }

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Session not found or workspace not ready' }, { status: 404 });

  emit(sessionId, { type: 'cmd_start', title: `$ ${command}`, command, level: 'info' });

  const result = await runCommand(command, session.workspaceDir, { timeoutMs: Math.min(timeoutMs ?? 60000, 120000) });

  emit(sessionId, {
    type: 'cmd_done',
    title: result.exitCode === 0 ? `✓ ${command}` : `✗ ${command} (exit ${result.exitCode})`,
    body: (result.stdout + result.stderr).slice(0, 2000),
    command, exitCode: result.exitCode, durationMs: result.durationMs,
    level: result.exitCode === 0 ? 'success' : 'error',
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id, action: 'builder.terminal.exec',
      details: { resource: 'build_session', resourceId: sessionId, command: command.slice(0, 200), exitCode: result.exitCode },
    },
  }).catch(() => {});

  return NextResponse.json({
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    timedOut: result.timedOut,
  });
}
