/**
 * METRICS AGGREGATOR
 * Aggregate and calculate business metrics from various data sources
 */

import { prisma } from '@/lib/db';

// Types matching Prisma schema fields
export interface MetricData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: string;
  metricType: string;
  aggregationType: string;
  unit?: string;
  currentValue: number;
  previousValue?: number;
  changePercent?: number;
  targetValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  trend: string;
  dataPoints: any;
  isActive: boolean;
  priority: number;
  refreshInterval: number;
  lastCalculated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricInput {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  metricType: string;
  aggregationType: string;
  unit?: string;
  targetValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
}

export interface MetricCalculation {
  metricName: string;
  value: number;
  timestamp: Date;
}

/**
 * Get all metrics with optional filters
 */
export async function getMetrics(filters?: {
  category?: string;
  isActive?: boolean;
  limit?: number;
}): Promise<MetricData[]> {
  try {
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const metrics = await prisma.businessMetric.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ],
      take: filters?.limit || 100
    });

    return metrics.map(m => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      description: m.description || undefined,
      category: m.category,
      metricType: m.metricType,
      aggregationType: m.aggregationType,
      unit: m.unit || undefined,
      currentValue: m.currentValue,
      previousValue: m.previousValue || undefined,
      changePercent: m.changePercent || undefined,
      targetValue: m.targetValue || undefined,
      minThreshold: m.minThreshold || undefined,
      maxThreshold: m.maxThreshold || undefined,
      trend: m.trend,
      dataPoints: m.dataPoints,
      isActive: m.isActive,
      priority: m.priority,
      refreshInterval: m.refreshInterval,
      lastCalculated: m.lastCalculated,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));
  } catch (error) {
    console.error('Error getting metrics:', error);
    return [];
  }
}

/**
 * Get single metric by ID or name
 */
export async function getMetric(identifier: string): Promise<MetricData | null> {
  try {
    const metric = await prisma.businessMetric.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: identifier }
        ]
      }
    });

    if (!metric) return null;

    return {
      id: metric.id,
      name: metric.name,
      displayName: metric.displayName,
      description: metric.description || undefined,
      category: metric.category,
      metricType: metric.metricType,
      aggregationType: metric.aggregationType,
      unit: metric.unit || undefined,
      currentValue: metric.currentValue,
      previousValue: metric.previousValue || undefined,
      changePercent: metric.changePercent || undefined,
      targetValue: metric.targetValue || undefined,
      minThreshold: metric.minThreshold || undefined,
      maxThreshold: metric.maxThreshold || undefined,
      trend: metric.trend,
      dataPoints: metric.dataPoints,
      isActive: metric.isActive,
      priority: metric.priority,
      refreshInterval: metric.refreshInterval,
      lastCalculated: metric.lastCalculated,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt
    };
  } catch (error) {
    console.error('Error getting metric:', error);
    return null;
  }
}

/**
 * Create new metric
 */
export async function createMetric(
  metric: MetricInput
): Promise<{ success: boolean; metricId?: string; error?: string }> {
  try {
    const created = await prisma.businessMetric.create({
      data: {
        name: metric.name,
        displayName: metric.displayName,
        description: metric.description || null,
        category: metric.category,
        metricType: metric.metricType,
        aggregationType: metric.aggregationType,
        unit: metric.unit || null,
        currentValue: 0,
        previousValue: null,
        changePercent: null,
        targetValue: metric.targetValue || null,
        minThreshold: metric.minThreshold || null,
        maxThreshold: metric.maxThreshold || null,
        trend: 'stable',
        dataPoints: [],
        isActive: true,
        priority: 0,
        refreshInterval: 300,
        lastCalculated: new Date()
      }
    });

    return {
      success: true,
      metricId: created.id
    };
  } catch (error) {
    console.error('Error creating metric:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate and update metric value
 */
export async function calculateMetric(
  metricName: string,
  newValue: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const metric = await prisma.businessMetric.findUnique({
      where: { name: metricName }
    });

    if (!metric) {
      return { success: false, error: 'Metric not found' };
    }

    // Calculate change percentage
    const changePercent = metric.currentValue !== 0
      ? ((newValue - metric.currentValue) / metric.currentValue) * 100
      : 0;

    // Determine trend
    let trend = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';

    // Update dataPoints
    const dataPoints = Array.isArray(metric.dataPoints) ? metric.dataPoints : [];
    dataPoints.push({
      value: newValue,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 data points
    if (dataPoints.length > 100) {
      dataPoints.shift();
    }

    await prisma.businessMetric.update({
      where: { name: metricName },
      data: {
        previousValue: metric.currentValue,
        currentValue: newValue,
        changePercent,
        trend,
        dataPoints,
        lastCalculated: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error calculating metric:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get metric trends over time
 */
export async function getMetricTrends(
  metricName: string,
  timeRange?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const metric = await prisma.businessMetric.findUnique({
      where: { name: metricName }
    });

    if (!metric) {
      return { success: false, error: 'Metric not found' };
    }

    const dataPoints = Array.isArray(metric.dataPoints) ? metric.dataPoints : [];

    return {
      success: true,
      data: dataPoints
    };
  } catch (error) {
    console.error('Error getting metric trends:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Aggregate user statistics
 */
export async function aggregateUserStats(
  userId: string
): Promise<{ success: boolean; stats?: any; error?: string }> {
  try {
    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!userStats) {
      return { success: false, error: 'User stats not found' };
    }

    return {
      success: true,
      stats: {
        totalConversations: userStats.totalConversations,
        totalMessages: userStats.totalMessages,
        totalFileUploads: userStats.totalFileUploads,
        totalProjects: userStats.totalProjects,
        lastActiveAt: userStats.lastActiveAt
      }
    };
  } catch (error) {
    console.error('Error aggregating user stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
