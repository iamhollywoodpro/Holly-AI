/**
 * Risk Analyzer Module
 * 
 * Analyzes self-improvement proposals to determine their risk level
 * based on multiple factors including code complexity, system impact,
 * and historical data.
 */

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum TriggerType {
  ROUTINE_AUDIT = "routine_audit",
  MINOR_FEEDBACK = "minor_feedback",
  PERFORMANCE_ISSUE = "performance_issue",
  NON_CRITICAL_ERROR = "non_critical_error",
  CRITICAL_ERROR = "critical_error",
  SECURITY_VULNERABILITY = "security_vulnerability",
}

export interface RiskAnalysisInput {
  triggerType: TriggerType;
  filesChanged: string[];
  linesChanged: number;
  affectedModules: string[];
  testCoverage?: number;
  historicalData?: {
    similarImprovementsCount: number;
    successRate: number;
  };
}

export interface RiskAnalysisResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100, higher = more risky
  factors: {
    triggerRisk: number;
    complexityRisk: number;
    impactRisk: number;
    historicalRisk: number;
  };
  reasoning: string;
}

export class RiskAnalyzer {
  /**
   * Analyze the risk level of a proposed improvement
   */
  analyze(input: RiskAnalysisInput): RiskAnalysisResult {
    const triggerRisk = this.analyzeTriggerRisk(input.triggerType);
    const complexityRisk = this.analyzeComplexityRisk(input.linesChanged);
    const impactRisk = this.analyzeImpactRisk(input.affectedModules, input.filesChanged);
    const historicalRisk = this.analyzeHistoricalRisk(input.historicalData);

    // Weighted average of all risk factors
    const riskScore =
      triggerRisk * 0.3 +
      complexityRisk * 0.25 +
      impactRisk * 0.3 +
      historicalRisk * 0.15;

    const riskLevel = this.determineRiskLevel(riskScore);
    const reasoning = this.generateReasoning(
      riskLevel,
      { triggerRisk, complexityRisk, impactRisk, historicalRisk }
    );

    return {
      riskLevel,
      riskScore: Math.round(riskScore),
      factors: {
        triggerRisk: Math.round(triggerRisk),
        complexityRisk: Math.round(complexityRisk),
        impactRisk: Math.round(impactRisk),
        historicalRisk: Math.round(historicalRisk),
      },
      reasoning,
    };
  }

  /**
   * Analyze risk based on trigger type
   */
  private analyzeTriggerRisk(triggerType: TriggerType): number {
    const triggerRiskMap: Record<TriggerType, number> = {
      [TriggerType.ROUTINE_AUDIT]: 10,
      [TriggerType.MINOR_FEEDBACK]: 15,
      [TriggerType.PERFORMANCE_ISSUE]: 40,
      [TriggerType.NON_CRITICAL_ERROR]: 50,
      [TriggerType.CRITICAL_ERROR]: 80,
      [TriggerType.SECURITY_VULNERABILITY]: 95,
    };

    return triggerRiskMap[triggerType] || 50;
  }

  /**
   * Analyze risk based on code complexity
   */
  private analyzeComplexityRisk(linesChanged: number): number {
    if (linesChanged < 50) return 10;
    if (linesChanged < 100) return 25;
    if (linesChanged < 200) return 50;
    if (linesChanged < 500) return 70;
    return 90;
  }

  /**
   * Analyze risk based on system impact
   */
  private analyzeImpactRisk(affectedModules: string[], filesChanged: string[]): number {
    let risk = 0;

    // Check for critical modules
    const criticalModules = [
      "auth",
      "database",
      "api",
      "consciousness",
      "self-improvement",
    ];

    const affectsCriticalModule = affectedModules.some((module) =>
      criticalModules.includes(module.toLowerCase())
    );

    if (affectsCriticalModule) {
      risk += 40;
    }

    // Check number of affected modules
    if (affectedModules.length === 1) {
      risk += 10;
    } else if (affectedModules.length <= 3) {
      risk += 30;
    } else {
      risk += 60;
    }

    // Check for schema changes
    const hasSchemaChanges = filesChanged.some((file) =>
      file.includes("schema.prisma")
    );

    if (hasSchemaChanges) {
      risk += 30;
    }

    return Math.min(risk, 100);
  }

  /**
   * Analyze risk based on historical data
   */
  private analyzeHistoricalRisk(
    historicalData?: {
      similarImprovementsCount: number;
      successRate: number;
    }
  ): number {
    if (!historicalData || historicalData.similarImprovementsCount === 0) {
      // No historical data = moderate risk
      return 50;
    }

    // Convert success rate (0-1) to risk (100-0)
    const risk = (1 - historicalData.successRate) * 100;

    // Adjust based on sample size
    if (historicalData.similarImprovementsCount < 3) {
      // Low confidence in historical data
      return (risk + 50) / 2;
    }

    return risk;
  }

  /**
   * Determine overall risk level from risk score
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 30) return RiskLevel.LOW;
    if (riskScore < 60) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  /**
   * Generate human-readable reasoning for the risk assessment
   */
  private generateReasoning(
    riskLevel: RiskLevel,
    factors: {
      triggerRisk: number;
      complexityRisk: number;
      impactRisk: number;
      historicalRisk: number;
    }
  ): string {
    const reasons: string[] = [];

    if (factors.triggerRisk > 70) {
      reasons.push("triggered by a critical issue");
    } else if (factors.triggerRisk < 20) {
      reasons.push("triggered by routine maintenance");
    }

    if (factors.complexityRisk > 70) {
      reasons.push("involves significant code changes");
    } else if (factors.complexityRisk < 30) {
      reasons.push("involves minimal code changes");
    }

    if (factors.impactRisk > 70) {
      reasons.push("affects critical system components");
    } else if (factors.impactRisk < 30) {
      reasons.push("affects isolated, non-critical components");
    }

    if (factors.historicalRisk > 70) {
      reasons.push("similar improvements have had low success rates");
    } else if (factors.historicalRisk < 30) {
      reasons.push("similar improvements have been successful");
    }

    const reasonText = reasons.length > 0 ? reasons.join(", ") : "standard risk factors";

    return `Risk level assessed as ${riskLevel} because this improvement is ${reasonText}.`;
  }
}

export const riskAnalyzer = new RiskAnalyzer();

// Export convenience function for API endpoints
export async function analyzeRisk(input: any) {
  // Convert the input to match RiskAnalysisInput interface
  const riskInput: RiskAnalysisInput = {
    triggerType: input.trigger as TriggerType || TriggerType.ROUTINE_AUDIT,
    filesChanged: input.filesChanged || [],
    linesChanged: input.filesChanged?.length * 50 || 0, // Estimate
    affectedModules: input.filesChanged?.map((f: string) => f.split('/')[0]) || [],
    testCoverage: 80, // Default assumption
    historicalData: {
      similarImprovementsCount: 0,
      successRate: 0.8
    }
  };
  
  const result = await riskAnalyzer.analyzeRisk(riskInput);
  
  return {
    overallRisk: result.riskScore / 100, // Convert to 0-1 scale
    riskLevel: result.riskLevel,
    factors: result.factors,
    reasoning: result.reasoning
  };
}
