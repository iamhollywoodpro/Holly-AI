/**
 * PHASE 3: ENHANCED SELF-AWARENESS & LEARNING
 * Insights API - Performance & Learning Intelligence
 * 
 * CORRECTED VERSION: Matches actual Prisma schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
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

    // Performance Issues (existing schema)
    if (insightType === 'performance' || insightType === 'all') {
      const performanceIssues = await prisma.performanceIssue.findMany({
        orderBy: { firstDetected: 'desc' },
        take: limit
      });

      insights.performance = {
        stats: {
          total: performanceIssues.length,
          identified: performanceIssues.filter(i => i.status === 'open' && !i.resolved).length,
          investigating: performanceIssues.filter(i => i.status === 'investigating').length,
          resolved: performanceIssues.filter(i => i.resolved).length,
          ignored: performanceIssues.filter(i => i.status === 'ignored').length,
          bySeverity: {
            critical: performanceIssues.filter(i => i.severity === 'critical').length,
            high: performanceIssues.filter(i => i.severity === 'high').length,
            medium: performanceIssues.filter(i => i.severity === 'medium').length,
            low: performanceIssues.filter(i => i.severity === 'low').length
          },
          byType: {
            n_plus_one: performanceIssues.filter(i => i.issueType.includes('n_plus_one') || i.issueType.includes('n+1')).length,
            slow_query: performanceIssues.filter(i => i.issueType.includes('slow')).length,
            memory_leak: performanceIssues.filter(i => i.issueType.includes('memory')).length,
            cache_miss: performanceIssues.filter(i => i.issueType.includes('cache')).length
          }
        },
        issues: performanceIssues
      };
    }

    // Refactoring Recommendations (existing schema)
    if (insightType === 'refactoring' || insightType === 'all') {
      const refactoringRecs = await prisma.refactoringRecommendation.findMany({
        orderBy: { detectedAt: 'desc' },
        take: limit
      });

      insights.refactoring = {
        stats: {
          total: refactoringRecs.length,
          suggested: refactoringRecs.filter(r => r.status === 'pending').length,
          inProgress: refactoringRecs.filter(r => r.status === 'in_progress').length,
          completed: refactoringRecs.filter(r => r.implemented).length,
          rejected: refactoringRecs.filter(r => r.status === 'rejected').length,
          byPriority: {
            critical: refactoringRecs.filter(r => r.priority >= 9).length,
            high: refactoringRecs.filter(r => r.priority >= 7 && r.priority < 9).length,
            medium: refactoringRecs.filter(r => r.priority >= 5 && r.priority < 7).length,
            low: refactoringRecs.filter(r => r.priority < 5).length
          },
          byType: {
            code_smell: refactoringRecs.filter(r => r.recommendationType.includes('smell')).length,
            duplication: refactoringRecs.filter(r => r.recommendationType.includes('duplicate')).length,
            complexity: refactoringRecs.filter(r => r.recommendationType.includes('complex')).length,
            design_pattern: refactoringRecs.filter(r => r.recommendationType.includes('pattern')).length,
            type_safety: refactoringRecs.filter(r => r.recommendationType.includes('type')).length
          }
        },
        recommendations: refactoringRecs
      };
    }

    // Learning Insights (existing schema - correct fields)
    if (insightType === 'learning' || insightType === 'all') {
      const learningInsights = await prisma.learningInsight.findMany({
        orderBy: { learnedAt: 'desc' },  // ✅ Correct field name
        take: limit
      });

      insights.learning = {
        stats: {
          total: learningInsights.length,
          actionable: learningInsights.filter(i => i.actionable).length,
          applied: learningInsights.filter(i => i.applied).length,  // ✅ Boolean field
          pending: learningInsights.filter(i => i.actionable && !i.applied).length,
          byType: {
            code_pattern: learningInsights.filter(i => i.insightType === 'code_pattern').length,
            user_behavior: learningInsights.filter(i => i.insightType === 'user_behavior').length,
            performance: learningInsights.filter(i => i.insightType === 'performance').length,
            error_pattern: learningInsights.filter(i => i.insightType === 'error_pattern').length,
            self_healing: learningInsights.filter(i => i.insightType === 'self_healing').length
          },
          averageConfidence: learningInsights.length > 0
            ? learningInsights.reduce((sum, i) => sum + i.confidence, 0) / learningInsights.length
            : 0
        },
        insights: learningInsights
      };
    }

    // Code Changes (existing schema - correct fields)
    if (insightType === 'all') {
      const codeChanges = await prisma.codeChange.findMany({
        orderBy: { committedAt: 'desc' },  // ✅ Correct field name
        take: limit
      });

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      insights.codeChanges = {
        stats: {
          total: codeChanges.length,
          last24Hours: codeChanges.filter(c => c.committedAt >= oneDayAgo).length,
          lastWeek: codeChanges.filter(c => c.committedAt >= oneWeekAgo).length,
          lastMonth: codeChanges.filter(c => c.committedAt >= oneMonthAgo).length,
          totalFiles: codeChanges.reduce((sum, c) => sum + c.filesChanged, 0),
          totalAdditions: codeChanges.reduce((sum, c) => sum + c.additions, 0),
          totalDeletions: codeChanges.reduce((sum, c) => sum + c.deletions, 0),
          byAuthor: codeChanges.reduce((acc, c) => {
            acc[c.authorName] = (acc[c.authorName] || 0) + 1;  // ✅ Correct field name
            return acc;
          }, {} as Record<string, number>)
        },
        recent: codeChanges.slice(0, 10)
      };
    }

    // Self-Healing Actions (existing schema - correct fields)
    if (insightType === 'all') {
      const healingActions = await prisma.selfHealingAction.findMany({
        orderBy: { detectedAt: 'desc' },  // ✅ Correct field name
        take: limit
      });

      insights.selfHealing = {
        stats: {
          total: healingActions.length,
          pending: healingActions.filter(a => a.status === 'pending').length,
          completed: healingActions.filter(a => a.success).length,  // ✅ Boolean field
          failed: healingActions.filter(a => a.status === 'failed' || (a.status === 'completed' && !a.success)).length,
          successRate: healingActions.length > 0 
            ? (healingActions.filter(a => a.success).length / healingActions.length * 100).toFixed(1) 
            : '0',
          byType: {
            typescript_fix: healingActions.filter(a => a.healingType.includes('typescript')).length,
            prisma_migration: healingActions.filter(a => a.healingType.includes('prisma')).length,
            dependency_update: healingActions.filter(a => a.healingType.includes('dependency')).length,
            api_fix: healingActions.filter(a => a.healingType.includes('api')).length
          }
        },
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
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
            status: action === 'resolve' ? 'closed' : 'ignored',
            resolved: action === 'resolve',
            resolvedAt: action === 'resolve' ? new Date() : null
          }
        });
        break;

      case 'refactoring':
        result = await prisma.refactoringRecommendation.update({
          where: { id },
          data: { 
            status: action === 'apply' ? 'completed' : action === 'reject' ? 'rejected' : 'in_progress',
            implemented: action === 'apply',
            completedAt: action === 'apply' ? new Date() : null
          }
        });
        break;

      case 'learning':
        result = await prisma.learningInsight.update({
          where: { id },
          data: { 
            applied: action === 'apply',  // ✅ Boolean field
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
