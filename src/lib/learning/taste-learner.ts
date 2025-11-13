/**
 * Taste Learning System  
 * Learns user's creative preferences and personalizes recommendations
 * Rebuilt for Prisma + Clerk
 */

import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export interface TasteSignal {
  id: string;
  userId: string;
  category: string;
  item: string;
  action: 'like' | 'dislike' | 'create' | 'use' | 'skip';
  strength: number;
  context?: string;
  timestamp: Date;
}

export interface TasteProfile {
  userId: string;
  preferences: {
    music?: string[];
    design?: string[];
    code?: string[];
    general?: string[];
  };
  patterns: {
    timeOfDay?: Record<string, number>;
    workStyle?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
  };
  lastUpdated: Date;
}

export class TasteLearner {
  private userId: string;
  private db: PrismaClient;

  constructor(userId: string, db: PrismaClient = prisma) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Record a taste signal
   */
  async recordSignal(signal: {
    category: string;
    item: string;
    action: 'like' | 'dislike' | 'create' | 'use' | 'skip';
    context?: string;
  }): Promise<void> {
    // Determine strength based on action
    const strengthMap = {
      like: 1.0,
      create: 0.9,
      use: 0.7,
      skip: -0.3,
      dislike: -1.0
    };

    await this.db.tasteSignal.create({
      data: {
        userId: this.userId,
        category: signal.category,
        item: signal.item,
        action: signal.action,
        strength: strengthMap[signal.action],
        context: signal.context || null,
      }
    });

    // Update taste profile
    await this.updateProfile();
  }

  /**
   * Get taste profile
   */
  async getProfile(): Promise<TasteProfile | null> {
    const profile = await this.db.tasteProfile.findUnique({
      where: { userId: this.userId }
    });

    if (!profile) return null;

    return {
      userId: profile.userId,
      preferences: profile.preferences as any,
      patterns: profile.patterns as any,
      lastUpdated: profile.updatedAt
    };
  }

  /**
   * Update taste profile based on signals
   */
  private async updateProfile(): Promise<void> {
    // Get recent signals
    const signals = await this.db.tasteSignal.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Analyze preferences by category
    const preferences: Record<string, string[]> = {};
    const categoryMap: Map<string, Map<string, number>> = new Map();

    for (const signal of signals) {
      if (!categoryMap.has(signal.category)) {
        categoryMap.set(signal.category, new Map());
      }
      const itemMap = categoryMap.get(signal.category)!;
      const currentScore = itemMap.get(signal.item) || 0;
      itemMap.set(signal.item, currentScore + signal.strength);
    }

    // Extract top preferences per category
    for (const [category, itemMap] of categoryMap.entries()) {
      const sortedItems = Array.from(itemMap.entries())
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([item, _]) => item);
      
      preferences[category] = sortedItems;
    }

    // Analyze patterns
    const patterns: Record<string, any> = {
      workStyle: this.inferWorkStyle(signals),
      complexity: this.inferComplexityPreference(signals)
    };

    // Upsert profile
    await this.db.tasteProfile.upsert({
      where: { userId: this.userId },
      create: {
        userId: this.userId,
        preferences,
        patterns,
      },
      update: {
        preferences,
        patterns,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(category: string, count: number = 5): Promise<string[]> {
    const profile = await this.getProfile();
    if (!profile || !profile.preferences[category]) {
      return [];
    }

    return profile.preferences[category].slice(0, count);
  }

  /**
   * Predict user preference for an item
   */
  async predictPreference(category: string, item: string): Promise<number> {
    // Get signals for similar items
    const signals = await this.db.tasteSignal.findMany({
      where: {
        userId: this.userId,
        category,
        item
      }
    });

    if (signals.length === 0) return 0.5; // Neutral

    const totalStrength = signals.reduce((sum, s) => sum + s.strength, 0);
    const avgStrength = totalStrength / signals.length;

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, (avgStrength + 1) / 2));
  }

  /**
   * Infer work style from signals
   */
  private inferWorkStyle(signals: TasteSignal[]): string {
    const createCount = signals.filter(s => s.action === 'create').length;
    const useCount = signals.filter(s => s.action === 'use').length;

    if (createCount > useCount * 1.5) return 'creative';
    if (useCount > createCount * 1.5) return 'practical';
    return 'balanced';
  }

  /**
   * Infer complexity preference
   */
  private inferComplexityPreference(signals: TasteSignal[]): 'simple' | 'moderate' | 'complex' {
    // Simple heuristic based on item names (could be more sophisticated)
    const complexItems = signals.filter(s => 
      s.item.toLowerCase().includes('advanced') || 
      s.item.toLowerCase().includes('complex') ||
      s.item.toLowerCase().includes('pro')
    );

    const simpleItems = signals.filter(s =>
      s.item.toLowerCase().includes('simple') ||
      s.item.toLowerCase().includes('basic') ||
      s.item.toLowerCase().includes('easy')
    );

    if (complexItems.length > signals.length * 0.4) return 'complex';
    if (simpleItems.length > signals.length * 0.4) return 'simple';
    return 'moderate';
  }
}
