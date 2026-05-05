/**
 * GET /api/canva/templates?query=music&type=instagram-post
 *
 * Search Canva templates. HOLLY uses this to find good starting
 * templates when creating designs for the user.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canvaIntegration } from "@/lib/design/canva-integration";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canvaIntegration.isConfigured()) {
      return NextResponse.json({ error: "Canva not configured" }, { status: 503 });
    }

    const connected = await canvaIntegration.isConnected(userId);
    if (!connected) {
      return NextResponse.json(
        { error: "Canva account not connected", connectUrl: "/api/canva/auth" },
        { status: 403 }
      );
    }

    const { searchParams } = req.nextUrl;
    const query = searchParams.get("query") || "music";
    const type  = searchParams.get("type")  || undefined;

    logger.info("Searching Canva templates", { userId, query, type, category: "canva" });

    const templates = await canvaIntegration.searchTemplates(userId, query, type);

    return NextResponse.json({
      success:   true,
      templates,
      query,
      type:      type ?? "all",
    });
  } catch (error: any) {
    logger.error("Canva template search failed", { error: error.message, category: "canva" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
