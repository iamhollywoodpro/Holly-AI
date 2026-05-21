/**
 * POST /api/multi-tenant/invalidate — Phase 17: Cache Invalidation
 *
 * Invalidates a user's cached context. Called when:
 * - Relationship profile is rebuilt
 * - User preferences change
 * - Learning profile is updated
 * - Taste profile changes
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { invalidateUserCache, invalidateAllCaches } from '@/lib/multi-tenant/user-context-cache';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { userId?: string; all?: boolean };
    const user = await prisma.user.findUnique({
      where: { clerkUserId: authResult.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (body.all) {
      invalidateAllCaches();
      return NextResponse.json({ phase: 17, action: 'invalidate_all' });
    }

    const targetUserId = body.userId ?? user.id;
    invalidateUserCache(targetUserId);

    return NextResponse.json({
      phase: 17,
      action: 'invalidate_user',
      userId: targetUserId,
    });
  } catch (error) {
    console.error('[Cache Invalidation] Error:', error);
    return NextResponse.json(
      { error: 'Invalidation failed' },
      { status: 500 }
    );
  }
}
