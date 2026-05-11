import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

  export async function GET() {
    try {
      // Get system health from health monitor
      const healthCheck = await prisma.learningEvent.findFirst({
        where: { type: "health_check" },
        orderBy: { timestamp: "desc" },
      });

      // Get self-improvement stats
      const selfImprovementActions = await prisma.selfImprovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const plansProposed = selfImprovementActions.length;
      const changesApplied = selfImprovementActions.filter(
        (a) => a.outcome === "applied"
      ).length;
      const rollbacks = selfImprovementActions.filter(
        (a) => a.outcome === "rolled_back"
      ).length;

    // Get initiative stats
    const initiatives = await prisma.notification.findMany({
      where: { category: "initiative" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const initiativesActedOn = initiatives.filter((i) => i.actionData?.actedOn).length;

    // Get training stats
    const trainingData = await prisma.learningEvent.findMany({
      where: { type: "training_data_collected" },
      orderBy: { timestamp: "desc" },
    });

    const examplesCollected = trainingData.reduce(
      (sum, e) => sum + ((e.data as any)?.examplesCollected || 0),
      0
    );

    // Calculate health score
    let healthScore = 100;
    let healthStatus: "healthy" | "degraded" | "critical" = "healthy";

    // Check recent rollbacks
    const recentRollbacks = selfImprovementActions
      .filter((a) => a.outcome === "rolled_back")
      .filter((a) => {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(a.createdAt) > oneWeekAgo;
      });

    if (recentRollbacks.length > 3) {
      healthScore = 60;
      healthStatus = "degraded";
    } else if (recentRollbacks.length > 1) {
      healthScore = 80;
    }

    // Check recent health checks
    const recentHealthChecks = await prisma.learningEvent.findMany({
      where: { 
        type: "health_check",
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentHealthChecks.length === 0) {
      healthScore = 70;
      healthStatus = "degraded";
    } else {
      const failedChecks = recentHealthChecks.filter((h) => !(h.data as any)?.passed);
      if (failedChecks.length > recentHealthChecks.length / 2) {
        healthScore = 50;
        healthStatus = "critical";
      }
    }

    const stats = {
      health: {
        status: healthStatus,
        score: healthScore,
        lastCheck: healthCheck?.timestamp
          ? new Date(healthCheck.timestamp).toLocaleString()
          : "Never",
      },
      selfImprovement: {
        plansProposed,
        changesApplied,
        rollbacks,
        lastCycle:
          selfImprovementActions.length > 0
            ? new Date(selfImprovementActions[0].createdAt).toLocaleString()
            : "Never",
      },
      initiatives: {
        total: initiatives.length,
        actedOn: initiativesActedOn,
        lastInitiative:
          initiatives.length > 0
            ? initiatives[0].title || "Recent initiative"
            : "None",
      },
      training: {
        examplesCollected,
        modelsFineTuned: 0, // To be implemented in Phase 5
        lastTraining: "Not yet implemented",
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch autonomous stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}