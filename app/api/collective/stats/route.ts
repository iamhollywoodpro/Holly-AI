/**
 * Phase 23: Collective intelligence stats dashboard
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCollectiveIntelligenceStats } from '@/lib/collective/collective-intelligence-engine';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getCollectiveIntelligenceStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Collective stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
