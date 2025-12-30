/**
 * SELF-DIAGNOSIS - Holly's Health Monitoring System
 * 
 * Enables Holly to diagnose her own issues and health status
 * This is self-monitoring and problem detection
 */

import { prisma } from '@/lib/db';

// Interface for autonomous API routes - matches expected properties
export interface SystemIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  description?: string;
  detected_at?: Date;
  stackTrace?: string;
  type: 'error' | 'warning' | 'performance' | 'security';
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: 'healthy' | 'slow' | 'down';
    api: 'healthy' | 'slow' | 'down';
    memory: 'healthy' | 'high' | 'critical';
    learning: 'active' | 'stale' | 'inactive';
  };
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    description: string;
    detected_at: Date;
  }>;
  metrics: {
    response_time_ms: number;
    error_rate: number;
    uptime_hours: number;
    last_learning_cycle: Date | null;
  };
}

export class SelfDiagnosis {
  /**
   * Perform complete system health check
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const issues: SystemHealth['issues'] = [];

    // Check database
    const dbStatus = await this.checkDatabase();
    if (dbStatus !== 'healthy') {
      issues.push({
        severity: dbStatus === 'down' ? 'critical' : 'medium',
        component: 'database',
        description: `Database is ${dbStatus}`,
        detected_at: new Date()
      });
    }

    // Check learning system
    const learningStatus = await this.checkLearningSystem();
    if (learningStatus !== 'active') {
      issues.push({
        severity: learningStatus === 'inactive' ? 'high' : 'low',
        component: 'learning',
        description: `Learning system is ${learningStatus}`,
        detected_at: new Date()
      });
    }

    // Calculate overall status
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    let overallStatus: SystemHealth['overall_status'] = 'healthy';
    if (criticalIssues > 0) {
      overallStatus = 'critical';
    } else if (highIssues > 0 || issues.length > 3) {
      overallStatus = 'degraded';
    }

    return {
      overall_status: overallStatus,
      components: {
        database: dbStatus,
        api: 'healthy', // Simplified for now
        memory: 'healthy', // Simplified for now
        learning: learningStatus
      },
      issues,
      metrics: {
        response_time_ms: 0, // Would need actual monitoring
        error_rate: 0,
        uptime_hours: 0,
        last_learning_cycle: await this.getLastLearningCycle()
      }
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<'healthy' | 'slow' | 'down'> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;

      if (duration > 1000) return 'slow';
      return 'healthy';
    } catch (error) {
      console.error('[SelfDiagnosis] Database check failed:', error);
      return 'down';
    }
  }

  /**
   * Check learning system activity
   */
  private async checkLearningSystem(): Promise<'active' | 'stale' | 'inactive'> {
    try {
      const lastLearning = await this.getLastLearningCycle();
      if (!lastLearning) return 'inactive';

      const hoursSinceLastLearning = (Date.now() - lastLearning.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastLearning < 24) return 'active';
      if (hoursSinceLastLearning < 72) return 'stale';
      return 'inactive';
    } catch (error) {
      console.error('[SelfDiagnosis] Learning system check failed:', error);
      return 'inactive';
    }
  }

  /**
   * Get last learning cycle timestamp
   */
  private async getLastLearningCycle(): Promise<Date | null> {
    try {
      const lastLearning = await prisma.hollyExperience.findFirst({
        where: {
          type: 'learning_cycle'
        },
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          timestamp: true
        }
      });

      return lastLearning?.timestamp || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Diagnose specific issue
   */
  async diagnoseIssue(
    errorMessage: string,
    context?: Record<string, any>
  ): Promise<{
    diagnosis: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggested_fix: string;
    auto_fixable: boolean;
  }> {
    // Simple pattern matching for common issues
    const diagnosis = this.analyzeError(errorMessage);

    return {
      diagnosis: diagnosis.description,
      severity: diagnosis.severity,
      suggested_fix: diagnosis.fix,
      auto_fixable: diagnosis.auto_fixable
    };
  }

  /**
   * Analyze error message
   */
  private analyzeError(errorMessage: string): {
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    fix: string;
    auto_fixable: boolean;
  } {
    const lower = errorMessage.toLowerCase();

    // Database errors
    if (lower.includes('database') || lower.includes('prisma')) {
      return {
        description: 'Database connectivity or query issue',
        severity: 'high',
        fix: 'Check database connection and query syntax',
        auto_fixable: false
      };
    }

    // API errors
    if (lower.includes('api') || lower.includes('fetch')) {
      return {
        description: 'API request failed',
        severity: 'medium',
        fix: 'Retry request or check API endpoint',
        auto_fixable: true
      };
    }

    // Rate limit errors
    if (lower.includes('rate limit') || lower.includes('429')) {
      return {
        description: 'Rate limit exceeded',
        severity: 'medium',
        fix: 'Implement exponential backoff or wait',
        auto_fixable: true
      };
    }

    // Authentication errors
    if (lower.includes('auth') || lower.includes('unauthorized')) {
      return {
        description: 'Authentication failure',
        severity: 'high',
        fix: 'Check API keys and credentials',
        auto_fixable: false
      };
    }

    // Default
    return {
      description: 'Unknown error',
      severity: 'medium',
      fix: 'Review error logs and context',
      auto_fixable: false
    };
  }
}

// Singleton instance
export const selfDiagnosis = new SelfDiagnosis();
