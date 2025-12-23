/**
 * Learning Engine Module
 * 
 * Analyzes historical data to identify patterns and improve
 * future decision-making through continuous learning.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../monitoring/logger";

const prisma = new PrismaClient();

export interface Pattern {
  id: string;
  type: "success" | "failure";
  description: string;
  confidence: number;
  occurrences: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningInsight {
  patterns: Pattern[];
  recommendations: string[];
  metrics: {
    totalImprovements: number;
    successRate: number;
    autoApprovalRate: number;
    averageConfidenceScore: number;
  };
}

export class LearningEngine {
  /**
   * Analyze historical data and extract patterns
   */
  async analyzePatterns(): Promise<LearningInsight> {
    try {
      // Get all completed improvements
      const improvements = await prisma.selfImprovement.findMany({
        where: {
          status: {
            in: ["approved", "merged", "deployed", "rejected", "failed", "rolled_back"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const patterns: Pattern[] = [];
      const recommendations: string[] = [];

      // Analyze success patterns
      const successPatterns = await this.identifySuccessPatterns(improvements);
      patterns.push(...successPatterns);

      // Analyze failure patterns
      const failurePatterns = await this.identifyFailurePatterns(improvements);
      patterns.push(...failurePatterns);

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(patterns));

      // Calculate metrics
      const metrics = this.calculateMetrics(improvements);

      logger.info("Pattern analysis completed", {
        patternsFound: patterns.length,
        recommendationsGenerated: recommendations.length,
        category: "learning",
      });

      return {
        patterns,
        recommendations,
        metrics,
      };
    } catch (error: any) {
      logger.error("Failed to analyze patterns", {
        error: error.message,
        category: "learning",
      });

      throw error;
    }
  }

  /**
   * Identify patterns in successful improvements
   */
  private async identifySuccessPatterns(improvements: any[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    const successfulImprovements = improvements.filter(
      (imp) =>
        imp.status === "deployed" ||
        imp.status === "merged" ||
        (imp.status === "approved" && imp.outcome === "success")
    );

    // Pattern: Trigger type success rate
    const triggerTypeSuccess = this.analyzeTriggerTypeSuccess(
      successfulImprovements,
      improvements
    );

    if (triggerTypeSuccess.length > 0) {
      patterns.push(...triggerTypeSuccess);
    }

    // Pattern: Module-specific success
    const moduleSuccess = this.analyzeModuleSuccess(
      successfulImprovements,
      improvements
    );

    if (moduleSuccess.length > 0) {
      patterns.push(...moduleSuccess);
    }

    return patterns;
  }

  /**
   * Identify patterns in failed improvements
   */
  private async identifyFailurePatterns(improvements: any[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    const failedImprovements = improvements.filter(
      (imp) =>
        imp.status === "failed" ||
        imp.status === "rolled_back" ||
        (imp.status === "rejected" && imp.outcome === "failure")
    );

    // Pattern: Common failure triggers
    const failureTriggers = this.analyzeFailureTriggers(
      failedImprovements,
      improvements
    );

    if (failureTriggers.length > 0) {
      patterns.push(...failureTriggers);
    }

    return patterns;
  }

  /**
   * Analyze success rates by trigger type
   */
  private analyzeTriggerTypeSuccess(
    successfulImprovements: any[],
    allImprovements: any[]
  ): Pattern[] {
    const patterns: Pattern[] = [];
    const triggerTypes = new Set(allImprovements.map((imp) => imp.triggerType));

    for (const triggerType of triggerTypes) {
      const total = allImprovements.filter((imp) => imp.triggerType === triggerType).length;
      const successful = successfulImprovements.filter(
        (imp) => imp.triggerType === triggerType
      ).length;

      const successRate = total > 0 ? successful / total : 0;

      if (total >= 3 && successRate > 0.8) {
        patterns.push({
          id: `trigger-success-${triggerType}`,
          type: "success",
          description: `Improvements triggered by "${triggerType}" have a high success rate (${Math.round(successRate * 100)}%)`,
          confidence: Math.min(successRate, total / 10), // Higher confidence with more data
          occurrences: total,
          metadata: {
            triggerType,
            successRate,
            totalCount: total,
            successfulCount: successful,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze success rates by affected modules
   */
  private analyzeModuleSuccess(
    successfulImprovements: any[],
    allImprovements: any[]
  ): Pattern[] {
    const patterns: Pattern[] = [];
    // This would require parsing filesChanged to extract modules
    // Simplified for now
    return patterns;
  }

  /**
   * Analyze common failure triggers
   */
  private analyzeFailureTriggers(
    failedImprovements: any[],
    allImprovements: any[]
  ): Pattern[] {
    const patterns: Pattern[] = [];
    const triggerTypes = new Set(failedImprovements.map((imp) => imp.triggerType));

    for (const triggerType of triggerTypes) {
      const total = allImprovements.filter((imp) => imp.triggerType === triggerType).length;
      const failed = failedImprovements.filter(
        (imp) => imp.triggerType === triggerType
      ).length;

      const failureRate = total > 0 ? failed / total : 0;

      if (total >= 3 && failureRate > 0.5) {
        patterns.push({
          id: `trigger-failure-${triggerType}`,
          type: "failure",
          description: `Improvements triggered by "${triggerType}" have a high failure rate (${Math.round(failureRate * 100)}%)`,
          confidence: Math.min(failureRate, total / 10),
          occurrences: total,
          metadata: {
            triggerType,
            failureRate,
            totalCount: total,
            failedCount: failed,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: Pattern[]): string[] {
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      if (pattern.type === "success" && pattern.confidence > 0.8) {
        recommendations.push(
          `Consider auto-approving improvements of type "${pattern.metadata.triggerType}" due to high historical success rate.`
        );
      }

      if (pattern.type === "failure" && pattern.confidence > 0.6) {
        recommendations.push(
          `Exercise caution with improvements of type "${pattern.metadata.triggerType}" due to high historical failure rate.`
        );
      }
    }

    return recommendations;
  }

  /**
   * Calculate overall metrics
   */
  private calculateMetrics(improvements: any[]): {
    totalImprovements: number;
    successRate: number;
    autoApprovalRate: number;
    averageConfidenceScore: number;
  } {
    const total = improvements.length;

    const successful = improvements.filter(
      (imp) =>
        imp.status === "deployed" ||
        imp.status === "merged" ||
        (imp.status === "approved" && imp.outcome === "success")
    ).length;

    const autoApproved = improvements.filter(
      (imp) => imp.status === "approved" && imp.outcome === "auto_approved"
    ).length;

    const successRate = total > 0 ? successful / total : 0;
    const autoApprovalRate = total > 0 ? autoApproved / total : 0;

    // Calculate average confidence score (would need to be stored in DB)
    const averageConfidenceScore = 0; // Placeholder

    return {
      totalImprovements: total,
      successRate,
      autoApprovalRate,
      averageConfidenceScore,
    };
  }

  /**
   * Apply learning insights to improve future decisions
   */
  async applyLearning(improvementId: string): Promise<void> {
    try {
      const insights = await this.analyzePatterns();

      // Store insights for future reference
      logger.info("Learning insights applied", {
        improvementId,
        patternsIdentified: insights.patterns.length,
        category: "learning",
      });

      // In a real implementation, this would update model weights
      // or adjust decision thresholds based on learned patterns
    } catch (error: any) {
      logger.error("Failed to apply learning", {
        improvementId,
        error: error.message,
        category: "learning",
      });
    }
  }
}

export const learningEngine = new LearningEngine();

// Convenience functions for easy import
export async function learnFromInteraction(context: {
  userId: string | null;
  userMessage: string;
  assistantResponse: string;
  conversationId: string;
  timestamp: Date;
}) {
  // Store interaction for future learning
  logger.info("Learning from interaction", {
    userId: context.userId,
    conversationId: context.conversationId,
    category: "learning",
  });
  
  // This could be enhanced to store interactions in a separate table
  // for more sophisticated learning in the future
}

export async function analyzeConversationPatterns(conversationId: string) {
  return learningEngine.analyzePatterns();
}
