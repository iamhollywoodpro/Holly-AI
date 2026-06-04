/**
 * Weekly Tool Discovery Cron
 * Triggered by Vercel Cron or external scheduler (POST or GET)
 * Scans HuggingFace + GitHub for new AI tools Holly could use
 */

import { NextRequest, NextResponse } from 'next/server';
import { runToolDiscoveryCycle } from '@/lib/consciousness/tool-discovery';
import { prisma } from '@/lib/db';

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const provided = authHeader?.replace('Bearer ', '') ?? cronSecret;
  return !!(process.env.CRON_SECRET && provided === process.env.CRON_SECRET);
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
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

// Cron sends POST — route it to the same handler
export async function POST(req: NextRequest) {
  return GET(req);
}