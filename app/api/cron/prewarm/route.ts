/**
 * GET /api/cron/prewarm — Phase 17: Profile Pre-warming Cron
 *
 * Runs every 10 minutes. Loads the top 50 active users' profiles
 * into the LRU cache so chat requests get instant context.
 */

import { NextResponse } from 'next/server';
import { prewarmActiveUsers, getCacheStats } from '@/lib/multi-tenant/user-context-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
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
