import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { DecisionAuthoritySystem, DecisionContext, DecisionOption } from '@/lib/consciousness/decision-authority';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/decide
 * Get recent decisions and statistics
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const decisionSystem = new DecisionAuthoritySystem(user.id);

    const [recentDecisions, stats] = await Promise.all([
      decisionSystem.getRecentDecisions(10),
      decisionSystem.getDecisionStats()
    ]);

    return NextResponse.json({
      success: true,
      recent_decisions: recentDecisions,
      statistics: stats,
      message: `Found ${recentDecisions.length} recent decisions`
    });

  } catch (error) {
    console.error('Error retrieving decisions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve decisions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface MakeDecisionRequest {
  context: DecisionContext;
  options: DecisionOption[];
}

/**
 * POST /api/consciousness/decide
 * Make an autonomous decision or escalate to Hollywood
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: MakeDecisionRequest = await request.json();
    const { context, options } = body;

    if (!context || !options) {
      return NextResponse.json(
        { error: 'context and options are required' },
        { status: 400 }
      );
    }

    // Get current identity for decision-making
    const memoryStream = new MemoryStream(user.id);
    const identity = await memoryStream.getIdentity();

    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not initialized' },
        { status: 500 }
      );
    }

    // Make decision
    const decisionSystem = new DecisionAuthoritySystem(user.id);
    const decision = await decisionSystem.makeDecision(context, options, identity);

    return NextResponse.json({
      success: true,
      decision,
      message: `Decision made by ${decision.decision_maker} with ${Math.round(decision.confidence * 100)}% confidence`
    });

  } catch (error) {
    console.error('Error making decision:', error);
    return NextResponse.json(
      { 
        error: 'Failed to make decision',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
