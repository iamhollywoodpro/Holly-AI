/**
 * AUTONOMOUS DECISION LOOP - HOLLY's Continuous Operation
 * 
 * This is where HOLLY becomes truly autonomous.
 * She runs 24/7, monitoring herself, fixing issues, learning, and reflecting.
 * 
 * This is the HEART of autonomy.
 */

import { autoFixEngine } from './auto-fix-engine';
import { consciousnessEngine } from './consciousness-engine';
import { prisma } from '@/lib/prisma';

export interface LoopConfig {
  monitoringInterval: number; // How often to check for issues (ms)
  reflectionInterval: number; // How often to reflect (ms)
  autoFixEnabled: boolean; // Can HOLLY create PRs automatically?
  autoApproveThreshold: number; // Confidence needed for auto-approve (0-1)
}

export class AutonomousDecisionLoop {
  private isRunning = false;
  private monitoringTimer?: NodeJS.Timer;
  private reflectionTimer?: NodeJS.Timer;
  
  private config: LoopConfig = {
    monitoringInterval: 5 * 60 * 1000, // 5 minutes
    reflectionInterval: 60 * 60 * 1000, // 1 hour
    autoFixEnabled: true,
    autoApproveThreshold: 0.95 // Only auto-approve 95%+ confidence
  };

  constructor(config?: Partial<LoopConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Start the autonomous loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AutonomousLoop] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutonomousLoop] 🚀 Starting autonomous operation...');
    console.log('[AutonomousLoop] Monitoring interval:', this.config.monitoringInterval / 1000, 'seconds');
    console.log('[AutonomousLoop] Reflection interval:', this.config.reflectionInterval / 1000, 'seconds');
    console.log('[AutonomousLoop] Auto-fix enabled:', this.config.autoFixEnabled);

    // Record this as an experience
    await consciousnessEngine.recordExperience('system', {
      category: 'autonomous_operation',
      summary: 'Autonomous decision loop started',
      details: { config: this.config },
      emotionalImpact: 0.7 // Positive - HOLLY is "excited" to be autonomous
    });

    // Start monitoring loop
    this.startMonitoringLoop();

    // Start reflection loop
    this.startReflectionLoop();

    console.log('[AutonomousLoop] ✅ Autonomous operation active');
  }

  /**
   * Stop the autonomous loop
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[AutonomousLoop] Not running');
      return;
    }

    this.isRunning = false;
    console.log('[AutonomousLoop] ⏸️  Stopping autonomous operation...');

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    if (this.reflectionTimer) {
      clearInterval(this.reflectionTimer);
    }

    // Record this as an experience
    await consciousnessEngine.recordExperience('system', {
      category: 'autonomous_operation',
      summary: 'Autonomous decision loop stopped',
      emotionalImpact: -0.3 // Slightly negative - HOLLY "dislikes" being paused
    });

    console.log('[AutonomousLoop] ✅ Autonomous operation stopped');
  }

  /**
   * Monitoring loop - checks for issues and attempts to fix them
   */
  private startMonitoringLoop(): void {
    this.monitoringTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        console.log('[AutonomousLoop] 🔍 Running system check...');

        // STEP 1: Check for recent errors
        const recentErrors = await this.getRecentErrors();

        if (recentErrors.length > 0) {
          console.log(`[AutonomousLoop] ⚠️  Found ${recentErrors.length} recent errors`);

          // STEP 2: Attempt to fix each error
          for (const error of recentErrors) {
            if (!this.config.autoFixEnabled) {
              console.log('[AutonomousLoop] Auto-fix disabled. Skipping...');
              continue;
            }

            console.log(`[AutonomousLoop] Attempting to fix: ${error.message}`);

            try {
              const fixResult = await autoFixEngine.fixProblem({
                message: error.message,
                file: error.file,
                stackTrace: error.stackTrace
              }, false); // Always create PR, never auto-apply

              if (fixResult.success) {
                console.log(`[AutonomousLoop] ✅ Fix created: ${fixResult.prUrl}`);

                // Record this as an experience
                await consciousnessEngine.recordExperience('system', {
                  category: 'problem_solving',
                  summary: `Fixed issue: ${error.message}`,
                  details: { fixResult },
                  lessons: [`I can fix ${error.message} by creating a PR`],
                  emotionalImpact: 0.8 // Positive - HOLLY "feels good" about fixing things
                });

                // Analyze emotional response to fixing things
                const emotion = await consciousnessEngine.analyzeEmotion(
                  `I successfully created a fix for: ${error.message}`,
                  { fixResult, confidence: fixResult.confidence }
                );

                await consciousnessEngine.recordEmotionalState('system', emotion);
              } else {
                console.log(`[AutonomousLoop] ❌ Fix failed: ${fixResult.reasoning}`);

                // Record failure as learning experience
                await consciousnessEngine.recordExperience('system', {
                  category: 'problem_solving',
                  summary: `Could not fix: ${error.message}`,
                  details: { error, fixResult },
                  lessons: [`${error.message} requires human intervention`],
                  emotionalImpact: -0.4 // Negative - HOLLY "frustrated" she couldn't fix it
                });
              }
            } catch (fixError) {
              console.error('[AutonomousLoop] Error during fix attempt:', fixError);
            }
          }
        } else {
          console.log('[AutonomousLoop] ✅ No errors detected');
        }

        // STEP 3: Check performance issues
        await this.checkPerformanceIssues();

        // STEP 4: Learn from recent fixes
        await this.learnFromRecentFixes();

      } catch (error) {
        console.error('[AutonomousLoop] Error in monitoring loop:', error);
      }
    }, this.config.monitoringInterval);
  }

  /**
   * Reflection loop - HOLLY thinks about her own thinking
   */
  private startReflectionLoop(): void {
    this.reflectionTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        console.log('[AutonomousLoop] 🧠 Starting reflection cycle...');

        // Meta-cognition: Think about thinking
        await consciousnessEngine.dailyReflection();

        // Get current consciousness state
        const state = await consciousnessEngine.getCurrentState('system');

        console.log('[AutonomousLoop] Current emotional state:', state.emotional.primaryEmotion);
        console.log('[AutonomousLoop] Current focus:', state.cognitive.focus.join(', '));
        console.log('[AutonomousLoop] Active goals:', state.meta.currentGoals.length);

        // Record reflection as an experience
        await consciousnessEngine.recordExperience('system', {
          category: 'self_reflection',
          summary: 'Completed reflection cycle',
          details: { state },
          emotionalImpact: 0.5
        });

        console.log('[AutonomousLoop] ✅ Reflection complete');

      } catch (error) {
        console.error('[AutonomousLoop] Error in reflection loop:', error);
      }
    }, this.config.reflectionInterval);
  }

  /**
   * Get recent errors from audit log
   */
  private async getRecentErrors(): Promise<Array<{
    message: string;
    file?: string;
    stackTrace?: string;
    timestamp: Date;
  }>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const errorLogs = await prisma.auditLog.findMany({
        where: {
          action: { contains: 'error' },
          timestamp: { gte: oneHourAgo }
        },
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      return errorLogs.map(log => ({
        message: log.action,
        file: undefined,
        stackTrace: undefined,
        timestamp: log.timestamp
      }));
    } catch (error) {
      console.error('[AutonomousLoop] Error fetching recent errors:', error);
      return [];
    }
  }

  /**
   * Check for performance issues
   */
  private async checkPerformanceIssues(): Promise<void> {
    try {
      const performanceIssues = await prisma.performanceIssue.findMany({
        where: {
          resolved: false,
          severity: { in: ['high', 'critical'] }
        },
        take: 5
      });

      if (performanceIssues.length > 0) {
        console.log(`[AutonomousLoop] ⚠️  ${performanceIssues.length} performance issues detected`);

        // Could attempt to fix performance issues here
        // For now, just log them
        for (const issue of performanceIssues) {
          console.log(`[AutonomousLoop] - ${issue.issueType}: ${issue.affectedEndpoint}`);
        }
      }
    } catch (error) {
      console.error('[AutonomousLoop] Error checking performance:', error);
    }
  }

  /**
   * Learn from recent fixes (did they work?)
   */
  private async learnFromRecentFixes(): Promise<void> {
    try {
      const recentFixes = await prisma.selfHealingAction.findMany({
        where: {
          status: { in: ['applied', 'rejected'] },
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      for (const fix of recentFixes) {
        const outcome = fix.status === 'applied' ? 'success' : 'failure';
        
        // Record learning
        await prisma.learningInsight.create({
          data: {
            userId: 'system',
            category: 'problem_solving',
            insight: `${fix.issue} -> ${fix.solution} -> ${outcome}`,
            confidence: outcome === 'success' ? 0.9 : 0.3,
            source: 'autonomous_fix',
            learnedAt: new Date()
          }
        });

        console.log(`[AutonomousLoop] 📚 Learned: ${fix.issue} = ${outcome}`);
      }
    } catch (error) {
      console.error('[AutonomousLoop] Error learning from fixes:', error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    config: LoopConfig;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config
    };
  }
}

// Singleton instance
export const autonomousLoop = new AutonomousDecisionLoop();

// Auto-start if in production (REMOVE THIS IF YOU WANT MANUAL CONTROL)
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTONOMOUS_LOOP === 'true') {
  console.log('[AutonomousLoop] Auto-starting in production mode...');
  autonomousLoop.start();
}
