/**
 * HOLLY's Deployment Monitoring System
 * 
 * Real-time monitoring of deployments with anomaly detection
 * 
 * Phase 6: Controlled Deployment & Monitoring
 */

import { prisma } from '@/lib/db';

// ===========================
// Types & Interfaces
// ===========================

export interface MonitoringMetrics {
  timestamp: Date;
  errorRate: number;
  successRate: number;
  responseTime: number;
  requestsPerMinute: number;
  activeUsers: number;
  healthScore: number;
}

export interface Anomaly {
  type: 'error_spike' | 'slow_response' | 'low_success_rate' | 'health_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: Partial<MonitoringMetrics>;
  threshold: any;
  detected: Date;
}

export interface DeploymentHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'unknown';
  score: number; // 0-100
  metrics: MonitoringMetrics;
  anomalies: Anomaly[];
  recommendations: string[];
}

// ===========================
// Deployment Monitor Class
// ===========================

export class DeploymentMonitor {
  private metricsHistory: MonitoringMetrics[] = [];
  private readonly MAX_HISTORY = 1000;
  private readonly ANOMALY_THRESHOLDS = {
    error_rate_spike: 0.05, // 5% error rate
    response_time_slow: 2000, // 2 seconds
    success_rate_low: 0.95, // 95% success rate
    health_score_critical: 70
  };

  /**
   * Record new metrics
   */
  recordMetrics(metrics: Omit<MonitoringMetrics, 'timestamp'>): void {
    const timestampedMetrics: MonitoringMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.metricsHistory.push(timestampedMetrics);

    // Keep history size manageable
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift();
    }

    console.log(`[MONITOR] Metrics recorded: ${JSON.stringify(metrics)}`);
  }

  /**
   * Get current deployment health
   */
  async getDeploymentHealth(): Promise<DeploymentHealth> {
    const latestMetrics = this.getLatestMetrics();
    const anomalies = this.detectAnomalies(latestMetrics);
    const score = this.calculateHealthScore(latestMetrics, anomalies);
    const overall = this.determineOverallHealth(score, anomalies);
    const recommendations = this.generateRecommendations(anomalies, latestMetrics);

    return {
      overall,
      score,
      metrics: latestMetrics,
      anomalies,
      recommendations
    };
  }

  /**
   * Detect anomalies in current metrics
   */
  private detectAnomalies(metrics: MonitoringMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check error rate
    if (metrics.errorRate > this.ANOMALY_THRESHOLDS.error_rate_spike) {
      anomalies.push({
        type: 'error_spike',
        severity: metrics.errorRate > 0.1 ? 'critical' : 'high',
        description: `Error rate at ${(metrics.errorRate * 100).toFixed(2)}%`,
        metrics: { errorRate: metrics.errorRate },
        threshold: this.ANOMALY_THRESHOLDS.error_rate_spike,
        detected: new Date()
      });
    }

    // Check response time
    if (metrics.responseTime > this.ANOMALY_THRESHOLDS.response_time_slow) {
      anomalies.push({
        type: 'slow_response',
        severity: metrics.responseTime > 5000 ? 'critical' : 'medium',
        description: `Response time at ${metrics.responseTime}ms`,
        metrics: { responseTime: metrics.responseTime },
        threshold: this.ANOMALY_THRESHOLDS.response_time_slow,
        detected: new Date()
      });
    }

    // Check success rate
    if (metrics.successRate < this.ANOMALY_THRESHOLDS.success_rate_low) {
      anomalies.push({
        type: 'low_success_rate',
        severity: metrics.successRate < 0.9 ? 'high' : 'medium',
        description: `Success rate at ${(metrics.successRate * 100).toFixed(2)}%`,
        metrics: { successRate: metrics.successRate },
        threshold: this.ANOMALY_THRESHOLDS.success_rate_low,
        detected: new Date()
      });
    }

    // Check health score
    if (metrics.healthScore < this.ANOMALY_THRESHOLDS.health_score_critical) {
      anomalies.push({
        type: 'health_degradation',
        severity: metrics.healthScore < 50 ? 'critical' : 'high',
        description: `Health score at ${metrics.healthScore}/100`,
        metrics: { healthScore: metrics.healthScore },
        threshold: this.ANOMALY_THRESHOLDS.health_score_critical,
        detected: new Date()
      });
    }

    return anomalies;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: MonitoringMetrics, anomalies: Anomaly[]): number {
    let score = 100;

    // Deduct points for anomalies
    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Factor in raw metrics
    score -= (metrics.errorRate * 100); // Each 1% error rate = -1 point
    score += ((metrics.successRate - 0.95) * 100); // Bonus for >95% success
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(
    score: number,
    anomalies: Anomaly[]
  ): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    const hasCriticalAnomaly = anomalies.some(a => a.severity === 'critical');

    if (hasCriticalAnomaly || score < 50) {
      return 'critical';
    }

    if (score < 80) {
      return 'degraded';
    }

    if (score >= 80) {
      return 'healthy';
    }

    return 'unknown';
  }

  /**
   * Generate recommendations based on anomalies
   */
  private generateRecommendations(anomalies: Anomaly[], metrics: MonitoringMetrics): string[] {
    const recommendations: string[] = [];

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case 'error_spike':
          recommendations.push('Investigate recent code changes for bugs');
          recommendations.push('Check server logs for error patterns');
          recommendations.push('Consider rolling back if error rate continues');
          break;

        case 'slow_response':
          recommendations.push('Review database query performance');
          recommendations.push('Check API endpoint response times');
          recommendations.push('Monitor server resource usage');
          break;

        case 'low_success_rate':
          recommendations.push('Verify API integrations are functioning');
          recommendations.push('Check for timeout issues');
          recommendations.push('Review error handling logic');
          break;

        case 'health_degradation':
          recommendations.push('Run full system diagnostics');
          recommendations.push('Check all critical services');
          recommendations.push('Consider triggering auto-recovery');
          break;
      }
    }

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }

  /**
   * Get latest metrics
   */
  private getLatestMetrics(): MonitoringMetrics {
    if (this.metricsHistory.length === 0) {
      // Return default healthy metrics
      return {
        timestamp: new Date(),
        errorRate: 0,
        successRate: 1.0,
        responseTime: 100,
        requestsPerMinute: 0,
        activeUsers: 0,
        healthScore: 100
      };
    }

    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): MonitoringMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Compare current deployment with baseline
   */
  async compareWithBaseline(): Promise<{
    current: MonitoringMetrics;
    baseline: MonitoringMetrics;
    changes: Record<string, number>;
  }> {
    const current = this.getLatestMetrics();
    const baseline = this.calculateBaselineMetrics();
    
    const changes = {
      errorRate: ((current.errorRate - baseline.errorRate) / baseline.errorRate) * 100,
      successRate: ((current.successRate - baseline.successRate) / baseline.successRate) * 100,
      responseTime: ((current.responseTime - baseline.responseTime) / baseline.responseTime) * 100,
      healthScore: ((current.healthScore - baseline.healthScore) / baseline.healthScore) * 100
    };

    return { current, baseline, changes };
  }

  /**
   * Calculate baseline metrics (average of last N metrics)
   */
  private calculateBaselineMetrics(count: number = 100): MonitoringMetrics {
    if (this.metricsHistory.length === 0) {
      return this.getLatestMetrics();
    }

    const recent = this.metricsHistory.slice(-count);
    const sum = recent.reduce((acc, m) => ({
      errorRate: acc.errorRate + m.errorRate,
      successRate: acc.successRate + m.successRate,
      responseTime: acc.responseTime + m.responseTime,
      requestsPerMinute: acc.requestsPerMinute + m.requestsPerMinute,
      activeUsers: acc.activeUsers + m.activeUsers,
      healthScore: acc.healthScore + m.healthScore
    }), {
      errorRate: 0,
      successRate: 0,
      responseTime: 0,
      requestsPerMinute: 0,
      activeUsers: 0,
      healthScore: 0
    });

    const count_actual = recent.length;

    return {
      timestamp: new Date(),
      errorRate: sum.errorRate / count_actual,
      successRate: sum.successRate / count_actual,
      responseTime: sum.responseTime / count_actual,
      requestsPerMinute: sum.requestsPerMinute / count_actual,
      activeUsers: sum.activeUsers / count_actual,
      healthScore: sum.healthScore / count_actual
    };
  }

  /**
   * Alert on critical issues
   */
  async sendAlert(anomaly: Anomaly): Promise<void> {
    console.error(`[MONITOR] 🚨 ALERT: ${anomaly.severity.toUpperCase()} - ${anomaly.description}`);

    // In a real implementation, this would:
    // - Send email/SMS notifications
    // - Create tickets in issue tracking system
    // - Post to Slack/Discord
    // - Trigger PagerDuty alerts

    // Record alert in database
    try {
      await prisma.experience.create({
        data: {
          type: "system_operation",
          action: 'alert_triggered',
          context: {
            anomaly: {
              type: anomaly.type,
              severity: anomaly.severity,
              description: anomaly.description
            }
          },
          outcome: 'alert_sent',
          wouldRepeat: true,
          confidence: 80,
          results: anomaly.metrics,
          lessonsLearned: `Alert triggered: ${anomaly.description}`
        }
      });
    } catch (error) {
      console.error('[MONITOR] Failed to record alert:', error);
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStatistics(): Promise<any> {
    try {
      const experiences = await prisma.experience.findMany({
        where: { action: 'alert_triggered' },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      const alerts = experiences.length;
      const criticalAlerts = experiences.filter(
        e => (e.context as any).anomaly?.severity === 'critical'
      ).length;

      return {
        totalAlerts: alerts,
        criticalAlerts,
        recentAlerts: experiences.slice(0, 10).map(e => ({
          type: (e.context as any).anomaly?.type || 'unknown',
          severity: (e.context as any).anomaly?.severity || 'unknown',
          description: (e.context as any).anomaly?.description || 'Unknown',
          timestamp: e.createdAt
        }))
      };
    } catch (error) {
      console.error('[MONITOR] Failed to get statistics:', error);
      return {
        totalAlerts: 0,
        criticalAlerts: 0,
        recentAlerts: []
      };
    }
  }

  /**
   * Reset metrics history (for testing)
   */
  resetHistory(): void {
    this.metricsHistory = [];
    console.log('[MONITOR] Metrics history reset');
  }
}

// ===========================
// Export Singleton Instance
// ===========================

export const deploymentMonitor = new DeploymentMonitor();
