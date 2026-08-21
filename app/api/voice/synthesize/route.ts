import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/monitoring/logger";
import { synthesizeWithCharacter, type VoiceCharacterInput } from "@/lib/voice/holly-voice-character";
import type { HollyEmotion } from "@/components/holly/LivingLogo";

export const runtime = "nodejs";
// Qwen3 warm generation is 25–90s — needs headroom over the old 60s Magpie budget
export const maxDuration = 120;

/**
 * POST /api/voice/synthesize
 *
 * Holly's Voice Character Engine
 *
 * Pipeline: Text + Emotion → Verbal Markers → Voice Style → TTS → Audio
 *
 * Primary: Qwen3-TTS Vivian (self-hosted Modal GPU, 2026-08-20 bake-off
 * winner — bo_qwen3_vivian_casual). Emotion drives the model's `instruct`
 * string (trigger-word emote system; instruct is never spoken or shown).
 *
 * Fallback: NVIDIA Magpie Sofia (plain, 48kHz, tail-clip ".." workaround).
 *
 * Kokoro + VoxCPM2 removed 2026-08-12 (Roadmap B1) — dead fallback weight.
 */

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

    // ── Voice Character Engine (Qwen3 Vivian primary, Magpie Sofia fallback) ──

    if (!process.env.MODAL_TTS_QWEN3_URL && !process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        {
          error: "Voice not available",
          detail:
            "No TTS provider configured. Set MODAL_TTS_QWEN3_URL (primary) " +
            "and/or NVIDIA_API_KEY (fallback) for voice synthesis.",
        },
        { status: 503 }
      );
    }

    const finalEmotion = (emotion as HollyEmotion | undefined) ?? "idle";

    // GPU LEDGER GATE (Steve, 2026-08-12): Qwen3 on Modal is the only paid
    // TTS lane (Magpie is free) — daily quota + monthly cap before synth.
    const { checkQuota, recordUsage } = await import("@/lib/ai/gpu-ledger");
    const ttsQuota = await checkQuota(userId, "tts");
    if (!ttsQuota.allowed) {
      return NextResponse.json(
        { error: "Voice budget reached", detail: ttsQuota.reason },
        { status: 429 } // 429 = fall back to Magpie client-side, not a hard error
      );
    }

    logger.info("Voice synthesis requested", {
      userId,
      textLength: text.length,
      emotion: finalEmotion,
      primaryProvider: "qwen3-vivian",
      category: "voice",
    });

    const result = await synthesizeWithCharacter({
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
    });

    if (result.audio) {
      const providerHeader = result.provider;

      // Record actual lane used (qwen3/modal = paid, magpie = free)
      void recordUsage({
        userId,
        category: "tts",
        provider: providerHeader,
      });

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

    return NextResponse.json(
      {
        error: "TTS synthesis failed",
        detail: "Both providers failed. Check the Qwen3 Modal endpoint and NVIDIA_API_KEY.",
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
