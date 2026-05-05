/**
 * POST /api/admin/optimize-db
 * HOLLY Tool: optimize_database
 *
 * Runs real database maintenance operations via Prisma $queryRawUnsafe.
 * Operations:
 *   analyze  — ANALYZE (updates query planner statistics, safe / fast)
 *   vacuum   — VACUUM ANALYZE (reclaims dead tuples + re-analyzes, safe)
 *   stats    — Returns table sizes and row counts from pg_catalog
 *   indexes  — Lists tables with high sequential-scan ratios (index candidates)
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Operation = 'analyze' | 'vacuum' | 'stats' | 'indexes';

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const operation: Operation = (body.operation as Operation) || 'analyze';

    const allowed: Operation[] = ['analyze', 'vacuum', 'stats', 'indexes'];
    if (!allowed.includes(operation)) {
      return NextResponse.json(
        { success: false, error: `Unknown operation "${operation}". Allowed: ${allowed.join(', ')}` },
        { status: 400 },
      );
    }

    let result: Record<string, unknown> = {};

    if (operation === 'analyze') {
      // Update query planner statistics for all tables
      await prisma.$executeRawUnsafe('ANALYZE');
      result = {
        message: 'ANALYZE completed — query planner statistics updated for all tables.',
        tip: 'Run this periodically after bulk inserts or large updates.',
      };
    }

    if (operation === 'vacuum') {
      // VACUUM cannot run inside a transaction; use $executeRawUnsafe which
      // Prisma runs outside of implicit transactions.
      await prisma.$executeRawUnsafe('VACUUM ANALYZE');
      result = {
        message: 'VACUUM ANALYZE completed — dead tuples reclaimed and statistics updated.',
        tip: 'Run during low-traffic windows. Neon runs autovacuum automatically.',
      };
    }

    if (operation === 'stats') {
      // Table sizes + live row estimates from pg_stat_user_tables
      const rows = await prisma.$queryRawUnsafe<Array<{
        table_name: string;
        live_rows: string;
        dead_rows: string;
        total_size: string;
      }>>(
        `SELECT
           relname                                        AS table_name,
           n_live_tup::text                               AS live_rows,
           n_dead_tup::text                               AS dead_rows,
           pg_size_pretty(pg_total_relation_size(relid))  AS total_size
         FROM pg_stat_user_tables
         ORDER BY pg_total_relation_size(relid) DESC
         LIMIT 25`
      );
      result = {
        message: 'Table size statistics retrieved.',
        tables: rows,
      };
    }

    if (operation === 'indexes') {
      // Tables with high sequential-scan ratios compared to index scans
      const rows = await prisma.$queryRawUnsafe<Array<{
        table_name: string;
        seq_scans: string;
        idx_scans: string;
        live_rows: string;
        recommendation: string;
      }>>(
        `SELECT
           relname                   AS table_name,
           seq_scan::text            AS seq_scans,
           idx_scan::text            AS idx_scans,
           n_live_tup::text          AS live_rows,
           CASE
             WHEN seq_scan > COALESCE(idx_scan, 0) AND n_live_tup > 1000
               THEN 'Consider adding an index'
             ELSE 'OK'
           END                       AS recommendation
         FROM pg_stat_user_tables
         WHERE n_live_tup > 100
         ORDER BY seq_scan DESC
         LIMIT 20`
      );
      result = {
        message: 'Index scan analysis completed.',
        tables: rows,
      };
    }

    console.log(`[OptimizeDB] Operation "${operation}" completed by ${clerkUserId}`);

    return NextResponse.json({
      success: true,
      operation,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[OptimizeDB] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Database operation failed' },
      { status: 500 },
    );
  }
}
