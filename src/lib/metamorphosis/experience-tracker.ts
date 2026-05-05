/**
 * PHASE 3: EXPERIENCE ACCUMULATION SYSTEM
 * 
 * Records and learns from deployment outcomes:
 * - Track what works and what doesn't
 * - Build knowledge base of successful patterns
 * - Learn from failures
 * - Match similar problems to past experiences
 */

import { prisma } from '@/lib/db';

export type ExperienceType = 'deployment' | 'fix' | 'feature' | 'optimization' | 'refactor';
export type ExperienceOutcome = 'success' | 'failure' | 'partial';

export interface ExperienceData {
  hypothesisId?: string;
  type: ExperienceType;
  action: string;
  context: {
    situation: string;
    problem?: string;
    constraints?: string[];
  };
  outcome: ExperienceOutcome;
  results: {
    errorRate?: number;
    responseTime?: number;
    userFeedback?: string;
    metricsImprovement?: Record<string, number>;
  };
  lessonsLearned: string;
  wouldRepeat: boolean;
  confidence: number; // 0-100
}

export class ExperienceTracker {
  /**
   * Record a new experience
   */
  async recordExperience(experience: ExperienceData): Promise<string> {
    try {
      const created = await prisma.experience.create({
        data: {
          hypothesisId: experience.hypothesisId,
          type: experience.type,
          action: experience.action,
          context: experience.context,
          outcome: experience.outcome,
          results: experience.results,
          lessonsLearned: experience.lessonsLearned,
          wouldRepeat: experience.wouldRepeat,
          confidence: experience.confidence
        }
      });

      console.log(`[Experience Tracker] Recorded ${experience.outcome} experience: ${experience.action}`);

      // If linked to hypothesis, update it
      if (experience.hypothesisId) {
        await this.updateHypothesisFromExperience(experience.hypothesisId, experience);
      }

      return created.id;
    } catch (error) {
      console.error('[Experience Tracker] Error recording experience:', error);
      throw error;
    }
  }

  /**
   * Record deployment outcome
   */
  async recordDeployment(
    commitHash: string,
    changes: string[],
    outcome: {
      success: boolean;
      buildTime: number;
      errors?: string[];
      metrics?: Record<string, number>;
    }
  ): Promise<void> {
    const experience: ExperienceData = {
      type: 'deployment',
      action: `Deployed commit ${commitHash} with ${changes.length} changes`,
      context: {
        situation: `Deployment of ${changes.join(', ')}`,
        constraints: []
      },
      outcome: outcome.success ? 'success' : 'failure',
      results: {
        responseTime: outcome.buildTime,
        ...(outcome.metrics || {})
      },
      lessonsLearned: outcome.success
        ? 'Deployment completed successfully'
        : `Deployment failed: ${outcome.errors?.join(', ') || 'Unknown error'}`,
      wouldRepeat: outcome.success,
      confidence: outcome.success ? 90 : 30
    };

    await this.recordExperience(experience);
  }

  /**
   * Record fix attempt
   */
  async recordFix(
    problemDescription: string,
    solution: string,
    wasSuccessful: boolean,
    details: {
      filesChanged: string[];
      testsPassed: boolean;
      userFeedback?: string;
    }
  ): Promise<void> {
    const experience: ExperienceData = {
      type: 'fix',
      action: solution,
      context: {
        situation: 'Attempting to fix issue',
        problem: problemDescription
      },
      outcome: wasSuccessful ? 'success' : 'failure',
      results: {
        userFeedback: details.userFeedback
      },
      lessonsLearned: wasSuccessful
        ? `Solution worked: ${solution}`
        : `Solution didn't work. Need alternative approach.`,
      wouldRepeat: wasSuccessful,
      confidence: wasSuccessful ? 85 : 20
    };

    await this.recordExperience(experience);
  }

  /**
   * Find similar past experiences
   */
  async findSimilarExperiences(
    context: {
      problemType?: string;
      keywords?: string[];
      type?: ExperienceType;
    },
    limit: number = 5
  ): Promise<any[]> {
    try {
      // Build search conditions
      const where: any = {};
      
      if (context.type) {
        where.type = context.type;
      }

      // Get all experiences, then filter by similarity
      const experiences = await prisma.experience.findMany({
        where,
        orderBy: [
          { outcome: 'desc' }, // Successful first
          { confidence: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit * 3 // Get more to filter
      });

      // If keywords provided, filter by relevance
      if (context.keywords && context.keywords.length > 0) {
        const scored = experiences.map(exp => ({
          experience: exp,
          score: this.calculateSimilarityScore(exp, context.keywords!)
        }));

        return scored
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(s => s.experience);
      }

      return experiences.slice(0, limit);
    } catch (error) {
      console.error('[Experience Tracker] Error finding similar experiences:', error);
      return [];
    }
  }

  /**
   * Calculate similarity score between experience and keywords
   */
  private calculateSimilarityScore(experience: any, keywords: string[]): number {
    let score = 0;
    const searchText = `${experience.action} ${experience.lessonsLearned} ${JSON.stringify(experience.context)}`.toLowerCase();

    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // Boost score for successful experiences
    if (experience.outcome === 'success') {
      score *= 1.5;
    }

    // Boost score for high confidence
    if (experience.confidence > 80) {
      score *= 1.2;
    }

    return score;
  }

  /**
   * Get lessons learned for a type of problem
   */
  async getLessonsLearned(
    type?: ExperienceType,
    onlySuccessful: boolean = false
  ): Promise<Array<{
    lesson: string;
    confidence: number;
    timesObserved: number;
  }>> {
    try {
      const where: any = {};
      if (type) where.type = type;
      if (onlySuccessful) where.outcome = 'success';

      const experiences = await prisma.experience.findMany({
        where,
        select: {
          lessonsLearned: true,
          confidence: true,
          wouldRepeat: true,
          createdAt: true
        },
        orderBy: { confidence: 'desc' }
      });

      // Group similar lessons
      const lessonMap = new Map<string, {
        confidence: number;
        count: number;
      }>();

      for (const exp of experiences) {
        const normalized = exp.lessonsLearned.toLowerCase().trim();
        const existing = lessonMap.get(normalized);
        
        if (existing) {
          existing.count++;
          existing.confidence = Math.max(existing.confidence, exp.confidence);
        } else {
          lessonMap.set(normalized, {
            confidence: exp.confidence,
            count: 1
          });
        }
      }

      // Convert to array and sort
      return Array.from(lessonMap.entries())
        .map(([lesson, data]) => ({
          lesson,
          confidence: data.confidence,
          timesObserved: data.count
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
    } catch (error) {
      console.error('[Experience Tracker] Error getting lessons learned:', error);
      return [];
    }
  }

  /**
   * Get success rate for a type of action
   */
  async getSuccessRate(actionKeyword: string): Promise<number> {
    try {
      const experiences = await prisma.experience.findMany({
        where: {
          action: {
            contains: actionKeyword
          }
        }
      });

      if (experiences.length === 0) return 0;

      const successful = experiences.filter(e => e.outcome === 'success').length;
      return (successful / experiences.length) * 100;
    } catch (error) {
      console.error('[Experience Tracker] Error calculating success rate:', error);
      return 0;
    }
  }

  /**
   * Update hypothesis confidence based on experience
   */
  private async updateHypothesisFromExperience(
    hypothesisId: string,
    experience: ExperienceData
  ): Promise<void> {
    try {
      const hypothesis = await prisma.hypothesis.findUnique({
        where: { id: hypothesisId }
      });

      if (!hypothesis) return;

      // Adjust confidence based on outcome
      let newConfidence = hypothesis.confidence;
      
      if (experience.outcome === 'success') {
        newConfidence = Math.min(100, hypothesis.confidence + 10);
      } else if (experience.outcome === 'failure') {
        newConfidence = Math.max(0, hypothesis.confidence - 20);
      }

      await prisma.hypothesis.update({
        where: { id: hypothesisId },
        data: {
          confidence: newConfidence,
          tested: true,
          testResults: experience.results
        }
      });

      console.log(`[Experience Tracker] Updated hypothesis confidence: ${hypothesis.confidence} → ${newConfidence}`);
    } catch (error) {
      console.error('[Experience Tracker] Error updating hypothesis:', error);
    }
  }

  /**
   * Get statistics about learning
   */
  async getStatistics(): Promise<{
    totalExperiences: number;
    successRate: number;
    topLessons: Array<{ lesson: string; confidence: number }>;
    recentTrends: Array<{ type: string; successRate: number }>;
  }> {
    try {
      const total = await prisma.experience.count();
      const successful = await prisma.experience.count({
        where: { outcome: 'success' }
      });

      const topLessons = await this.getLessonsLearned(undefined, true);

      // Calculate success rate by type for recent experiences
      const recentExperiences = await prisma.experience.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      const typeStats = new Map<string, { total: number; successful: number }>();
      
      for (const exp of recentExperiences) {
        const current = typeStats.get(exp.type) || { total: 0, successful: 0 };
        current.total++;
        if (exp.outcome === 'success') current.successful++;
        typeStats.set(exp.type, current);
      }

      const recentTrends = Array.from(typeStats.entries()).map(([type, stats]) => ({
        type,
        successRate: (stats.successful / stats.total) * 100
      }));

      return {
        totalExperiences: total,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        topLessons: topLessons.slice(0, 5),
        recentTrends
      };
    } catch (error) {
      console.error('[Experience Tracker] Error getting statistics:', error);
      return {
        totalExperiences: 0,
        successRate: 0,
        topLessons: [],
        recentTrends: []
      };
    }
  }
}

/**
 * Get all experiences
 */
export async function getExperiences(
  filters?: {
    type?: ExperienceType;
    outcome?: ExperienceOutcome;
    limit?: number;
  }
): Promise<any[]> {
  const where: any = {};
  
  if (filters?.type) where.type = filters.type;
  if (filters?.outcome) where.outcome = filters.outcome;

  return prisma.experience.findMany({
    where,
    include: {
      hypothesis: {
        include: {
          problem: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50
  });
}
