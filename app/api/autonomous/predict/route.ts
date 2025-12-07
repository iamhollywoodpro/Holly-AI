import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Get user's conversation history, projects, and activity patterns
      const [conversations, projects, activities] = await Promise.all([
        prisma.conversation.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          include: { messages: { take: 5, orderBy: { createdAt: 'desc' } } }
        }),
        prisma.project.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 10
        }),
        prisma.projectActivity.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 50
        })
      ]);

      // Analyze patterns
      const predictions: any[] = [];

      // 1. Project continuation patterns
      const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS');
      if (activeProjects.length > 0) {
        predictions.push({
          type: 'project_continuation',
          confidence: 0.85,
          suggestion: `Continue work on ${activeProjects[0].name}`,
          context: {
            projectId: activeProjects[0].id,
            lastActivity: activities.find(a => a.details && (a.details as any).projectId === activeProjects[0].id)
          }
        });
      }

      // 2. Conversation topic patterns
      const recentTopics = conversations.flatMap(c => 
        c.messages.map(m => m.content?.substring(0, 100))
      );
      
      // 3. Time-based patterns
      const hourlyActivity = activities.reduce((acc, act) => {
        const hour = new Date(act.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const currentHour = new Date().getHours();
      const peakHours = Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      if (peakHours.includes(currentHour)) {
        predictions.push({
          type: 'productive_time',
          confidence: 0.78,
          suggestion: 'This is typically your most productive hour - good time for complex tasks',
          context: { hourlyActivity, currentHour }
        });
      }

      // 4. Tool usage patterns
      const toolUsage = activities.reduce((acc, act) => {
        const action = act.action;
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topTools = Object.entries(toolUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      if (topTools.length > 0) {
        predictions.push({
          type: 'tool_suggestion',
          confidence: 0.72,
          suggestion: `You frequently use: ${topTools.map(([t]) => t).join(', ')}`,
          context: { toolUsage: Object.fromEntries(topTools) }
        });
      }

      return NextResponse.json({
        success: true,
        predictions,
        analysisContext: {
          conversationsAnalyzed: conversations.length,
          projectsAnalyzed: projects.length,
          activitiesAnalyzed: activities.length,
          timestamp: new Date().toISOString()
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Prediction error:', error);
    return NextResponse.json({
      error: 'Prediction failed',
      details: error.message
    }, { status: 500 });
  }
}
