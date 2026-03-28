import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { maya1Service, addEmotionsToText } from "@/lib/voice/maya1-service";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/voice/stream
 * 
 * Redirects to /api/voice/synthesize for now.
 * True streaming will be available when vLLM is deployed on Modal.
 * 
 * For the current Maya1 Modal deployment, audio is returned as a single WAV file.
 * The client (enhanced-voice-output.ts) streams it via HTML Audio natively.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { text, voiceDescription, addEmotions, emotionContext } = body;

    if (!text) {
      return new Response("Text is required", { status: 400 });
    }

    // Add emotions if requested
    const processedText = addEmotions && emotionContext
      ? addEmotionsToText(text, emotionContext)
      : text;

    logger.info("Voice stream requested (forwarding to synthesize)", {
      userId,
      textLength: processedText.length,
      category: "voice",
    });

    // Forward to the unified synthesize endpoint
    const synthesizeUrl = new URL("/api/voice/synthesize", req.url);
    const synthesizeResponse = await fetch(synthesizeUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward auth headers
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        text: processedText,
        voiceDescription,
      }),
    });

    if (!synthesizeResponse.ok) {
      const err = await synthesizeResponse.text();
      return new Response(`Voice synthesis failed: ${err}`, {
        status: synthesizeResponse.status,
      });
    }

    const audioBuffer = await synthesizeResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600",
        "X-Voice-Provider": synthesizeResponse.headers.get("X-Voice-Provider") || "unknown",
      },
    });
  } catch (error: any) {
    logger.error("Voice stream failed", {
      error: error.message,
      category: "voice",
    });

    return new Response(`Voice stream failed: ${error.message}`, {
      status: 500,
    });
  }
}
