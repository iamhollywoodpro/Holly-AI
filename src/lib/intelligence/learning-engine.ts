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
 * 
 * ACTUAL PRISMA FIELDS:
 * - category, insightType, title, description, evidence (Json)
 * - confidence, actionable, applied (Boolean), priority, impact
 * - relatedFiles, relatedPatterns, tags (String[])
 * - learnedAt, appliedAt, validatedAt
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface LearningInput {
  category: string;
  type: string; // Maps to insightType
  title: string;
  description: string;
  evidence?: Record<string, any>; // Maps to evidence Json
  confidence?: number;
  actionable?: boolean;
  priority?: number;
  impact?: string;
  relatedFiles?: string[];
  relatedPatterns?: string[];
  tags?: string[];
}

export interface LearningPattern {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  evidence: Record<string, any>;
  confidence: number;
  actionable: boolean;
  applied: boolean;
  priority: number;
  impact?: string;
  relatedFiles: string[];
  relatedPatterns: string[];
  tags: string[];
  learnedAt: Date;
  appliedAt?: Date;
  validatedAt?: Date;
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
  appliedCount: number;
  averageConfidence: number;
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
        title: input.title,
        description: input.description,
        evidence: input.evidence || {},
        confidence: input.confidence || 0.5,
        actionable: input.actionable || false,
        applied: false,
        priority: input.priority || 5,
        impact: input.impact,
        relatedFiles: input.relatedFiles || [],
        relatedPatterns: input.relatedPatterns || [],
        tags: input.tags || []
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
  applied?: boolean;
  limit?: number;
}): Promise<LearningPattern[]> {
  try {
    const where: any = {};
    
    if (options?.category) where.category = options.category;
    if (options?.type) where.insightType = options.type;
    if (options?.minConfidence) {
      where.confidence = { gte: options.minConfidence };
    }
    if (options?.applied !== undefined) {
      where.applied = options.applied;
    }

    const insights = await prisma.learningInsight.findMany({
      where,
      orderBy: [
        { confidence: 'desc' },
        { priority: 'asc' }
      ],
      take: options?.limit || 50
    });

    return insights.map(insight => ({
      id: insight.id,
      category: insight.category,
      type: insight.insightType,
      title: insight.title,
      description: insight.description,
      evidence: insight.evidence as Record<string, any>,
      confidence: insight.confidence,
      actionable: insight.actionable,
      applied: insight.applied,
      priority: insight.priority,
      impact: insight.impact || undefined,
      relatedFiles: insight.relatedFiles,
      relatedPatterns: insight.relatedPatterns,
      tags: insight.tags,
      learnedAt: insight.learnedAt,
      appliedAt: insight.appliedAt || undefined,
      validatedAt: insight.validatedAt || undefined
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
      minConfidence: options.similarityThreshold || 0.7,
      applied: false // Only get patterns not yet applied
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

    // Find most relevant pattern based on actionability and priority
    const relevantPattern = patterns.find(p => p.actionable) || patterns[0];

    // Mark as applied
    await prisma.learningInsight.update({
      where: { id: relevantPattern.id },
      data: {
        applied: true,
        appliedAt: new Date()
      }
    });

    return {
      success: true,
      adapted: true,
      changes: [`Applied pattern: ${relevantPattern.title}`],
      confidence: relevantPattern.confidence,
      reasoning: `Used learned pattern from ${relevantPattern.category} with priority ${relevantPattern.priority}`
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
      orderBy: { learnedAt: 'desc' }
    });

    // Calculate category counts
    const categoryCounts: Record<string, number> = {};
    allInsights.forEach(insight => {
      categoryCounts[insight.category] = (categoryCounts[insight.category] || 0) + 1;
    });

    // Get top patterns (highest confidence + actionable)
    const topPatterns = await getLearnedPatterns({
      minConfidence: 0.7,
      limit: 10
    });

    // Get recent learning
    const recentLearning = allInsights.slice(0, 10).map(insight => ({
      id: insight.id,
      category: insight.category,
      type: insight.insightType,
      title: insight.title,
      description: insight.description,
      evidence: insight.evidence as Record<string, any>,
      confidence: insight.confidence,
      actionable: insight.actionable,
      applied: insight.applied,
      priority: insight.priority,
      impact: insight.impact || undefined,
      relatedFiles: insight.relatedFiles,
      relatedPatterns: insight.relatedPatterns,
      tags: insight.tags,
      learnedAt: insight.learnedAt,
      appliedAt: insight.appliedAt || undefined,
      validatedAt: insight.validatedAt || undefined
    }));

    // Count applied insights
    const appliedCount = allInsights.filter(i => i.applied).length;

    // Calculate average confidence
    const totalConfidence = allInsights.reduce((sum, i) => sum + i.confidence, 0);
    const averageConfidence = allInsights.length > 0 
      ? totalConfidence / allInsights.length 
      : 0;

    return {
      totalInsights: allInsights.length,
      categoryCounts,
      topPatterns,
      recentLearning,
      appliedCount,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  } catch (error) {
    console.error('Error getting learning progress:', error);
    return {
      totalInsights: 0,
      categoryCounts: {},
      topPatterns: [],
      recentLearning: [],
      appliedCount: 0,
      averageConfidence: 0
    };
  }
}
