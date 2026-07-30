/**
 * GET /api/cron/prewarm — Phase 17: Profile Pre-warming Cron
 *
 * Runs every 10 minutes. Loads the top 50 active users' profiles
 * into the LRU cache so chat requests get instant context.
 *
 * S9 FIX: Now requires CRON_SECRET authentication (matching all other
 * cron routes). Previously had zero auth — anyone could trigger DB-heavy
 * prewarm operations.
 */

import { NextResponse } from 'next/server';
import { prewarmActiveUsers, getCacheStats } from '@/lib/multi-tenant/user-context-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // S9 FIX: Verify CRON_SECRET — same pattern as every other cron route
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = request.headers.get('x-cron-secret') || '';
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[Prewarm Cron] CRON_SECRET not configured');
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const providedSecret = authHeader.replace('Bearer ', '') || cronSecret;
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prewarmActiveUsers();
    const stats = getCacheStats();

    return NextResponse.json({
      phase: 17,
      prewarmed: result.warmed,
      errors: result.errors.length,
      cacheStats: stats,
    });
  } catch (error) {
    console.error('[Prewarm Cron] Error:', error);
    return NextResponse.json(
      { error: 'Prewarm failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
