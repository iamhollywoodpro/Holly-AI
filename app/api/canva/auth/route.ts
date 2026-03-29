/**
 * GET /api/canva/auth
 *
 * Step 1 of PKCE OAuth: generate code_verifier + state,
 * store them in a short-lived cookie, then redirect the user to Canva's
 * authorization page.
 *
 * After the user approves, Canva redirects them to /api/canva/callback.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canvaIntegration, generateCodeVerifier, generateState } from "@/lib/design/canva-integration";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canvaIntegration.isConfigured()) {
      return NextResponse.json(
        {
          error: "Canva not configured",
          detail: "Add CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_REDIRECT_URI to environment variables.",
          docs:   "https://www.canva.dev/docs/connect/creating-integrations/",
        },
        { status: 503 }
      );
    }

    const codeVerifier = generateCodeVerifier();
    const state        = generateState();

    const authUrl = canvaIntegration.buildAuthUrl(codeVerifier, state);

    // Store PKCE verifier + state in a secure, HttpOnly cookie (5-min TTL)
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("canva_code_verifier", codeVerifier, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   300, // 5 minutes
      path:     "/",
    });
    response.cookies.set("canva_oauth_state", state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   300,
      path:     "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
