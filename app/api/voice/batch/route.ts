import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby cap — use Coolify for unlimited

/**
 * POST /api/voice/batch
 *
 * HOLLY Voice Batch Synthesis — VoxCPM2 (primary) + Kokoro (fallback)
 *
 * Accepts an array of text chunks, fires ALL synthesis requests in parallel
 * server-side, and returns an array of base64-encoded WAV buffers.
 *
 * Provider chain per chunk (mirrors /api/voice/synthesize):
 *   1. VoxCPM2 TTS     — primary, 48kHz studio quality, emotion style tags, voice design
 *   2. Kokoro-FastAPI   — fallback, ultra-low latency, zero cold start
 *
 * Why batch?
 *   Without batch: client fires 8 requests → 8× network RTT (~100ms each) → ~800ms overhead
 *   With batch:    client fires 1 request  → all 8 synthesis calls run in parallel on server
 *                  → total time ≈ slowest single call (~3-5s on GPU VoxCPM2)
 *
 * Request body:
 *   { chunks: string[], voice?: string, speed?: number }
 *
 * Response:
 *   { results: Array<{ index: number, audio: string|null, error?: string }> }
 *   audio is base64-encoded WAV, or null if that chunk failed
 */

const VOXCPM2_TTS_URL    = process.env.VOXCPM2_TTS_URL    || "";   // primary
const KOKORO_TTS_URL     = process.env.KOKORO_TTS_URL     || "";   // fallback
const HOLLY_TTS_API_KEY  = process.env.HOLLY_TTS_API_KEY  || "";

const KOKORO_VOICE = process.env.KOKORO_VOICE || "af_heart";

const HOLLY_VOICE_DESCRIPTION =
  process.env.HOLLY_VOICE_DESCRIPTION ||
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing with emotional depth.";

const VOXCPM2_STYLE_GUIDANCE = process.env.VOXCPM2_STYLE_GUIDANCE || "natural, warm, confident";

const MAX_CHUNKS = 20; // safety cap

// ─── Text preprocessing (shared with synthesize route) ─────────────────────────
// Strips markdown/emojis, replaces symbols with spoken words, expands abbreviations,
// fixes line skipping, and optionally strips emotion tags for Kokoro.

function preprocessText(text: string, stripEmotionTags = false): string {
  let t = text;

  // Code blocks → pause
  t = t.replace(/```[\s\S]*?```/g, ".");
  t = t.replace(/`[^`]+`/g, ".");

  // Markdown
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  t = t.replace(/\|[-:\s|]+\|/g, "");
  t = t.replace(/\|/g, " ");

  // Symbols → spoken words
  t = t.replace(/→/g, ", then, ");
  t = t.replace(/←/g, ", back to, ");
  t = t.replace(/↑/g, ", up, ");
  t = t.replace(/↓/g, ", down, ");
  t = t.replace(/⇒/g, ", therefore, ");
  t = t.replace(/➜/g, ", leading to, ");
  t = t.replace(/➤/g, ", ");
  t = t.replace(/^[•●○▪▸▹◆◇■□]\s*/gm, "");
  t = t.replace(/^[-*]\s+/gm, "");
  t = t.replace(/×/g, " times ");
  t = t.replace(/÷/g, " divided by ");
  t = t.replace(/±/g, " plus or minus ");
  t = t.replace(/≈/g, " approximately ");
  t = t.replace(/&/g, " and ");
  t = t.replace(/@/g, " at ");
  t = t.replace(/#/g, " ");
  t = t.replace(/%/g, " percent ");
  t = t.replace(/—/g, ", ");
  t = t.replace(/–/g, ", ");
  t = t.replace(/\s[-–]\s/g, " ");
  t = t.replace(/\s*\/\s*/g, " or ");
  t = t.replace(/</g, " ");
  t = t.replace(/>/g, " ");

  // Abbreviations
  t = t.replace(/\bAPI\b/g, "A P I");
  t = t.replace(/\bHTML\b/g, "H T M L");
  t = t.replace(/\bCSS\b/g, "C S S");
  t = t.replace(/\bSQL\b/g, "S Q L");
  t = t.replace(/\bJSON\b/g, "J S O N");
  t = t.replace(/\bURL\b/g, "U R L");
  t = t.replace(/\bUI\b/g, "U I");
  t = t.replace(/\bBPM\b/g, "B P M");
  t = t.replace(/\bAI\b/g, "A I");
  t = t.replace(/\bLLM\b/g, "L L M");
  t = t.replace(/\bGPU\b/g, "G P U");
  t = t.replace(/\bCPU\b/g, "C P U");
  t = t.replace(/\bTypeScript\b/g, "Type Script");
  t = t.replace(/\bJavaScript\b/g, "Java Script");
  t = t.replace(/\bNext\.?js\b/g, "Next dot J S");
  t = t.replace(/\bPostgreSQL\b/g, "Postgres");
  t = t.replace(/\bi\.e\.\s/gi, "that is, ");
  t = t.replace(/\be\.g\.\s/gi, "for example, ");
  t = t.replace(/\betc\.\s/gi, "etcetera. ");
  t = t.replace(/\bv(?:s)?\.\s/gi, "versus ");

  // Numbers
  t = t.replace(/\bv(\d+)\.(\d+)/gi, "version $1 point $2");
  t = t.replace(/(\d+)\.(\d+)/g, "$1 point $2");
  t = t.replace(/(\d),(\d)/g, "$1$2");

  // Emojis
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "");

  // Emotion tags (only for Kokoro)
  if (stripEmotionTags) {
    t = t.replace(/\([^)]*tone[^)]*\)/gi, "");
    t = t.replace(/\([^)]*faster[^)]*\)/gi, "");
    t = t.replace(/\([^)]*slower[^)]*\)/gi, "");
    t = t.replace(/\([^)]*gentle[^)]*\)/gi, "");
    t = t.replace(/\([^)]*excited[^)]*\)/gi, "");
    t = t.replace(/\[(laugh|chuckle|cough|sigh|gasp|clears throat)\]/gi, "");
  }

  // Fix line skips
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, ". ");

  // Final cleanup
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\s*[.,;:]\s*[.,;:]+/g, (m) => m[0]);
  if (t.length > 0 && !/[.!?]$/.test(t)) t += ".";
  if (t.length > 8000) t = t.substring(0, 8000) + "...";

  return t;
}

// ─── Per-chunk synthesis — VoxCPM2 first, Kokoro fallback ─────────────────────

async function synthesizeOne(
  rawText: string,
  voice: string,
  speed: number
): Promise<Buffer | null> {

  // Primary: Kokoro (CPU-based, $0 cost)
  if (KOKORO_TTS_URL) {
    try {
      const text = preprocessText(rawText, true);
      const res = await fetch(KOKORO_TTS_URL.replace(/\/$/, ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
        signal: AbortSignal.timeout(30_000),
      });

      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) {
          return Buffer.from(buf);
        }
      }
    } catch {
      // fall through to VoxCPM2
    }
  }

  // Fallback: VoxCPM2 (GPU-based, uses Modal credits)
  if (VOXCPM2_TTS_URL) {
    try {
      const text = preprocessText(rawText, false);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (HOLLY_TTS_API_KEY) headers["X-API-Key"] = HOLLY_TTS_API_KEY;

      const res = await fetch(VOXCPM2_TTS_URL.replace(/\/$/, ""), {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          voice_description: HOLLY_VOICE_DESCRIPTION,
          style_guidance: VOXCPM2_STYLE_GUIDANCE,
          sample_rate: 48000,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) {
          return Buffer.from(buf);
        }
      }
    } catch {
    }
  }

  return null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!VOXCPM2_TTS_URL && !KOKORO_TTS_URL) {
      return NextResponse.json(
        {
          error: "Voice not available",
          detail:
            "No TTS provider configured. " +
            "Start VoxCPM2: docker run -p 7860:7860 openbmb/voxcpm2 " +
            "then set VOXCPM2_TTS_URL=http://localhost:7860 in your environment.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      chunks,
      voice = KOKORO_VOICE,   // Kokoro fallback voice id
      speed = 1.0,
    } = body as { chunks: string[]; voice?: string; speed?: number };

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "chunks array is required" }, { status: 400 });
    }

    const limited = chunks.slice(0, MAX_CHUNKS);

    logger.info("Voice batch synthesis requested", {
      userId,
      chunkCount: limited.length,
      primaryProvider: VOXCPM2_TTS_URL ? "voxcpm2" : "kokoro",
      category: "voice",
    });

    // Fire ALL synthesis requests in parallel — server handles multi-threading
    const promises = limited.map((chunk, i) =>
      synthesizeOne(chunk, voice, speed)  // preprocessing happens inside per-provider
        .then(buf => ({
          index: i,
          audio: buf ? buf.toString("base64") : null,
        }))
        .catch(() => ({ index: i, audio: null as string | null }))
    );

    const results = await Promise.all(promises);

    logger.info("Voice batch synthesis completed", {
      userId,
      total:     results.length,
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
