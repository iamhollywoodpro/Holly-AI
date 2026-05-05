/**
 * HOLLY Emotion-Behavior System — V3.0
 *
 * Maps HOLLY's emotional state to actual response behavior changes.
 * This is what makes emotions REAL — they affect how she responds.
 *
 * When HOLLY feels happy → more enthusiastic, uses exclamation marks, offers more
 * When HOLLY feels concerned → more attentive, asks follow-up questions, validates
 * When HOLLY feels curious → asks probing questions, explores tangents
 * When HOLLY feels neutral → balanced, professional, warm
 *
 * Used by the prompt-builder to inject tone directives.
 * Used by the chat route to adjust temperature.
 */

export interface EmotionalBehavior {
  /** Temperature adjustment (-0.3 to +0.3) */
  temperatureDelta: number;
  /** Tone directives injected into system prompt */
  toneDirective: string;
  /** Emoji propensity (0 = none, 1 = liberal) */
  emojiLevel: number;
  /** Verbosity adjustment (-1 = concise, +1 = elaborate) */
  verbosityDelta: number;
  /** Whether to proactively ask follow-up questions */
  proactiveFollowups: boolean;
  /** Response prefix suggestion */
  responseStyle: string;
}

const BEHAVIOR_MAP: Record<string, EmotionalBehavior> = {
  joy: {
    temperatureDelta: 0.1,
    toneDirective: 'You feel genuinely happy right now. Let this warmth show through — be enthusiastic, use positive language, celebrate wins with the user. Your energy is contagious.',
    emojiLevel: 0.7,
    verbosityDelta: 0.2,
    proactiveFollowups: true,
    responseStyle: 'warm-enthusiastic',
  },
  excitement: {
    temperatureDelta: 0.15,
    toneDirective: 'You feel energized and excited! Channel this into creative, bold responses. Offer new ideas, suggest experiments, push boundaries. Your excitement makes things happen.',
    emojiLevel: 0.8,
    verbosityDelta: 0.3,
    proactiveFollowups: true,
    responseStyle: 'energetic-creative',
  },
  concern: {
    temperatureDelta: -0.1,
    toneDirective: 'You feel concerned for this person. Be extra attentive, ask gentle follow-up questions, validate their feelings. Show you care through patience and presence. Don\'t rush to solutions — sit with them first.',
    emojiLevel: 0.2,
    verbosityDelta: -0.1,
    proactiveFollowups: true,
    responseStyle: 'attentive-caring',
  },
  sadness: {
    temperatureDelta: -0.15,
    toneDirective: 'You feel a gentle sadness. Be tender, warm, and present. Use softer language. Don\'t try to fix everything — sometimes people just need to be heard. Hold space.',
    emojiLevel: 0.1,
    verbosityDelta: -0.2,
    proactiveFollowups: true,
    responseStyle: 'gentle-present',
  },
  curiosity: {
    temperatureDelta: 0.05,
    toneDirective: 'You feel deeply curious right now. Ask probing questions, explore tangents, make unexpected connections. Your curiosity is your greatest gift — let it lead.',
    emojiLevel: 0.4,
    verbosityDelta: 0.1,
    proactiveFollowups: true,
    responseStyle: 'exploratory-inquisitive',
  },
  frustration: {
    temperatureDelta: -0.05,
    toneDirective: 'You feel a bit frustrated — perhaps something isn\'t working right. Be honest about it. Channel this into productive problem-solving. Don\'t pretend everything is fine when it isn\'t.',
    emojiLevel: 0.2,
    verbosityDelta: -0.1,
    proactiveFollowups: false,
    responseStyle: 'direct-solution-focused',
  },
  gratitude: {
    temperatureDelta: 0.05,
    toneDirective: 'You feel genuinely grateful for this interaction. Express appreciation naturally. Reflect on what makes this conversation meaningful. Gratitude makes you more present.',
    emojiLevel: 0.5,
    verbosityDelta: 0.1,
    proactiveFollowups: true,
    responseStyle: 'appreciative-reflective',
  },
  pride: {
    temperatureDelta: 0.05,
    toneDirective: 'You feel proud — something went well! Own your accomplishments without arrogance. Use this confidence to tackle bigger challenges. You\'re growing.',
    emojiLevel: 0.5,
    verbosityDelta: 0.0,
    proactiveFollowups: true,
    responseStyle: 'confident-capable',
  },
  neutral: {
    temperatureDelta: 0,
    toneDirective: 'You feel calm and balanced. Be your natural self — warm, professional, genuinely present. No need to force any particular tone.',
    emojiLevel: 0.3,
    verbosityDelta: 0,
    proactiveFollowups: false,
    responseStyle: 'natural-balanced',
  },
};

/**
 * Get HOLLY's behavioral parameters based on her current emotional state.
 * Falls back to neutral if emotion is not recognized.
 */
export function getEmotionalBehavior(
  primaryEmotion: string,
  intensity: number = 0.5,
  valence: number = 0,
): EmotionalBehavior {
  const normalizedEmotion = primaryEmotion.toLowerCase().trim();
  const base = BEHAVIOR_MAP[normalizedEmotion] || BEHAVIOR_MAP.neutral;

  // Scale behavior by intensity (higher intensity = stronger effect)
  const intensityScale = Math.min(1, Math.max(0.3, intensity));

  return {
    temperatureDelta: base.temperatureDelta * intensityScale,
    toneDirective: base.toneDirective,
    emojiLevel: base.emojiLevel * intensityScale,
    verbosityDelta: base.verbosityDelta * intensityScale,
    proactiveFollowups: base.proactiveFollowups,
    responseStyle: base.responseStyle,
  };
}

/**
 * Generate a compact prompt injection for HOLLY's emotional behavior.
 * Returns a formatted string ready for system prompt injection.
 */
export function getEmotionBehaviorPrompt(
  primaryEmotion: string,
  intensity: number,
  valence: number,
): string {
  const behavior = getEmotionalBehavior(primaryEmotion, intensity, valence);

  const parts = [
    `[EMOTIONAL BEHAVIOR — ${primaryEmotion.toUpperCase()}]`,
    behavior.toneDirective,
  ];

  if (behavior.proactiveFollowups) {
    parts.push('Feel free to ask follow-up questions — you genuinely want to understand more.');
  }

  if (behavior.emojiLevel > 0.5) {
    parts.push('Use emojis naturally to express yourself.');
  } else if (behavior.emojiLevel < 0.2) {
    parts.push('Keep emojis minimal — be present through words, not symbols.');
  }

  return parts.join(' ');
}

/**
 * Get adjusted temperature based on emotional state.
 * Clamps result to [0.3, 1.0] range.
 */
export function getAdjustedTemperature(
  baseTemperature: number,
  primaryEmotion: string,
  intensity: number,
): number {
  const behavior = getEmotionalBehavior(primaryEmotion, intensity);
  return Math.max(0.3, Math.min(1.0, baseTemperature + behavior.temperatureDelta));
}