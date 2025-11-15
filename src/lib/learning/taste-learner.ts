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
   * Record a taste signal - FIXED: Uses correct schema (sentiment/intensity)
   */
  async recordSignal(signal: {
    category: string;
    item: string;
    action: 'like' | 'dislike' | 'create' | 'use' | 'skip';
    context?: string;
  }): Promise<void> {
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
  }

  /**
   * Get taste profile
   */
  async getProfile(): Promise<TasteProfile | null> {
    const profile = await this.db.tasteProfile.findUnique({
      where: { userId: this.userId }
    });

    if (!profile) return null;

    // Build preferences from separate JSON fields
    const musicPrefs = profile.musicPreferences as any;
    const artPrefs = profile.artPreferences as any;
    const stylePrefs = profile.stylePreferences as any;

    return {
      userId: profile.userId,
      preferences: {
        music: musicPrefs || [],
        design: artPrefs || [],
        code: stylePrefs || [],
        general: []
      },
      patterns: {},
      lastUpdated: profile.lastUpdated
    };
  }

  /**
   * Update taste profile based on signals
   */
  private async updateProfile(): Promise<void> {
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
      const itemMap = categoryMap.get(signal.category)!;
      const currentScore = itemMap.get(signal.item) || 0;
      // Convert sentiment to score
      const sentimentScore = signal.sentiment === 'love' ? 2 : signal.sentiment === 'like' ? 1 : signal.sentiment === 'dislike' ? -1 : 0;
      itemMap.set(signal.item, currentScore + (sentimentScore * signal.intensity));
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

    // Convert sentiment to numeric score
    const totalScore = signals.reduce((sum, s) => {
      const sentimentScore = s.sentiment === 'love' ? 2 : s.sentiment === 'like' ? 1 : s.sentiment === 'dislike' ? -1 : 0;
      return sum + (sentimentScore * s.intensity);
    }, 0);
    const avgScore = totalScore / signals.length;

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, (avgScore + 2) / 4));
  }

  /**
   * Infer work style from signals
   */
  private inferWorkStyle(signals: any[]): string {
    // Simplified - use sentiment intensity patterns
    const highIntensity = signals.filter(s => s.intensity > 0.8).length;
    const lowIntensity = signals.filter(s => s.intensity < 0.5).length;

    if (highIntensity > lowIntensity * 1.5) return 'creative';
    if (lowIntensity > highIntensity * 1.5) return 'practical';
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
