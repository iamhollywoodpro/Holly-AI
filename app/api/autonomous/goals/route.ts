import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, category, deadline, priority = 5 } = await req.json();

    if (!title) {
      return NextResponse.json({ 
        error: 'Missing goal title' 
      }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const newGoal = await prisma.hollyGoal.create({
        data: {
          userId,
          title,
          description: description || null,
          category: category || 'general',
          priority: typeof priority === 'number' ? priority : 5,
          targetDate: deadline ? new Date(deadline) : null,
          status: 'active'
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
          title: newGoal.title,
          description: newGoal.description,
          category: newGoal.category,
          priority: newGoal.priority,
          deadline: newGoal.targetDate
        },
        context: {
          totalActiveGoals: activeGoals.length,
          goalsByPriority: {
            high: activeGoals.filter(g => g.priority >= 7).length,
            medium: activeGoals.filter(g => g.priority >= 4 && g.priority < 7).length,
            low: activeGoals.filter(g => g.priority < 4).length
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
    const { userId } = await auth();
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
          title: g.title,
          description: g.description,
          category: g.category,
          priority: g.priority,
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
