import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/goals
 * Get all active goals for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const goals = await prisma.hollyGoal.findMany({
      where: {
        userId: user.id,
        status: 'active',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    console.log('[Goals] ✅ Retrieved goals:', goals.length);
    return NextResponse.json({
      success: true,
      goals,
      message: `Found ${goals.length} active goals`,
    });
  } catch (error) {
    console.error('Error retrieving goals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consciousness/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, category, priority, targetDate } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description required' },
        { status: 400 }
      );
    }

    const goal = await prisma.hollyGoal.create({
      data: {
        userId: user.id,
        title,
        description,
        category: category || 'general',
        priority: priority || 5,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });

    console.log('[Goals] ✅ Created goal:', goal.id);
    return NextResponse.json({
      success: true,
      goal,
      message: 'Goal created successfully',
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/consciousness/goals
 * Update a goal's progress
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { goal_id, progress_update } = body;

    if (!goal_id) {
      return NextResponse.json(
        { error: 'Goal ID required' },
        { status: 400 }
      );
    }

    // Verify user owns this goal
    const existingGoal = await prisma.hollyGoal.findFirst({
      where: {
        id: goal_id,
        userId: user.id,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Update goal
    const updateData: any = {};
    
    if (progress_update.progress !== undefined) {
      updateData.progress = progress_update.progress;
    }
    
    if (progress_update.status) {
      updateData.status = progress_update.status;
    }
    
    if (progress_update.milestones_achieved) {
      updateData.milestonesAchieved = {
        push: progress_update.milestones_achieved,
      };
    }
    
    if (progress_update.obstacles_encountered) {
      updateData.obstaclesEncountered = {
        push: progress_update.obstacles_encountered,
      };
    }
    
    if (progress_update.breakthroughs) {
      updateData.breakthroughs = {
        push: progress_update.breakthroughs,
      };
    }

    const updatedGoal = await prisma.hollyGoal.update({
      where: { id: goal_id },
      data: updateData,
    });

    console.log('[Goals] ✅ Updated goal:', updatedGoal.id);
    return NextResponse.json({
      success: true,
      goal: updatedGoal,
      message: 'Goal updated successfully',
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
