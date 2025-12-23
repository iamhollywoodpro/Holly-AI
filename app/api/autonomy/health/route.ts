import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { selfHealingEngine } from "@/lib/autonomy/self-healing";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";

/**
 * GET /api/autonomy/health
 * Perform a health check and return current system status
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perform health check
    const healthCheck = await selfHealingEngine.performHealthCheck();

    logger.info("Health check requested", {
      userId,
      healthy: healthCheck.healthy,
      issuesFound: healthCheck.issues.length,
      category: "self-healing",
    });

    return NextResponse.json({
      success: true,
      health: healthCheck,
    });
  } catch (error: any) {
    logger.error("Health check failed", {
      error: error.message,
      category: "self-healing",
    });

    return NextResponse.json(
      { error: `Health check failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomy/health/auto-fix
 * Trigger an auto-fix for a specific issue
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { issueId } = body;

    if (!issueId) {
      return NextResponse.json(
        { error: "Missing issue ID" },
        { status: 400 }
      );
    }

    // Perform health check to get the issue
    const healthCheck = await selfHealingEngine.performHealthCheck();
    const issue = healthCheck.issues.find((i) => i.id === issueId);

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Trigger auto-fix
    const improvementId = await selfHealingEngine.triggerAutoFix(issue, userId);

    if (!improvementId) {
      return NextResponse.json(
        { error: "Failed to trigger auto-fix" },
        { status: 500 }
      );
    }

    logger.info("Auto-fix triggered", {
      userId,
      issueId,
      improvementId,
      category: "self-healing",
    });

    return NextResponse.json({
      success: true,
      improvementId,
      message: "Auto-fix triggered successfully",
    });
  } catch (error: any) {
    logger.error("Failed to trigger auto-fix", {
      error: error.message,
      category: "self-healing",
    });

    return NextResponse.json(
      { error: `Failed to trigger auto-fix: ${error.message}` },
      { status: 500 }
    );
  }
}
