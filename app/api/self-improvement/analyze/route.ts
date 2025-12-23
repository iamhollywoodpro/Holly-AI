import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { riskAnalyzer, TriggerType } from "@/lib/autonomy/risk-analyzer";
import { confidenceScorer } from "@/lib/autonomy/confidence-scorer";
import { decisionEngine, DecisionAction } from "@/lib/autonomy/decision-engine";
import { logger } from "@/lib/monitoring/logger";

const prisma = new PrismaClient();

export const runtime = "nodejs";

/**
 * POST /api/self-improvement/analyze
 * Analyze a proposed improvement and make an autonomous decision
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      improvementId,
      triggerType,
      filesChanged,
      linesChanged,
      affectedModules,
      llmConfidence,
      predictedTestCoverage,
      overrideRules,
    } = body;

    // Validate required fields
    if (!improvementId || !triggerType || !filesChanged || !affectedModules) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the improvement record
    const improvement = await prisma.selfImprovement.findUnique({
      where: { id: improvementId },
    });

    if (!improvement) {
      return NextResponse.json(
        { error: "Improvement not found" },
        { status: 404 }
      );
    }

    // Get historical data for similar improvements
    const historicalData = await this.getHistoricalData(
      triggerType,
      affectedModules
    );

    // Perform risk analysis
    const riskAnalysis = riskAnalyzer.analyze({
      triggerType: triggerType as TriggerType,
      filesChanged,
      linesChanged: linesChanged || filesChanged.length * 50, // Estimate if not provided
      affectedModules,
      historicalData,
    });

    // Calculate confidence score
    const confidenceScore = confidenceScorer.score({
      llmConfidence,
      predictedTestCoverage,
      historicalData,
      codeQualityMetrics: {
        lintingPassed: true, // Will be determined by actual checks
        typeCheckPassed: true,
        securityScanPassed: true,
      },
    });

    // Make decision
    const decision = decisionEngine.decide({
      improvementId,
      riskAnalysis,
      confidenceScore,
      overrideRules,
    });

    // Update improvement record with analysis results
    await prisma.selfImprovement.update({
      where: { id: improvementId },
      data: {
        riskLevel: riskAnalysis.riskLevel,
        status:
          decision.action === DecisionAction.AUTO_APPROVE
            ? "approved"
            : decision.action === DecisionAction.REJECT
            ? "rejected"
            : "pending_review",
      },
    });

    logger.info("Autonomous analysis completed", {
      improvementId,
      decision: decision.action,
      riskLevel: riskAnalysis.riskLevel,
      confidenceScore: confidenceScore.confidenceScore,
      category: "autonomy",
    });

    return NextResponse.json({
      success: true,
      improvementId,
      analysis: {
        risk: riskAnalysis,
        confidence: confidenceScore,
        decision,
      },
    });
  } catch (error: any) {
    logger.error("Failed to analyze improvement", {
      error: error.message,
      category: "autonomy",
    });

    return NextResponse.json(
      { error: `Failed to analyze improvement: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Get historical data for similar improvements
 */
async function getHistoricalData(
  triggerType: string,
  affectedModules: string[]
): Promise<{ similarImprovementsCount: number; successRate: number }> {
  try {
    // Find similar past improvements
    const similarImprovements = await prisma.selfImprovement.findMany({
      where: {
        triggerType,
        status: {
          in: ["approved", "merged", "deployed", "rejected", "failed"],
        },
      },
      select: {
        status: true,
        outcome: true,
      },
    });

    const successfulImprovements = similarImprovements.filter(
      (imp) =>
        imp.status === "deployed" ||
        imp.status === "merged" ||
        (imp.status === "approved" && imp.outcome === "success")
    );

    const successRate =
      similarImprovements.length > 0
        ? successfulImprovements.length / similarImprovements.length
        : 0;

    return {
      similarImprovementsCount: similarImprovements.length,
      successRate,
    };
  } catch (error) {
    logger.error("Failed to fetch historical data", {
      error: error.message,
      category: "autonomy",
    });

    return {
      similarImprovementsCount: 0,
      successRate: 0,
    };
  }
}
