/**
 * Goal Management API
 * 
 * Provides endpoints for:
 * - Creating and managing goals
 * - Tracking goal execution
 * - Getting goal statistics
 * - Suggesting new goals
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logging/structured-logger';
import { prioritizeGoals, suggestGoals } from '@/lib/autonomy/goal-prioritization';
import { executeGoal, getGoalStats } from '@/lib/autonomy/goal-execution';

const prisma = new PrismaClient();

const logger = createLogger('api-goals');

/**
 * GET /api/goals - List and prioritize goals
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action');

    logger.info('GET /api/goals', { userId, action });

    if (action === 'suggest') {
      // Suggest new goals based on system state
      const suggestions = await suggestGoals(userId || 'system');
      return NextResponse.json({ suggestions });
    }

    // Default: return prioritized goals
    const prioritized = await prioritizeGoals(userId);
    
    return NextResponse.json({
      goals: prioritized,
      total: prioritized.length,
      canStart: prioritized.filter(g => g.canStart).length
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('GET /api/goals failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals - Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, priority, actions, userId, deadline, dependsOn } = body;

    logger.info('POST /api/goals', { title, category, priority });

    // Validate required fields
    if (!title || !category || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, priority' },
        { status: 400 }
      );
    }

    // Validate priority is 1-10
    if (priority < 1 || priority > 10) {
      return NextResponse.json(
        { error: 'Priority must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Create goal using raw query
    const result = await prisma.$queryRaw`
      INSERT INTO goals (
        title, 
        description, 
        category, 
        priority, 
        actions, 
        user_id, 
        deadline, 
        depends_on, 
        status, 
        progress,
        created_at,
        updated_at
      )
      VALUES (
        ${title},
        ${description || null},
        ${category},
        ${priority},
        ${JSON.stringify(actions || [])},
        ${userId || null},
        ${deadline || null},
        ${JSON.stringify(dependsOn || [])},
        'pending',
        0,
        NOW(),
        NOW()
      )
      RETURNING id, title, category, priority, status, created_at
    `;

    const goal = Array.isArray(result) && result.length > 0 ? result[0] : null;

    logger.info('Goal created successfully', { goalId: goal?.id });

    return NextResponse.json({
      success: true,
      goal
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('POST /api/goals failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: 'Failed to create goal', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals - Update goal status or priority
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId, status, priority, progress } = body;

    logger.info('PATCH /api/goals', { goalId, status, priority });

    if (!goalId) {
      return NextResponse.json(
        { error: 'Missing required field: goalId' },
        { status: 400 }
      );
    }

    // Build update fields
    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      values.push(progress);
    }

    updates.push('updated_at = NOW()');
    values.push(goalId);

    // Execute update
    await prisma.$executeRaw`
      UPDATE goals 
      SET ${updates.join(', ')}
      WHERE id = ${goalId}
    `;

    logger.info('Goal updated successfully', { goalId });

    return NextResponse.json({
      success: true,
      goalId
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('PATCH /api/goals failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: 'Failed to update goal', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals - Delete a goal
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goalId');

    if (!goalId) {
      return NextResponse.json(
        { error: 'Missing required parameter: goalId' },
        { status: 400 }
      );
    }

    logger.info('DELETE /api/goals', { goalId });

    await prisma.$executeRaw`DELETE FROM goals WHERE id = ${goalId}`;

    logger.info('Goal deleted successfully', { goalId });

    return NextResponse.json({
      success: true,
      goalId
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('DELETE /api/goals failed', { error: errorMessage });
    
    return NextResponse.json(
      { error: 'Failed to delete goal', details: errorMessage },
      { status: 500 }
    );
  }
}