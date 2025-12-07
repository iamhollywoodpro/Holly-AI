import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal, category, deadline, priority = 'MEDIUM' } = await req.json();

    if (!goal) {
      return NextResponse.json({ 
        error: 'Missing goal description' 
      }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const newGoal = await prisma.hollyGoal.create({
        data: {
          userId,
          goal,
          category: category || 'IMPROVEMENT',
          priority,
          targetDate: deadline ? new Date(deadline) : null,
          progress: 0,
          status: 'ACTIVE',
          metadata: {
            createdBy: 'AUTONOMOUS',
            timestamp: new Date().toISOString()
          }
        }
      });

      // Get all active goals for context
      const activeGoals = await prisma.hollyGoal.findMany({
        where: { userId, status: 'ACTIVE' },
        orderBy: { priority: 'desc' }
      });

      return NextResponse.json({
        success: true,
        goal: {
          id: newGoal.id,
          description: newGoal.goal,
          category: newGoal.category,
          priority: newGoal.priority,
          deadline: newGoal.targetDate,
          progress: newGoal.progress
        },
        context: {
          totalActiveGoals: activeGoals.length,
          goalsByPriority: {
            high: activeGoals.filter(g => g.priority === 'HIGH').length,
            medium: activeGoals.filter(g => g.priority === 'MEDIUM').length,
            low: activeGoals.filter(g => g.priority === 'LOW').length
          }
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Goal setting error:', error);
    return NextResponse.json({
      error: 'Failed to set goal',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifyAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const goals = await prisma.hollyGoal.findMany({
        where: { userId },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return NextResponse.json({
        success: true,
        goals: goals.map(g => ({
          id: g.id,
          description: g.goal,
          category: g.category,
          priority: g.priority,
          progress: g.progress,
          status: g.status,
          deadline: g.targetDate,
          createdAt: g.createdAt
        }))
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Goal retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve goals',
      details: error.message
    }, { status: 500 });
  }
}
