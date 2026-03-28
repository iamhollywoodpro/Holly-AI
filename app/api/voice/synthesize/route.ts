import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 90; // Modal cold start can take ~20s on first hit

/**
 * POST /api/voice/synthesize
 * 
 * HOLLY's Primary Voice — Maya1 via Modal.com (FREE GPU)
 * Fallback → Gemini TTS (free) if Modal is unavailable
 * 
 * Single voice pipeline — no duplicate audio, no two voices at once.
 */

// HOLLY's voice profile for Maya1
const HOLLY_VOICE_DESCRIPTION =
  process.env.MAYA1_VOICE_DESCRIPTION ||
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing with emotional depth.";

const HOLLY_MAYA1_TTS_URL = process.env.HOLLY_MAYA1_TTS_URL || "";
const HOLLY_TTS_API_KEY   = process.env.HOLLY_TTS_API_KEY || "";
const GEMINI_API_KEY      = process.env.GEMINI_API_KEY || "";

// ─── Text Preprocessing ───────────────────────────────────────────────────────

function preprocessText(text: string): string {
  let cleaned = text;

  // Strip markdown formatting
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");    // code blocks
  cleaned = cleaned.replace(/`[^`]+`/g, "");            // inline code
  cleaned = cleaned.replace(/[*_#~]/g, "");              // bold/italic/headers
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // links

  // Strip emojis but keep emotion tags (e.g. <laugh>)
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, "");
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, "");

  // Trim & collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Limit length (avoid very long TTS)
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
    throw new Error("HOLLY_MAYA1_TTS_URL not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Optional API key for security
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
    signal: AbortSignal.timeout(80000), // 80s timeout (allows for cold start)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Maya1 Modal API error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Gemini TTS Fallback ──────────────────────────────────────────────────────

async function generateWithGemini(text: string): Promise<Buffer> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Sulafat" },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini TTS error: ${response.status}`);
  }

  const json = await response.json();
  const audioData =
    json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioData) {
    throw new Error("No audio data in Gemini response");
  }

  // Gemini returns raw PCM (24kHz 16-bit mono) — wrap in WAV header
  const pcm = Buffer.from(audioData, "base64");
  return addWavHeader(pcm, 24000, 16, 1);
}

function addWavHeader(
  pcmData: Buffer,
  sampleRate: number,
  bitDepth: number,
  channels: number
): Buffer {
  const dataSize   = pcmData.length;
  const headerSize = 44;
  const wav        = Buffer.alloc(headerSize + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(headerSize + dataSize - 8, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);                               // PCM chunk size
  wav.writeUInt16LE(1, 20);                                // PCM format
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  wav.writeUInt16LE(channels * (bitDepth / 8), 32);
  wav.writeUInt16LE(bitDepth, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmData.copy(wav, headerSize);

  return wav;
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
      temperature = 0.4,
    } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const cleanedText  = preprocessText(text);
    const voiceDesc    = voiceDescription || HOLLY_VOICE_DESCRIPTION;

    logger.info("Voice synthesis requested", {
      userId,
      textLength: cleanedText.length,
      provider: HOLLY_MAYA1_TTS_URL ? "maya1-modal" : "gemini-fallback",
      category: "voice",
    });

    let audioBuffer: Buffer;
    let providerUsed = "unknown";

    // ── Primary: Maya1 via Modal ──────────────────────────────────────────────
    if (HOLLY_MAYA1_TTS_URL) {
      try {
        audioBuffer  = await generateWithMaya1(cleanedText, voiceDesc, temperature);
        providerUsed = "maya1-modal";
        logger.info("Maya1 voice synthesis succeeded", {
          audioSize: audioBuffer.length,
          category: "voice",
        });
      } catch (maya1Error: any) {
        // ── Fallback: Gemini TTS ────────────────────────────────────────────
        logger.warn("Maya1 failed, falling back to Gemini TTS", {
          error: maya1Error.message,
          category: "voice",
        });

        if (GEMINI_API_KEY) {
          audioBuffer  = await generateWithGemini(cleanedText);
          providerUsed = "gemini-fallback";
        } else {
          throw new Error(
            `Maya1 unavailable and no Gemini fallback: ${maya1Error.message}`
          );
        }
      }
    } else if (GEMINI_API_KEY) {
      // Modal not configured yet — use Gemini until Modal is deployed
      audioBuffer  = await generateWithGemini(cleanedText);
      providerUsed = "gemini-only";
    } else {
      return NextResponse.json(
        {
          error:
            "No TTS provider configured. Set HOLLY_MAYA1_TTS_URL (Modal) or GEMINI_API_KEY.",
        },
        { status: 503 }
      );
    }

    logger.info("Voice synthesis completed", {
      userId,
      audioSize: audioBuffer.length,
      provider: providerUsed,
      category: "voice",
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        "X-Voice-Provider": providerUsed,
        "X-Voice-Model": providerUsed.includes("maya1") ? "maya-research/maya1" : "gemini-2.5-flash",
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
 * Returns service info and available emotions
 */
export async function GET() {
  const modalConfigured  = !!HOLLY_MAYA1_TTS_URL;
  const geminiConfigured = !!GEMINI_API_KEY;

  return NextResponse.json({
    service: "HOLLY Voice Synthesis",
    primaryProvider: modalConfigured ? "Maya1 (Modal.com GPU)" : null,
    fallbackProvider: geminiConfigured ? "Gemini TTS" : null,
    activeProvider: modalConfigured
      ? "maya1-modal"
      : geminiConfigured
      ? "gemini-only"
      : "none",
    modelUrl: "https://huggingface.co/maya-research/maya1",
    license: "Apache 2.0",
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
    examples: [
      "Hello Hollywood! I'm ready when you are.",
      "Great news! <laugh> The deployment just succeeded.",
      "I've been thinking about this... <sigh> it's more complex than it looks.",
      "Oh! <gasp> That's a brilliant idea, Hollywood.",
      "Just between us <whisper> I think this is the best version yet</whisper>.",
    ],
    setup: {
      step1: "Deploy Modal service: cd services/maya1-tts && modal deploy modal_deploy.py",
      step2: "Add HOLLY_MAYA1_TTS_URL to Vercel env vars",
      step3: "Optionally add HOLLY_TTS_API_KEY for security",
      docs: "See services/maya1-tts/MODAL_SETUP.md for full guide",
    },
  });
}
