/**
 * GET /api/multi-tenant/stats — Phase 17: Multi-Tenant Cache Stats
 *
 * Returns cache hit/miss rates, prewarming status, and connection pool info.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCacheStats, getPoolConfig } from '@/lib/multi-tenant/user-context-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheStats = getCacheStats();
    const poolConfig = getPoolConfig();

    return NextResponse.json({
      phase: 17,
      cache: cacheStats,
      connectionPool: poolConfig,
      summary: {
        totalCachedUsers: cacheStats.users,
        hitRate: cacheStats.hits + cacheStats.misses > 0
          ? `${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1)}%`
          : 'N/A',
        prewarmingRuns: cacheStats.prewarmingRuns,
        lastPrewarm: cacheStats.lastPrewarmAt,
      },
    });
  } catch (error) {
    console.error('[MultiTenant Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
