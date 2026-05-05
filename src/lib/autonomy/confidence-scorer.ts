/**
 * Confidence Scorer Module
 * 
 * Calculates a confidence score for proposed self-improvements
 * based on LLM confidence, test coverage, and historical success rates.
 */

export interface ConfidenceScoringInput {
  llmConfidence?: number; // 0-1
  predictedTestCoverage?: number; // 0-100
  historicalData?: {
    similarImprovementsCount: number;
    successRate: number;
  };
  codeQualityMetrics?: {
    lintingPassed: boolean;
    typeCheckPassed: boolean;
    securityScanPassed: boolean;
  };
}

export interface ConfidenceScoringResult {
  confidenceScore: number; // 0-100
  factors: {
    llmConfidence: number;
    testCoverage: number;
    historicalSuccess: number;
    codeQuality: number;
  };
  recommendation: "auto_approve" | "human_review" | "reject";
  reasoning: string;
}

export class ConfidenceScorer {
  /**
   * Calculate confidence score for a proposed improvement
   */
  score(input: ConfidenceScoringInput): ConfidenceScoringResult {
    const llmConfidence = this.scoreLLMConfidence(input.llmConfidence);
    const testCoverage = this.scoreTestCoverage(input.predictedTestCoverage);
    const historicalSuccess = this.scoreHistoricalSuccess(input.historicalData);
    const codeQuality = this.scoreCodeQuality(input.codeQualityMetrics);

    // Weighted average
    const confidenceScore =
      llmConfidence * 0.3 +
      testCoverage * 0.25 +
      historicalSuccess * 0.25 +
      codeQuality * 0.2;

    const recommendation = this.determineRecommendation(confidenceScore);
    const reasoning = this.generateReasoning(
      confidenceScore,
      { llmConfidence, testCoverage, historicalSuccess, codeQuality }
    );

    return {
      confidenceScore: Math.round(confidenceScore),
      factors: {
        llmConfidence: Math.round(llmConfidence),
        testCoverage: Math.round(testCoverage),
        historicalSuccess: Math.round(historicalSuccess),
        codeQuality: Math.round(codeQuality),
      },
      recommendation,
      reasoning,
    };
  }

  /**
   * Score based on LLM confidence
   */
  private scoreLLMConfidence(llmConfidence?: number): number {
    if (llmConfidence === undefined) {
      // Default moderate confidence if not provided
      return 60;
    }

    // Convert 0-1 to 0-100
    return llmConfidence * 100;
  }

  /**
   * Score based on predicted test coverage
   */
  private scoreTestCoverage(testCoverage?: number): number {
    if (testCoverage === undefined) {
      // Assume moderate coverage if not provided
      return 50;
    }

    // Test coverage is already 0-100
    return testCoverage;
  }

  /**
   * Score based on historical success rate
   */
  private scoreHistoricalSuccess(
    historicalData?: {
      similarImprovementsCount: number;
      successRate: number;
    }
  ): number {
    if (!historicalData || historicalData.similarImprovementsCount === 0) {
      // No historical data = moderate confidence
      return 60;
    }

    // Convert success rate (0-1) to score (0-100)
    const baseScore = historicalData.successRate * 100;

    // Adjust based on sample size
    if (historicalData.similarImprovementsCount < 3) {
      // Low confidence in historical data, regress to mean
      return (baseScore + 60) / 2;
    } else if (historicalData.similarImprovementsCount < 10) {
      // Moderate confidence
      return (baseScore * 0.7 + 60 * 0.3);
    }

    // High confidence in historical data
    return baseScore;
  }

  /**
   * Score based on code quality metrics
   */
  private scoreCodeQuality(
    codeQualityMetrics?: {
      lintingPassed: boolean;
      typeCheckPassed: boolean;
      securityScanPassed: boolean;
    }
  ): number {
    if (!codeQualityMetrics) {
      // Assume moderate quality if not provided
      return 60;
    }

    let score = 0;

    if (codeQualityMetrics.lintingPassed) score += 30;
    if (codeQualityMetrics.typeCheckPassed) score += 40;
    if (codeQualityMetrics.securityScanPassed) score += 30;

    return score;
  }

  /**
   * Determine recommendation based on confidence score
   */
  private determineRecommendation(
    confidenceScore: number
  ): "auto_approve" | "human_review" | "reject" {
    if (confidenceScore >= 90) return "auto_approve";
    if (confidenceScore >= 60) return "human_review";
    return "reject";
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    confidenceScore: number,
    factors: {
      llmConfidence: number;
      testCoverage: number;
      historicalSuccess: number;
      codeQuality: number;
    }
  ): string {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (factors.llmConfidence > 80) {
      strengths.push("high LLM confidence");
    } else if (factors.llmConfidence < 50) {
      weaknesses.push("low LLM confidence");
    }

    if (factors.testCoverage > 80) {
      strengths.push("excellent test coverage");
    } else if (factors.testCoverage < 50) {
      weaknesses.push("insufficient test coverage");
    }

    if (factors.historicalSuccess > 80) {
      strengths.push("strong historical success rate");
    } else if (factors.historicalSuccess < 50) {
      weaknesses.push("poor historical success rate");
    }

    if (factors.codeQuality > 80) {
      strengths.push("high code quality");
    } else if (factors.codeQuality < 50) {
      weaknesses.push("code quality concerns");
    }

    let reasoning = `Confidence score: ${Math.round(confidenceScore)}%. `;

    if (strengths.length > 0) {
      reasoning += `Strengths: ${strengths.join(", ")}. `;
    }

    if (weaknesses.length > 0) {
      reasoning += `Concerns: ${weaknesses.join(", ")}. `;
    }

    if (confidenceScore >= 90) {
      reasoning += "Recommended for auto-approval.";
    } else if (confidenceScore >= 60) {
      reasoning += "Recommended for human review.";
    } else {
      reasoning += "Not recommended for implementation.";
    }

    return reasoning;
  }
}

export const confidenceScorer = new ConfidenceScorer();

// Export convenience function for API endpoints
export async function calculateConfidence(input: any) {
  const result = confidenceScorer.score(input);
  return result;
}
