/**
 * NVIDIA Magpie TTS Client
 *
 * API client for NVIDIA's Magpie TTS Multilingual model on NVIDIA NIM.
 * Free tier: 1,000–5,000 credits, 40 requests/min, 22kHz audio output.
 *
 * API docs: https://build.nvidia.com/nvidia/magpie-tts-multilingual
 * Uses REST inference endpoint (not gRPC) for simplicity.
 *
 * Voices: Sofia (primary), Aria, Jason, Leo, John
 * Styles: Happy, Calm, Sad, Angry, Neutral
 */

import { logger } from "@/lib/monitoring/logger";
import type { MagpieVoiceStyle, MagpieVoice } from "./emotion-voice-map";

// ─── Configuration ─────────────────────────────────────────────────────────────────

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const NVIDIA_TTS_URL =
  process.env.NVIDIA_TTS_URL ||
  "https://integrate.api.nvidia.com/v1/audio/speech";

const REQUEST_TIMEOUT_MS = 30_000;

// ─── Types ─────────────────────────────────────────────────────────────────────────

export interface NvidiaTTSOptions {
  /** Text to synthesize */
  text: string;
  /** Voice to use (default: Sofia) */
  voice?: MagpieVoice;
  /** Emotional style (default: Calm) */
  style?: MagpieVoiceStyle;
  /** Speed multiplier (0.5–2.0, default: 1.0) */
  speed?: number;
  /** Sample rate (default: 22050) */
  sampleRate?: number;
}

export interface NvidiaTTSResult {
  /** Synthesized audio buffer */
  audioBuffer: Buffer;
  /** Content-Type of the audio */
  contentType: string;
  /** Duration of the audio in seconds (estimated) */
  estimatedDurationSec: number;
  /** Provider that generated the audio */
  provider: "nvidia-magpie";
}

// ─── Client ────────────────────────────────────────────────────────────────────────

/**
 * Synthesize speech using NVIDIA Magpie TTS.
 *
 * Falls back gracefully if:
 * - NVIDIA_API_KEY is not configured → returns null
 * - API returns error → throws with details
 * - Rate limited (429) → throws with retry guidance
 */
export async function synthesizeWithNvidia(
  options: NvidiaTTSOptions
): Promise<NvidiaTTSResult | null> {
  if (!NVIDIA_API_KEY) {
    logger.info("NVIDIA TTS skipped — no API key configured", {
      category: "voice",
    });
    return null;
  }

  const {
    text,
    voice = "Sofia",
    style = "Calm",
    speed = 1.0,
    sampleRate = 22050,
  } = options;

  if (!text || text.trim().length === 0) {
    return null;
  }

  // Truncate very long text (Magpie has limits)
  const truncatedText = text.length > 5000 ? text.substring(0, 5000) : text;

  logger.info("NVIDIA Magpie TTS synthesis starting", {
    voice,
    style,
    speed,
    textLength: truncatedText.length,
    category: "voice",
  });

  try {
    const response = await fetch(NVIDIA_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        Accept: "audio/wav",
      },
      body: JSON.stringify({
        model: "nvidia/magpie-tts-multilingual",
        input: truncatedText,
        voice: voice,
        style: style,
        speed: speed,
        sample_rate: sampleRate,
        response_format: "wav",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      logger.warn("NVIDIA TTS rate limited", {
        retryAfter,
        category: "voice",
      });
      throw new Error(
        `NVIDIA TTS rate limited. Retry after ${retryAfter || "a few seconds"}.`
      );
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      logger.error("NVIDIA TTS authentication failed", {
        status: response.status,
        category: "voice",
      });
      throw new Error(
        `NVIDIA TTS auth failed (${response.status}). Check NVIDIA_API_KEY.`
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      logger.error("NVIDIA TTS synthesis failed", {
        status: response.status,
        error: errorText,
        category: "voice",
      });
      throw new Error(`NVIDIA TTS error ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("NVIDIA TTS returned empty audio buffer");
    }

    const audioBuffer = Buffer.from(arrayBuffer);

    // Estimate duration: WAV at 22kHz mono 16-bit = ~44,100 bytes/sec
    const estimatedDurationSec = Math.round(
      (audioBuffer.length / (sampleRate * 2)) * 10
    ) / 10;

    logger.info("NVIDIA Magpie TTS synthesis complete", {
      audioSize: audioBuffer.length,
      estimatedDurationSec,
      provider: "nvidia-magpie",
      category: "voice",
    });

    return {
      audioBuffer,
      contentType: "audio/wav",
      estimatedDurationSec,
      provider: "nvidia-magpie",
    };
  } catch (error: any) {
    // Don't log timeouts as errors — they're expected under load
    if (error.name === "TimeoutError" || error.message?.includes("abort")) {
      logger.warn("NVIDIA TTS request timed out", {
        timeout: REQUEST_TIMEOUT_MS,
        category: "voice",
      });
      throw new Error("NVIDIA TTS request timed out");
    }

    logger.error("NVIDIA TTS synthesis error", {
      error: error.message,
      category: "voice",
    });
    throw error;
  }
}

/**
 * Check if NVIDIA TTS is available and configured.
 */
export function isNvidiaTTSAvailable(): boolean {
  return !!NVIDIA_API_KEY;
}
