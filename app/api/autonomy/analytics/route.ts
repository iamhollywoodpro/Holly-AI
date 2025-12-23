import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { learningEngine } from "@/lib/autonomy/learning-engine";
import { logger } from "@/lib/monitoring/logger";

const prisma = new PrismaClient();

export const runtime = "nodejs";

/**
 * GET /api/autonomy/analytics
 * Get autonomy analytics and learning insights
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get learning insights
    const insights = await learningEngine.analyzePatterns();

    // Get recent autonomous decisions
    const recentDecisions = await prisma.selfImprovement.findMany({
      where: {
        status: {
          in: ["approved", "rejected", "deployed", "failed"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        problemStatement: true,
        riskLevel: true,
        status: true,
        outcome: true,
        createdAt: true,
        deployedAt: true,
      },
    });

    // Calculate time-based metrics
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const metrics24h = await calculateMetrics(last24Hours);
    const metrics7d = await calculateMetrics(last7Days);
    const metrics30d = await calculateMetrics(last30Days);

    logger.info("Autonomy analytics retrieved", {
      userId,
      category: "autonomy",
    });

    return NextResponse.json({
      success: true,
      insights,
      recentDecisions,
      metrics: {
        last24Hours: metrics24h,
        last7Days: metrics7d,
        last30Days: metrics30d,
      },
    });
  } catch (error: any) {
    logger.error("Failed to get autonomy analytics", {
      error: error.message,
      category: "autonomy",
    });

    return NextResponse.json(
      { error: `Failed to get analytics: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Calculate metrics for a time period
 */
async function calculateMetrics(since: Date) {
  const improvements = await prisma.selfImprovement.findMany({
    where: {
      createdAt: {
        gte: since,
      },
    },
  });

  const total = improvements.length;
  const autoApproved = improvements.filter(
    (imp) => imp.outcome === "auto_approved"
  ).length;
  const successful = improvements.filter(
    (imp) =>
      imp.status === "deployed" ||
      imp.status === "merged" ||
      (imp.status === "approved" && imp.outcome === "success")
  ).length;
  const failed = improvements.filter(
    (imp) => imp.status === "failed" || imp.status === "rolled_back"
  ).length;

  const byRiskLevel = {
    low: improvements.filter((imp) => imp.riskLevel === "low").length,
    medium: improvements.filter((imp) => imp.riskLevel === "medium").length,
    high: improvements.filter((imp) => imp.riskLevel === "high").length,
  };

  return {
    total,
    autoApproved,
    successful,
    failed,
    autoApprovalRate: total > 0 ? autoApproved / total : 0,
    successRate: total > 0 ? successful / total : 0,
    failureRate: total > 0 ? failed / total : 0,
    byRiskLevel,
  };
}
