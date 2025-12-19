// PHASE 1: REAL Analytics Report Generation
// Generates comprehensive reports from actual database metrics
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { reportType = 'overview', dateRange = '30d', userId } = await req.json();

    // Calculate date range
    const now = new Date();
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 };
    const days = daysMap[dateRange] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Query system-wide metrics
    const [
      totalUsers,
      totalConversations,
      totalMessages,
      totalMusicTracks,
      totalProjects,
      recentUsers,
      recentConversations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.message.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.musicTrack.count({
        where: { uploadedAt: { gte: startDate } }
      }),
      prisma.project.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.conversation.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          createdAt: true,
          messages: { select: { id: true } }
        },
        take: 100
      })
    ]);

    // Calculate success rate (conversations with multiple messages)
    const successfulConversations = recentConversations.filter(
      c => c.messages.length > 2
    ).length;
    const successRate = recentConversations.length > 0
      ? (successfulConversations / recentConversations.length) * 100
      : 0;

    // Activity by day
    const activityByDay: Record<string, number> = {};
    recentConversations.forEach(c => {
      const day = c.createdAt.toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    // Top users (if admin report)
    let topUsers: any[] = [];
    if (reportType === 'admin' || reportType === 'overview') {
      const usersWithActivity = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              conversations: true,
              musicTracks: true,
              projects: true
            }
          }
        },
        take: 10,
        orderBy: {
          conversations: { _count: 'desc' }
        }
      });

      topUsers = usersWithActivity.map(u => ({
        id: u.id,
        name: u.name,
        conversations: u._count.conversations,
        projects: u._count.projects,
        musicTracks: u._count.musicTracks
      }));
    }

    const result = {
      success: true,
      reportType,
      period: dateRange,
      generatedAt: new Date().toISOString(),
      report: {
        summary: {
          totalUsers,
          newUsers: recentUsers,
          totalConversations,
          totalMessages,
          avgMessagesPerConversation: recentConversations.length > 0
            ? Math.round(totalMessages / recentConversations.length)
            : 0,
          successRate: Math.round(successRate * 10) / 10
        },
        metrics: {
          users: totalUsers,
          conversations: totalConversations,
          messages: totalMessages,
          musicGenerations: totalMusicTracks,
          projects: totalProjects,
          successRate: Math.round(successRate * 10) / 10
        },
        growth: {
          newUsers: recentUsers,
          newConversations: totalConversations,
          growthRate: recentUsers > 0 && totalUsers > 0
            ? Math.round((recentUsers / totalUsers) * 100)
            : 0
        },
        activityByDay: Object.entries(activityByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-7), // Last 7 days
        topUsers: topUsers.slice(0, 5)
      },
      downloadUrl: null // Could generate PDF in future
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analytics report generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
