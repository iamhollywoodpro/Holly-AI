/**
 * GET /api/notion/status
 * Returns whether Notion is connected for this user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.integration.findFirst({
    where: { service: 'notion', createdBy: userId },
  });

  if (!row || !row.isActive) {
    return NextResponse.json({ connected: false });
  }

  const cfg = row.config as Record<string, unknown>;
  return NextResponse.json({
    connected: true,
    workspaceName: cfg?.workspaceName ?? null,
    workspaceIcon: cfg?.workspaceIcon ?? null,
    connectedAt: cfg?.connectedAt ?? null,
  });
}
