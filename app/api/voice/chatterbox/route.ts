import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * /api/voice/chatterbox — compatibility shim
 *
 * Chatterbox Turbo (MIT) is now the fallback provider in /api/voice/synthesize.
 * Primary provider is Kokoro-FastAPI (Apache 2.0, self-hosted Docker).
 * This route proxies to the unified endpoint for backwards compatibility.
 */
export async function POST(req: NextRequest) {
  // Redirect to the unified voice synthesize endpoint
  return NextResponse.redirect(new URL("/api/voice/synthesize", req.url), 308);
}

export async function GET() {
  return NextResponse.json({
    status: "active_as_fallback",
    replacement: "/api/voice/synthesize",
    message:
      "Chatterbox Turbo (MIT) is now the automatic fallback in POST /api/voice/synthesize. " +
      "Primary provider is Kokoro-FastAPI (Apache 2.0). Use /api/voice/synthesize directly.",
    providers: {
      primary: "Kokoro-FastAPI — Apache 2.0, self-hosted Docker, zero GPU credits",
      fallback: "Chatterbox Turbo — MIT, HF Spaces free T4 GPU, emotion tags",
    },
  });
}
