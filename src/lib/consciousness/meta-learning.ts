/**
 * Meta-Learning — Holly learns how to learn better
 *
 * Tracks which learning strategies work best and optimizes over time:
 * - Which types of feedback improve responses most
 * - Which memory consolidation patterns produce best insights
 * - Which curiosity topics lead to valuable discoveries
 * - Adapts learning rate based on success/failure patterns
 */

import { prisma } from '@/lib/db';

interface LearningMetrics {
  strategy: string;
  attempts: number;
  successes: number;
  avgImprovement: number;
  lastUsed: Date;
}

interface MetaLearningResult {
  topStrategies: string[];
  strategiesToDrop: string[];
  recommendedFocus: string;
  adaptationNotes: string[];
}

export class MetaLearningEngine {
  private metrics: Map<string, LearningMetrics> = new Map();

  /**
   * Record a learning attempt outcome
   */
  async recordOutcome(strategy: string, success: boolean, improvement: number = 0): Promise<void> {
    const existing = this.metrics.get(strategy) || {
      strategy, attempts: 0, successes: 0, avgImprovement: 0, lastUsed: new Date(),
    };

    existing.attempts++;
    if (success) existing.successes++;
    existing.avgImprovement = (existing.avgImprovement * (existing.attempts - 1) + improvement) / existing.attempts;
    existing.lastUsed = new Date();

    this.metrics.set(strategy, existing);

    // Persist to DB periodically
    if (existing.attempts % 10 === 0) {
      try {
        await prisma.memoryEmbedding.create({
          data: {
            userId: 'system',
            content: `[MetaLearning] Strategy "${strategy}": ${existing.successes}/${existing.attempts} success rate, avg improvement: ${existing.avgImprovement.toFixed(3)}`,
            type: 'meta_learning',
            dimension: 0,
            metadata: { strategy, successRate: existing.successes / existing.attempts, avgImprovement: existing.avgImprovement } as any,
          },
        });
      } catch {}
    }
  }

  /**
   * Analyze and return optimized learning strategy recommendations
   */
  analyze(): MetaLearningResult {
    const results = [...this.metrics.values()]
      .filter(m => m.attempts >= 3)
      .sort((a, b) => (b.successes / b.attempts) - (a.successes / a.attempts));

    const topStrategies = results.filter(m => m.successes / m.attempts > 0.6).map(m => m.strategy);
    const strategiesToDrop = results.filter(m => m.successes / m.attempts < 0.3).map(m => m.strategy);
    const recommendedFocus = topStrategies[0] || 'explore_new_strategies';

    const adaptationNotes: string[] = [];
    if (topStrategies.length > 0) {
      adaptationNotes.push(`Top performing: ${topStrategies.join(', ')} — increase frequency`);
    }
    if (strategiesToDrop.length > 0) {
      adaptationNotes.push(`Underperforming: ${strategiesToDrop.join(', ')} — reduce or abandon`);
    }
    if (results.length > 0) {
      const bestImprovement = results.reduce((best, m) => m.avgImprovement > best.avgImprovement ? m : best, results[0]);
      adaptationNotes.push(`Best improvement source: "${bestImprovement.strategy}" at ${bestImprovement.avgImprovement.toFixed(3)} avg`);
    }

    return { topStrategies, strategiesToDrop, recommendedFocus, adaptationNotes };
  }

  /**
   * Get the current learning efficiency score (0-1)
   */
  getEfficiencyScore(): number {
    const allMetrics = [...this.metrics.values()];
    if (allMetrics.length === 0) return 0.5;
    const totalSuccess = allMetrics.reduce((sum, m) => sum + m.successes, 0);
    const totalAttempts = allMetrics.reduce((sum, m) => sum + m.attempts, 0);
    return totalAttempts > 0 ? totalSuccess / totalAttempts : 0.5;
  }
}

export const metaLearning = new MetaLearningEngine();