// PHASE 1: REAL Work Reflection
// Queries WorkLog and recent activities from database
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { timeframe = 'today', userId } = await req.json();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Query work logs
    const workLogs = await prisma.workLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Query recent activities
    const recentActivities = await prisma.recentActivity.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Query experiences
    const experiences = await prisma.hollyExperience.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Analyze achievements
    const achievements: string[] = [];
    // All workLogs are completed (have completedAt), so just count them
    if (workLogs.length > 0) {
      achievements.push(`Completed ${workLogs.length} tasks successfully`);
    }
    
    const uniqueCategories = new Set(workLogs.map(log => log.category).filter(Boolean));
    if (uniqueCategories.size > 0) {
      achievements.push(`Worked on ${uniqueCategories.size} different types of tasks`);
    }

    // Identify improvements
    const improvements: string[] = [];
    // WorkLog model doesn't track success/failure status
    // Improvements based on duration and patterns
    
    const avgDuration = workLogs.length > 0
      ? workLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / workLogs.length
      : 0;
    
    if (avgDuration > 5000) {
      improvements.push('Average task duration is high - optimize for speed');
    }

    // Extract insights from experiences
    const insights: string[] = [];
    const learnings = experiences.flatMap(e => e.lessons || []);
    if (learnings.length > 0) {
      insights.push(`Learned ${learnings.length} new things from experiences`);
    }

    const result = {
      success: true,
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      reflection: {
        achievements: achievements.length > 0 ? achievements : ['Building momentum'],
        improvements: improvements.length > 0 ? improvements : ['Maintaining good performance'],
        insights: insights.length > 0 ? insights.join('; ') : 'Continuing to learn and adapt',
        summary: {
          totalTasks: workLogs.length,
          activitiesRecorded: recentActivities.length,
          experiencesGained: experiences.length,
          avgTaskDuration: Math.round(avgDuration)
        }
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Reflection error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
