/**
 * POST /api/notion/disconnect
 * Disconnects Notion integration for the current user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.integration.findFirst({
    where: { service: 'notion', createdBy: userId },
  });

  if (!row) {
    return NextResponse.json({ ok: true, message: 'Not connected' });
  }

  await prisma.integration.update({
    where: { id: row.id },
    data: {
      status: 'inactive',
      isActive: false,
      accessToken: null,
      config: {},
    },
  });

  return NextResponse.json({ ok: true, message: 'Notion disconnected' });
}
