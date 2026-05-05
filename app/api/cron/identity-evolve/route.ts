/**
 * GET /api/cron/identity-evolve — Phase 3E
 *
 * Vercel cron endpoint: runs daily to evolve HollyIdentity for all active users
 * based on their accumulated emotion trends and learning patterns.
 *
 * Security: same CRON_SECRET pattern as /api/cron/evolve.
 *
 * Schedule: 0 4 * * *  (4 AM UTC daily — low-traffic window)
 */

import { NextRequest, NextResponse } from 'next/server';
import { evolveAllIdentities } from '@/lib/identity/identity-evolver';

export const runtime = 'nodejs';
export const maxDuration = 60;

function validateCronSecret(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization');
  const headerSecret = req.headers.get('x-cron-secret');
  const urlSecret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const provided = authHeader?.replace('Bearer ', '') ?? headerSecret ?? urlSecret;
    if (provided !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  return null;
}

async function runIdentityEvolve() {
  try {
    const result = await evolveAllIdentities();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('[Cron:identity-evolve] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authErr = validateCronSecret(req);
  if (authErr) return authErr;
  return runIdentityEvolve();
}

export async function POST(req: NextRequest) {
  const authErr = validateCronSecret(req);
  if (authErr) return authErr;
  return runIdentityEvolve();
}
