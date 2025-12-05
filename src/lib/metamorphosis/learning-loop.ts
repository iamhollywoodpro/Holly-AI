/**
 * PHASE 3: CONTINUOUS LEARNING LOOP
 * 
 * Orchestrates the self-improvement cycle:
 * 1. Monitor system health
 * 2. Detect problems
 * 3. Generate hypotheses
 * 4. Present top solutions to user
 * 5. Learn from outcomes
 * 6. Repeat
 */

import { ProblemDetector } from './problem-detector';
import { HypothesisGenerator } from './hypothesis-generator';
import { ExperienceTracker, ExperienceData } from './experience-tracker';
import { prisma } from '@/lib/db';

export interface LearningCycleResult {
  problemsDetected: number;
  hypothesesGenerated: number;
  topRecommendations: Array<{
    problemId: string;
    problemTitle: string;
    severity: string;
    bestHypothesis: {
      id: string;
      solution: string;
      confidence: number;
    };
  }>;
  insights: string[];
}

export class LearningLoop {
  private problemDetector: ProblemDetector;
  private hypothesisGenerator: HypothesisGenerator;
  private experienceTracker: ExperienceTracker;

  constructor() {
    this.problemDetector = new ProblemDetector();
    this.hypothesisGenerator = new HypothesisGenerator();
    this.experienceTracker = new ExperienceTracker();
  }

  /**
   * Run a complete learning cycle
   */
  async runCycle(): Promise<LearningCycleResult> {
    console.log('[Learning Loop] 🔄 Starting learning cycle...');

    try {
      // STEP 1: Detect Problems
      console.log('[Learning Loop] 🔍 Step 1: Detecting problems...');
      await this.problemDetector.detectAndRecordProblems();

      // Get all unresolved problems
      const problems = await prisma.detectedProblem.findMany({
        where: {
          status: { in: ['detected', 'analyzing'] }
        },
        orderBy: [
          { severity: 'desc' },
          { detectedAt: 'desc' }
        ]
      });

      console.log(`[Learning Loop] Found ${problems.length} active problems`);

      // STEP 2: Generate Hypotheses for New Problems
      console.log('[Learning Loop] 💡 Step 2: Generating hypotheses...');
      let totalHypotheses = 0;

      for (const problem of problems) {
        // Check if hypotheses already exist
        const existingHypotheses = await prisma.hypothesis.count({
          where: { problemId: problem.id }
        });

        if (existingHypotheses === 0) {
          const hypotheses = await this.hypothesisGenerator.generateHypotheses(problem.id);
          totalHypotheses += hypotheses.length;
        } else {
          totalHypotheses += existingHypotheses;
        }
      }

      console.log(`[Learning Loop] Generated/found ${totalHypotheses} hypotheses`);

      // STEP 3: Rank Problems and Solutions
      console.log('[Learning Loop] 📊 Step 3: Ranking recommendations...');
      const recommendations = await this.generateRecommendations();

      // STEP 4: Generate Insights
      console.log('[Learning Loop] 💭 Step 4: Generating insights...');
      const insights = await this.generateInsights();

      console.log('[Learning Loop] ✅ Learning cycle complete');

      return {
        problemsDetected: problems.length,
        hypothesesGenerated: totalHypotheses,
        topRecommendations: recommendations,
        insights
      };
    } catch (error) {
      console.error('[Learning Loop] Error running cycle:', error);
      return {
        problemsDetected: 0,
        hypothesesGenerated: 0,
        topRecommendations: [],
        insights: ['Learning cycle encountered an error']
      };
    }
  }

  /**
   * Generate ranked recommendations
   */
  private async generateRecommendations(): Promise<Array<{
    problemId: string;
    problemTitle: string;
    severity: string;
    bestHypothesis: {
      id: string;
      solution: string;
      confidence: number;
    };
  }>> {
    try {
      // Get problems with their top hypothesis
      const problems = await prisma.detectedProblem.findMany({
        where: {
          status: { in: ['detected', 'analyzing'] }
        },
        include: {
          hypotheses: {
            orderBy: { confidence: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { severity: 'desc' },
          { detectedAt: 'desc' }
        ],
        take: 5 // Top 5 problems
      });

      return problems
        .filter(p => p.hypotheses.length > 0)
        .map(problem => ({
          problemId: problem.id,
          problemTitle: problem.title,
          severity: problem.severity,
          bestHypothesis: {
            id: problem.hypotheses[0].id,
            solution: problem.hypotheses[0].proposedSolution,
            confidence: problem.hypotheses[0].confidence
          }
        }));
    } catch (error) {
      console.error('[Learning Loop] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Generate insights from learning data
   */
  private async generateInsights(): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Get learning statistics
      const stats = await this.experienceTracker.getStatistics();

      if (stats.totalExperiences > 0) {
        insights.push(`I've accumulated ${stats.totalExperiences} learning experiences with a ${stats.successRate.toFixed(1)}% success rate.`);
      }

      if (stats.topLessons.length > 0) {
        insights.push(`Top lesson learned: "${stats.topLessons[0].lesson}" (confidence: ${stats.topLessons[0].confidence})`);
      }

      // Get problem trends
      const criticalProblems = await prisma.detectedProblem.count({
        where: {
          severity: 'critical',
          status: { in: ['detected', 'analyzing'] }
        }
      });

      if (criticalProblems > 0) {
        insights.push(`⚠️  ${criticalProblems} critical issues require immediate attention.`);
      }

      // Get recent success trends
      if (stats.recentTrends.length > 0) {
        const bestTrend = stats.recentTrends.reduce((best, current) => 
          current.successRate > best.successRate ? current : best
        );
        insights.push(`Recent ${bestTrend.type} changes have ${bestTrend.successRate.toFixed(1)}% success rate.`);
      }

      // Check for patterns in failures
      const recentFailures = await prisma.experience.count({
        where: {
          outcome: 'failure',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      if (recentFailures > 3) {
        insights.push(`🔍 ${recentFailures} failures in the last week - may need to adjust approach.`);
      }

      if (insights.length === 0) {
        insights.push('System is stable. Continuing to monitor for improvements.');
      }
    } catch (error) {
      console.error('[Learning Loop] Error generating insights:', error);
      insights.push('Unable to generate insights at this time.');
    }

    return insights;
  }

  /**
   * Record outcome of implementing a hypothesis
   */
  async recordHypothesisOutcome(
    hypothesisId: string,
    wasSuccessful: boolean,
    details: {
      metrics?: Record<string, number>;
      userFeedback?: string;
      observations?: string;
    }
  ): Promise<void> {
    try {
      // Get hypothesis and problem details
      const hypothesis = await prisma.hypothesis.findUnique({
        where: { id: hypothesisId },
        include: { problem: true }
      });

      if (!hypothesis) {
        console.error('[Learning Loop] Hypothesis not found');
        return;
      }

      // Record experience
      const experience: ExperienceData = {
        hypothesisId: hypothesisId,
        type: 'fix',
        action: hypothesis.proposedSolution,
        context: {
          situation: hypothesis.problem.description,
          problem: hypothesis.problem.title,
          constraints: Array.isArray(hypothesis.risks) ? hypothesis.risks : []
        },
        outcome: wasSuccessful ? 'success' : 'failure',
        results: {
          ...(details.metrics || {}),
          userFeedback: details.userFeedback
        },
        lessonsLearned: details.observations || (wasSuccessful 
          ? `Successfully resolved: ${hypothesis.problem.title}`
          : `Attempted solution didn't work: ${hypothesis.proposedSolution}`
        ),
        wouldRepeat: wasSuccessful,
        confidence: wasSuccessful ? hypothesis.confidence + 10 : hypothesis.confidence - 20
      };

      await this.experienceTracker.recordExperience(experience);

      // If successful, mark problem as resolved
      if (wasSuccessful) {
        await prisma.detectedProblem.update({
          where: { id: hypothesis.problemId },
          data: {
            status: 'resolved',
            resolvedAt: new Date()
          }
        });

        console.log(`[Learning Loop] ✅ Problem resolved: ${hypothesis.problem.title}`);
      } else {
        console.log(`[Learning Loop] ❌ Solution failed, will try alternatives`);
      }
    } catch (error) {
      console.error('[Learning Loop] Error recording hypothesis outcome:', error);
    }
  }

  /**
   * Get learning progress summary
   */
  async getProgressSummary(): Promise<{
    activeProblems: number;
    solvedProblems: number;
    totalExperiences: number;
    successRate: number;
    recentInsights: string[];
  }> {
    try {
      const activeProblems = await prisma.detectedProblem.count({
        where: { status: { in: ['detected', 'analyzing'] } }
      });

      const solvedProblems = await prisma.detectedProblem.count({
        where: { status: 'resolved' }
      });

      const stats = await this.experienceTracker.getStatistics();
      const insights = await this.generateInsights();

      return {
        activeProblems,
        solvedProblems,
        totalExperiences: stats.totalExperiences,
        successRate: stats.successRate,
        recentInsights: insights
      };
    } catch (error) {
      console.error('[Learning Loop] Error getting progress summary:', error);
      return {
        activeProblems: 0,
        solvedProblems: 0,
        totalExperiences: 0,
        successRate: 0,
        recentInsights: []
      };
    }
  }

  /**
   * Suggest next actions based on current state
   */
  async suggestNextActions(): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Get critical problems
      const criticalProblems = await prisma.detectedProblem.findMany({
        where: {
          severity: 'critical',
          status: { in: ['detected', 'analyzing'] }
        },
        include: {
          hypotheses: {
            orderBy: { confidence: 'desc' },
            take: 1
          }
        }
      });

      for (const problem of criticalProblems) {
        if (problem.hypotheses.length > 0) {
          suggestions.push(`🚨 Critical: Implement solution for "${problem.title}" (${problem.hypotheses[0].confidence}% confidence)`);
        } else {
          suggestions.push(`🚨 Critical: Analyze "${problem.title}" - no solutions yet`);
        }
      }

      // Get high-confidence hypotheses for high-severity problems
      const readyToImplement = await prisma.hypothesis.findMany({
        where: {
          confidence: { gte: 80 },
          tested: false,
          problem: {
            severity: { in: ['high', 'critical'] },
            status: { in: ['detected', 'analyzing'] }
          }
        },
        include: { problem: true },
        take: 3
      });

      for (const hypothesis of readyToImplement) {
        suggestions.push(`✅ Ready to implement: "${hypothesis.proposedSolution.substring(0, 60)}..." (${hypothesis.confidence}% confidence)`);
      }

      // Check for stale problems
      const staleDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const staleProblems = await prisma.detectedProblem.count({
        where: {
          status: 'detected',
          detectedAt: { lt: staleDate }
        }
      });

      if (staleProblems > 0) {
        suggestions.push(`⏰ ${staleProblems} problems detected over a week ago need analysis`);
      }

      if (suggestions.length === 0) {
        suggestions.push('✨ System is healthy - continue monitoring');
      }
    } catch (error) {
      console.error('[Learning Loop] Error suggesting actions:', error);
      suggestions.push('Unable to generate suggestions at this time');
    }

    return suggestions;
  }
}

/**
 * Global learning loop instance
 */
export const learningLoop = new LearningLoop();
