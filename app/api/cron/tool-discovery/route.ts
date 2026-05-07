/**
 * Weekly Tool Discovery Cron
 * Triggered by Vercel Cron or external scheduler
 * Scans HuggingFace + GitHub for new AI tools Holly could use
 */

import { NextRequest, NextResponse } from 'next/server';
import { runToolDiscoveryCycle } from '@/lib/consciousness/tool-discovery';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the primary user (Steve) for notifications
    const users = await prisma.user.findMany({ take: 1, orderBy: { createdAt: 'asc' } });
    const userId = users[0]?.id;

    if (!userId) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    console.log('[Cron:ToolDiscovery] Starting weekly discovery cycle...');
    const stats = await runToolDiscoveryCycle(userId);

    return NextResponse.json({
      success: true,
      message: 'Tool discovery cycle complete',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron:ToolDiscovery] Error:', error);
    return NextResponse.json(
      { error: 'Discovery cycle failed', details: (error as Error).message },
      { status: 500 },
    );
  }
}