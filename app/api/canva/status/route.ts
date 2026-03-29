/**
 * GET /api/canva/status
 *
 * Returns whether Canva is configured + whether the current user
 * has connected their Canva account. Used by the UI to show
 * "Connect Canva" vs "Canva Connected" state.
 *
 * DELETE /api/canva/status  →  disconnect (revoke + delete tokens)
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

    const configured = canvaIntegration.isConfigured();
    const connected  = configured ? await canvaIntegration.isConnected(userId) : false;

    let profile = null;
    if (connected) {
      try {
        profile = await canvaIntegration.getUserProfile(userId);
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      configured,
      connected,
      connectUrl:  configured ? "/api/canva/auth" : null,
      canvaUser:   profile ? {
        id:          profile.profile?.id ?? profile.id,
        displayName: profile.profile?.display_name ?? profile.display_name,
        email:       profile.profile?.email ?? profile.email,
      } : null,
      capabilities: [
        "Instagram posts",
        "YouTube thumbnails",
        "Presentations (PDF)",
        "Logos",
        "Stories",
        "LinkedIn posts",
        "Brand template autofill",
        "Template search",
        "Design export (PNG, PDF, JPG, MP4, GIF)",
      ],
      setup: configured ? null : {
        step1: "Go to https://www.canva.com/developers → Create integration",
        step2: "Set redirect URL to: " + (process.env.NEXT_PUBLIC_APP_URL || "https://holly.nexamusicgroup.com") + "/api/canva/callback",
        step3: "Enable scopes: asset:read asset:write design:content:read design:content:write design:meta:read folder:read profile:read",
        step4: "Add CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI to Vercel env vars",
        step5: "User clicks /api/canva/auth to connect",
      },
    });
  } catch (error: any) {
    logger.error("Canva status check failed", { error: error.message, category: "canva" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await canvaIntegration.disconnect(userId);
    return NextResponse.json({ success: true, message: "Canva account disconnected" });
  } catch (error: any) {
    logger.error("Canva disconnect failed", { error: error.message, category: "canva" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
