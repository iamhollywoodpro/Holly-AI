/**
 * INSIGHTS ENGINE
 * Generate insights from analytics data
 */

import { prisma } from '@/lib/db';

export interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  recommendations: string[];
  relatedMetrics: string[];
  timestamp: Date;
}

export interface InsightFilters {
  category?: string;
  severity?: string;
  limit?: number;
}

/**
 * Generate insights from current analytics data
 */
export async function generateInsights(
  userId: string
): Promise<{ success: boolean; insights?: Insight[]; error?: string }> {
  try {
    const insights: Insight[] = [];

    // Get user stats for analysis
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (userStats) {
      // Check for low activity
      const hoursSinceActive = (Date.now() - userStats.lastActiveAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive > 48) {
        insights.push({
          id: `insight-${Date.now()}-1`,
          category: 'user-engagement',
          title: 'Low Recent Activity',
          description: `User has been inactive for ${Math.round(hoursSinceActive)} hours`,
          severity: 'warning',
          confidence: 0.9,
          recommendations: [
            'Send re-engagement email',
            'Highlight new features',
            'Offer assistance'
          ],
          relatedMetrics: ['user-activity', 'engagement-rate'],
          timestamp: new Date()
        });
      }

      // Check conversation volume
      if (userStats.totalConversations > 100) {
        insights.push({
          id: `insight-${Date.now()}-2`,
          category: 'user-engagement',
          title: 'High Engagement User',
          description: `User has ${userStats.totalConversations} total conversations`,
          severity: 'info',
          confidence: 1.0,
          recommendations: [
            'Consider power user features',
            'Request product feedback',
            'Offer premium features'
          ],
          relatedMetrics: ['conversation-count', 'message-count'],
          timestamp: new Date()
        });
      }
    }

    // Get business metrics for analysis
    const metrics = await prisma.businessMetric.findMany({
      where: { isActive: true }
    });

    for (const metric of metrics) {
      // Check if metric is below threshold
      if (metric.minThreshold && metric.currentValue < metric.minThreshold) {
        insights.push({
          id: `insight-${Date.now()}-metric-${metric.id}`,
          category: 'performance',
          title: `${metric.displayName} Below Threshold`,
          description: `Current value (${metric.currentValue}) is below minimum threshold (${metric.minThreshold})`,
          severity: 'critical',
          confidence: 1.0,
          recommendations: [
            'Investigate root cause',
            'Review recent changes',
            'Implement corrective measures'
          ],
          relatedMetrics: [metric.name],
          timestamp: new Date()
        });
      }

      // Check if metric is above threshold
      if (metric.maxThreshold && metric.currentValue > metric.maxThreshold) {
        insights.push({
          id: `insight-${Date.now()}-metric-${metric.id}`,
          category: 'performance',
          title: `${metric.displayName} Above Threshold`,
          description: `Current value (${metric.currentValue}) exceeds maximum threshold (${metric.maxThreshold})`,
          severity: 'warning',
          confidence: 1.0,
          recommendations: [
            'Review capacity limits',
            'Optimize resource usage',
            'Consider scaling'
          ],
          relatedMetrics: [metric.name],
          timestamp: new Date()
        });
      }

      // Check for significant changes
      if (metric.changePercent && Math.abs(metric.changePercent) > 50) {
        insights.push({
          id: `insight-${Date.now()}-change-${metric.id}`,
          category: 'trends',
          title: `Significant Change in ${metric.displayName}`,
          description: `Metric changed by ${metric.changePercent.toFixed(1)}%`,
          severity: 'warning',
          confidence: 0.8,
          recommendations: [
            'Verify data accuracy',
            'Identify change drivers',
            'Monitor for patterns'
          ],
          relatedMetrics: [metric.name],
          timestamp: new Date()
        });
      }
    }

    return {
      success: true,
      insights
    };
  } catch (error) {
    console.error('Error generating insights:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get historical insights (if we store them)
 */
export async function getInsights(
  userId: string,
  filters?: InsightFilters
): Promise<{ success: boolean; insights?: Insight[]; error?: string }> {
  try {
    // For now, generate fresh insights
    // In production, we'd fetch stored insights
    return generateInsights(userId);
  } catch (error) {
    console.error('Error getting insights:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Analyze metric health across all metrics
 */
export async function analyzeMetricHealth(): Promise<{
  success: boolean;
  health?: {
    healthy: number;
    warning: number;
    critical: number;
    total: number;
  };
  error?: string;
}> {
  try {
    const metrics = await prisma.businessMetric.findMany({
      where: { isActive: true }
    });

    let healthy = 0;
    let warning = 0;
    let critical = 0;

    for (const metric of metrics) {
      let isHealthy = true;

      if (metric.minThreshold && metric.currentValue < metric.minThreshold) {
        critical++;
        isHealthy = false;
      } else if (metric.maxThreshold && metric.currentValue > metric.maxThreshold) {
        warning++;
        isHealthy = false;
      } else if (metric.changePercent && Math.abs(metric.changePercent) > 50) {
        warning++;
        isHealthy = false;
      }

      if (isHealthy) {
        healthy++;
      }
    }

    return {
      success: true,
      health: {
        healthy,
        warning,
        critical,
        total: metrics.length
      }
    };
  } catch (error) {
    console.error('Error analyzing metric health:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
