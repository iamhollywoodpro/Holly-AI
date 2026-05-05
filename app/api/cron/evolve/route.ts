/**
 * GET /api/cron/evolve — Phase 3E
 *
 * Vercel cron endpoint: runs hourly to process accumulated LearningEvents
 * into LearningPatterns, UserLearningProfiles, and EvolutionProposals.
 *
 * Security: protected by CRON_SECRET env var (set in Vercel project settings).
 * Vercel passes the secret in the Authorization header automatically.
 *
 * Schedule: 0 * * * *  (every hour on the hour)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEvolutionCycle } from '@/lib/autonomous/evolution-trigger';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro: up to 300s; Hobby: 60s

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

async function runEvolve() {
  try {
    const result = await processEvolutionCycle(100);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('[Cron:evolve] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authErr = validateCronSecret(req);
  if (authErr) return authErr;
  return runEvolve();
}

export async function POST(req: NextRequest) {
  const authErr = validateCronSecret(req);
  if (authErr) return authErr;
  return runEvolve();
}
