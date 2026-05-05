/**
 * GET    /api/builder/files?sessionId=&path= — read file or list tree
 * POST   /api/builder/files — write file
 * DELETE /api/builder/files?sessionId=&path= — delete file
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { readFile, writeFile, deleteFile, listFiles } from '@/lib/builder/sandbox';
import { emit } from '@/lib/builder/event-bus';
import { emitFileSync } from '@/lib/builder/file-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSession(userId: string, sessionId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;
  return prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const filePath = url.searchParams.get('path');

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const session = await getSession(userId, sessionId);
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Session not found or workspace not ready' }, { status: 404 });

  if (filePath) {
    try {
      const content = await readFile(session.workspaceDir, filePath);
      return NextResponse.json({ path: filePath, content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  const tree = await listFiles(session.workspaceDir);
  return NextResponse.json({ tree });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId, path: filePath, content } = await req.json();
  if (!sessionId || !filePath || content === undefined) {
    return NextResponse.json({ error: 'sessionId, path, and content required' }, { status: 400 });
  }

  const session = await getSession(userId, sessionId);
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const isNew = !(await prisma.buildFile.findFirst({ where: { sessionId, path: filePath } }));
  await writeFile(session.workspaceDir, filePath, content);

  // Upsert in DB
  if (!isNew) {
    await prisma.buildFile.update({ where: { sessionId_path: { sessionId, path: filePath } }, data: { content, updatedAt: new Date() } });
  } else {
    await prisma.buildFile.create({ data: { sessionId, path: filePath, content, action: 'write' } });
  }

  // Emit legacy event + file sync event
  emit(sessionId, { type: 'file_write', title: `Saved ${filePath}`, filePath, level: 'success' });
  await emitFileSync({ eventType: isNew ? 'file_created' : 'file_updated', sessionId, path: filePath, content: content.slice(0, 200), source: 'user' });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const filePath = url.searchParams.get('path');

  if (!sessionId || !filePath) return NextResponse.json({ error: 'sessionId and path required' }, { status: 400 });

  const session = await getSession(userId, sessionId);
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  await deleteFile(session.workspaceDir, filePath);
  await prisma.buildFile.deleteMany({ where: { sessionId, path: filePath } });
  emit(sessionId, { type: 'file_delete', title: `Deleted ${filePath}`, filePath, level: 'warn' });
  await emitFileSync({ eventType: 'file_deleted', sessionId, path: filePath, source: 'user' });

  return NextResponse.json({ ok: true });
}
