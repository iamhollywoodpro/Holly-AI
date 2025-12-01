/**
 * PHASE 3: ENHANCED SELF-AWARENESS & LEARNING
 * Insights API - Performance & Learning Intelligence
 * 
 * This endpoint provides comprehensive insights about:
 * - Performance issues and optimizations
 * - Refactoring recommendations
 * - Learning insights from code patterns
 * - System health and trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/insights?type=performance|refactoring|learning|all
 * Get comprehensive system insights
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { email: true }
    });

    const isAdmin = user?.email?.endsWith('@nexamusicgroup.com');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const insightType = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    const insights: any = {};

    // Get performance issues
    if (insightType === 'performance' || insightType === 'all') {
      const performanceIssues = await prisma.performanceIssue.findMany({
        include: { codeChange: true },
        orderBy: { identifiedAt: 'desc' },
        take: limit
      });

      const perfStats = {
        total: performanceIssues.length,
        identified: performanceIssues.filter(i => i.status === 'identified').length,
        investigating: performanceIssues.filter(i => i.status === 'investigating').length,
        resolved: performanceIssues.filter(i => i.status === 'resolved').length,
        ignored: performanceIssues.filter(i => i.status === 'ignored').length,
        bySeverity: {
          critical: performanceIssues.filter(i => i.severity === 'critical').length,
          high: performanceIssues.filter(i => i.severity === 'high').length,
          medium: performanceIssues.filter(i => i.severity === 'medium').length,
          low: performanceIssues.filter(i => i.severity === 'low').length
        },
        byType: {
          n_plus_one: performanceIssues.filter(i => i.issueType === 'n_plus_one').length,
          slow_query: performanceIssues.filter(i => i.issueType === 'slow_query').length,
          memory_leak: performanceIssues.filter(i => i.issueType === 'memory_leak').length,
          cache_miss: performanceIssues.filter(i => i.issueType === 'cache_miss').length
        }
      };

      insights.performance = {
        stats: perfStats,
        issues: performanceIssues
      };
    }

    // Get refactoring recommendations
    if (insightType === 'refactoring' || insightType === 'all') {
      const refactoringRecs = await prisma.refactoringRecommendation.findMany({
        include: { codeChange: true },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const refactorStats = {
        total: refactoringRecs.length,
        suggested: refactoringRecs.filter(r => r.status === 'suggested').length,
        inProgress: refactoringRecs.filter(r => r.status === 'in_progress').length,
        completed: refactoringRecs.filter(r => r.status === 'completed').length,
        rejected: refactoringRecs.filter(r => r.status === 'rejected').length,
        byPriority: {
          critical: refactoringRecs.filter(r => r.priority === 'critical').length,
          high: refactoringRecs.filter(r => r.priority === 'high').length,
          medium: refactoringRecs.filter(r => r.priority === 'medium').length,
          low: refactoringRecs.filter(r => r.priority === 'low').length
        },
        byType: {
          code_smell: refactoringRecs.filter(r => r.recommendationType === 'code_smell').length,
          duplication: refactoringRecs.filter(r => r.recommendationType === 'duplication').length,
          complexity: refactoringRecs.filter(r => r.recommendationType === 'complexity').length,
          design_pattern: refactoringRecs.filter(r => r.recommendationType === 'design_pattern').length,
          type_safety: refactoringRecs.filter(r => r.recommendationType === 'type_safety').length
        }
      };

      insights.refactoring = {
        stats: refactorStats,
        recommendations: refactoringRecs
      };
    }

    // Get learning insights
    if (insightType === 'learning' || insightType === 'all') {
      const learningInsights = await prisma.learningInsight.findMany({
        orderBy: { discoveredAt: 'desc' },
        take: limit
      });

      const learningStats = {
        total: learningInsights.length,
        actionable: learningInsights.filter(i => i.actionable).length,
        applied: learningInsights.filter(i => i.appliedAt !== null).length,
        pending: learningInsights.filter(i => i.actionable && !i.appliedAt).length,
        byType: {
          code_pattern: learningInsights.filter(i => i.insightType === 'code_pattern').length,
          user_behavior: learningInsights.filter(i => i.insightType === 'user_behavior').length,
          performance: learningInsights.filter(i => i.insightType === 'performance').length,
          error_pattern: learningInsights.filter(i => i.insightType === 'error_pattern').length,
          self_healing: learningInsights.filter(i => i.insightType === 'self_healing').length
        },
        averageConfidence: learningInsights.reduce((sum, i) => sum + i.confidence, 0) / learningInsights.length || 0
      };

      insights.learning = {
        stats: learningStats,
        insights: learningInsights
      };
    }

    // Get code change trends
    if (insightType === 'all') {
      const codeChanges = await prisma.codeChange.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const changeStats = {
        total: codeChanges.length,
        last24Hours: codeChanges.filter(c => c.timestamp >= oneDayAgo).length,
        lastWeek: codeChanges.filter(c => c.timestamp >= oneWeekAgo).length,
        lastMonth: codeChanges.filter(c => c.timestamp >= oneMonthAgo).length,
        totalFiles: codeChanges.reduce((sum, c) => sum + c.filesChanged, 0),
        totalAdditions: codeChanges.reduce((sum, c) => sum + c.additions, 0),
        totalDeletions: codeChanges.reduce((sum, c) => sum + c.deletions, 0),
        byAuthor: codeChanges.reduce((acc, c) => {
          acc[c.commitAuthor] = (acc[c.commitAuthor] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      insights.codeChanges = {
        stats: changeStats,
        recent: codeChanges.slice(0, 10)
      };
    }

    // Get self-healing stats
    if (insightType === 'all') {
      const healingActions = await prisma.selfHealingAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const healingStats = {
        total: healingActions.length,
        pending: healingActions.filter(a => a.status === 'pending').length,
        completed: healingActions.filter(a => a.status === 'completed').length,
        failed: healingActions.filter(a => a.status === 'failed').length,
        successRate: healingActions.length > 0 
          ? (healingActions.filter(a => a.status === 'completed').length / healingActions.length * 100).toFixed(1) 
          : '0',
        byType: {
          typescript_fix: healingActions.filter(a => a.actionType === 'typescript_fix').length,
          prisma_migration: healingActions.filter(a => a.actionType === 'prisma_migration').length,
          dependency_update: healingActions.filter(a => a.actionType === 'dependency_update').length,
          api_fix: healingActions.filter(a => a.actionType === 'api_fix').length
        }
      };

      insights.selfHealing = {
        stats: healingStats,
        recent: healingActions.slice(0, 10)
      };
    }

    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString(),
      insights
    });

  } catch (error) {
    console.error('[Insights] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/insights/action
 * Take action on an insight (mark as applied, ignored, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { email: true }
    });

    const isAdmin = user?.email?.endsWith('@nexamusicgroup.com');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { type, id, action, impact } = await req.json();

    let result;

    switch (type) {
      case 'performance':
        result = await prisma.performanceIssue.update({
          where: { id },
          data: { 
            status: action === 'resolve' ? 'resolved' : 'ignored',
            resolvedAt: action === 'resolve' ? new Date() : null
          }
        });
        break;

      case 'refactoring':
        result = await prisma.refactoringRecommendation.update({
          where: { id },
          data: { 
            status: action === 'apply' ? 'completed' : action === 'reject' ? 'rejected' : 'in_progress',
            completedAt: action === 'apply' ? new Date() : null
          }
        });
        break;

      case 'learning':
        result = await prisma.learningInsight.update({
          where: { id },
          data: { 
            appliedAt: action === 'apply' ? new Date() : null,
            impact: impact || null
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid insight type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      result
    });

  } catch (error) {
    console.error('[Insights] Action error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
