import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/voice/stream
 *
 * Thin proxy → /api/voice/synthesize (Kokoro TTS or Chatterbox fallback).
 *
 * The client (enhanced-voice-output.ts) already chunks text to ~180 chars and
 * calls /api/voice/synthesize directly for each chunk. This endpoint exists as
 * a compatibility shim for any legacy callers and for optional emotion-tagging.
 *
 * Provider chain (all FREE, handled in /api/voice/synthesize):
 *   1. Kokoro-FastAPI  — Apache 2.0, self-hosted Docker, ~300ms CPU / ~50ms GPU
 *   2. Chatterbox Turbo — MIT, HF Spaces free T4 GPU, emotion tags
 *   3. Browser TTS     — handled client-side as instant fallback
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { text, voiceDescription, voice, speed } = body;

    if (!text) {
      return new Response("Text is required", { status: 400 });
    }

    logger.info("Voice stream requested (forwarding to synthesize)", {
      userId,
      textLength: text.length,
      category: "voice",
    });

    // Forward to the unified synthesize endpoint
    const synthesizeUrl = new URL("/api/voice/synthesize", req.url);
    const synthesizeResponse = await fetch(synthesizeUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        text,
        voiceDescription,
        voice,
        speed,
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
