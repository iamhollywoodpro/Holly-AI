import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";
import { synthesizeWithCharacter, type VoiceCharacterInput } from "@/lib/voice/holly-voice-character";
import type { HollyEmotion } from "@/components/holly/LivingLogo";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/voice/synthesize
 *
 * Holly's Voice Character Engine — NVIDIA Magpie (primary) → Kokoro (fallback)
 *
 * Pipeline: Text + Emotion → Verbal Markers → Voice Style → TTS → Audio
 *
 * NVIDIA Magpie TTS Multilingual:
 *   - Free API with emotional style control (Happy, Calm, Sad, Angry, Neutral)
 *   - 5 English voices: Sofia (primary), Aria, Jason, Leo, John
 *   - 22kHz audio, gRPC/REST streaming
 *
 * Kokoro-FastAPI (hexgrad/Kokoro-82M, Apache 2.0):
 *   - Ultra-low latency fallback (~300ms CPU)
 *   - OpenAI-compatible API at /v1/audio/speech
 */

const VOXCPM2_TTS_URL    = process.env.VOXCPM2_TTS_URL    || "";   // primary
const KOKORO_TTS_URL     = process.env.KOKORO_TTS_URL     || "";   // fallback
const HOLLY_TTS_API_KEY  = process.env.HOLLY_TTS_API_KEY  || "";
const KOKORO_VOICE       = process.env.KOKORO_VOICE       || "af_heart";

const HOLLY_VOICE_DESCRIPTION =
  process.env.HOLLY_VOICE_DESCRIPTION ||
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing with emotional depth.";

const VOXCPM2_STYLE_GUIDANCE = process.env.VOXCPM2_STYLE_GUIDANCE || "natural, warm, confident";

// ─── Comprehensive TTS Text Preprocessing ────────────────────────────────────────
//
// Fixes:
//   1. Skipped lines — collapses excessive whitespace/newlines but keeps sentence flow
//   2. Symbol reading — replaces arrows, bullets, math symbols with spoken equivalents
//   3. Word goofs — expands abbreviations, URLs, technical terms for natural speech
//   4. Markdown — strips all markdown formatting cleanly
//   5. Emojis — removed entirely (TTS can't render them)
//   6. Code blocks — replaced with brief pauses, not read aloud

function preprocessText(text: string, stripEmotionTags = false): string {
  let t = text;

  // ── Step 1: Code blocks → brief pause indicator ─────────────────────────────
  t = t.replace(/```[\s\S]*?```/g, ".");
  t = t.replace(/`[^`]+`/g, ".");

  // ── Step 2: Strip markdown formatting ───────────────────────────────────────
  t = t.replace(/#{1,6}\s/g, "");            // headings
  t = t.replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, "$1");  // bold/italic/strike
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");           // links → text only
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");                 // images → removed

  // ── Step 3: Table markdown → readable format ────────────────────────────────
  t = t.replace(/\|[-:\s|]+\|/g, "");        // table separator rows
  t = t.replace(/\|/g, " ");                 // table cell borders → space

  // ── Step 4: Replace symbols with spoken words ───────────────────────────────
  // Arrows and directional
  t = t.replace(/→/g, ", then, ");
  t = t.replace(/←/g, ", back to, ");
  t = t.replace(/↑/g, ", up, ");
  t = t.replace(/↓/g, ", down, ");
  t = t.replace(/↗/g, ", increasing, ");
  t = t.replace(/↘/g, ", decreasing, ");
  t = t.replace(/⇒/g, ", therefore, ");
  t = t.replace(/⇐/g, ", because, ");
  t = t.replace(/➜/g, ", leading to, ");
  t = t.replace(/➤/g, ", ");
  t = t.replace(/►/g, ", ");

  // Bullets and list markers
  t = t.replace(/^[•●○▪▸▹◆◇■□]\s*/gm, "");
  t = t.replace(/^[-*]\s+/gm, "");            // markdown bullets

  // Math and logic
  t = t.replace(/×/g, " times ");
  t = t.replace(/÷/g, " divided by ");
  t = t.replace(/±/g, " plus or minus ");
  t = t.replace(/≈/g, " approximately ");
  t = t.replace(/≠/g, " not equal to ");
  t = t.replace(/≤/g, " less than or equal to ");
  t = t.replace(/≥/g, " greater than or equal to ");
  t = t.replace(/∞/g, " infinity ");
  t = t.replace(/∑/g, " sum of ");
  t = t.replace(/∆/g, " delta ");
  t = t.replace(/√/g, " square root of ");

  // Common symbols
  t = t.replace(/&/g, " and ");
  t = t.replace(/@/g, " at ");
  t = t.replace(/#/g, " ");
  t = t.replace(/%/g, " percent ");
  t = t.replace(/\$/g, " dollars ");
  t = t.replace(/€/g, " euros ");
  t = t.replace(/£/g, " pounds ");
  t = t.replace(/°/g, " degrees ");
  t = t.replace(/©/g, " copyright ");
  t = t.replace(/®/g, " registered ");
  t = t.replace(/™/g, " trademark ");

  // Dashes — preserve em-dash pauses, remove stray hyphens
  t = t.replace(/—/g, ", ");                  // em-dash → pause
  t = t.replace(/–/g, ", ");                  // en-dash → pause
  t = t.replace(/\s[-–]\s/g, " ");            // hyphen between words → space

  // Slash — "and/or" style
  t = t.replace(/\s*\/\s*/g, " or ");

  // Ellipsis
  t = t.replace(/\.{3,}/g, "...");

  // Angle brackets (often from HTML or comparison)
  t = t.replace(/</g, " ");
  t = t.replace(/>/g, " ");

  // ── Step 5: Expand abbreviations for natural speech ─────────────────────────
  t = t.replace(/\bAPI\b/g, "A P I");
  t = t.replace(/\bHTML\b/g, "H T M L");
  t = t.replace(/\bCSS\b/g, "C S S");
  t = t.replace(/\bSQL\b/g, "S Q L");
  t = t.replace(/\bNoSQL\b/g, "No S Q L");
  t = t.replace(/\bREST\b/g, "R E S T");
  t = t.replace(/\bJSON\b/g, "J S O N");
  t = t.replace(/\bXML\b/g, "X M L");
  t = t.replace(/\bURL\b/g, "U R L");
  t = t.replace(/\bUI\b/g, "U I");
  t = t.replace(/\bUX\b/g, "U X");
  t = t.replace(/\bBPM\b/g, "B P M");
  t = t.replace(/\bAI\b/g, "A I");
  t = t.replace(/\bLLM\b/g, "L L M");
  t = t.replace(/\bMCP\b/g, "M C P");
  t = t.replace(/\bGPU\b/g, "G P U");
  t = t.replace(/\bCPU\b/g, "C P U");
  t = t.replace(/\bTypeScript\b/g, "Type Script");
  t = t.replace(/\bJavaScript\b/g, "Java Script");
  t = t.replace(/\bNext\.?js\b/g, "Next dot J S");
  t = t.replace(/\bNode\.?js\b/g, "Node dot J S");
  t = t.replace(/\bReact\b/g, "React");
  t = t.replace(/\bTailwind\b/g, "Tailwind");
  t = t.replace(/\bPostgreSQL\b/g, "Postgres");
  t = t.replace(/\bi\.e\.\s/gi, "that is, ");
  t = t.replace(/\be\.g\.\s/gi, "for example, ");
  t = t.replace(/\betc\.\s/gi, "etcetera. ");
  t = t.replace(/\bv(?:s)?\.\s/gi, "versus ");
  t = t.replace(/\bapprox\.\s/gi, "approximately ");
  t = t.replace(/\bdept\.\s/gi, "department ");
  t = t.replace(/\bav\w*\.\s/gi, "available ");
  t = t.replace(/\binfo\.\s/gi, "information ");

  // ── Step 6: Handle numbers for better reading ───────────────────────────────
  // Version numbers: "v2.5" → "version 2 point 5"
  t = t.replace(/\bv(\d+)\.(\d+)/gi, "version $1 point $2");
  // Decimal numbers: "3.14" → "3 point 14"
  t = t.replace(/(\d+)\.(\d+)/g, "$1 point $2");
  // Large numbers: "1,000" → "1000"
  t = t.replace(/(\d),(\d)/g, "$1$2");

  // ── Step 7: Remove emojis ───────────────────────────────────────────────────
  t = t.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  t = t.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  t = t.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  t = t.replace(/[\u{1F900}-\u{1F9FF}]/gu, "");
  t = t.replace(/[\u{1FA00}-\u{1FA6F}]/gu, "");
  t = t.replace(/[\u{1FA70}-\u{1FAFF}]/gu, "");
  t = t.replace(/[\u{2600}-\u{26FF}]/gu, "");
  t = t.replace(/[\u{2700}-\u{27BF}]/gu, "");
  t = t.replace(/[\u{FE00}-\u{FE0F}]/gu, "");
  t = t.replace(/[\u{200D}]/gu, "");
  t = t.replace(/[\u{20E3}]/gu, "");
  t = t.replace(/[\u{E0020}-\u{E007F}]/gu, "");

  // ── Step 8: Optionally strip emotion tags (for Kokoro) ──────────────────────
  if (stripEmotionTags) {
    t = t.replace(/\([^)]*tone[^)]*\)/gi, "");
    t = t.replace(/\([^)]*faster[^)]*\)/gi, "");
    t = t.replace(/\([^)]*slower[^)]*\)/gi, "");
    t = t.replace(/\([^)]*gentle[^)]*\)/gi, "");
    t = t.replace(/\([^)]*excited[^)]*\)/gi, "");
    t = t.replace(/\[(laugh|chuckle|cough|sigh|gasp|clears throat)\]/gi, "");
  }

  // ── Step 9: Fix line skips — ensure sentences flow naturally ─────────────────
  // Newlines → period + space (preserves sentence boundaries)
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, ". ");

  // ── Step 10: Final cleanup ──────────────────────────────────────────────────
  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();

  // Remove empty/stray punctuation sequences
  t = t.replace(/\s*[.,;:]\s*[.,;:]+/g, (m) => m[0]);

  // Ensure text ends with punctuation for natural TTS ending
  if (t.length > 0 && !/[.!?]$/.test(t)) {
    t += ".";
  }

  // Truncate if absurdly long
  if (t.length > 8000) {
    t = t.substring(0, 8000) + "...";
  }

  return t;
}

// ─── VoxCPM2 Synthesis ────────────────────────────────────────────────────────

async function generateWithVoxCPM2(text: string): Promise<Buffer> {
  if (!VOXCPM2_TTS_URL) {
    throw new Error("VOXCPM2_TTS_URL not configured");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HOLLY_TTS_API_KEY) headers["X-API-Key"] = HOLLY_TTS_API_KEY;

  const response = await fetch(VOXCPM2_TTS_URL.replace(/\/$/, ""), {
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

   console.log(`[TTS] VoxCPM2 response status: ${response.status} for URL: ${VOXCPM2_TTS_URL.replace(/\/$/, "")}`);

   if (!response.ok) {
     const errText = await response.text().catch(() => `HTTP ${response.status}`);
     throw new Error(`VoxCPM2 error ${response.status}: ${errText}`);
   }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("VoxCPM2 returned empty audio buffer");
  }
  return Buffer.from(arrayBuffer);
}

// ─── Kokoro Synthesis (fallback) ──────────────────────────────────────────────

async function generateWithKokoro(
  text: string,
  voice: string = KOKORO_VOICE,
  speed: number = 1.0
): Promise<Buffer> {
  if (!KOKORO_TTS_URL) {
    throw new Error("KOKORO_TTS_URL not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "audio/wav",
  };
  if (HOLLY_TTS_API_KEY) {
    headers["Authorization"] = `Bearer ${HOLLY_TTS_API_KEY}`;
  }

  const response = await fetch(`${KOKORO_TTS_URL.replace(/\/$/, "")}/v1/audio/speech`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "kokoro",
      input: text,
      voice: voice,
      response_format: "wav",
      speed: speed,
    }),
    signal: AbortSignal.timeout(30000),
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

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      text,
      temperature = 1.0,
      voice,
      speed = 1.0,
      // Voice Character Engine params
      emotion,
      previousEmotion,
      blendRatio,
      isGreeting,
      isHumorResponse,
      isProcessing,
    } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // ── Voice Character Engine (ALWAYS — Magpie primary, Kokoro fallback) ─────
    //
    // V3.5 (2026-06-30): Previously this path was gated on `if (validEmotion)`,
    // which meant callers who didn't pass an emotion fell through to a legacy
    // Kokoro-first path — Magpie was never tried. That defeated the entire
    // Voice Character Engine for the common case.
    //
    // FIX: Always route through the character engine. Default emotion to
    // "idle" when caller doesn't pass one. Magpie is now the actual primary
    // for every voice request. Kokoro stays as fallback inside the engine.
    // VoxCPM2 stays as the third-tier final fallback (engine doesn't try it).

    if (!VOXCPM2_TTS_URL && !KOKORO_TTS_URL && !process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        {
          error: "Voice not available",
          detail:
            "No TTS provider configured. " +
            "Set NVIDIA_API_KEY for Magpie TTS (primary), " +
            "KOKORO_TTS_URL for Kokoro fallback, or " +
            "VOXCPM2_TTS_URL for VoxCPM2 final fallback.",
        },
        { status: 503 }
      );
    }

    const finalEmotion = (emotion as HollyEmotion | undefined) ?? "idle";

    logger.info("Voice synthesis requested", {
      userId,
      textLength: text.length,
      emotion: finalEmotion,
      primaryProvider: "nvidia-magpie",
      category: "voice",
    });

    const result = await synthesizeWithCharacter(
      {
        text,
        emotion: finalEmotion,
        previousEmotion: previousEmotion as HollyEmotion | undefined,
        blendRatio,
        speed,
        voice,
        isGreeting,
        isHumorResponse,
        isProcessing,
        userId,
      },
      // Inject Kokoro as fallback synthesizer (used by character engine
      // when Magpie is unavailable or fails)
      async (txt, v, s) => {
        if (!KOKORO_TTS_URL) throw new Error("Kokoro not configured");
        return generateWithKokoro(preprocessText(txt, true), v, s);
      }
    );

    if (result.audio) {
      const providerHeader = result.provider === "nvidia-magpie"
        ? "nvidia-magpie"
        : "kokoro";

      logger.info("Voice synthesis completed", {
        userId,
        audioSize: result.audio.length,
        provider: providerHeader,
        emotion: finalEmotion,
        category: "voice",
      });

      return new NextResponse(result.audio as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":    result.contentType || "audio/wav",
          "Content-Length":  result.audio.length.toString(),
          "Cache-Control":   "private, max-age=3600",
          "X-Voice-Provider": providerHeader,
          "X-Voice-Emotion":  finalEmotion,
          "X-Voice-Style":    result.prosody.style,
          "X-Voice-Speed":   result.prosody.speed.toString(),
          "X-Voice-Markers": result.markersApplied.join(","),
        },
      });
    }

    // ── Final fallback: VoxCPM2 (only reached if Magpie AND Kokoro both failed)
    //
    // The character engine already tried Magpie → Kokoro. If we land here,
    // both are down. VoxCPM2 is the last resort (GPU-based, Modal credits).
    if (VOXCPM2_TTS_URL) {
      try {
        const voxcpmText = preprocessText(text, false);
        const audioBuffer = await generateWithVoxCPM2(voxcpmText);

        logger.warn("Voice synthesis fell back to VoxCPM2 (Magpie + Kokoro both failed)", {
          userId,
          audioSize: audioBuffer.length,
          provider: "voxcpm2",
          category: "voice",
        });

        return new NextResponse(audioBuffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type":   "audio/wav",
            "Content-Length": audioBuffer.length.toString(),
            "Cache-Control":  "private, max-age=3600",
            "X-Voice-Provider": "voxcpm2",
            "X-Voice-Model":    "voxcpm2-48khz",
          },
        });
      } catch (voxcpmErr: any) {
        console.warn(`[TTS] VoxCPM2 final fallback also failed: ${voxcpmErr.message}`);
        logger.error("All TTS providers failed", {
          error: voxcpmErr.message,
          category: "voice",
        });
      }
    }

    return NextResponse.json(
      {
        error: "TTS synthesis failed",
        detail: `All providers failed. Magpie: ${process.env.NVIDIA_API_KEY ? "error" : "not configured"}, Kokoro: ${KOKORO_TTS_URL ? "error" : "not configured"}, VoxCPM2: ${VOXCPM2_TTS_URL ? "error" : "not configured"}`,
      },
      { status: 503 }
    );
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

export async function GET() {
  return NextResponse.json({
    service: "Holly Voice Character Engine",
    voice_identity: "Holly — AI partner with emotional voice",
    engine: {
      name: "Voice Character Engine",
      description: "Text + Emotion → Verbal Markers → Voice Style → TTS → Audio",
      features: [
        "11 emotion-to-voice mappings with noticeable vocal shifts",
        "Verbal personality markers (laughs, hmms, sighs, natural fillers)",
        "Emotion blending for smooth transitions",
        "Provider-agnostic architecture (swap TTS without rework)",
      ],
    },
    providers: {
      primary: {
        name:        "NVIDIA Magpie TTS Multilingual",
        description: "Emotion-aware TTS with 5 styles and 5 English voices",
        configured:  !!(process.env.NVIDIA_API_KEY),
        voices:      ["Sofia", "Aria", "Jason", "Leo", "John"],
        styles:      ["Happy", "Calm", "Sad", "Angry", "Neutral"],
        cost:        "Free tier (1,000–5,000 credits, 40 req/min)",
      },
      fallback: {
        name:        "Kokoro-FastAPI",
        model:       "hexgrad/Kokoro-82M",
        license:     "Apache 2.0",
        latency:     "~300ms CPU / ~50ms GPU",
        cost:        "$0/month — self-hosted Docker",
        configured:  !!KOKORO_TTS_URL,
        url:         KOKORO_TTS_URL || "not set",
        voices: [
          "af_heart", "af_bella", "af_sky", "af_sarah", "af_nicole",
          "af_alloy", "af_aoede", "af_kore", "af_river",
          "bf_emma", "bf_isabella", "am_adam", "bm_lewis",
        ],
        active_voice: KOKORO_VOICE,
      },
      legacy: {
        name:        "VoxCPM2",
        description: "48kHz studio-quality synthesis (GPU-based, Modal credits)",
        configured:  !!VOXCPM2_TTS_URL,
        url:         VOXCPM2_TTS_URL || "not set",
      },
    },
    text_preprocessing: {
      description: "Comprehensive TTS text cleaning for natural speech",
      features: [
        "Markdown stripping (bold, italic, links, images, headings, tables)",
        "Symbol-to-speech conversion (arrows → 'then', bullets removed, math symbols expanded)",
        "Abbreviation expansion (API → A P I, i.e. → that is, e.g. → for example)",
        "Number formatting (v2.5 → version 2 point 5, decimals spoken naturally)",
        "Emoji removal (all Unicode emoji ranges)",
        "Newline preservation (double newlines → sentence pauses, single → continuation)",
        "Code block replacement (→ brief pause instead of reading code)",
        "Verbal marker injection (personality sounds based on emotion)",
      ],
    },
    api_params: {
      emotion:   "HollyEmotion: focused | curious | creative | excited | contemplative | empathetic | analyzing | researching | generating | dreaming | idle",
      previousEmotion: "HollyEmotion (optional, for blending)",
      blendRatio: "0.0–1.0 (optional, 1.0 = fully current emotion)",
      isGreeting: "boolean (optional, adds warm laugh)",
      isHumorResponse: "boolean (optional, adds chuckle)",
      isProcessing: "boolean (optional, adds thoughtful hmm)",
    },
  });
}
