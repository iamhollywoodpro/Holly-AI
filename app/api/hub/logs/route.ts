/**
 * GET /api/hub/logs?tool=aura&status=error&limit=50
 * Returns recent hub request logs (in-memory, newest first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { getLogs } from '@/lib/hub/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  const { searchParams } = new URL(req.url);
  const tool   = searchParams.get('tool')   ?? undefined;
  const status = searchParams.get('status') as 'success' | 'error' | 'rate_limited' | undefined;
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

  const logs = getLogs({ tool, status, limit });

  return NextResponse.json({
    ok:    true,
    count: logs.length,
    logs,
  });
}
