import { NextRequest, NextResponse } from 'next/server';
import { runNightlyDeepSleep } from '@/lib/memory/deep-sleep';

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize: Check CRON_SECRET or bearer token to secure endpoint
    const authHeader = req.headers.get('authorization');
    const searchParams = req.nextUrl.searchParams;
    const clientSecret = searchParams.get('secret') || authHeader?.replace('Bearer ', '');

    const serverSecret = process.env.CRON_SECRET;

    if (serverSecret && clientSecret !== serverSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Execute consolidation loop
    const result = await runNightlyDeepSleep();

    return NextResponse.json({
      success: true,
      message: 'Memory consolidation completed successfully.',
      ...result
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: `Cron execution failed: ${errorMsg}`
    }, { status: 500 });
  }
}
