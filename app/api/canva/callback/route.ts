/**
 * GET /api/canva/callback?code=...&state=...
 *
 * Step 2 of PKCE OAuth: Canva redirects here after user approval.
 * We verify the state, exchange the code for tokens, then redirect
 * the user back to the dashboard with a success/error message.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canvaIntegration } from "@/lib/design/canva-integration";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle user denial
  if (error) {
    logger.warn("Canva OAuth denied by user", { error, category: "canva" });
    return NextResponse.redirect(`${APP_URL}/settings?canva=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings?canva=error&reason=missing_params`);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/sign-in`);
    }

    // Verify state (CSRF protection)
    const storedState    = req.cookies.get("canva_oauth_state")?.value;
    const codeVerifier   = req.cookies.get("canva_code_verifier")?.value;

    if (!storedState || storedState !== state) {
      logger.warn("Canva OAuth state mismatch", { userId, category: "canva" });
      return NextResponse.redirect(`${APP_URL}/settings?canva=error&reason=state_mismatch`);
    }

    if (!codeVerifier) {
      return NextResponse.redirect(`${APP_URL}/settings?canva=error&reason=missing_verifier`);
    }

    // Exchange code for tokens
    await canvaIntegration.exchangeCode(code, codeVerifier, userId);

    logger.info("Canva connected successfully", { userId, category: "canva" });

    // Clear the PKCE cookies
    const response = NextResponse.redirect(`${APP_URL}/settings?canva=connected`);
    response.cookies.delete("canva_code_verifier");
    response.cookies.delete("canva_oauth_state");
    return response;

  } catch (err: any) {
    logger.error("Canva OAuth callback failed", { error: err.message, category: "canva" });
    return NextResponse.redirect(
      `${APP_URL}/settings?canva=error&reason=${encodeURIComponent(err.message)}`
    );
  }
}
