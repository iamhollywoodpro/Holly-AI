/**
 * Goal Execution API
 * 
 * Provides endpoints for:
 * - Executing a goal
 * - Canceling a goal
 * - Getting goal statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger } from '@/lib/logging/structured-logger';
import { executeGoal, cancelGoal, getGoalStats } from '@/lib/autonomy/goal-execution';

const logger = createLogger('api-goals-execute');

/**
 * POST /api/goals/[goalId]/execute - Execute a goal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { goalId } = params;

    logger.info(`Executing goal: ${goalId}`);

    // Execute the goal
    const result = await executeGoal(goalId);

    if (result.success) {
      logger.info(`Goal executed successfully: ${goalId}`, {
        duration: result.totalDuration,
        steps: result.steps.length
      });
    } else {
      logger.error(`Goal execution failed: ${goalId}`, {
        error: result.error,
        duration: result.totalDuration
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('POST /api/goals/[goalId]/execute failed', { 
      goalId: params.goalId,
      error: errorMessage 
    });
    
    return NextResponse.json(
      { error: 'Failed to execute goal', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[goalId]/execute - Cancel an in-progress goal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { goalId } = params;

    logger.info(`Canceling goal: ${goalId}`);

    const cancelled = await cancelGoal(goalId);

    if (cancelled) {
      logger.info(`Goal cancelled successfully: ${goalId}`);
      return NextResponse.json({ success: true, goalId });
    } else {
      logger.warn(`Failed to cancel goal: ${goalId}`);
      return NextResponse.json(
        { error: 'Failed to cancel goal' },
        { status: 400 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('DELETE /api/goals/[goalId]/execute failed', { 
      goalId: params.goalId,
      error: errorMessage 
    });
    
    return NextResponse.json(
      { error: 'Failed to cancel goal', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/goals/[goalId]/execute - Get goal execution statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { goalId } = params;

    logger.info(`Getting goal stats: ${goalId}`);

    const stats = await getGoalStats(goalId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Goal not found or no execution data' },
        { status: 404 }
      );
    }

    return NextResponse.json(stats);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('GET /api/goals/[goalId]/execute failed', { 
      goalId: params.goalId,
      error: errorMessage 
    });
    
    return NextResponse.json(
      { error: 'Failed to get goal stats', details: errorMessage },
      { status: 500 }
    );
  }
}