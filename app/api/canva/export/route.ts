/**
 * POST /api/canva/export
 *
 * Export an existing Canva design by its ID.
 *
 * Body: { designId: string, format?: "PNG"|"PDF"|"JPG"|"MP4"|"GIF", quality?: "draft"|"regular"|"pro" }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canvaIntegration } from "@/lib/design/canva-integration";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { designId, format = "PNG", quality = "regular" } = body;

    if (!designId) {
      return NextResponse.json({ error: "designId is required" }, { status: 400 });
    }

    logger.info("Exporting Canva design", { userId, designId, format, category: "canva" });

    const exportUrl = await canvaIntegration.exportDesign(userId, designId, format, quality);

    return NextResponse.json({
      success:   true,
      exportUrl,
      designId,
      format,
    });
  } catch (error: any) {
    logger.error("Canva export failed", { error: error.message, category: "canva" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
