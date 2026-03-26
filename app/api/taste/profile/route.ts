/**
 * GET /api/taste/profile — Phase 2E
 *
 * Returns the current TasteProfile for the authenticated user.
 * If no profile exists yet (not enough signals), returns null with a message.
 *
 * DELETE /api/taste/profile — reset all taste signals and profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TasteEngine } from '@/lib/learning/taste-engine';
import { getOrCreateUser } from '@/lib/user-manager';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getOrCreateUser(userId);
    const engine = new TasteEngine(dbUser.id);
    const profile = await engine.getProfile();

    if (!profile) {
      return NextResponse.json({
        success: true,
        profile: null,
        message: 'No taste profile yet — send at least 3 signals to build one',
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error('[/api/taste/profile GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getOrCreateUser(userId);

    await prisma.$transaction([
      prisma.tasteSignal.deleteMany({ where: { userId: dbUser.id } }),
      prisma.tasteProfile.deleteMany({ where: { userId: dbUser.id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Taste profile reset' });
  } catch (err: any) {
    console.error('[/api/taste/profile DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
