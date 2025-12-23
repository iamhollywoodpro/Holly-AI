/**
 * Self-Healing Module
 * 
 * Proactively monitors the system for issues and automatically
 * triggers self-improvements to resolve them.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../monitoring/logger";
import { errorTracker } from "../monitoring/error-tracker";

const prisma = new PrismaClient();

export interface HealthCheckResult {
  healthy: boolean;
  issues: HealthIssue[];
  timestamp: Date;
}

export interface HealthIssue {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: "error_spike" | "performance_degradation" | "anomaly";
  description: string;
  metrics: Record<string, any>;
  suggestedAction?: string;
}

export class SelfHealingEngine {
  private readonly ERROR_SPIKE_THRESHOLD = 10; // errors per minute
  private readonly PERFORMANCE_THRESHOLD = 2000; // ms response time
  private readonly CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Perform a comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const issues: HealthIssue[] = [];

    try {
      // Check for error spikes
      const errorSpike = await this.checkErrorSpike();
      if (errorSpike) {
        issues.push(errorSpike);
      }

      // Check for performance degradation
      const performanceIssue = await this.checkPerformance();
      if (performanceIssue) {
        issues.push(performanceIssue);
      }

      // Check for deployment failures
      const deploymentIssue = await this.checkDeploymentHealth();
      if (deploymentIssue) {
        issues.push(deploymentIssue);
      }

      const healthy = issues.length === 0 || issues.every((i) => i.severity === "low");

      logger.info("Health check completed", {
        healthy,
        issuesFound: issues.length,
        category: "self-healing",
      });

      return {
        healthy,
        issues,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error("Health check failed", {
        error: error.message,
        category: "self-healing",
      });

      return {
        healthy: false,
        issues: [
          {
            id: "health-check-failure",
            severity: "high",
            type: "anomaly",
            description: "Health check system itself failed",
            metrics: { error: error.message },
          },
        ],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check for error spikes
   */
  private async checkErrorSpike(): Promise<HealthIssue | null> {
    try {
      // Get recent improvements that failed
      const recentFailures = await prisma.selfImprovement.findMany({
        where: {
          status: "failed",
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      const errorRate = recentFailures.length / 60; // errors per minute

      if (errorRate > this.ERROR_SPIKE_THRESHOLD) {
        return {
          id: "error-spike",
          severity: errorRate > this.ERROR_SPIKE_THRESHOLD * 2 ? "critical" : "high",
          type: "error_spike",
          description: `Detected ${recentFailures.length} failures in the last hour (${errorRate.toFixed(2)}/min)`,
          metrics: {
            errorCount: recentFailures.length,
            errorRate,
            threshold: this.ERROR_SPIKE_THRESHOLD,
          },
          suggestedAction: "Investigate recent failures and consider rolling back recent changes",
        };
      }

      return null;
    } catch (error: any) {
      logger.error("Failed to check error spike", {
        error: error.message,
        category: "self-healing",
      });
      return null;
    }
  }

  /**
   * Check for performance degradation
   */
  private async checkPerformance(): Promise<HealthIssue | null> {
    try {
      // In a real implementation, this would query metrics from a monitoring service
      // For now, we'll use a placeholder

      const avgResponseTime = 0; // Placeholder

      if (avgResponseTime > this.PERFORMANCE_THRESHOLD) {
        return {
          id: "performance-degradation",
          severity: avgResponseTime > this.PERFORMANCE_THRESHOLD * 2 ? "high" : "medium",
          type: "performance_degradation",
          description: `Average response time (${avgResponseTime}ms) exceeds threshold (${this.PERFORMANCE_THRESHOLD}ms)`,
          metrics: {
            avgResponseTime,
            threshold: this.PERFORMANCE_THRESHOLD,
          },
          suggestedAction: "Investigate slow queries and consider performance optimizations",
        };
      }

      return null;
    } catch (error: any) {
      logger.error("Failed to check performance", {
        error: error.message,
        category: "self-healing",
      });
      return null;
    }
  }

  /**
   * Check deployment health
   */
  private async checkDeploymentHealth(): Promise<HealthIssue | null> {
    try {
      // Check recent deployments
      const recentDeployments = await prisma.selfImprovement.findMany({
        where: {
          status: "deployed",
          deployedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: {
          deployedAt: "desc",
        },
        take: 10,
      });

      const failedDeployments = recentDeployments.filter(
        (d) => d.outcome === "failure" || d.outcome === "rolled_back"
      );

      const failureRate =
        recentDeployments.length > 0
          ? failedDeployments.length / recentDeployments.length
          : 0;

      if (failureRate > 0.3 && recentDeployments.length >= 3) {
        return {
          id: "deployment-health",
          severity: failureRate > 0.5 ? "high" : "medium",
          type: "anomaly",
          description: `High deployment failure rate: ${Math.round(failureRate * 100)}% of recent deployments failed`,
          metrics: {
            totalDeployments: recentDeployments.length,
            failedDeployments: failedDeployments.length,
            failureRate,
          },
          suggestedAction: "Review deployment process and consider stricter approval criteria",
        };
      }

      return null;
    } catch (error: any) {
      logger.error("Failed to check deployment health", {
        error: error.message,
        category: "self-healing",
      });
      return null;
    }
  }

  /**
   * Automatically trigger a self-improvement to fix an issue
   */
  async triggerAutoFix(issue: HealthIssue, userId: string): Promise<string | null> {
    try {
      logger.info("Triggering auto-fix for issue", {
        issueId: issue.id,
        severity: issue.severity,
        category: "self-healing",
      });

      // Create a new self-improvement to address the issue
      const improvement = await prisma.selfImprovement.create({
        data: {
          userId,
          triggerType: "auto_healing",
          triggerData: {
            issueId: issue.id,
            issueType: issue.type,
            issueSeverity: issue.severity,
            issueDescription: issue.description,
            issueMetrics: issue.metrics,
          },
          problemStatement: `Auto-detected issue: ${issue.description}`,
          solutionApproach: issue.suggestedAction || "Investigate and resolve the issue",
          riskLevel: issue.severity === "critical" || issue.severity === "high" ? "high" : "medium",
          branchName: `auto-fix/${issue.id}-${Date.now()}`,
          status: "planned",
          filesChanged: [],
        },
      });

      logger.info("Auto-fix improvement created", {
        improvementId: improvement.id,
        issueId: issue.id,
        category: "self-healing",
      });

      return improvement.id;
    } catch (error: any) {
      logger.error("Failed to trigger auto-fix", {
        issueId: issue.id,
        error: error.message,
        category: "self-healing",
      });

      errorTracker.trackError(error, {
        issueId: issue.id,
        category: "self-healing",
      });

      return null;
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(userId: string): void {
    logger.info("Starting continuous health monitoring", {
      interval: this.CHECK_INTERVAL,
      category: "self-healing",
    });

    setInterval(async () => {
      const healthCheck = await this.performHealthCheck();

      if (!healthCheck.healthy) {
        // Trigger auto-fixes for critical issues
        for (const issue of healthCheck.issues) {
          if (issue.severity === "critical" || issue.severity === "high") {
            await this.triggerAutoFix(issue, userId);
          }
        }
      }
    }, this.CHECK_INTERVAL);
  }
}

export const selfHealingEngine = new SelfHealingEngine();

// Export convenience functions for API endpoints
export async function monitorSystem() {
  return await selfHealingEngine.performHealthCheck();
}

export async function detectAnomalies(healthMetrics: HealthCheckResult) {
  return healthMetrics.issues;
}

export async function proposeImprovements(anomalies: HealthIssue[]) {
  const improvements = [];
  
  for (const anomaly of anomalies) {
    improvements.push({
      trigger: anomaly.type,
      solution: anomaly.suggestedAction || 'Manual investigation required',
      priority: anomaly.severity,
      autoFixable: anomaly.severity !== 'critical'
    });
  }
  
  return improvements;
}
