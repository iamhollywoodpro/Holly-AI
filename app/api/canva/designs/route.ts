/**
 * POST /api/canva/designs   — Create a new Canva design
 * GET  /api/canva/designs   — List user's recent Canva designs
 *
 * HOLLY calls this when the user asks her to create a design in Canva.
 *
 * Example POST body:
 * {
 *   "type": "instagram-post",
 *   "content": { "title": "New Release", "subtitle": "Available now on all platforms" },
 *   "exportFormat": "PNG"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canvaIntegration } from "@/lib/design/canva-integration";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 120; // exports can take up to 60s

const VALID_TYPES = [
  "instagram-post", "twitter-post", "linkedin-post",
  "youtube-thumbnail", "presentation", "logo",
  "infographic", "video", "story", "a4-document", "letter",
] as const;

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
        {
          error:      "Canva account not connected",
          connectUrl: "/api/canva/auth",
          detail:     "Ask the user to connect their Canva account first by visiting /api/canva/auth",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, content, templateId, brandTemplateId, exportFormat, quality } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid design type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    logger.info("Creating Canva design", { userId, type, exportFormat, category: "canva" });

    const result = await canvaIntegration.createDesign(userId, {
      type,
      content,
      templateId,
      brandTemplateId,
      exportFormat: exportFormat ?? "PNG",
      quality:      quality      ?? "regular",
    });

    logger.info("Canva design created", {
      userId,
      designId: result.designId,
      format:   result.format,
      category: "canva",
    });

    return NextResponse.json({
      success:  true,
      design:   result,
      provider: "Canva",
    });

  } catch (error: any) {
    logger.error("Canva design creation failed", { error: error.message, category: "canva" });

    if (error.message.includes("Not authorized")) {
      return NextResponse.json(
        { error: error.message, connectUrl: "/api/canva/auth" },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    const designs = await canvaIntegration.listDesigns(userId, Math.min(limit, 50));

    return NextResponse.json({ success: true, designs });
  } catch (error: any) {
    logger.error("Canva list designs failed", { error: error.message, category: "canva" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
