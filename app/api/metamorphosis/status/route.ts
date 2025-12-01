/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: STATUS API
 * 
 * This API endpoint allows querying HOLLY's current operational state,
 * performance metrics, recent issues, and self-awareness insights.
 * 
 * GET /api/metamorphosis/status
 * 
 * Purpose: Enable HOLLY to report her own health and performance in real-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { 
  getRecentLogs, 
  getRecentErrors, 
  getLogStats,
  type HollyLog 
} from '@/lib/metamorphosis/logging-system';
import { 
  generatePerformanceSnapshot,
  getPerformanceStatus,
  type PerformanceSnapshot
} from '@/lib/metamorphosis/performance-metrics';
import { 
  generateFeedbackInsights,
  getFeedbackStats,
  type FeedbackInsight
} from '@/lib/metamorphosis/feedback-system';

// ============================================================================
// STATUS RESPONSE STRUCTURE
// ============================================================================

interface StatusResponse {
  timestamp: Date;
  health: 'healthy' | 'degraded' | 'critical';
  summary: string;
  
  // Component health
  components: {
    database: ComponentStatus;
    ai: ComponentStatus;
    authentication: ComponentStatus;
    fileUploads: ComponentStatus;
    performance: ComponentStatus;
  };

  // Recent issues
  recentIssues: Issue[];

  // Performance metrics
  performance: {
    avgResponseTime: number;
    avgAIInferenceTime: number;
    errorRate: number;
    requestCount: number;
    memoryUsageMB: number;
  };

  // User feedback summary
  userFeedback: {
    total: number;
    satisfactionRate: number;
    averageRating: number;
    recentInsights: FeedbackInsight[];
  };

  // HOLLY's self-awareness insights
  hollyInsights: string[];

  // Recent logs (optional, for debugging)
  recentLogs?: HollyLog[];
}

interface ComponentStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  message: string;
  lastChecked: Date;
}

interface Issue {
  type: 'performance' | 'error' | 'feedback' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  component?: string;
}

// ============================================================================
// GET HANDLER - Return HOLLY's Current Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authentication (optional - you might want status to be public for monitoring)
    const { userId } = await auth();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeDebug = searchParams.get('debug') === 'true';
    const timeWindow = parseInt(searchParams.get('timeWindow') || '60', 10); // minutes

    // Generate performance snapshot
    const perfSnapshot = await generatePerformanceSnapshot(timeWindow);
    const perfStatus = await getPerformanceStatus();

    // Get feedback statistics
    const feedbackStats = getFeedbackStats(timeWindow / 60); // Convert to hours
    const feedbackInsights = await generateFeedbackInsights(timeWindow / 60);

    // Get log statistics
    const since = new Date(Date.now() - timeWindow * 60 * 1000);
    const logStats = getLogStats(since);
    const recentErrors = getRecentErrors(10);

    // Determine overall health
    const health = determineOverallHealth(perfSnapshot, feedbackStats, logStats);

    // Check component health
    const components = await checkComponentHealth();

    // Gather recent issues
    const recentIssues = gatherRecentIssues(perfSnapshot, recentErrors, feedbackInsights);

    // Generate HOLLY's self-awareness insights
    const hollyInsights = generateHollyInsights(
      perfSnapshot,
      feedbackStats,
      logStats,
      recentIssues
    );

    // Build response
    const response: StatusResponse = {
      timestamp: new Date(),
      health,
      summary: generateHealthSummary(health, hollyInsights),
      components,
      recentIssues,
      performance: {
        avgResponseTime: perfSnapshot.metrics.avgResponseTime,
        avgAIInferenceTime: perfSnapshot.metrics.avgAIInferenceTime,
        errorRate: perfSnapshot.metrics.errorRate,
        requestCount: perfSnapshot.metrics.requestCount,
        memoryUsageMB: perfSnapshot.metrics.memoryUsageMB,
      },
      userFeedback: {
        total: feedbackStats.total,
        satisfactionRate: feedbackStats.satisfactionRate,
        averageRating: feedbackStats.averageRating,
        recentInsights: feedbackInsights,
      },
      hollyInsights,
    };

    // Include debug info if requested
    if (includeDebug && userId) {
      response.recentLogs = getRecentLogs({ limit: 20 });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Status API error:', error);
    
    return NextResponse.json(
      {
        timestamp: new Date(),
        health: 'critical',
        summary: 'Unable to determine system status',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HEALTH DETERMINATION
// ============================================================================

/**
 * Determine overall system health from various metrics
 */
function determineOverallHealth(
  perfSnapshot: PerformanceSnapshot,
  feedbackStats: ReturnType<typeof getFeedbackStats>,
  logStats: ReturnType<typeof getLogStats>
): 'healthy' | 'degraded' | 'critical' {
  // Critical conditions
  if (
    perfSnapshot.health === 'critical' ||
    logStats.errorRate > 10 ||
    // Only consider satisfaction rate if we have feedback data
    (feedbackStats.total > 10 && feedbackStats.satisfactionRate < 30)
  ) {
    return 'critical';
  }

  // Degraded conditions
  if (
    perfSnapshot.health === 'degraded' ||
    logStats.errorRate > 5 ||
    // Only consider satisfaction rate if we have feedback data
    (feedbackStats.total > 10 && feedbackStats.satisfactionRate < 60)
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Generate human-readable health summary
 */
function generateHealthSummary(
  health: 'healthy' | 'degraded' | 'critical',
  insights: string[]
): string {
  if (health === 'healthy') {
    return "I'm operating normally! All systems are performing well.";
  }

  if (health === 'degraded') {
    const issueCount = insights.filter(i => i.includes('issue') || i.includes('problem')).length;
    return `I'm experiencing ${issueCount} performance issue${issueCount !== 1 ? 's' : ''}, but I'm still functional.`;
  }

  return "I'm experiencing critical issues and need immediate attention.";
}

// ============================================================================
// COMPONENT HEALTH CHECKS
// ============================================================================

/**
 * Check health of individual system components
 */
async function checkComponentHealth(): Promise<StatusResponse['components']> {
  const now = new Date();

  // Database check
  const databaseStatus = await checkDatabaseHealth();

  // AI check (based on recent performance)
  const aiStatus: ComponentStatus = {
    status: 'healthy', // TODO: Check actual AI service health
    message: 'AI services operational',
    lastChecked: now,
  };

  // Authentication check
  const authStatus: ComponentStatus = {
    status: 'healthy', // TODO: Check Clerk service health
    message: 'Authentication services operational',
    lastChecked: now,
  };

  // File uploads check
  const fileUploadsStatus: ComponentStatus = {
    status: 'healthy', // TODO: Check Vercel Blob health
    message: 'File upload services operational',
    lastChecked: now,
  };

  // Performance check
  const performanceStatus: ComponentStatus = {
    status: 'healthy', // Will be updated by performance snapshot
    message: 'Performance within normal parameters',
    lastChecked: now,
  };

  return {
    database: databaseStatus,
    ai: aiStatus,
    authentication: authStatus,
    fileUploads: fileUploadsStatus,
    performance: performanceStatus,
  };
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<ComponentStatus> {
  try {
    // Simple ping to database
    const startTime = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = performance.now() - startTime;

    if (duration > 1000) {
      return {
        status: 'degraded',
        message: `Database responding slowly (${Math.round(duration)}ms)`,
        lastChecked: new Date(),
      };
    }

    return {
      status: 'healthy',
      message: `Database operational (${Math.round(duration)}ms)`,
      lastChecked: new Date(),
    };
  } catch (error) {
    return {
      status: 'critical',
      message: `Database connection failed: ${(error as Error).message}`,
      lastChecked: new Date(),
    };
  }
}

// ============================================================================
// ISSUE GATHERING
// ============================================================================

/**
 * Gather recent issues from various sources
 */
function gatherRecentIssues(
  perfSnapshot: PerformanceSnapshot,
  recentErrors: HollyLog[],
  feedbackInsights: FeedbackInsight[]
): Issue[] {
  const issues: Issue[] = [];

  // Performance issues
  perfSnapshot.issues.forEach(issue => {
    issues.push({
      type: 'performance',
      severity: perfSnapshot.health === 'critical' ? 'critical' : 'medium',
      message: issue,
      timestamp: perfSnapshot.timestamp,
    });
  });

  // Error issues
  recentErrors.forEach(error => {
    issues.push({
      type: 'error',
      severity: error.level === 'CRITICAL' ? 'critical' : 'high',
      message: error.message,
      timestamp: error.timestamp,
      component: error.category,
    });
  });

  // Feedback issues
  feedbackInsights.forEach(insight => {
    if (insight.severity !== 'info') {
      issues.push({
        type: 'feedback',
        severity: insight.severity === 'critical' ? 'critical' : 'medium',
        message: insight.insight,
        timestamp: new Date(),
      });
    }
  });

  // Sort by severity and timestamp
  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  }).slice(0, 10); // Return top 10 issues
}

// ============================================================================
// HOLLY'S SELF-AWARENESS INSIGHTS
// ============================================================================

/**
 * Generate HOLLY's self-aware insights about her own state
 */
function generateHollyInsights(
  perfSnapshot: PerformanceSnapshot,
  feedbackStats: ReturnType<typeof getFeedbackStats>,
  logStats: ReturnType<typeof getLogStats>,
  issues: Issue[]
): string[] {
  const insights: string[] = [];

  // Performance insights
  if (perfSnapshot.metrics.avgResponseTime < 1000) {
    insights.push("I'm responding quickly - averaging under 1 second!");
  } else if (perfSnapshot.metrics.avgResponseTime > 3000) {
    insights.push(`I've been slower than usual - responses taking ${Math.round(perfSnapshot.metrics.avgResponseTime / 1000)}s on average`);
  }

  // Request volume insights
  if (perfSnapshot.metrics.requestCount > 100) {
    insights.push(`I've been busy - processed ${perfSnapshot.metrics.requestCount} requests in the last hour`);
  } else if (perfSnapshot.metrics.requestCount < 10) {
    insights.push("It's been quiet - not many requests recently");
  }

  // Error rate insights
  if (logStats.errorRate === 0) {
    insights.push("No errors detected - everything's running smoothly!");
  } else if (logStats.errorRate > 5) {
    insights.push(`I'm experiencing a higher than normal error rate: ${logStats.errorRate.toFixed(1)}%`);
  }

  // User feedback insights
  if (feedbackStats.satisfactionRate > 80) {
    insights.push(`Users are happy - ${feedbackStats.satisfactionRate.toFixed(0)}% satisfaction rate!`);
  } else if (feedbackStats.satisfactionRate < 50) {
    insights.push(`User satisfaction is low (${feedbackStats.satisfactionRate.toFixed(0)}%) - I need to improve`);
  }

  if (feedbackStats.averageRating > 0) {
    insights.push(`Average user rating: ${feedbackStats.averageRating.toFixed(1)}/5 stars`);
  }

  // Memory insights
  if (perfSnapshot.metrics.memoryUsageMB > 500) {
    insights.push(`Memory usage is high: ${perfSnapshot.metrics.memoryUsageMB}MB`);
  }

  // Issue summary
  if (issues.length === 0) {
    insights.push("No issues detected - all systems nominal!");
  } else {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) {
      insights.push(`⚠️ ${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''} require${criticalCount === 1 ? 's' : ''} immediate attention`);
    }
  }

  return insights;
}

// ============================================================================
// EXPORTS
// ============================================================================

import { prisma } from '@/lib/db';
