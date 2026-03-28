import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/voice/synthesize
 *
 * HOLLY's Voice — Maya1 via Modal.com (FREE GPU, Apache 2.0)
 *
 * Maya1 is the ONLY voice provider. No paid TTS, no Google, no ElevenLabs.
 * If Modal is down, voice synthesis is unavailable — clear error returned.
 */

// HOLLY's voice profile for Maya1
const HOLLY_VOICE_DESCRIPTION =
  process.env.MAYA1_VOICE_DESCRIPTION ||
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing with emotional depth.";

const HOLLY_MAYA1_TTS_URL = process.env.HOLLY_MAYA1_TTS_URL || "";
const HOLLY_TTS_API_KEY   = process.env.HOLLY_TTS_API_KEY || "";

// ─── Text Preprocessing ───────────────────────────────────────────────────────

function preprocessText(text: string): string {
  let cleaned = text;

  // Strip markdown formatting
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`[^`]+`/g, "");
  cleaned = cleaned.replace(/[*_#~]/g, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Strip emojis but keep Maya1 emotion tags (e.g. <laugh>)
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, "");
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, "");

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (cleaned.length > 4000) {
    cleaned = cleaned.substring(0, 4000) + "...";
  }

  return cleaned;
}

// ─── Maya1 via Modal ──────────────────────────────────────────────────────────

async function generateWithMaya1(
  text: string,
  description: string,
  temperature: number = 0.4
): Promise<Buffer> {
  if (!HOLLY_MAYA1_TTS_URL) {
    throw new Error(
      "HOLLY_MAYA1_TTS_URL not set. Deploy the Maya1 Modal service and add the URL to Vercel env vars."
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (HOLLY_TTS_API_KEY) {
    headers["X-API-Key"] = HOLLY_TTS_API_KEY;
  }

  const response = await fetch(HOLLY_MAYA1_TTS_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      description,
      temperature,
      top_p: 0.9,
    }),
    signal: AbortSignal.timeout(30000), // 30s — Modal cold start is ~10–15s
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Maya1 error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("Maya1 returned an empty audio buffer");
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
    const { text, voiceDescription, temperature = 0.4 } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!HOLLY_MAYA1_TTS_URL) {
      return NextResponse.json(
        {
          error: "Voice not available",
          detail: "Maya1 TTS service not configured. Set HOLLY_MAYA1_TTS_URL in Vercel.",
        },
        { status: 503 }
      );
    }

    const cleanedText = preprocessText(text);
    const voiceDesc   = voiceDescription || HOLLY_VOICE_DESCRIPTION;

    logger.info("Voice synthesis requested", {
      userId,
      textLength: cleanedText.length,
      provider: "maya1-modal",
      category: "voice",
    });

    const audioBuffer = await generateWithMaya1(cleanedText, voiceDesc, temperature);

    logger.info("Voice synthesis completed", {
      userId,
      audioSize: audioBuffer.length,
      provider: "maya1-modal",
      category: "voice",
    });

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        "X-Voice-Provider": "maya1-modal",
        "X-Voice-Model": "maya-research/maya1",
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

/**
 * GET /api/voice/synthesize
 */
export async function GET() {
  return NextResponse.json({
    service: "HOLLY Voice Synthesis",
    provider: "Maya1 via Modal.com (FREE GPU)",
    model: "maya-research/maya1",
    license: "Apache 2.0",
    configured: !!HOLLY_MAYA1_TTS_URL,
    voice: HOLLY_VOICE_DESCRIPTION,
    emotions: [
      { tag: "<laugh>",        description: "Natural laugh" },
      { tag: "<laugh_harder>", description: "Louder, harder laugh" },
      { tag: "<chuckle>",      description: "Soft chuckle" },
      { tag: "<giggle>",       description: "Light giggle" },
      { tag: "<whisper>",      description: "Whispered voice" },
      { tag: "<sigh>",         description: "Soft sigh" },
      { tag: "<gasp>",         description: "Surprised gasp" },
      { tag: "<cry>",          description: "Emotional crying" },
      { tag: "<angry>",        description: "Stern/angry tone" },
      { tag: "<excited>",      description: "Enthusiastic delivery" },
      { tag: "<snort>",        description: "Snort laugh" },
    ],
    setup: {
      step1: "cd services/maya1-tts && modal deploy modal_deploy.py",
      step2: "Add HOLLY_MAYA1_TTS_URL to Vercel env vars",
      step3: "(Optional) Add HOLLY_TTS_API_KEY for security",
      docs: "https://huggingface.co/maya-research/maya1",
    },
  });
}
