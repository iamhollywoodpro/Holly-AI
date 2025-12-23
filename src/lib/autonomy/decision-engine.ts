/**
 * Decision Engine Module
 * 
 * Makes autonomous decisions about self-improvements based on
 * risk analysis and confidence scoring.
 */

import { RiskLevel, RiskAnalysisResult } from "./risk-analyzer";
import { ConfidenceScoringResult } from "./confidence-scorer";
import { logger } from "../monitoring/logger";

export enum DecisionAction {
  AUTO_APPROVE = "auto_approve",
  HUMAN_REVIEW = "human_review",
  REJECT = "reject",
}

export interface DecisionInput {
  improvementId: string;
  riskAnalysis: RiskAnalysisResult;
  confidenceScore: ConfidenceScoringResult;
  overrideRules?: {
    requireHumanReview?: boolean;
    allowAutoApproval?: boolean;
  };
}

export interface DecisionResult {
  action: DecisionAction;
  reasoning: string;
  metadata: {
    riskLevel: RiskLevel;
    confidenceScore: number;
    autoApprovalEligible: boolean;
    safetyChecks: {
      riskThresholdPassed: boolean;
      confidenceThresholdPassed: boolean;
      overrideApplied: boolean;
    };
  };
}

export class DecisionEngine {
  // Thresholds for auto-approval
  private readonly AUTO_APPROVE_THRESHOLDS = {
    [RiskLevel.LOW]: {
      minConfidence: 95,
    },
    [RiskLevel.MEDIUM]: {
      minConfidence: 999, // Never auto-approve medium risk
    },
    [RiskLevel.HIGH]: {
      minConfidence: 999, // Never auto-approve high risk
    },
  };

  /**
   * Make a decision about whether to auto-approve an improvement
   */
  decide(input: DecisionInput): DecisionResult {
    const { improvementId, riskAnalysis, confidenceScore, overrideRules } = input;

    // Check for override rules
    if (overrideRules?.requireHumanReview) {
      logger.info("Decision overridden: human review required", {
        improvementId,
        category: "autonomy",
      });

      return {
        action: DecisionAction.HUMAN_REVIEW,
        reasoning: "Human review explicitly required by override rule.",
        metadata: {
          riskLevel: riskAnalysis.riskLevel,
          confidenceScore: confidenceScore.confidenceScore,
          autoApprovalEligible: false,
          safetyChecks: {
            riskThresholdPassed: false,
            confidenceThresholdPassed: false,
            overrideApplied: true,
          },
        },
      };
    }

    // Check if confidence score recommends rejection
    if (confidenceScore.recommendation === "reject") {
      logger.warn("Improvement rejected by confidence scorer", {
        improvementId,
        confidenceScore: confidenceScore.confidenceScore,
        category: "autonomy",
      });

      return {
        action: DecisionAction.REJECT,
        reasoning: `Confidence score too low (${confidenceScore.confidenceScore}%). ${confidenceScore.reasoning}`,
        metadata: {
          riskLevel: riskAnalysis.riskLevel,
          confidenceScore: confidenceScore.confidenceScore,
          autoApprovalEligible: false,
          safetyChecks: {
            riskThresholdPassed: false,
            confidenceThresholdPassed: false,
            overrideApplied: false,
          },
        },
      };
    }

    // Check if eligible for auto-approval
    const threshold = this.AUTO_APPROVE_THRESHOLDS[riskAnalysis.riskLevel];
    const confidenceThresholdPassed =
      confidenceScore.confidenceScore >= threshold.minConfidence;
    const riskThresholdPassed = riskAnalysis.riskLevel === RiskLevel.LOW;

    const autoApprovalEligible =
      riskThresholdPassed &&
      confidenceThresholdPassed &&
      (overrideRules?.allowAutoApproval !== false);

    if (autoApprovalEligible) {
      logger.info("Improvement auto-approved", {
        improvementId,
        riskLevel: riskAnalysis.riskLevel,
        confidenceScore: confidenceScore.confidenceScore,
        category: "autonomy",
      });

      return {
        action: DecisionAction.AUTO_APPROVE,
        reasoning: `Auto-approved: ${riskAnalysis.reasoning} Confidence: ${confidenceScore.confidenceScore}%. ${confidenceScore.reasoning}`,
        metadata: {
          riskLevel: riskAnalysis.riskLevel,
          confidenceScore: confidenceScore.confidenceScore,
          autoApprovalEligible: true,
          safetyChecks: {
            riskThresholdPassed: true,
            confidenceThresholdPassed: true,
            overrideApplied: false,
          },
        },
      };
    }

    // Default to human review
    logger.info("Improvement requires human review", {
      improvementId,
      riskLevel: riskAnalysis.riskLevel,
      confidenceScore: confidenceScore.confidenceScore,
      category: "autonomy",
    });

    return {
      action: DecisionAction.HUMAN_REVIEW,
      reasoning: `Human review required. ${riskAnalysis.reasoning} ${confidenceScore.reasoning}`,
      metadata: {
        riskLevel: riskAnalysis.riskLevel,
        confidenceScore: confidenceScore.confidenceScore,
        autoApprovalEligible: false,
        safetyChecks: {
          riskThresholdPassed,
          confidenceThresholdPassed,
          overrideApplied: false,
        },
      },
    };
  }

  /**
   * Get the auto-approval threshold for a given risk level
   */
  getAutoApprovalThreshold(riskLevel: RiskLevel): number {
    return this.AUTO_APPROVE_THRESHOLDS[riskLevel].minConfidence;
  }
}

export const decisionEngine = new DecisionEngine();

// Export convenience function for API endpoints
export async function makeDecision(input: any) {
  const result = await decisionEngine.makeDecision(input);
  return result;
}
