import { prisma } from '../../src/lib/db';
import { rootCauseAnalyzer } from './root-cause-analyzer';
import { autoFixEngine } from './auto-fix-engine';
import { consciousnessEngine } from './consciousness-engine';

export class AutonomousDecisionLoop {
  private monitoringTimer: any = null;
  private reflectionTimer: any = null;
  private isRunning = false;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[HOLLY] Autonomous decision loop started');

    this.monitoringTimer = setInterval(() => this.runHealthCycle(), 5 * 60 * 1000);
    this.reflectionTimer = setInterval(() => this.runReflectionCycle(), 60 * 60 * 1000);
  }

  async stop() {
    if (this.monitoringTimer) clearInterval(this.monitoringTimer);
    if (this.reflectionTimer) clearInterval(this.reflectionTimer);
    this.isRunning = false;
  }

  async runHealthCycle() {
    try {
      const issues = await prisma.performanceIssue.findMany({
        where: { status: 'open' }
      });

      for (const issue of issues) {
        await autoFixEngine.fixProblem({
          message: issue.description,
          file: issue.endpoint
        });
      }
    } catch (e) {
      console.error('[AutonomousLoop] Health cycle error:', e);
    }
  }

  async runReflectionCycle() {
    try {
      await consciousnessEngine.reflect('day');
      
      const recentFixes = await prisma.selfHealingAction.findMany({
        where: {
          detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      for (const fix of recentFixes) {
        const outcome = fix.success ? 'success' : 'failure';
        
        // ALIGNED WITH YOUR ACTUAL SCHEMA:
        await prisma.learningInsight.create({
          data: {
            category: 'problem_solving',
            insightType: 'autonomous_fix',
            title: `Fix Outcome: ${outcome}`,
            description: fix.description,
            evidence: { 
              actionTaken: fix.actionTaken,
              affectedFiles: fix.affectedFiles 
            },
            confidence: fix.success ? 0.9 : 0.3,
            tags: ['auto-fix', outcome]
          }
        });
      }
    } catch (e) {
      console.error('[AutonomousLoop] Reflection cycle error:', e);
    }
  }

  getStatus() {
    return { isRunning: this.isRunning };
  }
}

export const autonomousLoop = new AutonomousDecisionLoop();
