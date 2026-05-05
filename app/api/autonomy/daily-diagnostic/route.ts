import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runDailyDiagnostic } from '@/lib/autonomy/daily-diagnostic';
import { logger } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get('x-cron-secret');

    const isCron = (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`)
      || (headerSecret && cronSecret && headerSecret === cronSecret);

    if (!userId && !isCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[Daily Diagnostic API] Triggered', {
      userId: userId || 'cron',
      category: 'daily-diagnostic',
    });

    const report = await runDailyDiagnostic();

    if (report.overallStatus === 'nominal') {
      logger.info('[Daily Diagnostic API] ✅ All Systems Nominal', {
        category: 'daily-diagnostic',
        summary: report.summary,
      });
    } else {
      logger.warn(`[Daily Diagnostic API] ⚠️ Status: ${report.overallStatus}`, {
        category: 'daily-diagnostic',
        summary: report.summary,
        failedChecks: report.checks.filter(c => c.status === 'fail').map(c => c.name),
      });
    }

    return NextResponse.json({
      success: true,
      command: 'initiate_daily_diagnostic',
      data: report,
    });
  } catch (error) {
    console.error('[Daily Diagnostic API] Error:', error);
    logger.error('[Daily Diagnostic API] Failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'daily-diagnostic',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await runDailyDiagnostic();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('[Daily Diagnostic API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
