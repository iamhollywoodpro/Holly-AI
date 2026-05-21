/**
 * Phase 13: Sovereign Growth API
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { runDailySelfReview, getGrowthContext } from '@/lib/growth/sovereign-growth';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(req.url);
    const section = url.searchParams.get('section');

    if (section === 'metrics') {
      const metrics = await prisma.growthMetric.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return NextResponse.json({ metrics });
    }

    if (section === 'improvements') {
      const improvements = await prisma.selfImprovementAction.findMany({
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      });
      return NextResponse.json({ improvements });
    }

    if (section === 'analytics') {
      const analytics = await prisma.conversationAnalytics.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return NextResponse.json({ analytics });
    }

    // Default: growth overview
    const [metrics, improvements, analytics, context] = await Promise.all([
      prisma.growthMetric.findMany({ where: { period: 'daily' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.selfImprovementAction.findMany({ where: { status: { in: ['planned', 'in_progress'] } }, orderBy: { priority: 'desc' }, take: 10 }),
      prisma.conversationAnalytics.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
      getGrowthContext(),
    ]);

    return NextResponse.json({ metrics, improvements, analytics, context });
  } catch (error) {
    console.error('[Growth API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'daily-review') {
      const result = await runDailySelfReview();
      return NextResponse.json(result);
    }

    if (action === 'complete-improvement') {
      const { improvementId } = body;
      if (!improvementId) return NextResponse.json({ error: 'Missing improvementId' }, { status: 400 });
      await prisma.selfImprovementAction.update({
        where: { id: improvementId },
        data: { status: 'completed', progress: 1, completedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Growth API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
