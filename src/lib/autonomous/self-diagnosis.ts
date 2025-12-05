/**
 * PHASE 4: SELF-DIAGNOSIS SYSTEM
 * 
 * Allows HOLLY to introspect her own running system:
 * - Monitor runtime errors
 * - Check system health
 * - Detect anomalies
 * - Trace error sources
 */

import { prisma } from '@/lib/db';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DiagnosticReport {
  timestamp: Date;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  issues: DiagnosticIssue[];
  metrics: SystemMetrics;
  recommendations: string[];
}

export interface DiagnosticIssue {
  id: string;
  type: 'error' | 'warning' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  stackTrace?: string;
  possibleCauses: string[];
  suggestedFixes: string[];
}

export interface SystemMetrics {
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export class SelfDiagnosisSystem {
  private projectRoot: string;

  constructor(projectRoot: string = '/home/user/Holly-AI') {
    this.projectRoot = projectRoot;
  }

  /**
   * Run comprehensive system diagnosis
   */
  async diagnose(): Promise<DiagnosticReport> {
    console.log('[Self-Diagnosis] 🔍 Running system diagnosis...');

    const issues: DiagnosticIssue[] = [];
    const recommendations: string[] = [];

    // Check for recent errors in database
    const recentErrors = await this.checkRecentErrors();
    issues.push(...recentErrors);

    // Check system health
    const healthIssues = await this.checkSystemHealth();
    issues.push(...healthIssues);

    // Check for performance issues
    const perfIssues = await this.checkPerformanceMetrics();
    issues.push(...perfIssues);

    // Check for code issues
    const codeIssues = await this.checkCodebase();
    issues.push(...codeIssues);

    // Get current metrics
    const metrics = await this.collectMetrics();

    // Determine overall health
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;

    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      systemHealth = 'critical';
      recommendations.push('🚨 Critical issues detected - immediate action required');
    } else if (highCount > 2) {
      systemHealth = 'degraded';
      recommendations.push('⚠️ Multiple high-severity issues - should address soon');
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('✅ System is healthy - no issues detected');
    } else {
      recommendations.push(...this.generateRecommendations(issues));
    }

    const report: DiagnosticReport = {
      timestamp: new Date(),
      systemHealth,
      issues,
      metrics,
      recommendations
    };

    console.log(`[Self-Diagnosis] Found ${issues.length} issues (${criticalCount} critical, ${highCount} high)`);

    return report;
  }

  /**
   * Check for recent errors in system
   */
  private async checkRecentErrors(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    try {
      // Check for TypeScript errors in recent builds
      // This would integrate with actual error logging in production
      
      // For now, check if there are unresolved problems in database
      const problems = await prisma.detectedProblem.findMany({
        where: {
          severity: { in: ['critical', 'high'] },
          status: { in: ['detected', 'analyzing'] }
        },
        take: 10,
        orderBy: { detectedAt: 'desc' }
      });

      for (const problem of problems) {
        issues.push({
          id: problem.id,
          type: problem.type as any,
          severity: problem.severity as any,
          component: 'system',
          message: problem.title,
          possibleCauses: [problem.description],
          suggestedFixes: ['Check Phase 3 hypotheses for solutions']
        });
      }
    } catch (error) {
      console.error('[Self-Diagnosis] Error checking recent errors:', error);
    }

    return issues;
  }

  /**
   * Check system health endpoints
   */
  private async checkSystemHealth(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
    } catch (error: any) {
      issues.push({
        id: 'db-connection',
        type: 'error',
        severity: 'critical',
        component: 'database',
        message: 'Database connection failed',
        stackTrace: error.stack,
        possibleCauses: [
          'Database server is down',
          'Connection string is invalid',
          'Network issues'
        ],
        suggestedFixes: [
          'Check DATABASE_URL environment variable',
          'Verify database server is running',
          'Check network connectivity'
        ]
      });
    }

    return issues;
  }

  /**
   * Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    try {
      // Check for slow database queries
      // In production, this would query actual metrics
      
      // Check if we have many experiences indicating poor performance
      const poorPerformanceCount = await prisma.experience.count({
        where: {
          outcome: 'failure',
          type: 'deployment',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      if (poorPerformanceCount > 5) {
        issues.push({
          id: 'high-failure-rate',
          type: 'performance',
          severity: 'high',
          component: 'deployment',
          message: `${poorPerformanceCount} deployment failures in last 7 days`,
          possibleCauses: [
            'Code quality issues',
            'Insufficient testing',
            'Environmental problems'
          ],
          suggestedFixes: [
            'Review recent failed deployments',
            'Improve pre-deployment validation',
            'Add more comprehensive tests'
          ]
        });
      }
    } catch (error) {
      console.error('[Self-Diagnosis] Error checking performance:', error);
    }

    return issues;
  }

  /**
   * Check codebase for issues
   */
  private async checkCodebase(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    try {
      // Check for common code issues
      // This is simplified - in production would do deeper analysis

      // Check if package.json exists
      try {
        await fs.access(path.join(this.projectRoot, 'package.json'));
      } catch {
        issues.push({
          id: 'missing-package-json',
          type: 'error',
          severity: 'critical',
          component: 'codebase',
          message: 'package.json not found',
          possibleCauses: ['File was deleted', 'Wrong directory'],
          suggestedFixes: ['Restore package.json from git']
        });
      }

      // Check if node_modules exists
      try {
        await fs.access(path.join(this.projectRoot, 'node_modules'));
      } catch {
        issues.push({
          id: 'missing-node-modules',
          type: 'warning',
          severity: 'medium',
          component: 'dependencies',
          message: 'node_modules directory not found',
          possibleCauses: ['Dependencies not installed'],
          suggestedFixes: ['Run npm install']
        });
      }
    } catch (error) {
      console.error('[Self-Diagnosis] Error checking codebase:', error);
    }

    return issues;
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<SystemMetrics> {
    try {
      // Get error rate from recent experiences
      const recentExperiences = await prisma.experience.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const failures = recentExperiences.filter(e => e.outcome === 'failure').length;
      const errorRate = recentExperiences.length > 0 
        ? (failures / recentExperiences.length) * 100 
        : 0;

      // Get active users count (simplified)
      const activeUsers = await prisma.user.count();

      return {
        errorRate,
        avgResponseTime: 0, // Would be calculated from actual metrics
        activeUsers
      };
    } catch (error) {
      console.error('[Self-Diagnosis] Error collecting metrics:', error);
      return {
        errorRate: 0,
        avgResponseTime: 0,
        activeUsers: 0
      };
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(issues: DiagnosticIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      recommendations.push(`⚠️ ${criticalIssues.length} critical issues require immediate attention`);
      criticalIssues.forEach(issue => {
        if (issue.suggestedFixes.length > 0) {
          recommendations.push(`  → ${issue.component}: ${issue.suggestedFixes[0]}`);
        }
      });
    }

    if (highIssues.length > 0) {
      recommendations.push(`🔧 ${highIssues.length} high-priority issues should be addressed`);
    }

    // Add proactive recommendations
    const errorIssues = issues.filter(i => i.type === 'error');
    if (errorIssues.length > 3) {
      recommendations.push('📊 Consider implementing more comprehensive error tracking');
    }

    return recommendations;
  }

  /**
   * Get diagnostic history
   */
  async getDiagnosticHistory(days: number = 7): Promise<any[]> {
    // In production, this would query stored diagnostic reports
    // For now, return recent problems
    return prisma.detectedProblem.findMany({
      where: {
        detectedAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { detectedAt: 'desc' },
      take: 50
    });
  }
}

/**
 * Quick health check
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  criticalIssues: number;
}> {
  const system = new SelfDiagnosisSystem();
  const report = await system.diagnose();
  
  const criticalIssues = report.issues.filter(i => i.severity === 'critical').length;
  
  return {
    healthy: report.systemHealth === 'healthy',
    criticalIssues
  };
}
