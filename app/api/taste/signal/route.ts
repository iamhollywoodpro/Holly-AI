/**
 * POST /api/taste/signal — Phase 2E
 *
 * Record an explicit taste signal from the user (e.g. a thumbs-up/down on a
 * response, or a user preference setting from the UI).
 *
 * Body: { category, item, signal, context?, weight?, source? }
 *
 * Returns: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TasteEngine, TasteCategory, TasteSignalType } from '@/lib/learning/taste-engine';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { category, item, signal, context, weight, source } = body;

    // Validate required fields
    const validCategories: TasteCategory[] = ['tone', 'length', 'format', 'humor', 'emoji', 'technical', 'topic'];
    const validSignals: TasteSignalType[] = ['positive', 'negative', 'neutral'];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }
    if (!validSignals.includes(signal)) {
      return NextResponse.json(
        { error: `Invalid signal. Must be one of: ${validSignals.join(', ')}` },
        { status: 400 }
      );
    }
    if (!item || typeof item !== 'string') {
      return NextResponse.json({ error: 'item is required (string)' }, { status: 400 });
    }

    // Resolve DB user id
    const dbUser = await getOrCreateUser(userId);

    const engine = new TasteEngine(dbUser.id);
    await engine.recordSignal({
      category,
      item,
      signal,
      context,
      weight: typeof weight === 'number' ? weight : 1.0,
      source: source ?? 'explicit',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[/api/taste/signal] Error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
