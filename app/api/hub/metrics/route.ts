/**
 * GET /api/hub/metrics
 * Returns aggregated performance metrics for all hub tools.
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { getMetrics } from '@/lib/hub/logger';
import { getAllTools } from '@/lib/hub/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  const metrics = getMetrics();
  const tools   = getAllTools();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    hub: {
      totalRequests:  metrics.total,
      successCount:   metrics.success,
      errorCount:     metrics.errors,
      successRate:    metrics.total ? `${Math.round((metrics.success / metrics.total) * 100)}%` : 'n/a',
      avgDuration:    `${metrics.avgDuration}ms`,
    },
    tools: tools.map(t => ({
      id:       t.id,
      name:     t.name,
      status:   t.status,
      metrics:  metrics.byTool[t.id] ?? { requests: 0, errors: 0, avgDuration: 0 },
    })),
  });
}
