/**
 * POST /api/learning/taste/predict — Phase 4 (updated)
 *
 * Get user's taste profile for preference predictions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TasteEngine } from '@/lib/learning/taste-engine';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);
    const engine = new TasteEngine(dbUser.id);
    const profile = await engine.getProfile();

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
