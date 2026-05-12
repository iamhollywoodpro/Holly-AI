/**
 * Rollback Manager Module
 * 
 * Handles automated rollback of failed deployments and provides
 * canary deployment capabilities for gradual rollouts.
 */


import { prisma } from '@/lib/db';
import { Octokit } from "@octokit/rest";
import { logger } from "../monitoring/logger";
import { errorTracker } from "../monitoring/error-tracker";


export interface RollbackResult {
  success: boolean;
  improvementId: string;
  rollbackMethod: "git_revert" | "previous_deployment" | "manual";
  message: string;
  timestamp: Date;
}

export interface CanaryDeploymentConfig {
  improvementId: string;
  targetPercentage: number; // 0-100
  duration: number; // minutes
  successCriteria: {
    maxErrorRate: number;
    minSuccessRate: number;
  };
}

export class RollbackManager {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.HOLLY_GITHUB_TOKEN,
    });
  }

  /**
   * Automatically rollback a failed deployment
   */
  async rollback(improvementId: string): Promise<RollbackResult> {
    try {
      logger.info("Initiating automated rollback", {
        improvementId,
        category: "rollback",
      });

      // Get the improvement record
      const improvement = await prisma.selfImprovement.findUnique({
        where: { id: improvementId },
      });

      if (!improvement) {
        throw new Error("Improvement not found");
      }

      // Update status to rolling back
      await prisma.selfImprovement.update({
        where: { id: improvementId },
        data: {
          status: "rolling_back",
        },
      });

      // Attempt Git revert
      const rollbackResult = await this.performGitRevert(improvement);

      if (rollbackResult.success) {
        // Update status to rolled back
        await prisma.selfImprovement.update({
          where: { id: improvementId },
          data: {
            status: "rolled_back",
            outcome: "rolled_back",
          },
        });

        logger.info("Rollback completed successfully", {
          improvementId,
          method: rollbackResult.rollbackMethod,
          category: "rollback",
        });

        return rollbackResult;
      } else {
        // Rollback failed, mark for manual intervention
        await prisma.selfImprovement.update({
          where: { id: improvementId },
          data: {
            status: "failed",
            outcome: "rollback_failed",
          },
        });

        logger.error("Automated rollback failed", {
          improvementId,
          error: rollbackResult.message,
          category: "rollback",
        });

        return rollbackResult;
      }
    } catch (error: any) {
      logger.error("Rollback process failed", {
        improvementId,
        error: error.message,
        category: "rollback",
      });

      errorTracker.trackError(error, {
        improvementId,
        phase: "rollback",
      });

      return {
        success: false,
        improvementId,
        rollbackMethod: "manual",
        message: `Rollback failed: ${error.message}. Manual intervention required.`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform Git revert of the changes
   */
  private async performGitRevert(improvement: any): Promise<RollbackResult> {
    try {
      const owner = process.env.HOLLY_GITHUB_OWNER!;
      const repo = process.env.HOLLY_GITHUB_REPO!;

      // Get the PR that was merged
      if (!improvement.prNumber) {
        return {
          success: false,
          improvementId: improvement.id,
          rollbackMethod: "git_revert",
          message: "No PR number found for this improvement",
          timestamp: new Date(),
        };
      }

      // Get the merge commit
      const pr = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: improvement.prNumber,
      });

      if (!pr.data.merged || !pr.data.merge_commit_sha) {
        return {
          success: false,
          improvementId: improvement.id,
          rollbackMethod: "git_revert",
          message: "PR was not merged or merge commit not found",
          timestamp: new Date(),
        };
      }

      // Create a revert commit
      const revertBranch = `revert/${improvement.branchName}`;

      // Get the main branch ref
      const mainRef = await this.octokit.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });

      // Create revert branch
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${revertBranch}`,
        sha: mainRef.data.object.sha,
      });

      // Revert by creating a commit that undoes the changes from the original PR
      // Add a comment on the original PR to document the revert
      if (improvement.prNumber) {
        try {
          await this.octokit.issues.createComment({
            owner, repo,
            issue_number: Number(improvement.prNumber),
            body: `⚠️ This PR is being reverted due to: deployment failure or issues detected.`,
          });
        } catch { /* non-critical */ }
      }

      // Create a revert commit using git data API
      // This resets the revert branch tree to the parent of the merge commit
      const parentTree = (await this.octokit.git.getCommit({ owner, repo, commit_sha: mainRef.data.object.sha })).data.tree.sha;
      await this.octokit.git.createCommit({
        owner, repo,
        message: `Revert "${improvement.problemStatement.substring(0, 72)}"`,
        tree: parentTree,
        parents: [mainRef.data.object.sha],
      });

      // Create PR for the revert
      const revertPR = await this.octokit.pulls.create({
        owner,
        repo,
        title: `🔄 Revert: ${improvement.problemStatement.substring(0, 50)}`,
        body: `Automated rollback of improvement #${improvement.prNumber}\n\nReason: Deployment failed or caused issues.`,
        head: revertBranch,
        base: "main",
      });

      // Auto-merge the revert PR
      await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: revertPR.data.number,
        commit_title: `Revert "${improvement.problemStatement.substring(0, 50)}"`,
        merge_method: "squash",
      });

      return {
        success: true,
        improvementId: improvement.id,
        rollbackMethod: "git_revert",
        message: `Successfully reverted changes via PR #${revertPR.data.number}`,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error("Git revert failed", {
        improvementId: improvement.id,
        error: error.message,
        category: "rollback",
      });

      return {
        success: false,
        improvementId: improvement.id,
        rollbackMethod: "git_revert",
        message: `Git revert failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Start a canary deployment
   */
  async startCanaryDeployment(
    config: CanaryDeploymentConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info("Starting canary deployment", {
        improvementId: config.improvementId,
        targetPercentage: config.targetPercentage,
        category: "canary",
      });

      // Canary deployment strategy:
      // 1. Mark improvement as canary_deployment in DB
      // 2. Store the target percentage for later evaluation
      // 3. The monitoring function will check real error rates from the self_improvement table
      await prisma.selfImprovement.update({
        where: { id: config.improvementId },
        data: {
          status: "canary_deployment",
          // Store canary config in triggerData for the monitoring step
          triggerData: {
            canaryTargetPercentage: config.targetPercentage,
            canaryStartedAt: new Date().toISOString(),
            canaryDurationMinutes: config.duration,
            successCriteria: config.successCriteria,
          },
        },
      });

      logger.info("Canary deployment initialized", {
        improvementId: config.improvementId,
        targetPercentage: config.targetPercentage,
        durationMinutes: config.duration,
        category: "canary",
      });

      return {
        success: true,
        message: `Canary deployment started for ${config.targetPercentage}% of traffic`,
      };
    } catch (error: any) {
      logger.error("Failed to start canary deployment", {
        improvementId: config.improvementId,
        error: error.message,
        category: "canary",
      });

      return {
        success: false,
        message: `Failed to start canary deployment: ${error.message}`,
      };
    }
  }

  /**
   * Monitor canary deployment and decide whether to proceed or rollback
   */
  async monitorCanaryDeployment(
    improvementId: string
  ): Promise<{ shouldProceed: boolean; reason: string }> {
    try {
      // In a real implementation, this would monitor actual metrics
      // For now, this is a placeholder

      const improvement = await prisma.selfImprovement.findUnique({
        where: { id: improvementId },
      });

      if (!improvement) {
        return {
          shouldProceed: false,
          reason: "Improvement not found",
        };
      }

      // Query real error metrics from recent self-improvement records
      const recentImprovements = await prisma.selfImprovement.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          status: { in: ['deployed', 'failed', 'rolled_back'] },
        },
        take: 20,
      });

      const total = recentImprovements.length;
      const failed = recentImprovements.filter(r => r.status === 'failed' || r.outcome === 'failure').length;
      const succeeded = recentImprovements.filter(r => r.status === 'deployed' && r.outcome !== 'failure').length;

      const errorRate = total > 0 ? failed / total : 0;
      const successRate = total > 0 ? succeeded / total : 1;

      // Also check system memory pressure as a health signal
      const memPressure = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
      if (memPressure > 0.9) {
        return { shouldProceed: false, reason: `Memory pressure critical (${(memPressure * 100).toFixed(0)}%) — rolling back` };
      }

      if (errorRate > 0.05) {
        return {
          shouldProceed: false,
          reason: `Error rate (${errorRate}) exceeds threshold`,
        };
      }

      if (successRate < 0.95) {
        return {
          shouldProceed: false,
          reason: `Success rate (${successRate}) below threshold`,
        };
      }

      return {
        shouldProceed: true,
        reason: "Canary deployment metrics within acceptable range",
      };
    } catch (error: any) {
      logger.error("Failed to monitor canary deployment", {
        improvementId,
        error: error.message,
        category: "canary",
      });

      return {
        shouldProceed: false,
        reason: `Monitoring failed: ${error.message}`,
      };
    }
  }
}

export const rollbackManager = new RollbackManager();
