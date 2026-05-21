/**
 * Phase 23: Query collective patterns for a domain/topic
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getRelevantCollectivePatterns, getCollectiveInsightsForUser } from '@/lib/collective/collective-intelligence-engine';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const topic = searchParams.get('topic');
    const topics = searchParams.get('topics'); // comma-separated

    if (topics) {
      // Get personalized insights for multiple topics
      const topicList = topics.split(',').filter(Boolean);
      const insights = await getCollectiveInsightsForUser(user.id, topicList);
      return NextResponse.json({ insights });
    }

    if (!domain) {
      return NextResponse.json({ error: 'Provide domain or topics parameter' }, { status: 400 });
    }

    const patterns = await getRelevantCollectivePatterns(domain, topic || undefined);
    return NextResponse.json({ patterns });
  } catch (error) {
    console.error('Collective patterns query error:', error);
    return NextResponse.json({ error: 'Failed to query patterns' }, { status: 500 });
  }
}
