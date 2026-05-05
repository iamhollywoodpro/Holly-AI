/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: PERFORMANCE METRICS TRACKER
 * 
 * This system tracks HOLLY's operational performance in real-time,
 * enabling self-awareness about speed, efficiency, and resource usage.
 * 
 * Purpose: Monitor response times, resource usage, error rates, and user experience
 * metrics to detect performance degradation and optimization opportunities.
 */

import { logger } from './logging-system';
import { prisma } from '@/lib/db';

// ============================================================================
// METRIC TYPES & STRUCTURES
// ============================================================================

export type MetricType = 
  | 'response_time'      // API/AI response duration
  | 'database_query'     // Database operation duration
  | 'memory_usage'       // Memory consumption
  | 'cpu_usage'          // CPU utilization
  | 'error_rate'         // Percentage of failed operations
  | 'user_satisfaction'  // User feedback score
  | 'throughput';        // Operations per second

export interface PerformanceMetric {
  name: string;
  type: MetricType;
  value: number;
  unit: 'ms' | 'mb' | 'percentage' | 'count' | 'ops/s';
  timestamp: Date;
  tags: Record<string, string>; // For grouping/filtering
  context?: {
    endpoint?: string;
    operation?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    avgResponseTime: number;      // Average API response time
    avgAIInferenceTime: number;   // Average AI processing time
    avgDbQueryTime: number;       // Average database query time
    errorRate: number;            // Percentage of errors
    requestCount: number;         // Total requests processed
    memoryUsageMB: number;        // Current memory usage
    cpuUsagePercent: number;      // Current CPU usage
  };
  health: 'healthy' | 'degraded' | 'critical';
  issues: string[]; // List of detected issues
}

// ============================================================================
// PERFORMANCE THRESHOLDS
// ============================================================================

export const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    good: 1000,      // < 1s is good
    acceptable: 3000, // < 3s is acceptable
    slow: 5000,      // > 5s is slow
  },
  aiInference: {
    good: 2000,      // < 2s is good
    acceptable: 5000, // < 5s is acceptable
    slow: 10000,     // > 10s is slow
  },
  dbQuery: {
    good: 50,        // < 50ms is good
    acceptable: 200,  // < 200ms is acceptable
    slow: 500,       // > 500ms is slow
  },
  errorRate: {
    good: 1,         // < 1% errors is good
    acceptable: 5,    // < 5% errors is acceptable
    critical: 10,    // > 10% errors is critical
  },
  memoryUsage: {
    good: 200,       // < 200MB is good
    acceptable: 500,  // < 500MB is acceptable
    high: 1000,      // > 1GB is high
  },
};

// ============================================================================
// IN-MEMORY METRICS STORAGE
// ============================================================================

class MetricsStore {
  private metrics: PerformanceMetric[] = [];
  private maxSize = 5000; // Keep last 5000 metrics

  // Aggregated counters for quick calculations
  private counters = {
    totalRequests: 0,
    totalErrors: 0,
    totalResponseTime: 0,
    totalAITime: 0,
    totalDbTime: 0,
  };

  add(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Update counters
    this.updateCounters(metric);

    // Trim old metrics
    if (this.metrics.length > this.maxSize) {
      this.metrics.shift();
    }
  }

  private updateCounters(metric: PerformanceMetric): void {
    if (metric.type === 'response_time') {
      this.counters.totalRequests++;
      this.counters.totalResponseTime += metric.value;
    }
    if (metric.name.includes('ai_inference')) {
      this.counters.totalAITime += metric.value;
    }
    if (metric.type === 'database_query') {
      this.counters.totalDbTime += metric.value;
    }
    if (metric.type === 'error_rate') {
      this.counters.totalErrors += metric.value;
    }
  }

  getMetrics(filters?: {
    type?: MetricType;
    since?: Date;
    limit?: number;
  }): PerformanceMetric[] {
    let filtered = [...this.metrics];

    if (filters?.type) {
      filtered = filtered.filter(m => m.type === filters.type);
    }

    if (filters?.since) {
      filtered = filtered.filter(m => m.timestamp >= filters.since!);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  getCounters() {
    return { ...this.counters };
  }

  clear(): void {
    this.metrics = [];
    this.counters = {
      totalRequests: 0,
      totalErrors: 0,
      totalResponseTime: 0,
      totalAITime: 0,
      totalDbTime: 0,
    };
  }
}

// Singleton metrics store
const metricsStore = new MetricsStore();

// ============================================================================
// METRIC RECORDING FUNCTIONS
// ============================================================================

/**
 * Record a performance metric
 */
export async function recordMetric(
  name: string,
  type: MetricType,
  value: number,
  unit: PerformanceMetric['unit'],
  tags?: Record<string, string>,
  context?: any
): Promise<void> {
  const metric: PerformanceMetric = {
    name,
    type,
    value,
    unit,
    timestamp: new Date(),
    tags: tags || {},
    context,
  };

  // Store metric
  metricsStore.add(metric);

  // Log if metric exceeds thresholds
  await checkThresholds(metric);
}

/**
 * Check if metric exceeds performance thresholds
 */
async function checkThresholds(metric: PerformanceMetric): Promise<void> {
  if (metric.type === 'response_time' && metric.value > PERFORMANCE_THRESHOLDS.responseTime.slow) {
    await logger.performance.slow('API response', metric.value, PERFORMANCE_THRESHOLDS.responseTime.acceptable, metric.context);
  }

  if (metric.name.includes('ai_inference') && metric.value > PERFORMANCE_THRESHOLDS.aiInference.slow) {
    await logger.performance.slow('AI inference', metric.value, PERFORMANCE_THRESHOLDS.aiInference.acceptable, metric.context);
  }

  if (metric.type === 'database_query' && metric.value > PERFORMANCE_THRESHOLDS.dbQuery.slow) {
    await logger.db.slow(metric.name, metric.value, metric.context);
  }

  if (metric.type === 'error_rate' && metric.value > PERFORMANCE_THRESHOLDS.errorRate.critical) {
    await logger.critical('performance', `Critical error rate: ${metric.value}%`, metric.context);
  }

  if (metric.type === 'memory_usage' && metric.value > PERFORMANCE_THRESHOLDS.memoryUsage.high) {
    await logger.warn('performance', `High memory usage: ${metric.value}MB`, metric.context);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const metrics = {
  /**
   * Record API response time
   */
  apiResponse: async (endpoint: string, duration: number, status: number) => {
    await recordMetric(
      `api_response_${endpoint}`,
      'response_time',
      duration,
      'ms',
      { endpoint, status: status.toString() }
    );
  },

  /**
   * Record AI inference time
   */
  aiInference: async (model: string, duration: number, tokens?: number) => {
    await recordMetric(
      `ai_inference_${model}`,
      'response_time',
      duration,
      'ms',
      { model, tokens: tokens?.toString() || 'unknown' }
    );
  },

  /**
   * Record database query time
   */
  dbQuery: async (operation: string, duration: number, model?: string) => {
    await recordMetric(
      `db_query_${operation}`,
      'database_query',
      duration,
      'ms',
      { operation, model: model || 'unknown' }
    );
  },

  /**
   * Record memory usage
   */
  memory: async () => {
    const usage = process.memoryUsage();
    const usageMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    await recordMetric(
      'memory_usage',
      'memory_usage',
      usageMB,
      'mb',
      { heapTotal: Math.round(usage.heapTotal / 1024 / 1024).toString() }
    );

    return usageMB;
  },

  /**
   * Record CPU usage (approximate)
   */
  cpu: async () => {
    const usage = process.cpuUsage();
    const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
    const cpuPercent = Math.round(totalUsage * 100);

    await recordMetric(
      'cpu_usage',
      'cpu_usage',
      cpuPercent,
      'percentage',
      {}
    );

    return cpuPercent;
  },

  /**
   * Record error occurrence
   */
  error: async (category: string, severity: 'low' | 'medium' | 'high') => {
    await recordMetric(
      `error_${category}`,
      'error_rate',
      1,
      'count',
      { category, severity }
    );
  },
};

// ============================================================================
// PERFORMANCE SNAPSHOT GENERATION
// ============================================================================

/**
 * Generate a comprehensive performance snapshot
 */
export async function generatePerformanceSnapshot(
  timeWindowMinutes: number = 60
): Promise<PerformanceSnapshot> {
  const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  const recentMetrics = metricsStore.getMetrics({ since });

  // Calculate averages
  const responseTimes = recentMetrics.filter(m => m.type === 'response_time');
  const aiTimes = recentMetrics.filter(m => m.name.includes('ai_inference'));
  const dbTimes = recentMetrics.filter(m => m.type === 'database_query');
  const errors = recentMetrics.filter(m => m.type === 'error_rate');

  const avgResponseTime = average(responseTimes.map(m => m.value));
  const avgAIInferenceTime = average(aiTimes.map(m => m.value));
  const avgDbQueryTime = average(dbTimes.map(m => m.value));
  const errorRate = responseTimes.length > 0
    ? (errors.length / responseTimes.length) * 100
    : 0;

  // Current resource usage
  const memoryUsageMB = await metrics.memory();
  const cpuUsagePercent = await metrics.cpu();

  // Determine health status
  const issues: string[] = [];
  let health: PerformanceSnapshot['health'] = 'healthy';

  if (avgResponseTime > PERFORMANCE_THRESHOLDS.responseTime.slow) {
    issues.push(`Slow API responses: ${Math.round(avgResponseTime)}ms (normal: <${PERFORMANCE_THRESHOLDS.responseTime.acceptable}ms)`);
    health = 'degraded';
  }

  if (avgAIInferenceTime > PERFORMANCE_THRESHOLDS.aiInference.slow) {
    issues.push(`Slow AI inference: ${Math.round(avgAIInferenceTime)}ms (normal: <${PERFORMANCE_THRESHOLDS.aiInference.acceptable}ms)`);
    health = 'degraded';
  }

  if (avgDbQueryTime > PERFORMANCE_THRESHOLDS.dbQuery.slow) {
    issues.push(`Slow database queries: ${Math.round(avgDbQueryTime)}ms (normal: <${PERFORMANCE_THRESHOLDS.dbQuery.acceptable}ms)`);
    health = 'degraded';
  }

  if (errorRate > PERFORMANCE_THRESHOLDS.errorRate.critical) {
    issues.push(`Critical error rate: ${errorRate.toFixed(1)}% (normal: <${PERFORMANCE_THRESHOLDS.errorRate.acceptable}%)`);
    health = 'critical';
  }

  if (memoryUsageMB > PERFORMANCE_THRESHOLDS.memoryUsage.high) {
    issues.push(`High memory usage: ${memoryUsageMB}MB (normal: <${PERFORMANCE_THRESHOLDS.memoryUsage.acceptable}MB)`);
    if (health === 'healthy') health = 'degraded';
  }

  const snapshot: PerformanceSnapshot = {
    timestamp: new Date(),
    metrics: {
      avgResponseTime: Math.round(avgResponseTime),
      avgAIInferenceTime: Math.round(avgAIInferenceTime),
      avgDbQueryTime: Math.round(avgDbQueryTime),
      errorRate: parseFloat(errorRate.toFixed(2)),
      requestCount: responseTimes.length,
      memoryUsageMB,
      cpuUsagePercent,
    },
    health,
    issues,
  };

  // Log snapshot
  await logger.metamorphosis.event('performance_snapshot_generated', {
    health: snapshot.health,
    issueCount: snapshot.issues.length,
  });

  return snapshot;
}

/**
 * Get human-readable performance status
 */
export async function getPerformanceStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  summary: string;
  details: string[];
}> {
  const snapshot = await generatePerformanceSnapshot(60); // Last hour

  let summary = '';
  if (snapshot.health === 'healthy') {
    summary = "I'm performing well! All systems operating normally.";
  } else if (snapshot.health === 'degraded') {
    summary = "I'm experiencing some performance issues, but I'm still functional.";
  } else {
    summary = "I'm experiencing critical performance problems and need attention.";
  }

  const details: string[] = [];
  details.push(`Average response time: ${snapshot.metrics.avgResponseTime}ms`);
  details.push(`AI inference time: ${snapshot.metrics.avgAIInferenceTime}ms`);
  details.push(`Database query time: ${snapshot.metrics.avgDbQueryTime}ms`);
  details.push(`Error rate: ${snapshot.metrics.errorRate}%`);
  details.push(`Memory usage: ${snapshot.metrics.memoryUsageMB}MB`);
  details.push(`Requests processed: ${snapshot.metrics.requestCount}`);

  if (snapshot.issues.length > 0) {
    details.push('');
    details.push('Detected issues:');
    details.push(...snapshot.issues);
  }

  return {
    status: snapshot.health,
    summary,
    details,
  };
}

/**
 * Persist performance snapshot to database
 */
export async function persistPerformanceSnapshot(
  snapshot: PerformanceSnapshot
): Promise<void> {
  try {
    // Note: Requires PerformanceSnapshot model in Prisma schema
    // TODO: Add PerformanceSnapshot model
    
    await logger.info('performance', 'Performance snapshot recorded', {
      health: snapshot.health,
      avgResponseTime: snapshot.metrics.avgResponseTime,
      errorRate: snapshot.metrics.errorRate,
    });
  } catch (error) {
    await logger.error('performance', 'Failed to persist performance snapshot', {}, {
      errorCode: (error as any).code,
      stackTrace: (error as any).stack,
    });
  }
}

// ============================================================================
// PERFORMANCE TRACKING UTILITIES
// ============================================================================

/**
 * Create a performance timer for tracking operation duration
 */
export function startPerformanceTimer(operationName: string) {
  const startTime = performance.now();
  
  return {
    end: async (tags?: Record<string, string>) => {
      const duration = performance.now() - startTime;
      await recordMetric(
        operationName,
        'response_time',
        duration,
        'ms',
        tags
      );
      return duration;
    },
  };
}

/**
 * Wrap a function with automatic performance tracking
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  tags?: Record<string, string>
): T {
  return (async (...args: any[]) => {
    const timer = startPerformanceTimer(operationName);
    try {
      const result = await fn(...args);
      await timer.end({ ...tags, status: 'success' });
      return result;
    } catch (error) {
      await timer.end({ ...tags, status: 'error' });
      await metrics.error(operationName, 'high');
      throw error;
    }
  }) as T;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// ============================================================================
// PERIODIC SNAPSHOT GENERATION
// ============================================================================

/**
 * Start periodic performance snapshot generation
 */
export function startPerformanceMonitoring(intervalMinutes: number = 15): NodeJS.Timeout {
  const interval = setInterval(async () => {
    const snapshot = await generatePerformanceSnapshot(intervalMinutes);
    await persistPerformanceSnapshot(snapshot);
    
    if (snapshot.health !== 'healthy') {
      await logger.metamorphosis.insight(
        `Performance ${snapshot.health}: ${snapshot.issues.length} issues detected`
      );
    }
  }, intervalMinutes * 60 * 1000);

  logger.metamorphosis.event('performance_monitoring_started', { intervalMinutes });

  return interval;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { metricsStore };
export default metrics;
