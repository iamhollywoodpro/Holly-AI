/**
 * GET  /api/proactive/initiatives — Fetch pending proactive initiatives
 * POST /api/proactive/initiatives — Mark initiative as shown/acted_on/dismissed
 *
 * Phase 2.2: Real-time initiative system frontend support.
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetch pending initiatives for the current user
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch { /* no auth */ }
    if (!userId) return NextResponse.json({ initiatives: [] });

    const { getOrCreateUser } = await import('@/lib/user-manager');
    const { prisma } = await import('@/lib/db');
    const dbUser = await getOrCreateUser(userId);

    const initiatives = await prisma.proactiveInitiative.findMany({
      where: { userId: dbUser.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ initiatives });
  } catch (err) {
    console.error('[ProactiveInitiatives API] GET failed:', err);
    return NextResponse.json({ initiatives: [] });
  }
}

// POST: Update initiative status (shown, acted_on, dismissed)
export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { initiativeId, status } = body;
    if (!initiativeId || !status) {
      return NextResponse.json({ error: 'initiativeId and status required' }, { status: 400 });
    }

    const validStatuses = ['shown', 'acted_on', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { getOrCreateUser } = await import('@/lib/user-manager');
    const { prisma } = await import('@/lib/db');
    const dbUser = await getOrCreateUser(authResult.userId);

    await prisma.proactiveInitiative.updateMany({
      where: { id: initiativeId, userId: dbUser.id },
      data: { status },
    });

    return NextResponse.json({ success: true, initiativeId, status });
  } catch (err) {
    console.error('[ProactiveInitiatives API] POST failed:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
