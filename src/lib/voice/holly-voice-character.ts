/**
 * Holly Voice Character Engine
 *
 * The core engine that transforms Holly's text responses into expressive,
 * human-like speech. This is what makes Holly sound like Holly — not a
 * robot, not a generic TTS voice, but a living partner with emotional depth.
 *
 * Pipeline:
 *   1. Text + Emotional State → Voice Style Mapping
 *   2. Inject Verbal Personality Markers
 *   3. Preprocess text for TTS consumption
 *   4. Route to best available TTS provider (NVIDIA Magpie → Kokoro fallback)
 *   5. Return audio with metadata
 *
 * This engine is provider-agnostic — switching TTS providers doesn't require
 * changing the character logic, only the API client.
 */

import type { HollyEmotion } from "@/components/holly/LivingLogo";
import { getVoiceForEmotion, blendVoices, type VoiceProsody } from "./emotion-voice-map";
import {
  injectVerbalMarkers,
  stripVerbalMarkers,
  type MarkerContext,
} from "./verbal-markers";
import { synthesizeWithNvidia, isNvidiaTTSAvailable, type NvidiaTTSResult } from "./nvidia-tts-client";
import { logger } from "@/lib/monitoring/logger";

// ─── Types ─────────────────────────────────────────────────────────────────────────

export type TTSProvider = "nvidia-magpie" | "kokoro" | "voxcpm2" | "none";

export interface VoiceCharacterInput {
  /** Holly's response text */
  text: string;
  /** Current emotional state */
  emotion: HollyEmotion;
  /** Previous emotional state (for smooth transitions) */
  previousEmotion?: HollyEmotion;
  /** Transition blend ratio (0–1, 1 = fully current emotion) */
  blendRatio?: number;
  /** Override speaking speed (provider default if omitted) */
  speed?: number;
  /** Override voice (provider default if omitted) */
  voice?: string;
  /** Whether this is a greeting */
  isGreeting?: boolean;
  /** Whether responding to humor */
  isHumorResponse?: boolean;
  /** Whether Holly is processing something complex */
  isProcessing?: boolean;
  /** User ID for logging */
  userId?: string;
}

export interface VoiceCharacterResult {
  /** The processed text (with markers and preprocessing) */
  processedText: string;
  /** Voice parameters used */
  prosody: VoiceProsody;
  /** Which TTS provider was used */
  provider: TTSProvider;
  /** Audio buffer (null if synthesis was skipped) */
  audio: Buffer | null;
  /** Audio content type */
  contentType: string;
  /** Estimated duration in seconds */
  estimatedDurationSec: number;
  /** Verbal markers that were applied */
  markersApplied: string[];
}

// ─── Text Preprocessing for TTS ────────────────────────────────────────────────────
//
// This runs AFTER verbal markers are injected but BEFORE synthesis.
// It ensures the text is clean and readable by TTS engines while preserving
// the personality markers that Magpie can render expressively.

function preprocessForTTS(text: string, provider: TTSProvider): string {
  let t = text;

  // Strip markdown formatting
  t = t.replace(/```[\s\S]*?```/g, ".");
  t = t.replace(/`[^`]+`/g, ".");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");

  // Remove emojis (TTS can't render them)
  t = t.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  t = t.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  t = t.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  t = t.replace(/[\u{1F900}-\u{1F9FF}]/gu, "");
  t = t.replace(/[\u{1FA00}-\u{1FA6F}]/gu, "");
  t = t.replace(/[\u{1FA70}-\u{1FAFF}]/gu, "");
  t = t.replace(/[\u{2600}-\u{26FF}]/gu, "");
  t = t.replace(/[\u{2700}-\u{27BF}]/gu, "");

  // Replace common symbols with spoken words
  t = t.replace(/→/g, ", then, ");
  t = t.replace(/&/g, " and ");
  t = t.replace(/@/g, " at ");
  t = t.replace(/%/g, " percent ");
  t = t.replace(/—/g, ", ");
  t = t.replace(/–/g, ", ");

  // Expand abbreviations
  t = t.replace(/\bAPI\b/g, "A P I");
  t = t.replace(/\bHTML\b/g, "H T M L");
  t = t.replace(/\bCSS\b/g, "C S S");
  t = t.replace(/\bURL\b/g, "U R L");
  t = t.replace(/\bAI\b/g, "A I");

  // Handle line breaks
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, ". ");

  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();

  // Ensure ends with punctuation
  if (t.length > 0 && !/[.!?]$/.test(t)) {
    t += ".";
  }

  // Truncate if absurdly long
  if (t.length > 5000) {
    t = t.substring(0, 5000) + "...";
  }

  // For providers that can't render personality markers, strip them
  if (provider === "kokoro" || provider === "voxcpm2") {
    t = stripVerbalMarkers(t);
  }

  return t;
}

// ─── Marker Tracking ──────────────────────────────────────────────────────────────

function extractAppliedMarkers(original: string, processed: string): string[] {
  const markers: string[] = [];
  const markerPattern = /\*[^*]+\*|^(Hmm,|um\.\.\.|Oh!|aww,)/gim;

  let match;
  while ((match = markerPattern.exec(processed)) !== null) {
    if (!original.includes(match[0])) {
      markers.push(match[0].trim());
    }
  }

  return markers;
}

// ─── Core Engine ────────────────────────────────────────────────────────────────────

/**
 * Transform Holly's text response into expressive speech.
 *
 * This is the main entry point for the Voice Character Engine.
 * Call it from the `/api/voice/synthesize` route with Holly's emotional
 * state and response text, and it handles everything else.
 *
 * @param input - What Holly wants to say and how she feels
 * @param kokoroSynth - Optional Kokoro synthesis function (injected to avoid circular deps)
 * @returns Complete voice character result with audio and metadata
 */
export async function synthesizeWithCharacter(
  input: VoiceCharacterInput,
  kokoroSynth?: (text: string, voice: string, speed: number) => Promise<Buffer>
): Promise<VoiceCharacterResult> {
  const {
    text,
    emotion,
    previousEmotion,
    blendRatio,
    speed,
    voice,
    isGreeting,
    isHumorResponse,
    isProcessing,
    userId,
  } = input;

  // ── Step 1: Determine Voice Style ──────────────────────────────────────────
  let prosody: VoiceProsody;

  if (previousEmotion && blendRatio !== undefined && blendRatio < 1.0) {
    // Blend between emotions for smooth transitions
    prosody = blendVoices(emotion, previousEmotion, blendRatio);
  } else {
    prosody = getVoiceForEmotion(emotion);
  }

  // Apply speed override if provided
  if (speed !== undefined) {
    prosody = { ...prosody, speed };
  }

  logger.info("Voice character engine processing", {
    emotion,
    previousEmotion,
    style: prosody.style,
    voice: prosody.voice,
    speed: prosody.speed,
    userId,
    category: "voice",
  });

  // ── Step 2: Inject Verbal Personality Markers ──────────────────────────────
  const markerContext: MarkerContext = {
    emotion,
    previousEmotion,
    isGreeting,
    isHumorResponse,
    isProcessing,
  };

  const textWithMarkers = injectVerbalMarkers(text, markerContext);
  const markersApplied = extractAppliedMarkers(text, textWithMarkers);

  // ── Step 3: Try NVIDIA Magpie (primary) ────────────────────────────────────
  if (isNvidiaTTSAvailable()) {
    const processedText = preprocessForTTS(textWithMarkers, "nvidia-magpie");

    try {
      const result = await synthesizeWithNvidia({
        text: processedText,
        voice: voice ? (voice as any) : prosody.voice,
        style: prosody.style,
        speed: prosody.speed,
      });

      if (result) {
        logger.info("Voice character engine: NVIDIA Magpie success", {
          emotion,
          style: prosody.style,
          markersApplied: markersApplied.length,
          userId,
          category: "voice",
        });

        return {
          processedText,
          prosody,
          provider: "nvidia-magpie",
          audio: result.audioBuffer,
          contentType: result.contentType,
          estimatedDurationSec: result.estimatedDurationSec,
          markersApplied,
        };
      }
    } catch (nvidiaErr: any) {
      logger.warn("NVIDIA Magpie failed, falling back to Kokoro", {
        error: nvidiaErr.message,
        userId,
        category: "voice",
      });
    }
  }

  // ── Step 4: Fallback to Kokoro ─────────────────────────────────────────────
  if (kokoroSynth) {
    const processedText = preprocessForTTS(textWithMarkers, "kokoro");
    const kokoroVoice = voice || "af_heart";

    try {
      const audioBuffer = await kokoroSynth(
        processedText,
        kokoroVoice,
        prosody.speed
      );

      logger.info("Voice character engine: Kokoro fallback success", {
        emotion,
        voice: kokoroVoice,
        markersApplied: markersApplied.length,
        userId,
        category: "voice",
      });

      return {
        processedText,
        prosody,
        provider: "kokoro",
        audio: audioBuffer,
        contentType: "audio/wav",
        estimatedDurationSec: Math.round((audioBuffer.length / 44100) * 10) / 10,
        markersApplied,
      };
    } catch (kokoroErr: any) {
      logger.error("Kokoro fallback also failed", {
        error: kokoroErr.message,
        userId,
        category: "voice",
      });
    }
  }

  // ── Step 5: No audio available — return text-only result ────────────────────
  const processedText = preprocessForTTS(textWithMarkers, "none");

  logger.warn("Voice character engine: no TTS provider available", {
    emotion,
    userId,
    category: "voice",
  });

  return {
    processedText,
    prosody,
    provider: "none",
    audio: null,
    contentType: "",
    estimatedDurationSec: 0,
    markersApplied,
  };
}

/**
 * Get the voice parameters for an emotion without synthesizing.
 * Useful for UI preview or client-side voice settings.
 */
export function getVoiceCharacterParams(
  emotion: HollyEmotion,
  previousEmotion?: HollyEmotion,
  blendRatio?: number
): VoiceProsody {
  if (previousEmotion && blendRatio !== undefined && blendRatio < 1.0) {
    return blendVoices(emotion, previousEmotion, blendRatio);
  }
  return getVoiceForEmotion(emotion);
}
