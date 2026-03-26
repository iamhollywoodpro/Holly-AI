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

export async function GET(req: NextRequest) {
  // Validate Vercel cron secret (or internal calls with ?secret=)
  const authHeader = req.headers.get('authorization');
  const urlSecret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const provided = authHeader?.replace('Bearer ', '') ?? urlSecret;
    if (provided !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await processEvolutionCycle(100); // larger batch for cron
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
