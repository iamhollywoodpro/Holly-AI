/**
 * Phase 23: Cron route to run collective intelligence aggregation
 * Runs periodically to extract, anonymize, and aggregate patterns across users
 */
import { NextRequest, NextResponse } from 'next/server';
import { runCollectiveIntelligenceLoop } from '@/lib/collective/collective-intelligence-engine';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runCollectiveIntelligenceLoop();

    console.log('[Collective Intelligence Cron]', result);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Collective intelligence cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
