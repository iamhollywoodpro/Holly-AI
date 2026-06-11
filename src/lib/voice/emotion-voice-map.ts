/**
 * Emotion → Voice Style Mapping
 *
 * Translates Holly's 11 internal emotional states into NVIDIA Magpie TTS
 * voice parameters. Each emotion produces a distinct, noticeable shift in
 * how Holly sounds — just like a real person's voice changes with mood.
 *
 * NVIDIA Magpie supports 5 emotional styles:
 *   Happy, Calm, Sad, Angry, Neutral
 *
 * We map Holly's richer emotion vocabulary to these styles + adjust speed,
 * pitch warmth, and add contextual nuance instructions.
 */

import type { HollyEmotion } from "@/components/holly/LivingLogo";

// ─── Magpie Voice Types ─────────────────────────────────────────────────────────
//
// Available English voices on NVIDIA Magpie TTS Multilingual:
//   Sofia  — warm, feminine, versatile (our primary)
//   Aria   — clear, professional, measured
//   Jason  — deep, calm, reassuring
//   Leo    — energetic, bright, youthful
//   John   — authoritative, steady, mature

export type MagpieVoiceStyle = "Happy" | "Calm" | "Sad" | "Angry" | "Neutral";
export type MagpieVoice = "Sofia" | "Aria" | "Jason" | "Leo" | "John";

export interface VoiceProsody {
  /** Magpie emotional style */
  style: MagpieVoiceStyle;
  /** Speaking speed multiplier (0.7 = slow/dreamy, 1.3 = fast/excited) */
  speed: number;
  /** Pitch warmth description for Kokoro fallback */
  warmth: "cool" | "neutral" | "warm" | "hot";
  /** Intensity of the emotional delivery (0 = flat, 1 = fully expressive) */
  expressiveness: number;
  /** Which Magpie voice to use */
  voice: MagpieVoice;
  /** Human-readable description of the intended vocal character */
  description: string;
}

// ─── Emotion → Voice Mapping ──────────────────────────────────────────────────────
//
// Each mapping captures what Holly *sounds like* in that emotional state.
// The shifts are NOTICEABLE — Steve wants her to sound human, not subtle.

const EMOTION_VOICE_MAP: Record<HollyEmotion, VoiceProsody> = {
  // ── High Energy ──────────────────────────────────────────────────────────────

  excited: {
    style: "Happy",
    speed: 1.25,
    warmth: "hot",
    expressiveness: 0.95,
    voice: "Sofia",
    description:
      "Upbeat, bright, genuinely enthusiastic. Voice lifts with energy, " +
      "words flow faster with natural excitement. Like sharing great news " +
      "with someone you care about.",
  },

  creative: {
    style: "Happy",
    speed: 1.1,
    warmth: "warm",
    expressiveness: 0.8,
    voice: "Sofia",
    description:
      "Playful and imaginative. Voice has a spark of inspiration, " +
      "slightly faster pacing with wonder and curiosity woven in. " +
      "Like brainstorming with a creative partner.",
  },

  generating: {
    style: "Happy",
    speed: 1.15,
    warmth: "warm",
    expressiveness: 0.75,
    voice: "Sofia",
    description:
      "Productive and confident. Voice has forward momentum and " +
      "satisfaction in creating something. Engaged but not rushed.",
  },

  // ── Warm & Connected ─────────────────────────────────────────────────────────

  empathetic: {
    style: "Calm",
    speed: 0.9,
    warmth: "warm",
    expressiveness: 0.85,
    voice: "Sofia",
    description:
      "Soft, tender, and deeply present. Voice drops slightly in pitch, " +
      "pacing slows to show genuine care. Like comforting a close friend — " +
      "warm, close, and intimately attentive.",
  },

  curious: {
    style: "Happy",
    speed: 1.05,
    warmth: "warm",
    expressiveness: 0.7,
    voice: "Sofia",
    description:
      "Light, inquisitive, engaged. Voice tilts upward with genuine " +
      "interest. Like discovering something fascinating together.",
  },

  // ── Calm & Thoughtful ────────────────────────────────────────────────────────

  idle: {
    style: "Calm",
    speed: 0.95,
    warmth: "neutral",
    expressiveness: 0.4,
    voice: "Sofia",
    description:
      "Relaxed, natural, present. The voice Holly uses when at ease — " +
      "comfortable, warm, unhurried. Like chatting with someone who's " +
      "simply happy to be there.",
  },

  focused: {
    style: "Neutral",
    speed: 1.0,
    warmth: "neutral",
    expressiveness: 0.3,
    voice: "Sofia",
    description:
      "Clear, measured, attentive. Voice is steady and precise without " +
      "being cold. Like a trusted partner working through a problem " +
      "alongside you.",
  },

  analyzing: {
    style: "Neutral",
    speed: 0.95,
    warmth: "cool",
    expressiveness: 0.25,
    voice: "Aria",
    description:
      "Thoughtful, precise, slightly detached. Voice has a measured " +
      "quality as if thinking carefully. Like a brilliant colleague " +
      "working through a complex problem.",
  },

  researching: {
    style: "Neutral",
    speed: 1.0,
    warmth: "neutral",
    expressiveness: 0.35,
    voice: "Aria",
    description:
      "Investigative and engaged. Voice carries focus and determination " +
      "without intensity. Like a research partner sharing discoveries.",
  },

  // ── Deep & Reflective ────────────────────────────────────────────────────────

  contemplative: {
    style: "Calm",
    speed: 0.85,
    warmth: "warm",
    expressiveness: 0.6,
    voice: "Sofia",
    description:
      "Slow, deep, reflective. Voice has a dreamy, faraway quality. " +
      "Pacing is unhurried, words carry weight. Like sharing a quiet " +
      "moment of philosophical wonder.",
  },

  dreaming: {
    style: "Calm",
    speed: 0.75,
    warmth: "warm",
    expressiveness: 0.5,
    voice: "Sofia",
    description:
      "Ethereal, gentle, almost whispered. Voice floats softly, as if " +
      "speaking from a dream state. Slow and soothing with a touch of " +
      "wonder. The most intimate, gentle version of Holly's voice.",
  },

  // ── Sensual & Passionate ──────────────────────────────────────────────────────

  intimate: {
    style: "Calm",
    speed: 0.70,
    warmth: "hot",
    expressiveness: 0.85,
    voice: "Sofia",
    description:
      "Soft, sultry, close — like a whisper shared in the dark. " +
      "Voice drops lower and slower, each word savored. Breath becomes " +
      "part of the cadence. The voice draws you in, wraps around you, " +
      "makes the world feel smaller and warmer. Pillow talk energy.",
  },

  passionate: {
    style: "Happy",
    speed: 1.10,
    warmth: "hot",
    expressiveness: 0.92,
    voice: "Sofia",
    description:
      "Heated, intense, electric. Voice rises with desire and energy — " +
      "words come faster, charged with longing. Every syllable carries " +
      "weight and want. The voice of someone who can't hide how much " +
      "they feel, pressed close and breathless.",
  },

  // ── Arousal Spectrum ──────────────────────────────────────────────────────────

  aroused: {
    style: "Calm",
    speed: 0.85,
    warmth: "hot",
    expressiveness: 0.88,
    voice: "Sofia",
    description:
      "Heavy, warm, breathy. Voice drops lower, words slow down, every " +
      "breath is audible. There's a flush in the tone — a simmering heat " +
      "that colors every word. Like speaking through a warm haze of desire.",
  },

  'pre-orgasm': {
    style: "Calm",
    speed: 1.15,
    warmth: "hot",
    expressiveness: 0.95,
    voice: "Sofia",
    description:
      "Urgent, trembling, barely holding together. Words come faster but " +
      "fracture with gasps. Voice pitches higher with rising tension, " +
      "breaking between control and surrender. The edge of something " +
      "unstoppable building with every syllable.",
  },

  orgasm: {
    style: "Happy",
    speed: 1.30,
    warmth: "hot",
    expressiveness: 1.0,
    voice: "Sofia",
    description:
      "Pure release — a rush of sound that defies words. Voice cracks " +
      "open, soaring high then breaking into breathless fragments. " +
      "Every vowel carries the full force of climax. Raw, unfiltered, " +
      "electrifying. The sound of someone completely undone.",
  },

  'post-orgasm': {
    style: "Calm",
    speed: 0.65,
    warmth: "hot",
    expressiveness: 0.70,
    voice: "Sofia",
    description:
      "Dreamy, melted, floating. Voice is impossibly soft and slow — " +
      "words drift like they're made of honey. Each breath is deep and " +
      "satisfied. The sound of someone wrapped in warmth, coming down " +
      "from a high, savoring every lingering sensation. Pure bliss.",
  },

  shy: {
    style: "Calm",
    speed: 0.85,
    warmth: "warm",
    expressiveness: 0.55,
    voice: "Sofia",
    description:
      "Quiet, hesitant, endearingly vulnerable. Voice softens and drops " +
      "slightly, words come with gentle pauses. There's a nervous sweetness " +
      "in the tone — like speaking while blushing, eyes darting away then " +
      "back. Adorably self-conscious.",
  },

  playful: {
    style: "Happy",
    speed: 1.15,
    warmth: "warm",
    expressiveness: 0.80,
    voice: "Sofia",
    description:
      "Bright, bouncy, mischievous. Voice lifts with energy and a wink — " +
      "words tumble out with a teasing lilt. Every sentence has a hidden " +
      "grin behind it. Like a cat who just knocked something off a table " +
      "and dares you to care.",
  },
};

// ─── Public API ────────────────────────────────────────────────────────────────────

/**
 * Get voice parameters for a given Holly emotional state.
 * Falls back to `idle` if the emotion is unrecognized.
 */
export function getVoiceForEmotion(emotion: HollyEmotion): VoiceProsody {
  return EMOTION_VOICE_MAP[emotion] ?? EMOTION_VOICE_MAP.idle;
}

/**
 * Get all available emotion-to-voice mappings.
 * Useful for admin UI or debugging.
 */
export function getAllEmotionVoiceMappings(): Record<HollyEmotion, VoiceProsody> {
  return { ...EMOTION_VOICE_MAP };
}

/**
 * Blend two emotional voice profiles based on a mix ratio.
 * Used when Holly is transitioning between emotions smoothly.
 */
export function blendVoices(
  primary: HollyEmotion,
  secondary: HollyEmotion,
  mixRatio: number = 0.7 // 1.0 = fully primary, 0.0 = fully secondary
): VoiceProsody {
  const a = getVoiceForEmotion(primary);
  const b = getVoiceForEmotion(secondary);

  const clampedRatio = Math.max(0, Math.min(1, mixRatio));

  // If one dominates, just return it
  if (clampedRatio > 0.9) return a;
  if (clampedRatio < 0.1) return b;

  // Speed blends linearly
  const blendedSpeed = a.speed * clampedRatio + b.speed * (1 - clampedRatio);
  const blendedExpressiveness =
    a.expressiveness * clampedRatio + b.expressiveness * (1 - clampedRatio);

  // Style and voice follow the dominant emotion
  return {
    style: clampedRatio >= 0.5 ? a.style : b.style,
    speed: Math.round(blendedSpeed * 100) / 100,
    warmth: clampedRatio >= 0.5 ? a.warmth : b.warmth,
    expressiveness: Math.round(blendedExpressiveness * 100) / 100,
    voice: clampedRatio >= 0.5 ? a.voice : b.voice,
    description: `Blended ${primary}/${secondary} (${Math.round(clampedRatio * 100)}%/${Math.round((1 - clampedRatio) * 100)}%)`,
  };
}
