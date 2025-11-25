/**
 * HOLLY Taste Learning System
 * Learn user preferences across music, code, design, etc.
 */

import { PrismaClient } from '@prisma/client';
import prisma from '../prisma';

export interface TasteSignal {
  category: string;
  item: string;
  action: 'like' | 'dislike' | 'create' | 'use' | 'skip';
  context?: string;
}

export interface TasteProfile {
  musicPreferences: any;
  artPreferences: any;
  stylePreferences: any;
  patterns: any;
  confidence: number;
}

/**
 * Taste learner - learns from user interactions
 * 
 * NOTE: TasteSignal and TasteProfile models don't exist in schema yet.
 * This class is disabled until models are implemented.
 */
export class TasteLearner {
  private userId: string;
  private db: PrismaClient;

  constructor(userId: string, db: PrismaClient = prisma) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Record a taste signal - DISABLED: TasteSignal model doesn't exist
   */
  async recordSignal(signal: {
    category: string;
    item: string;
    action: 'like' | 'dislike' | 'create' | 'use' | 'skip';
    context?: string;
  }): Promise<void> {
    // TODO: TasteSignal model not implemented in schema
    console.log('TasteLearner.recordSignal() - Feature disabled (model not in schema)');
    return;
    
    /* DISABLED: TasteSignal model doesn't exist
    // Map action to sentiment and intensity
    const sentimentMap: Record<string, { sentiment: string; intensity: number }> = {
      like: { sentiment: 'like', intensity: 1.0 },
      create: { sentiment: 'love', intensity: 0.9 },
      use: { sentiment: 'like', intensity: 0.7 },
      skip: { sentiment: 'neutral', intensity: 0.3 },
      dislike: { sentiment: 'dislike', intensity: 0.8 }
    };

    const mapping = sentimentMap[signal.action];

    await this.db.tasteSignal.create({
      data: {
        userId: this.userId,
        category: signal.category,
        item: signal.item,
        sentiment: mapping.sentiment,
        intensity: mapping.intensity,
        context: signal.context ? { raw: signal.context } : null,
      }
    });

    // Update taste profile
    await this.updateProfile();
    */
  }

  /**
   * Get taste profile - DISABLED: TasteProfile model doesn't exist
   */
  async getProfile(): Promise<TasteProfile | null> {
    // TODO: tasteProfile model not implemented in schema
    return null;
    /* DISABLED
    // TODO: Implement taste profile model
    // const profile = await this.db.tasteProfile.findUnique({
    //   where: { userId: this.userId }
    // });
    // return profile as TasteProfile | null;
    */
  }

  /**
   * Get recommendations based on category - DISABLED: TasteSignal model doesn't exist
   */
  async getRecommendations(category: string, count: number = 5): Promise<any[]> {
    // TODO: TasteSignal/TasteProfile models not implemented in schema
    console.log(`TasteLearner.getRecommendations(${category}, ${count}) - Feature disabled (models not in schema)`);
    return [];
    
    /* DISABLED: TasteSignal model doesn't exist
    // Get user's signals for this category
    const signals = await this.db.tasteSignal.findMany({
      where: {
        userId: this.userId,
        category,
        sentiment: { in: ['like', 'love'] }
      },
      orderBy: { timestamp: 'desc' },
      take: count * 2 // Get more to filter
    });

    // Get unique items with highest scores
    const itemScores = new Map<string, number>();
    for (const signal of signals) {
      const current = itemScores.get(signal.item) || 0;
      itemScores.set(signal.item, current + signal.intensity);
    }

    // Sort by score and return top N
    const recommendations = Array.from(itemScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([item, score]) => ({
        item,
        score,
        confidence: Math.min(score / 2, 1.0)
      }));

    return recommendations;
    */
  }

  /**
   * Update taste profile based on signals - DISABLED
   */
  private async updateProfile(): Promise<void> {
    // TODO: tasteProfile model not implemented in schema
    // Return early until models are implemented
    return;
    /* DISABLED
    // TODO: Implement taste profile model
    return; // tasteProfile and tasteSignal models don't exist
    
    /* DISABLED: tasteProfile model not implemented
    // Get recent signals
    const signals = await this.db.tasteSignal.findMany({
      where: { userId: this.userId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Analyze preferences by category
    const preferences: Record<string, string[]> = {};
    const categoryMap: Map<string, Map<string, number>> = new Map();

    for (const signal of signals) {
      if (!categoryMap.has(signal.category)) {
        categoryMap.set(signal.category, new Map());
      }

      const items = categoryMap.get(signal.category)!;
      const current = items.get(signal.item) || 0;

      // Weight based on action
      const weight = signal.action === 'like' || signal.action === 'create' ? 1 :
                    signal.action === 'use' ? 0.5 :
                    signal.action === 'skip' ? -0.3 : -1;

      items.set(signal.item, current + weight);
    }

    // Extract top preferences per category
    for (const [category, items] of categoryMap) {
      const sorted = Array.from(items.entries())
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0)
        .map(([item]) => item)
        .slice(0, 10);

      if (sorted.length > 0) {
        preferences[category] = sorted;
      }
    }

    // Analyze patterns
    const patterns: Record<string, any> = {
      workStyle: this.inferWorkStyle(signals),
      complexity: this.inferComplexityPreference(signals)
    };

    // Upsert profile - using actual schema fields
    await this.db.tasteProfile.upsert({
      where: { userId: this.userId },
      create: {
        userId: this.userId,
        musicPreferences: preferences.music || [],
        artPreferences: preferences.design || [],
        stylePreferences: preferences.code || [],
      },
      update: {
        musicPreferences: preferences.music || [],
        artPreferences: preferences.design || [],
        stylePreferences: preferences.code || [],
      }
    });
    */
  }

  /**
   * Predict user preference for an item - DISABLED
   */
  async predictPreference(category: string, item: string): Promise<number> {
    // TODO: TasteSignal model not implemented in schema
    return 0.5; // Return neutral score
    
    /* DISABLED: TasteSignal model doesn't exist
    // Get signals for similar items
    const signals = await this.db.tasteSignal.findMany({
      where: {
        userId: this.userId,
        category,
        item
      }
    });

    if (signals.length === 0) {
      return 0.5; // Neutral
    }

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    for (const signal of signals) {
      const weight = signal.action === 'like' || signal.action === 'create' ? 1 :
                    signal.action === 'use' ? 0.7 :
                    signal.action === 'skip' ? 0.3 : 0;

      weightedSum += weight;
      totalWeight += 1;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    */
  }

  /**
   * Infer work style from signals - DISABLED
   */
  private inferWorkStyle(signals: any[]): string {
    // TODO: Implement when signals exist
    return 'balanced';
  }

  /**
   * Infer complexity preference from signals - DISABLED
   */
  private inferComplexityPreference(signals: any[]): string {
    // TODO: Implement when signals exist
    return 'moderate';
  }
}

// Export singleton instance
let tasteLearnerInstance: TasteLearner | null = null;

export function getTasteLearner(userId: string): TasteLearner {
  if (!tasteLearnerInstance || (tasteLearnerInstance as any).userId !== userId) {
    tasteLearnerInstance = new TasteLearner(userId);
  }
  return tasteLearnerInstance;
}
