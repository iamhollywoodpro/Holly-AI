/**
 * HOLLY PATTERN TRACKER
 * 
 * Tracks and analyzes user behavior patterns for personalization
 * 
 * Uses: ConversationPattern (Prisma model)
 * 
 * ACTUAL PRISMA FIELDS (VERIFIED):
 * - id, userId, patternType, pattern, context (Json)
 * - frequency, effectiveness, lastSeen, firstSeen
 * - examples (String[]), relatedPatterns (String[])
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface PatternData {
  id: string;
  userId: string;
  patternType: string;
  pattern: string;
  context: Record<string, any>;
  frequency: number;
  effectiveness: number;
  lastSeen: Date;
  firstSeen: Date;
  examples: string[];
  relatedPatterns: string[];
}

export interface PatternInsights {
  totalPatterns: number;
  byType: Record<string, number>;
  topPatterns: PatternData[];
  recommendations: string[];
  averageEffectiveness: number;
}

// ================== PATTERN TRACKER ==================

/**
 * Record or update user pattern
 */
export async function recordPattern(
  userId: string,
  patternType: string,
  pattern: string,
  context: Record<string, any>
): Promise<{ success: boolean; patternId?: string; error?: string }> {
  try {
    // Check if pattern already exists
    const existing = await prisma.conversationPattern.findFirst({
      where: {
        userId,
        patternType,
        pattern
      }
    });

    if (existing) {
      // Update existing pattern
      const updated = await prisma.conversationPattern.update({
        where: { id: existing.id },
        data: {
          frequency: { increment: 1 },
          lastSeen: new Date(),
          context: context
        }
      });

      return {
        success: true,
        patternId: updated.id
      };
    } else {
      // Create new pattern
      const created = await prisma.conversationPattern.create({
        data: {
          userId,
          patternType,
          pattern,
          context: context,
          frequency: 1,
          effectiveness: 0.5,
          lastSeen: new Date(),
          firstSeen: new Date(),
          examples: [],
          relatedPatterns: []
        }
      });

      return {
        success: true,
        patternId: created.id
      };
    }
  } catch (error) {
    console.error('Error recording pattern:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update pattern effectiveness
 */
export async function updatePatternEffectiveness(
  patternId: string,
  effectiveness: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.conversationPattern.update({
      where: { id: patternId },
      data: {
        effectiveness: Math.max(0, Math.min(1, effectiveness)) // Clamp 0-1
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating pattern effectiveness:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user patterns
 */
export async function getUserPatterns(
  userId: string,
  patternType?: string
): Promise<PatternData[]> {
  try {
    const where: any = { userId };
    if (patternType) where.patternType = patternType;

    const patterns = await prisma.conversationPattern.findMany({
      where,
      orderBy: [
        { frequency: 'desc' },
        { effectiveness: 'desc' }
      ]
    });

    return patterns.map(p => ({
      id: p.id,
      userId: p.userId,
      patternType: p.patternType,
      pattern: p.pattern,
      context: p.context as Record<string, any>,
      frequency: p.frequency,
      effectiveness: p.effectiveness,
      lastSeen: p.lastSeen,
      firstSeen: p.firstSeen,
      examples: p.examples,
      relatedPatterns: p.relatedPatterns
    }));
  } catch (error) {
    console.error('Error getting user patterns:', error);
    return [];
  }
}

/**
 * Get pattern insights and recommendations
 */
export async function getPatternInsights(userId: string): Promise<PatternInsights> {
  try {
    const patterns = await getUserPatterns(userId);

    // Count by type
    const byType: Record<string, number> = {};
    patterns.forEach(p => {
      byType[p.patternType] = (byType[p.patternType] || 0) + 1;
    });

    // Get top patterns (high frequency + high effectiveness)
    const topPatterns = patterns
      .sort((a, b) => {
        const scoreA = a.frequency * a.effectiveness;
        const scoreB = b.frequency * b.effectiveness;
        return scoreB - scoreA;
      })
      .slice(0, 10);

    // Calculate average effectiveness
    const totalEffectiveness = patterns.reduce((sum, p) => sum + p.effectiveness, 0);
    const averageEffectiveness = patterns.length > 0 
      ? totalEffectiveness / patterns.length 
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageEffectiveness < 0.6) {
      recommendations.push('Consider adjusting response strategies for better engagement');
    }

    const mostCommonType = Object.entries(byType)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (mostCommonType) {
      recommendations.push(`Primary interaction pattern: ${mostCommonType[0]}`);
    }

    if (patterns.length > 20) {
      recommendations.push('Rich interaction history enables advanced personalization');
    }

    return {
      totalPatterns: patterns.length,
      byType,
      topPatterns,
      recommendations,
      averageEffectiveness: Math.round(averageEffectiveness * 100) / 100
    };
  } catch (error) {
    console.error('Error getting pattern insights:', error);
    return {
      totalPatterns: 0,
      byType: {},
      topPatterns: [],
      recommendations: [],
      averageEffectiveness: 0
    };
  }
}

/**
 * Link related patterns
 */
export async function linkPatterns(
  patternId: string,
  relatedPatternIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.conversationPattern.update({
      where: { id: patternId },
      data: {
        relatedPatterns: relatedPatternIds
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error linking patterns:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
