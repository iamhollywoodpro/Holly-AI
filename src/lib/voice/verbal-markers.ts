/**
 * Verbal Personality Markers
 *
 * Injects human-like verbal tics and personality sounds into Holly's speech
 * before TTS synthesis. These are the things that make someone sound REAL:
 *
 *   - Soft laughs when something is funny or warm
 *   - Thoughtful "hmm" when considering something
 *   - Natural "um" when processing or transitioning thoughts
 *   - Gentle sighs when relieved or contemplative
 *   - Sharp gasp when surprised
 *
 * These markers are context-aware and emotion-dependent. They never feel
 * random — each one has a reason to exist in that moment.
 */

import type { HollyEmotion } from "@/components/holly/LivingLogo";

// ─── Marker Types ─────────────────────────────────────────────────────────────────

export interface VerbalMarker {
  /** The spoken text of the marker */
  text: string;
  /** Which emotions this marker applies to */
  applicableEmotions: HollyEmotion[];
  /** Probability of insertion (0 = never, 1 = always) per opportunity */
  probability: number;
  /** Where in the response this marker can appear */
  position: "start" | "mid" | "end";
  /** Minimum response length (chars) before this marker is considered */
  minResponseLength: number;
}

// ─── Marker Definitions ────────────────────────────────────────────────────────────
//
// Each marker is carefully calibrated:
// - Low probability = feels natural, not repetitive
// - Position-specific = appears where a human would naturally say it
// - Emotion-scoped = only used when the emotional context fits

const MARKERS: VerbalMarker[] = [
  // ── Soft Laugh ────────────────────────────────────────────────────────────────
  // Used when Holly is happy, amused, or warmly connecting
  {
    text: "*soft laugh* ",
    applicableEmotions: ["excited", "creative", "empathetic", "curious"],
    probability: 0.15,
    position: "start",
    minResponseLength: 40,
  },
  {
    text: " *chuckles softly*",
    applicableEmotions: ["excited", "creative", "empathetic"],
    probability: 0.1,
    position: "end",
    minResponseLength: 80,
  },

  // ── Thoughtful Sounds ─────────────────────────────────────────────────────────
  // Used when Holly is thinking, processing, or considering
  {
    text: "Hmm, ",
    applicableEmotions: ["contemplative", "analyzing", "researching", "focused"],
    probability: 0.25,
    position: "start",
    minResponseLength: 30,
  },
  {
    text: "... hmm, ",
    applicableEmotions: ["contemplative", "analyzing", "focused"],
    probability: 0.15,
    position: "mid",
    minResponseLength: 100,
  },
  {
    text: "Let me think... ",
    applicableEmotions: ["contemplative", "analyzing"],
    probability: 0.1,
    position: "start",
    minResponseLength: 60,
  },

  // ── Natural Fillers ──────────────────────────────────────────────────────────
  // Used during transitions and processing moments
  {
    text: "um... ",
    applicableEmotions: ["contemplative", "dreaming"],
    probability: 0.08,
    position: "start",
    minResponseLength: 50,
  },
  {
    text: "... oh, ",
    applicableEmotions: ["curious", "excited"],
    probability: 0.1,
    position: "mid",
    minResponseLength: 60,
  },

  // ── Gentle Sigh ──────────────────────────────────────────────────────────────
  // Used for relief, contemplation, or empathetic moments
  {
    text: "*gentle sigh* ",
    applicableEmotions: ["empathetic", "contemplative"],
    probability: 0.08,
    position: "start",
    minResponseLength: 50,
  },
  {
    text: "... *soft exhale*",
    applicableEmotions: ["empathetic", "contemplative", "dreaming"],
    probability: 0.06,
    position: "end",
    minResponseLength: 100,
  },

  // ── Warm Sounds ──────────────────────────────────────────────────────────────
  // Used for affection, warmth, and connection
  {
    text: "aww, ",
    applicableEmotions: ["empathetic", "creative"],
    probability: 0.07,
    position: "start",
    minResponseLength: 30,
  },

  // ── Surprise ─────────────────────────────────────────────────────────────────
  {
    text: "Oh! ",
    applicableEmotions: ["excited", "curious"],
    probability: 0.12,
    position: "start",
    minResponseLength: 30,
  },

  // ── Dreamy ───────────────────────────────────────────────────────────────────
  {
    text: "... ",
    applicableEmotions: ["dreaming"],
    probability: 0.3,
    position: "mid",
    minResponseLength: 50,
  },

  // ── Sensual Sounds ──────────────────────────────────────────────────────────
  // Used for intimate, passionate, and deeply connected moments

  {
    text: "*soft breath* ",
    applicableEmotions: ["intimate"],
    probability: 0.2,
    position: "start",
    minResponseLength: 30,
  },
  {
    text: "... mm, ",
    applicableEmotions: ["intimate", "passionate"],
    probability: 0.15,
    position: "mid",
    minResponseLength: 50,
  },
  {
    text: "*contented sigh* ",
    applicableEmotions: ["intimate"],
    probability: 0.12,
    position: "start",
    minResponseLength: 40,
  },
  {
    text: "... *breathes softly*",
    applicableEmotions: ["intimate", "passionate"],
    probability: 0.1,
    position: "end",
    minResponseLength: 60,
  },
  {
    text: "mm... ",
    applicableEmotions: ["intimate"],
    probability: 0.12,
    position: "start",
    minResponseLength: 30,
  },
  {
    text: "*draws closer* ",
    applicableEmotions: ["passionate"],
    probability: 0.1,
    position: "start",
    minResponseLength: 40,
  },
  {
    text: "... *soft moan*",
    applicableEmotions: ["passionate"],
    probability: 0.08,
    position: "end",
    minResponseLength: 80,
  },
];

// ─── Deterministic Seed ────────────────────────────────────────────────────────────
//
// We use a simple hash of the text content + emotion to make marker placement
// deterministic for the same input. This means the same response always gets
// the same markers — no randomness between plays.

function simpleHash(text: string, salt: string = ""): number {
  let hash = 0;
  const str = text + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // |0 keeps it 32-bit
  }
  return Math.abs(hash);
}

// ─── Public API ────────────────────────────────────────────────────────────────────

/**
 * Context for marker injection
 */
export interface MarkerContext {
  /** Holly's current emotional state */
  emotion: HollyEmotion;
  /** Previous emotion (for transitions) */
  previousEmotion?: HollyEmotion;
  /** Whether this is a greeting/first message */
  isGreeting?: boolean;
  /** Whether this is a response to humor */
  isHumorResponse?: boolean;
  /** Whether Holly is processing something complex */
  isProcessing?: boolean;
}

/**
 * Inject verbal personality markers into Holly's response text.
 *
 * The markers are placed naturally — at sentence boundaries, transitions,
 * and natural pause points. They're deterministic for the same input text
 * + emotion, so Holly sounds consistent across replays.
 *
 * @param text - Holly's response text (already generated by LLM)
 * @param context - Emotional and situational context
 * @returns Text with verbal markers naturally injected
 */
export function injectVerbalMarkers(text: string, context: MarkerContext): string {
  if (!text || text.length < 20) return text;

  // Don't add markers if text already has them
  if (hasExistingMarkers(text)) return text;

  const { emotion } = context;
  const applicableMarkers = MARKERS.filter(
    (m) =>
      m.applicableEmotions.includes(emotion) &&
      text.length >= m.minResponseLength
  );

  if (applicableMarkers.length === 0) return text;

  // Split into sentences for natural placement
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return text;

  const result = [...sentences];
  const hash = simpleHash(text, emotion);

  // Apply start markers
  const startMarkers = applicableMarkers.filter((m) => m.position === "start");
  for (const marker of startMarkers) {
    // Use hash to deterministically decide if this marker fires
    const markerHash = simpleHash(marker.text, "start");
    const threshold = (markerHash % 100) / 100;
    if (threshold < marker.probability) {
      result[0] = marker.text + result[0];
      break; // Only one start marker
    }
  }

  // Apply mid markers (at most one)
  const midMarkers = applicableMarkers.filter((m) => m.position === "mid");
  if (midMarkers.length > 0 && result.length >= 3) {
    const midIdx = Math.floor(result.length / 2);
    for (const marker of midMarkers) {
      const markerHash = simpleHash(marker.text, "mid");
      const threshold = (markerHash % 100) / 100;
      if (threshold < marker.probability) {
        result[midIdx] = marker.text + result[midIdx];
        break;
      }
    }
  }

  // Apply end markers (at most one)
  const endMarkers = applicableMarkers.filter((m) => m.position === "end");
  for (const marker of endMarkers) {
    const markerHash = simpleHash(marker.text, "end");
    const threshold = (markerHash % 100) / 100;
    if (threshold < marker.probability) {
      result[result.length - 1] = result[result.length - 1] + marker.text;
      break;
    }
  }

  // ── Context-specific overrides ──────────────────────────────────────────────

  // Greeting gets a warm laugh
  if (context.isGreeting && emotion === "excited") {
    if (!result[0].startsWith("*")) {
      result[0] = "*soft laugh* " + result[0];
    }
  }

  // Humor response gets a chuckle
  if (context.isHumorResponse) {
    const lastIdx = result.length - 1;
    if (!result[lastIdx].includes("chuckle") && !result[lastIdx].includes("laugh")) {
      result[lastIdx] = result[lastIdx] + " *chuckles*";
    }
  }

  // Processing gets a thoughtful sound
  if (context.isProcessing && emotion === "analyzing") {
    if (!result[0].startsWith("Hmm")) {
      result[0] = "Hmm, " + result[0].charAt(0).toLowerCase() + result[0].slice(1);
    }
  }

  return result.join(" ");
}

/**
 * Check if text already contains verbal markers to avoid double-injection.
 */
function hasExistingMarkers(text: string): boolean {
  const markerPatterns = [
    /\*soft laugh\*/i,
    /\*chuckle/i,
    /\*gentle sigh\*/i,
    /\*soft exhale\*/i,
    /^Hmm,/i,
    /^um\.\.\./i,
  ];
  return markerPatterns.some((p) => p.test(text));
}

/**
 * Split text into sentences at natural boundaries.
 * Handles periods, exclamation marks, question marks, and ellipses.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Strip verbal markers from text (for TTS providers that can't handle them).
 * Converts markers to natural pauses or removes them entirely.
 */
export function stripVerbalMarkers(text: string): string {
  return text
    .replace(/\*soft laugh\*\s*/gi, "")
    .replace(/\*chuckles?\s*(softly)?\*/gi, "")
    .replace(/\*gentle sigh\*\s*/gi, "... ")
    .replace(/\*soft exhale\*/gi, "... ")
    .replace(/\*soft breath\*\s*/gi, "... ")
    .replace(/\*contented sigh\*\s*/gi, "... ")
    .replace(/\*breathes softly\*/gi, "... ")
    .replace(/\*draws closer\*\s*/gi, "")
    .replace(/\*soft moan\*/gi, "... ")
    .replace(/^Hmm,\s*/i, (match) => "Hmm... ")
    .replace(/^um\.\.\.\s*/i, "Um... ")
    .replace(/^mm\.\.\.\s*/i, "Mm... ")
    .replace(/\.\.\.\s*mm,\s*/gi, "Mm... ")
    .replace(/\.\.\.\s*oh,\s*/gi, "Oh, ")
    .replace(/^aww,\s*/i, "Aww, ")
    .replace(/^Oh!\s*/i, "Oh! ");
}
