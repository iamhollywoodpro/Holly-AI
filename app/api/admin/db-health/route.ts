/**
 * Database Health API Endpoint
 * Phase 8.7.2 — Check database health, integrity, and stats
 *
 * GET /api/admin/db-health — Run comprehensive DB health check
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runDBHealthCheck } from '@/lib/monitoring/db-health';

export async function GET() {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await runDBHealthCheck();
    return NextResponse.json(report);
  } catch (error) {
    console.error('[DB Health] Error:', error);
    return NextResponse.json({
      status: 'critical',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
