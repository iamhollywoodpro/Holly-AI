import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/voice/batch
 *
 * Accepts an array of text chunks, fires ALL Kokoro requests in parallel
 * server-side, and returns an array of base64-encoded WAV buffers.
 *
 * Why this matters:
 *   Without batch: client fires 8 requests → 8× network RTT (each ~100ms) → adds ~800ms overhead
 *   With batch:    client fires 1 request  → all 8 Kokoro calls run in parallel on server
 *                  → total time ≈ slowest single Kokoro call (~3-5s)
 *
 * Request body:
 *   { chunks: string[], voice?: string, speed?: number }
 *
 * Response:
 *   { results: Array<{ index: number, audio: string|null, error?: string }> }
 *   audio is base64-encoded WAV, or null if that chunk failed
 */

const KOKORO_TTS_URL  = process.env.KOKORO_TTS_URL  || "";
const CHATTERBOX_URL  = process.env.CHATTERBOX_TTS_URL || "";
const HOLLY_TTS_KEY   = process.env.HOLLY_TTS_API_KEY  || "";
const KOKORO_VOICE    = process.env.KOKORO_VOICE || "af_heart";

const MAX_CHUNKS = 20; // safety cap

function preprocessText(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, " code block. ");
  t = t.replace(/`[^`]+`/g, " code. ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

async function synthesizeOne(
  text: string,
  voice: string,
  speed: number
): Promise<Buffer | null> {
  // Try Kokoro first
  if (KOKORO_TTS_URL) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "audio/wav",
      };
      if (HOLLY_TTS_KEY) headers["Authorization"] = `Bearer ${HOLLY_TTS_KEY}`;

      const res = await fetch(`${KOKORO_TTS_URL.replace(/\/$/, "")}/v1/audio/speech`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "kokoro",
          input: text,
          voice,
          response_format: "wav",
          speed,
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) return Buffer.from(buf);
      }
    } catch {
      // fall through to Chatterbox
    }
  }

  // Chatterbox fallback
  if (CHATTERBOX_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (HOLLY_TTS_KEY) headers["X-API-Key"] = HOLLY_TTS_KEY;

      const res = await fetch(`${CHATTERBOX_URL.replace(/\/$/, "")}/api/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, exaggeration: 0.4, cfg_weight: 0.5 }),
        signal: AbortSignal.timeout(60_000),
      });

      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) return Buffer.from(buf);
      }
    } catch {
      // both failed
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!KOKORO_TTS_URL && !CHATTERBOX_URL) {
      return NextResponse.json({ error: "No TTS provider configured" }, { status: 503 });
    }

    const body = await req.json();
    const {
      chunks,
      voice = KOKORO_VOICE,
      speed = 1.0,
    } = body as { chunks: string[]; voice?: string; speed?: number };

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "chunks array is required" }, { status: 400 });
    }

    const limited = chunks.slice(0, MAX_CHUNKS);

    logger.info("Voice batch synthesis requested", {
      userId,
      chunkCount: limited.length,
      category: "voice",
    });

    // Fire ALL Kokoro requests in parallel — server handles multi-threading
    const promises = limited.map((chunk, i) =>
      synthesizeOne(preprocessText(chunk), voice, speed)
        .then(buf => ({
          index: i,
          audio: buf ? buf.toString("base64") : null,
        }))
        .catch(() => ({ index: i, audio: null as string | null }))
    );

    const results = await Promise.all(promises);

    logger.info("Voice batch synthesis completed", {
      userId,
      total: results.length,
      succeeded: results.filter(r => r.audio !== null).length,
      category: "voice",
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    logger.error("Voice batch synthesis failed", {
      error: error.message,
      category: "voice",
    });
    return NextResponse.json(
      { error: `Voice batch failed: ${error.message}` },
      { status: 500 }
    );
  }
}
