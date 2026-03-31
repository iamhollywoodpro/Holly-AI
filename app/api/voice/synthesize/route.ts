import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/voice/synthesize
 *
 * HOLLY's Voice — Kokoro TTS (FREE, Apache 2.0, Zero Cold Starts)
 *
 * Provider chain (first available wins):
 *   1. Kokoro-FastAPI   — self-hosted Docker, OpenAI-compatible, ~300ms CPU / ~50ms GPU
 *   2. Chatterbox Turbo — self-hosted HF Space, MIT license, expressive + voice-cloning
 *   3. Browser fallback — handled client-side in enhanced-voice-output.ts
 *
 * No paid TTS. No Modal GPU credits. No cold starts. No subscriptions. Ever.
 *
 * Setup:
 *   Kokoro:     cd services/kokoro-tts && docker compose up  → set KOKORO_TTS_URL
 *   Chatterbox: deploy to HF Space                          → set CHATTERBOX_TTS_URL
 */

// ─── Environment ──────────────────────────────────────────────────────────────

const KOKORO_TTS_URL     = process.env.KOKORO_TTS_URL     || "";   // e.g. http://localhost:8880
const CHATTERBOX_TTS_URL = process.env.CHATTERBOX_TTS_URL || "";   // HF Space or self-hosted
const HOLLY_TTS_API_KEY  = process.env.HOLLY_TTS_API_KEY  || "";   // optional shared secret

// HOLLY's voice — Kokoro voice ID + Chatterbox description
// Kokoro voices: af_heart, af_bella, af_sky, af_sarah, af_nicole, bf_emma, bf_isabella
const KOKORO_VOICE = process.env.KOKORO_VOICE || "af_heart";

const HOLLY_VOICE_DESCRIPTION =
  process.env.HOLLY_VOICE_DESCRIPTION ||
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing with emotional depth.";

// ─── Text Preprocessing ───────────────────────────────────────────────────────

function preprocessText(text: string): string {
  let t = text;

  // Strip markdown — keep Kokoro/Chatterbox emotion tags intact
  t = t.replace(/```[\s\S]*?```/g, " code block. ");
  t = t.replace(/`[^`]+`/g, " code. ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");

  // Strip emojis but preserve emotion tags like [laugh], <laugh>
  t = t.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  t = t.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  t = t.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  t = t.replace(/[\u{2600}-\u{26FF}]/gu, "");
  t = t.replace(/[\u{2700}-\u{27BF}]/gu, "");

  t = t.replace(/\s+/g, " ").trim();

  // The enhanced-voice-output client chunks into ~180-char pieces before calling here.
  // This cap handles any direct / large API calls gracefully.
  if (t.length > 8000) {
    t = t.substring(0, 8000) + "...";
  }

  return t;
}

// ─── Provider 1: Kokoro-FastAPI (OpenAI-compatible) ───────────────────────────
//
// Kokoro-FastAPI exposes POST /v1/audio/speech (OpenAI Speech API compatible).
// Run locally:  docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
// Run on GPU:   docker run --gpus all -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest
//
// Available voices: af_heart, af_bella, af_sky, af_sarah, af_nicole,
//                   af_alloy, af_aoede, af_kore, af_river,
//                   bf_emma, bf_isabella, am_adam, bm_lewis
// Voice mixing:     "af_heart(2)+af_bella(1)" for 67%/33% blend

async function generateWithKokoro(
  text: string,
  voice: string = KOKORO_VOICE,
  speed: number = 1.0
): Promise<Buffer> {
  if (!KOKORO_TTS_URL) {
    throw new Error("KOKORO_TTS_URL not configured");
  }

  const endpoint = `${KOKORO_TTS_URL.replace(/\/$/, "")}/v1/audio/speech`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "audio/wav",
  };
  if (HOLLY_TTS_API_KEY) {
    headers["Authorization"] = `Bearer ${HOLLY_TTS_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "kokoro",
      input: text,
      voice: voice,
      response_format: "wav",
      speed: speed,
    }),
    signal: AbortSignal.timeout(30000), // 30s — CPU inference ~300ms/sentence, well within budget
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Kokoro error ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Kokoro returned empty audio buffer");
  }
  return Buffer.from(arrayBuffer);
}

// ─── Provider 2: Chatterbox Turbo (MIT, expressive, voice-cloning) ────────────
//
// Deploy to Hugging Face Spaces (free T4 GPU) or self-host via Docker.
// HF Space: https://huggingface.co/spaces/ResembleAI/Chatterbox
// Self-host: docker run -p 7860:7860 resemble/chatterbox-turbo
//
// Emotion tags supported: [laugh] [chuckle] [cough] [sigh] [gasp] [clears throat]

async function generateWithChatterbox(text: string): Promise<Buffer> {
  if (!CHATTERBOX_TTS_URL) {
    throw new Error("CHATTERBOX_TTS_URL not configured");
  }

  const endpoint = `${CHATTERBOX_TTS_URL.replace(/\/$/, "")}/api/tts`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (HOLLY_TTS_API_KEY) {
    headers["X-API-Key"] = HOLLY_TTS_API_KEY;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      voice_description: HOLLY_VOICE_DESCRIPTION,
      exaggeration: 0.4,   // 0–1: expressiveness level (0.4 = natural but expressive)
      cfg_weight: 0.5,     // classifier-free guidance
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Chatterbox error ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Chatterbox returned empty audio buffer");
  }
  return Buffer.from(arrayBuffer);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      text,
      voiceDescription,
      temperature = 1.0,   // unused by Kokoro but kept for API compat
      voice,               // override Kokoro voice (optional)
      speed = 1.0,         // speech speed multiplier
      provider,            // force a specific provider: "kokoro" | "chatterbox"
    } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Check at least one provider is configured
    if (!KOKORO_TTS_URL && !CHATTERBOX_TTS_URL) {
      return NextResponse.json(
        {
          error: "Voice not available",
          detail:
            "No TTS provider configured. " +
            "Run Kokoro locally: docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest " +
            "then set KOKORO_TTS_URL=http://localhost:8880 in your .env.local",
          setup: {
            kokoro: "cd services/kokoro-tts && docker compose up",
            docs: "https://github.com/remsky/Kokoro-FastAPI",
          },
        },
        { status: 503 }
      );
    }

    const cleanedText = preprocessText(text);
    const kokoroVoice  = voice || KOKORO_VOICE;

    logger.info("Voice synthesis requested", {
      userId,
      textLength: cleanedText.length,
      provider: provider || "auto",
      category: "voice",
    });

    let audioBuffer: Buffer | null = null;
    let usedProvider = "none";

    // ── Try Kokoro first (fastest, zero cost, no cold start) ──────────────────
    if (!provider || provider === "kokoro") {
      if (KOKORO_TTS_URL) {
        try {
          audioBuffer  = await generateWithKokoro(cleanedText, kokoroVoice, speed);
          usedProvider = "kokoro";
        } catch (kokoroErr: any) {
          logger.warn("Kokoro TTS failed, trying Chatterbox fallback", {
            error: kokoroErr.message,
            category: "voice",
          });
        }
      }
    }

    // ── Fallback to Chatterbox if Kokoro failed or forced ─────────────────────
    if (!audioBuffer && (!provider || provider === "chatterbox")) {
      if (CHATTERBOX_TTS_URL) {
        try {
          audioBuffer  = await generateWithChatterbox(cleanedText);
          usedProvider = "chatterbox";
        } catch (cbErr: any) {
          logger.error("Chatterbox TTS also failed", {
            error: cbErr.message,
            category: "voice",
          });
        }
      }
    }

    if (!audioBuffer) {
      return NextResponse.json(
        {
          error: "All TTS providers failed",
          detail: "Both Kokoro and Chatterbox are unavailable. Check your Docker services.",
          kokoro_url: KOKORO_TTS_URL || "not set",
          chatterbox_url: CHATTERBOX_TTS_URL || "not set",
        },
        { status: 503 }
      );
    }

    logger.info("Voice synthesis completed", {
      userId,
      audioSize: audioBuffer.length,
      provider: usedProvider,
      category: "voice",
    });

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":       "audio/wav",
        "Content-Length":     audioBuffer.length.toString(),
        "Cache-Control":      "private, max-age=3600",
        "X-Voice-Provider":   usedProvider,
        "X-Voice-Model":      usedProvider === "kokoro" ? "kokoro-82M" : "chatterbox-turbo",
        "X-Kokoro-Voice":     kokoroVoice,
      },
    });
  } catch (error: any) {
    logger.error("Voice synthesis failed", {
      error: error.message,
      category: "voice",
    });
    return NextResponse.json(
      { error: `Voice synthesis failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// ─── GET: service info & setup guide ─────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service:        "HOLLY Voice Synthesis",
    providers: {
      primary: {
        name:       "Kokoro-FastAPI",
        model:      "hexgrad/Kokoro-82M",
        license:    "Apache 2.0",
        latency:    "~300ms CPU / ~50ms GPU",
        cost:       "$0/month — self-hosted Docker",
        configured: !!KOKORO_TTS_URL,
        url:        KOKORO_TTS_URL || "not set — run: docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest",
        voices: [
          "af_heart", "af_bella", "af_sky", "af_sarah", "af_nicole",
          "af_alloy", "af_aoede", "af_kore", "af_river",
          "bf_emma", "bf_isabella", "am_adam", "bm_lewis",
        ],
        voice_mixing: "Combine voices: 'af_heart(2)+af_bella(1)' for 67%/33% blend",
        active_voice: KOKORO_VOICE,
      },
      fallback: {
        name:       "Chatterbox Turbo",
        model:      "ResembleAI/chatterbox-turbo",
        license:    "MIT",
        latency:    "~150ms GPU / ~2-3s CPU",
        cost:       "$0/month — HF Spaces free T4 or self-hosted",
        configured: !!CHATTERBOX_TTS_URL,
        url:        CHATTERBOX_TTS_URL || "not set",
        emotion_tags: ["[laugh]", "[chuckle]", "[cough]", "[sigh]", "[gasp]", "[clears throat]"],
      },
    },
    setup: {
      kokoro: {
        step1: "cd services/kokoro-tts && docker compose up",
        step2: "Add KOKORO_TTS_URL=http://localhost:8880 to .env.local",
        step3: "Optionally set KOKORO_VOICE=af_heart (default)",
        docs:  "https://github.com/remsky/Kokoro-FastAPI",
      },
      chatterbox: {
        step1: "Deploy to HF Spaces: https://huggingface.co/spaces/ResembleAI/Chatterbox",
        step2: "Or self-host: docker run -p 7860:7860 resemble/chatterbox-turbo",
        step3: "Add CHATTERBOX_TTS_URL to .env.local",
        docs:  "https://github.com/resemble-ai/chatterbox",
      },
    },
    migration_note:
      "Maya1 required a Modal.com A10G GPU ($1.10/hr). With the 4-min keep-alive ping " +
      "it burned ~$792/month 24/7. Kokoro runs on CPU for $0 forever.",
  });
}
