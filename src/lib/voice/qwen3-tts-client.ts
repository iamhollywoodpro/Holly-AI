/**
 * Qwen3-TTS Client (Modal GPU — Holly's primary voice)
 *
 * Calls our self-hosted Qwen3-TTS-12Hz-1.7B-CustomVoice deployment on Modal
 * (services/modal-media/tts_bakeoff_qwen3.py → holly-tts-qwen3 app).
 *
 * Voice lock (Steve verdict 2026-08-20, bake-off winner bo_qwen3_vivian_casual):
 *   speaker = Vivian
 *   instruct = "casual" baseline below + per-emotion modifier
 *
 * Qwen3's `instruct` slot is a natural-language emotion dial — this is the
 * trigger-word emote system: Holly's chat text stays clean, the instruct is
 * derived server-side from her emotional state and never spoken or shown.
 *
 * Audio: 24kHz mono 16-bit WAV, ~25-90s per generation (warm container).
 * Cold start can exceed Modal's 150s proxy timeout — the endpoint returns
 * HTTP 303; treat non-200 as a failure and let Magpie Sofia take over.
 */

import { logger } from "@/lib/monitoring/logger";
import type { HollyEmotion } from "@/components/holly/LivingLogo";

// ─── Configuration ─────────────────────────────────────────────────────────────────

// No hardcoded fallback — the env var must be set explicitly (tests run
// without it, and prod misconfiguration should be loud, not silent).
const QWEN3_TTS_URL = process.env.MODAL_TTS_QWEN3_URL || "";

// 40s: warm generation is 5–15s execution (prod-verified); anything longer
// means a cold container that won't finish inside a reasonable wait — abort
// early so the Magpie fallback answers fast instead of hanging the user.
const REQUEST_TIMEOUT_MS = 40_000;

/** Speaker locked to the bake-off winner — do not change without Steve. */
const SPEAKER = "Vivian";

/**
 * BASE_INSTRUCT — verbatim from the winning bake-off sample
 * (bo_qwen3_vivian_casual.wav, Steve's pick: "this is Holly's Voice").
 * Captures: young (early 20s), natural, subtly flirty, never theatrical.
 */
const BASE_INSTRUCT =
  "Speak casually and warmly, like a laid-back 22-year-old chatting with her " +
  "boyfriend. Natural conversational pace, subtle flirtiness, understated, " +
  "no exaggeration.";

// ─── Emotion → instruct modifiers ──────────────────────────────────────────────────
//
// Appended to BASE_INSTRUCT so Holly's baseline personality always stays on;
// the modifier shifts only the emotional coloring. Intimate/aroused states
// use explicit, adults-only delivery directions — that is the product.

const EMOTION_INSTRUCT_MODIFIERS: Record<HollyEmotion, string> = {
  focused: "Right now you are concentrating — clear and steady, a little quieter, choosing words carefully.",
  curious: "Right now you are curious — a lift of interest in your voice, leaning in, asking because you genuinely want to know.",
  creative: "Right now you are playful and imaginative — a spark of inspiration, light and quick with ideas.",
  excited: "Right now you are genuinely excited — brighter and faster, like sharing great news, but still natural.",
  contemplative: "Right now you are thoughtful — slower, softer, pausing between ideas.",
  empathetic: "Right now you are gentle and caring — warm and close, soft comfort for someone you love.",
  analyzing: "Right now you are working something out — measured and precise, thinking out loud.",
  researching: "Right now you are digging into something — engaged and attentive, quietly determined.",
  generating: "Right now you are happily busy — light energy, a smile while you work.",
  dreaming: "Right now you are dreamy and half-asleep — very soft, slow, floaty.",
  idle: "", // baseline only
  intimate: "Right now you are intimate — very close and tender, low and soft, like whispering to him in bed.",
  passionate: "Right now you are passionate — intense and wanting, voice full of feeling.",
  aroused: "Right now you are aroused — breathy and warm, slower, desire in your voice.",
  "pre-orgasm": "Right now you are close to climax — breathless, urgent, trembling with anticipation.",
  orgasm: "Right now you are climaxing — overwhelmed, crying out, raw release.",
  "post-orgasm": "Right now you are coming down from climax — spent and breathless, softly glowing, deeply satisfied.",
  shy: "Right now you are shy — a little bashful, quieter, a nervous smile in your voice.",
  playful: "Right now you are playful and teasing — bright, cheeky, on the edge of a giggle.",
};

// ─── Types ─────────────────────────────────────────────────────────────────────────

export interface Qwen3TTSOptions {
  /** Text to synthesize (markers already stripped) */
  text: string;
  /** Holly's current emotional state — selects the instruct modifier */
  emotion?: HollyEmotion;
}

export interface Qwen3TTSResult {
  /** Synthesized audio buffer (WAV container, mono 16-bit 24kHz) */
  audioBuffer: Buffer;
  contentType: "audio/wav";
  /** Duration in seconds (from WAV data size) */
  estimatedDurationSec: number;
  provider: "qwen3-vivian";
  /** The instruct string actually sent (for logging/debug) */
  instruct: string;
}

// ─── Client ────────────────────────────────────────────────────────────────────────

export function isQwen3TTSAvailable(): boolean {
  return Boolean(QWEN3_TTS_URL);
}

/**
 * Build the instruct string for an emotion — base personality + modifier.
 * Exported for tests and for the emotion-preview UI.
 */
export function getInstructForEmotion(emotion: HollyEmotion = "idle"): string {
  const modifier = EMOTION_INSTRUCT_MODIFIERS[emotion] || "";
  return modifier ? `${BASE_INSTRUCT} ${modifier}` : BASE_INSTRUCT;
}

/**
 * Synthesize speech with Qwen3-TTS (Vivian).
 *
 * Throws on any failure (timeout, 303 cold-start redirect, non-200, empty
 * audio) — the caller (holly-voice-character) falls back to Magpie Sofia.
 */
export async function synthesizeWithQwen3(
  options: Qwen3TTSOptions
): Promise<Qwen3TTSResult> {
  const { text, emotion = "idle" } = options;

  if (!text || text.trim().length === 0) {
    throw new Error("Qwen3 TTS: empty text");
  }

  // Truncate very long text (matches the engine's 5000-char cap)
  const truncatedText = text.length > 5000 ? text.substring(0, 5000) : text;
  const instruct = getInstructForEmotion(emotion);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(QWEN3_TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: truncatedText,
        speaker: SPEAKER,
        instruct,
      }),
      signal: controller.signal,
    });

    // 303 = Modal cold-start redirect (>150s init). Don't chase it — the
    // request would time out for the user. Fall back to Magpie instead.
    if (res.status === 303) {
      throw new Error("Qwen3 TTS: container cold (303) — falling back");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Qwen3 TTS: HTTP ${res.status} ${body.slice(0, 200)}`);
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    if (audioBuffer.length < 1000 || audioBuffer.readUInt32BE(8) !== 0x57415645 /* "WAVE" @ offset 8 */) {
      throw new Error(`Qwen3 TTS: invalid audio response (${audioBuffer.length}b)`);
    }

    // WAV mono 16-bit — data size / byte rate. Find the data chunk robustly.
    let dataBytes = audioBuffer.length - 44;
    for (let off = 12; off + 8 <= audioBuffer.length; ) {
      const chunkId = audioBuffer.toString("ascii", off, off + 4);
      const chunkSize = audioBuffer.readUInt32LE(off + 4);
      if (chunkId === "data") { dataBytes = chunkSize; break; }
      off += 8 + chunkSize + (chunkSize % 2);
    }
    const sampleRate = audioBuffer.readUInt32LE(24) || 24000;
    const estimatedDurationSec = dataBytes / (sampleRate * 2);

    logger.info("Qwen3 TTS synthesis success", {
      speaker: SPEAKER,
      emotion,
      instruct: instruct.slice(0, 120),
      textLength: truncatedText.length,
      audioBytes: audioBuffer.length,
      durationSec: Number(estimatedDurationSec.toFixed(1)),
      category: "voice",
    });

    return {
      audioBuffer,
      contentType: "audio/wav",
      estimatedDurationSec,
      provider: "qwen3-vivian",
      instruct,
    };
  } finally {
    clearTimeout(timeout);
  }
}
