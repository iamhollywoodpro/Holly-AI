/**
 * POST /api/learning/taste/track — Phase 4 (updated)
 *
 * Record a taste signal using the working TasteEngine.
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

    const { category, item, signal, context, weight, source } = await req.json();
    const dbUser = await getOrCreateUser(userId);

    const engine = new TasteEngine(dbUser.id);
    await engine.recordSignal({
      category,
      item: item || '',
      signal,
      context,
      weight: typeof weight === 'number' ? weight : 1.0,
      source: source ?? 'implicit',
    });

    return NextResponse.json({ success: true, message: 'Taste signal recorded' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
