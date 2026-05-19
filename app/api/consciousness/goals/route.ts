import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getGoalFormation } from '@/lib/consciousness/goal-formation';

/**
 * GET /api/consciousness/goals
 * Fetch active goals for the consciousness sidebar
 */
export async function GET(req: NextRequest) {
  try {
    // Get userId from query params or auth header
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Use GoalFormationSystem to get active goals
    const goalFormation = getGoalFormation(userId);
    const goals = await goalFormation.getActiveGoals();

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('[Goals API] Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals', goals: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consciousness/goals
 * Generate new goals for Holly
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const goalFormation = getGoalFormation(userId);
    const goals = await goalFormation.generateGoalsWithContext(
      body.context || {},
      body.maxGoals || 3
    );

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('[Goals API] Error generating goals:', error);
    return NextResponse.json(
      { error: 'Failed to generate goals' },
      { status: 500 }
    );
  }
}
