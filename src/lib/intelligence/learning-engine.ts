/**
 * HOLLY LEARNING ENGINE
 * 
 * Core learning and adaptation system that allows HOLLY to:
 * 1. Learn from user interactions and feedback
 * 2. Adapt behaviors based on patterns
 * 3. Track learning progress
 * 4. Apply learned knowledge to new situations
 * 
 * Uses: LearningInsight (Prisma model)
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface LearningInput {
  category: string;
  type: string;
  description: string;
  context?: Record<string, any>;
  relatedFiles?: string[];
  relatedPatterns?: string[];
}

export interface LearningPattern {
  id: string;
  category: string;
  type: string;
  description: string;
  confidence: number;
  occurrences: number;
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdaptationResult {
  success: boolean;
  adapted: boolean;
  changes: string[];
  confidence: number;
  reasoning?: string;
}

export interface LearningProgress {
  totalInsights: number;
  categoryCounts: Record<string, number>;
  topPatterns: LearningPattern[];
  recentLearning: LearningPattern[];
  adaptationRate: number;
}

// ================== LEARNING ENGINE ==================

/**
 * Record new learning insight
 */
export async function recordLearning(input: LearningInput): Promise<{ 
  success: boolean; 
  id?: string; 
  error?: string 
}> {
  try {
    const insight = await prisma.learningInsight.create({
      data: {
        category: input.category,
        insightType: input.type,
        description: input.description,
        context: input.context || {},
        relatedFiles: input.relatedFiles || [],
        relatedPatterns: input.relatedPatterns || [],
        confidence: 1.0,
        appliedCount: 0,
      }
    });

    return { 
      success: true, 
      id: insight.id 
    };
  } catch (error) {
    console.error('Error recording learning:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Retrieve learned patterns by category/type
 */
export async function getLearnedPatterns(options?: {
  category?: string;
  type?: string;
  minConfidence?: number;
  limit?: number;
}): Promise<LearningPattern[]> {
  try {
    const where: any = {};
    
    if (options?.category) where.category = options.category;
    if (options?.type) where.insightType = options.type;
    if (options?.minConfidence) {
      where.confidence = { gte: options.minConfidence };
    }

    const insights = await prisma.learningInsight.findMany({
      where,
      orderBy: [
        { confidence: 'desc' },
        { appliedCount: 'desc' }
      ],
      take: options?.limit || 50
    });

    return insights.map(insight => ({
      id: insight.id,
      category: insight.category,
      type: insight.insightType,
      description: insight.description,
      confidence: insight.confidence,
      occurrences: insight.appliedCount,
      context: insight.context as Record<string, any>,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt
    }));
  } catch (error) {
    console.error('Error retrieving learned patterns:', error);
    return [];
  }
}

/**
 * Apply learned knowledge to current situation
 */
export async function applyLearning(options: {
  category: string;
  context: Record<string, any>;
  similarityThreshold?: number;
}): Promise<AdaptationResult> {
  try {
    // Get relevant learned patterns
    const patterns = await getLearnedPatterns({
      category: options.category,
      minConfidence: options.similarityThreshold || 0.7
    });

    if (patterns.length === 0) {
      return {
        success: true,
        adapted: false,
        changes: [],
        confidence: 0,
        reasoning: 'No relevant learned patterns found'
      };
    }

    // Find most relevant pattern based on context similarity
    const relevantPattern = patterns[0]; // Simplified: use highest confidence

    // Update applied count
    await prisma.learningInsight.update({
      where: { id: relevantPattern.id },
      data: {
        appliedCount: { increment: 1 },
        lastApplied: new Date()
      }
    });

    return {
      success: true,
      adapted: true,
      changes: [`Applied pattern: ${relevantPattern.description}`],
      confidence: relevantPattern.confidence,
      reasoning: `Used learned pattern from ${relevantPattern.category}`
    };
  } catch (error) {
    console.error('Error applying learning:', error);
    return {
      success: false,
      adapted: false,
      changes: [],
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Track overall learning progress
 */
export async function getLearningProgress(): Promise<LearningProgress> {
  try {
    const allInsights = await prisma.learningInsight.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Calculate category counts
    const categoryCounts: Record<string, number> = {};
    allInsights.forEach(insight => {
      categoryCounts[insight.category] = (categoryCounts[insight.category] || 0) + 1;
    });

    // Get top patterns (highest confidence + most applied)
    const topPatterns = await getLearnedPatterns({
      minConfidence: 0.8,
      limit: 10
    });

    // Get recent learning
    const recentLearning = allInsights.slice(0, 10).map(insight => ({
      id: insight.id,
      category: insight.category,
      type: insight.insightType,
      description: insight.description,
      confidence: insight.confidence,
      occurrences: insight.appliedCount,
      context: insight.context as Record<string, any>,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt
    }));

    // Calculate adaptation rate (insights applied vs total)
    const totalApplied = allInsights.reduce((sum, i) => sum + i.appliedCount, 0);
    const adaptationRate = allInsights.length > 0 
      ? totalApplied / allInsights.length 
      : 0;

    return {
      totalInsights: allInsights.length,
      categoryCounts,
      topPatterns,
      recentLearning,
      adaptationRate: Math.round(adaptationRate * 100) / 100
    };
  } catch (error) {
    console.error('Error getting learning progress:', error);
    return {
      totalInsights: 0,
      categoryCounts: {},
      topPatterns: [],
      recentLearning: [],
      adaptationRate: 0
    };
  }
}
