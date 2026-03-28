import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * /api/voice/chatterbox — DEPRECATED
 * 
 * Chatterbox TTS has been replaced by Maya1 (Modal.com GPU).
 * All voice requests are now handled by /api/voice/synthesize.
 * This route redirects for backwards compatibility.
 */
export async function POST(req: NextRequest) {
  // Redirect to the unified voice synthesize endpoint
  return NextResponse.redirect(new URL("/api/voice/synthesize", req.url), 308);
}

export async function GET() {
  return NextResponse.json({
    deprecated: true,
    replacement: "/api/voice/synthesize",
    message:
      "Chatterbox TTS has been replaced by Maya1 (Modal.com GPU). " +
      "Use POST /api/voice/synthesize instead.",
    newVoice: "Maya1 — 20+ emotions, Apache 2.0, FREE GPU via Modal.com",
  });
}
