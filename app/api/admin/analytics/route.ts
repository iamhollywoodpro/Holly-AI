/**
 * Advanced Analytics Dashboard API Route
 * Phase 4A - Code quality, performance, and technical debt metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

interface AnalyticsData {
  codeQuality: any;
  performance: any;
  technicalDebt: any;
  predictions: any;
  selfHealing: any;
  trends: any;
}

/**
 * Calculate code quality metrics
 */
async function calculateCodeQualityMetrics() {
  const metrics = await prisma.codeQualityMetric.findMany({
    orderBy: { measuredAt: 'desc' },
    take: 100
  });

  if (metrics.length === 0) {
    return {
      current: null,
      average: 0,
      trend: 'stable',
      history: []
    };
  }

  const latest = metrics[0];
  const avgQuality = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
  const avgComplexity = metrics.reduce((sum, m) => sum + m.complexity, 0) / metrics.length;
  const avgMaintainability = metrics.reduce((sum, m) => sum + m.maintainability, 0) / metrics.length;
  const avgCoverage = metrics.reduce((sum, m) => sum + m.testCoverage, 0) / metrics.length;

  // Calculate trend
  let trend = 'stable';
  if (metrics.length >= 5) {
    const recent5 = metrics.slice(0, 5);
    const avgRecent = recent5.reduce((sum, m) => sum + m.qualityScore, 0) / 5;
    const older5 = metrics.slice(5, 10);
    const avgOlder = older5.reduce((sum, m) => sum + m.qualityScore, 0) / 5;
    
    if (avgRecent > avgOlder * 1.05) {
      trend = 'improving';
    } else if (avgRecent < avgOlder * 0.95) {
      trend = 'degrading';
    }
  }

  return {
    current: latest,
    averages: {
      quality: avgQuality,
      complexity: avgComplexity,
      maintainability: avgMaintainability,
      coverage: avgCoverage
    },
    trend,
    history: metrics.map(m => ({
      date: m.measuredAt,
      quality: m.qualityScore,
      complexity: m.complexity,
      maintainability: m.maintainability,
      coverage: m.testCoverage
    }))
  };
}

/**
 * Calculate performance metrics
 */
async function calculatePerformanceMetrics() {
  const issues = await prisma.performanceIssue.findMany({
    where: {
      firstDetected: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    orderBy: { firstDetected: 'desc' }
  });

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const openIssues = issues.filter(i => !i.resolved);
  const avgResponseTime = issues.length > 0
    ? issues.reduce((sum, i) => sum + i.avgResponseTime, 0) / issues.length
    : 0;

  // Group by issue type
  const byType = issues.reduce((acc: any, issue) => {
    acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
    return acc;
  }, {});

  // Group by endpoint
  const byEndpoint = issues.reduce((acc: any, issue) => {
    acc[issue.endpoint] = (acc[issue.endpoint] || 0) + 1;
    return acc;
  }, {});

  // Calculate trend
  const last7Days = issues.filter(i => 
    Date.now() - new Date(i.firstDetected).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  
  const prev7Days = issues.filter(i => {
    const diff = Date.now() - new Date(i.firstDetected).getTime();
    return diff >= 7 * 24 * 60 * 60 * 1000 && diff < 14 * 24 * 60 * 60 * 1000;
  }).length;

  let trend = 'stable';
  if (last7Days > prev7Days * 1.2) {
    trend = 'increasing';
  } else if (last7Days < prev7Days * 0.8) {
    trend = 'decreasing';
  }

  return {
    total: issues.length,
    open: openIssues.length,
    critical: criticalIssues.length,
    avgResponseTime,
    byType,
    byEndpoint: Object.entries(byEndpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10),
    trend,
    recentIssues: issues.slice(0, 20)
  };
}

/**
 * Calculate technical debt metrics
 */
async function calculateTechnicalDebtMetrics() {
  const debts = await prisma.technicalDebt.findMany({
    orderBy: { identifiedAt: 'desc' }
  });

  const unresolved = debts.filter(d => !d.resolved);
  const totalEffort = debts.reduce((sum, d) => sum + d.effortMinutes, 0);
  const unresolvedEffort = unresolved.reduce((sum, d) => sum + d.effortMinutes, 0);

  // Group by type
  const byType = debts.reduce((acc: any, debt) => {
    acc[debt.debtType] = (acc[debt.debtType] || 0) + 1;
    return acc;
  }, {});

  // Group by severity
  const bySeverity = {
    critical: debts.filter(d => d.severity === 'critical').length,
    high: debts.filter(d => d.severity === 'high').length,
    medium: debts.filter(d => d.severity === 'medium').length,
    low: debts.filter(d => d.severity === 'low').length
  };

  // Calculate debt ratio (minutes of debt per 1000 lines of code)
  // Approximate: assume 50 lines per minute of work
  const estimatedCodebase = totalEffort * 50;
  const debtRatio = estimatedCodebase > 0 ? (unresolvedEffort / estimatedCodebase) * 100 : 0;

  // Top debt items
  const topDebt = unresolved
    .sort((a, b) => (b.priority * b.effortMinutes) - (a.priority * a.effortMinutes))
    .slice(0, 10);

  return {
    total: debts.length,
    unresolved: unresolved.length,
    resolved: debts.length - unresolved.length,
    totalEffortHours: Math.round(totalEffort / 60),
    unresolvedEffortHours: Math.round(unresolvedEffort / 60),
    debtRatio,
    byType,
    bySeverity,
    topDebt
  };
}

/**
 * Calculate prediction metrics
 */
async function calculatePredictionMetrics() {
  const predictions = await prisma.prediction.findMany({
    orderBy: { predictedAt: 'desc' },
    take: 100
  });

  const validated = predictions.filter(p => p.validated);
  const occurred = predictions.filter(p => p.status === 'occurred');
  const prevented = predictions.filter(p => p.status === 'prevented');
  const falsePositives = predictions.filter(p => p.status === 'false_positive');

  // Calculate accuracy
  const accuracy = validated.length > 0
    ? ((occurred.length + prevented.length) / validated.length) * 100
    : 0;

  // Group by type
  const byType = predictions.reduce((acc: any, pred) => {
    acc[pred.predictionType] = (acc[pred.predictionType] || 0) + 1;
    return acc;
  }, {});

  // Group by severity
  const bySeverity = {
    critical: predictions.filter(p => p.severity === 'critical').length,
    high: predictions.filter(p => p.severity === 'high').length,
    medium: predictions.filter(p => p.severity === 'medium').length,
    low: predictions.filter(p => p.severity === 'low').length
  };

  // Average confidence
  const avgConfidence = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    : 0;

  return {
    total: predictions.length,
    validated: validated.length,
    occurred: occurred.length,
    prevented: prevented.length,
    falsePositives: falsePositives.length,
    accuracy: Math.round(accuracy),
    avgConfidence,
    byType,
    bySeverity,
    recent: predictions.slice(0, 10)
  };
}

/**
 * Calculate self-healing metrics
 */
async function calculateSelfHealingMetrics() {
  const actions = await prisma.selfHealingAction.findMany({
    where: {
      detectedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { detectedAt: 'desc' }
  });

  const successful = actions.filter(a => a.success);
  const failed = actions.filter(a => !a.success);
  const successRate = actions.length > 0
    ? (successful.length / actions.length) * 100
    : 0;

  // Group by type
  const byType = actions.reduce((acc: any, action) => {
    acc[action.healingType] = (acc[action.healingType] || 0) + 1;
    return acc;
  }, {});

  // Group by issue type
  const byIssueType = actions.reduce((acc: any, action) => {
    acc[action.issueType] = (acc[action.issueType] || 0) + 1;
    return acc;
  }, {});

  // Calculate average time to heal
  const completedActions = actions.filter(a => a.completedAt && a.attemptedAt);
  const avgTimeToHeal = completedActions.length > 0
    ? completedActions.reduce((sum, a) => {
        const diff = new Date(a.completedAt!).getTime() - new Date(a.attemptedAt!).getTime();
        return sum + diff;
      }, 0) / completedActions.length / 1000 / 60 // Convert to minutes
    : 0;

  return {
    total: actions.length,
    successful: successful.length,
    failed: failed.length,
    successRate: Math.round(successRate),
    avgTimeToHealMinutes: Math.round(avgTimeToHeal),
    byType,
    byIssueType,
    recent: actions.slice(0, 10)
  };
}

/**
 * Calculate trends
 */
async function calculateTrends() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Get data for last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now - (29 - i) * dayMs);
    return {
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime()
    };
  });

  // Code changes trend
  const codeChanges = await prisma.codeChange.findMany({
    where: {
      committedAt: {
        gte: new Date(now - 30 * dayMs)
      }
    },
    select: { committedAt: true, riskLevel: true }
  });

  // Self-healing actions trend
  const healingActions = await prisma.selfHealingAction.findMany({
    where: {
      detectedAt: {
        gte: new Date(now - 30 * dayMs)
      }
    },
    select: { detectedAt: true, success: true }
  });

  // Performance issues trend
  const perfIssues = await prisma.performanceIssue.findMany({
    where: {
      firstDetected: {
        gte: new Date(now - 30 * dayMs)
      }
    },
    select: { firstDetected: true, severity: true }
  });

  // Predictions trend
  const predictions = await prisma.prediction.findMany({
    where: {
      predictedAt: {
        gte: new Date(now - 30 * dayMs)
      }
    },
    select: { predictedAt: true, confidence: true }
  });

  const dailyData = days.map(day => {
    const dayStart = day.timestamp;
    const dayEnd = dayStart + dayMs;

    return {
      date: day.date,
      codeChanges: codeChanges.filter(c => {
        const t = new Date(c.committedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length,
      highRiskChanges: codeChanges.filter(c => {
        const t = new Date(c.committedAt).getTime();
        return t >= dayStart && t < dayEnd && c.riskLevel === 'high';
      }).length,
      healingActions: healingActions.filter(a => {
        const t = new Date(a.detectedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length,
      successfulHealing: healingActions.filter(a => {
        const t = new Date(a.detectedAt).getTime();
        return t >= dayStart && t < dayEnd && a.success;
      }).length,
      performanceIssues: perfIssues.filter(p => {
        const t = new Date(p.firstDetected).getTime();
        return t >= dayStart && t < dayEnd;
      }).length,
      predictions: predictions.filter(p => {
        const t = new Date(p.predictedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length
    };
  });

  return {
    daily: dailyData,
    summary: {
      totalCodeChanges: codeChanges.length,
      totalHealingActions: healingActions.length,
      totalPerfIssues: perfIssues.length,
      totalPredictions: predictions.length
    }
  };
}

/**
 * GET /api/admin/analytics/dashboard
 * Get comprehensive analytics dashboard data
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [codeQuality, performance, technicalDebt, predictions, selfHealing, trends] = await Promise.all([
      calculateCodeQualityMetrics(),
      calculatePerformanceMetrics(),
      calculateTechnicalDebtMetrics(),
      calculatePredictionMetrics(),
      calculateSelfHealingMetrics(),
      calculateTrends()
    ]);

    const analytics: AnalyticsData = {
      codeQuality,
      performance,
      technicalDebt,
      predictions,
      selfHealing,
      trends
    };

    // Calculate overall health score (0-100)
    const healthScore = Math.round(
      (codeQuality.averages?.quality || 50) * 0.3 +
      (100 - (performance.open / Math.max(performance.total, 1)) * 100) * 0.2 +
      (100 - (technicalDebt.unresolved / Math.max(technicalDebt.total, 1)) * 100) * 0.2 +
      (predictions.accuracy || 50) * 0.15 +
      (selfHealing.successRate || 50) * 0.15
    );

    return NextResponse.json({
      success: true,
      analytics,
      healthScore,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/measure
 * Trigger new code quality measurement
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { scope, scopePath, scopeName, metrics } = body;

    if (!scope || !metrics) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const measurement = await prisma.codeQualityMetric.create({
      data: {
        scope,
        scopePath,
        scopeName,
        linesOfCode: metrics.linesOfCode || 0,
        complexity: metrics.complexity || 0,
        maintainability: metrics.maintainability || 0,
        testCoverage: metrics.testCoverage || 0,
        qualityScore: metrics.qualityScore || 0,
        duplication: metrics.duplication || 0,
        documentation: metrics.documentation || 0,
        bugs: metrics.bugs || 0,
        vulnerabilities: metrics.vulnerabilities || 0,
        codeSmells: metrics.codeSmells || 0,
        technicalDebt: metrics.technicalDebt || 0,
        debtRatio: metrics.debtRatio || 0,
        trend: metrics.trend || 'stable',
        changeFromPrev: metrics.changeFromPrev || 0
      }
    });

    return NextResponse.json({
      success: true,
      measurement
    });

  } catch (error) {
    console.error('Error creating measurement:', error);
    return NextResponse.json(
      { error: 'Failed to create measurement' },
      { status: 500 }
    );
  }
}
