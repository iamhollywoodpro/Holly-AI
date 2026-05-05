/**
 * AUTOMATED ROLLBACK SYSTEM
 * 
 * Detects failed deployments and automatically reverts to last working version:
 * - Monitors deployment status
 * - Checks health after deployment
 * - Auto-reverts on failures
 * - Records rollback events
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ExperienceTracker } from '../metamorphosis/experience-tracker';

const execAsync = promisify(exec);

export interface DeploymentHealth {
  isHealthy: boolean;
  checks: {
    api: boolean;
    database: boolean;
    build: boolean;
  };
  errors: string[];
  timestamp: Date;
}

export interface RollbackResult {
  success: boolean;
  previousCommit: string;
  rolledBackTo: string;
  reason: string;
  timestamp: Date;
}

export class RollbackSystem {
  private projectRoot: string;
  private healthCheckUrl: string;
  private experienceTracker: ExperienceTracker;

  constructor(
    projectRoot: string = '/home/user/Holly-AI',
    healthCheckUrl: string = 'https://holly.nexamusicgroup.com/api/health'
  ) {
    this.projectRoot = projectRoot;
    this.healthCheckUrl = healthCheckUrl;
    this.experienceTracker = new ExperienceTracker();
  }

  /**
   * Check deployment health after a deployment
   */
  async checkDeploymentHealth(
    waitSeconds: number = 60
  ): Promise<DeploymentHealth> {
    console.log(`[Rollback] 🏥 Checking deployment health (waiting ${waitSeconds}s)...`);

    // Wait for deployment to stabilize
    await this.sleep(waitSeconds * 1000);

    const health: DeploymentHealth = {
      isHealthy: true,
      checks: {
        api: false,
        database: false,
        build: false
      },
      errors: [],
      timestamp: new Date()
    };

    // Check API health
    try {
      const response = await fetch(this.healthCheckUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        health.checks.api = data.status === 'healthy' || data.health === 'healthy';
        health.checks.database = data.components?.database === 'healthy' || data.database === 'healthy';
        health.checks.build = true; // If API responds, build succeeded
      } else {
        health.errors.push(`API health check failed: ${response.status}`);
      }
    } catch (error: any) {
      health.errors.push(`API health check error: ${error.message}`);
    }

    // Determine overall health
    health.isHealthy = 
      health.checks.api &&
      health.checks.database &&
      health.checks.build &&
      health.errors.length === 0;

    if (health.isHealthy) {
      console.log('[Rollback] ✅ Deployment is healthy');
    } else {
      console.log('[Rollback] ❌ Deployment has issues:');
      health.errors.forEach(err => console.log(`  - ${err}`));
    }

    return health;
  }

  /**
   * Perform automatic rollback to previous commit
   */
  async performRollback(reason: string): Promise<RollbackResult> {
    console.log('[Rollback] 🔄 Performing automatic rollback...');

    try {
      // Get current commit
      const { stdout: currentCommit } = await execAsync(
        'git rev-parse HEAD',
        { cwd: this.projectRoot }
      );

      // Get previous commit
      const { stdout: previousCommit } = await execAsync(
        'git rev-parse HEAD~1',
        { cwd: this.projectRoot }
      );

      const current = currentCommit.trim();
      const previous = previousCommit.trim();

      console.log(`[Rollback] Current: ${current.substring(0, 7)}`);
      console.log(`[Rollback] Rolling back to: ${previous.substring(0, 7)}`);

      // Revert to previous commit
      await execAsync(
        `git revert --no-edit ${current}`,
        { cwd: this.projectRoot }
      );

      // Push revert
      await execAsync(
        'git push origin main',
        { cwd: this.projectRoot }
      );

      console.log('[Rollback] ✅ Rollback complete - deployment reverting');

      // Record experience
      await this.recordRollbackExperience(current, previous, reason, true);

      return {
        success: true,
        previousCommit: current,
        rolledBackTo: previous,
        reason,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('[Rollback] ❌ Rollback failed:', error.message);

      return {
        success: false,
        previousCommit: 'unknown',
        rolledBackTo: 'unknown',
        reason: `Rollback failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Monitor deployment and auto-rollback if unhealthy
   */
  async monitorAndRollback(
    commitHash: string,
    waitSeconds: number = 60
  ): Promise<{
    healthy: boolean;
    rolledBack: boolean;
    health: DeploymentHealth;
    rollback?: RollbackResult;
  }> {
    console.log('[Rollback] 📊 Starting deployment monitoring...');

    // Check health
    const health = await this.checkDeploymentHealth(waitSeconds);

    if (health.isHealthy) {
      // Record successful deployment
      await this.recordDeploymentSuccess(commitHash, health);

      return {
        healthy: true,
        rolledBack: false,
        health
      };
    }

    // Deployment is unhealthy - perform rollback
    console.log('[Rollback] ⚠️  Unhealthy deployment detected - initiating rollback');

    const rollback = await this.performRollback(
      `Deployment ${commitHash.substring(0, 7)} failed health checks: ${health.errors.join(', ')}`
    );

    return {
      healthy: false,
      rolledBack: rollback.success,
      health,
      rollback
    };
  }

  /**
   * Get rollback history
   */
  async getRollbackHistory(limit: number = 10): Promise<any[]> {
    // Query git log for revert commits
    try {
      const { stdout } = await execAsync(
        `git log --grep="revert" --oneline -${limit}`,
        { cwd: this.projectRoot }
      );

      return stdout.trim().split('\n').filter(Boolean).map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' '),
          type: 'rollback'
        };
      });
    } catch (error) {
      console.error('[Rollback] Error getting history:', error);
      return [];
    }
  }

  /**
   * Check if current deployment needs rollback
   */
  async shouldRollback(): Promise<{ should: boolean; reason: string }> {
    const health = await this.checkDeploymentHealth(10); // Quick check

    if (!health.isHealthy) {
      return {
        should: true,
        reason: health.errors.join(', ')
      };
    }

    return {
      should: false,
      reason: 'Deployment is healthy'
    };
  }

  /**
   * Record successful deployment experience
   */
  private async recordDeploymentSuccess(
    commitHash: string,
    health: DeploymentHealth
  ): Promise<void> {
    try {
      await this.experienceTracker.recordExperience({
        type: 'deployment',
        action: `Deployed commit ${commitHash.substring(0, 7)}`,
        context: {
          situation: 'Automated deployment',
          constraints: []
        },
        outcome: 'success',
        results: {
          responseTime: 0,
          userFeedback: 'Deployment healthy'
        },
        lessonsLearned: 'Deployment passed all health checks',
        wouldRepeat: true,
        confidence: 95
      });
    } catch (error) {
      console.error('[Rollback] Error recording deployment:', error);
    }
  }

  /**
   * Record rollback experience
   */
  private async recordRollbackExperience(
    failedCommit: string,
    revertedTo: string,
    reason: string,
    success: boolean
  ): Promise<void> {
    try {
      await this.experienceTracker.recordExperience({
        type: 'deployment',
        action: `Rolled back from ${failedCommit.substring(0, 7)} to ${revertedTo.substring(0, 7)}`,
        context: {
          situation: 'Automatic rollback due to failed deployment',
          problem: reason
        },
        outcome: success ? 'success' : 'failure',
        results: {
          userFeedback: success 
            ? 'Rollback successful - system restored'
            : 'Rollback failed - manual intervention needed'
        },
        lessonsLearned: `Deployment ${failedCommit.substring(0, 7)} failed: ${reason}. ${success ? 'Auto-recovery successful.' : 'Manual recovery needed.'}`,
        wouldRepeat: success,
        confidence: success ? 80 : 20
      });
    } catch (error) {
      console.error('[Rollback] Error recording rollback:', error);
    }
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Quick health check
 */
export async function checkHealth(url?: string): Promise<boolean> {
  const system = new RollbackSystem(undefined, url);
  const health = await system.checkDeploymentHealth(10);
  return health.isHealthy;
}

/**
 * Perform emergency rollback
 */
export async function emergencyRollback(reason: string): Promise<RollbackResult> {
  const system = new RollbackSystem();
  return await system.performRollback(reason);
}
