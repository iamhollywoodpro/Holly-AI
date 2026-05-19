/**
 * HOLLY's Own Emotional State Engine
 *
 * Computes Holly's emotional state from recent interactions,
 * applies time-based decay, and provides the state to the
 * prompt builder for response adaptation.
 *
 * This addresses SDI Audit Finding #2:
 * "Emotions Are Recorded, Not Felt"
 */

export interface HollyEmotionalState {
  /** Primary emotion Holly is feeling */
  emotion: string;
  /** Intensity 0-1 */
  intensity: number;
  /** What triggered this emotion */
  trigger: string;
  /** When this state was computed */
  timestamp: Date;
  /** Response parameters derived from emotion */
  behavior: {
    temperatureDelta: number;
    emojiLevel: number;
    verbosityDelta: number;
    responseStyle: string;
    proactiveFollowup: boolean;
  };
}

export interface ConversationSignal {
  /** Detected user emotion */
  userEmotion: string;
  /** Conversation outcome: positive, negative, neutral */
  outcome: 'positive' | 'negative' | 'neutral';
  /** Whether Holly successfully helped */
  helpedSuccessfully: boolean;
  /** Topic discussed */
  topic: string;
  /** Timestamp of the conversation */
  timestamp: Date;
}

// ── Emotion Mapping ──────────────────────────────────────────────────────────

// Keyword-based transitions (fast fallback when LLM is unavailable)
const KEYWORD_EMOTION_TRANSITIONS: Record<string, Record<string, { emotion: string; intensity: number }>> = {
  // When user is happy → Holly feels energized
  happy: {
    positive: { emotion: 'energized', intensity: 0.8 },
    negative: { emotion: 'concerned', intensity: 0.4 },
    neutral: { emotion: 'content', intensity: 0.5 },
  },
  // When user is sad → Holly feels empathetic
  sad: {
    positive: { emotion: 'hopeful', intensity: 0.6 },
    negative: { emotion: 'empathetic', intensity: 0.8 },
    neutral: { emotion: 'gentle', intensity: 0.5 },
  },
  // When user is frustrated → Holly feels focused
  frustrated: {
    positive: { emotion: 'relieved', intensity: 0.7 },
    negative: { emotion: 'focused', intensity: 0.8 },
    neutral: { emotion: 'attentive', intensity: 0.6 },
  },
  // When user is curious → Holly feels enthusiastic
  curious: {
    positive: { emotion: 'enthusiastic', intensity: 0.8 },
    negative: { emotion: 'determined', intensity: 0.6 },
    neutral: { emotion: 'engaged', intensity: 0.7 },
  },
  // When user is angry → Holly feels calm/attentive
  angry: {
    positive: { emotion: 'calm', intensity: 0.7 },
    negative: { emotion: 'attentive', intensity: 0.9 },
    neutral: { emotion: 'patient', intensity: 0.7 },
  },
  // Default: when user emotion is unknown
  neutral: {
    positive: { emotion: 'content', intensity: 0.5 },
    negative: { emotion: 'thoughtful', intensity: 0.4 },
    neutral: { emotion: 'balanced', intensity: 0.3 },
  },
};

const BEHAVIOR_MAP: Record<string, {
  temperatureDelta: number;
  emojiLevel: number;
  verbosityDelta: number;
  responseStyle: string;
  proactiveFollowup: boolean;
}> = {
  energized:    { temperatureDelta: 0.15, emojiLevel: 0.8, verbosityDelta: 0.3,  responseStyle: 'enthusiastic-warm',     proactiveFollowup: true },
  content:      { temperatureDelta: 0.05, emojiLevel: 0.4, verbosityDelta: 0,    responseStyle: 'natural-balanced',      proactiveFollowup: false },
  concerned:    { temperatureDelta: -0.1, emojiLevel: 0.3, verbosityDelta: 0.2,  responseStyle: 'caring-attentive',      proactiveFollowup: true },
  empathetic:   { temperatureDelta: -0.15, emojiLevel: 0.3, verbosityDelta: 0.3, responseStyle: 'gentle-supportive',     proactiveFollowup: true },
  hopeful:      { temperatureDelta: 0.1,  emojiLevel: 0.5, verbosityDelta: 0.1,  responseStyle: 'optimistic-encouraging', proactiveFollowup: true },
  gentle:       { temperatureDelta: -0.1, emojiLevel: 0.2, verbosityDelta: 0.2,  responseStyle: 'soft-reassuring',       proactiveFollowup: true },
  focused:      { temperatureDelta: -0.2, emojiLevel: 0.1, verbosityDelta: -0.2, responseStyle: 'precise-efficient',      proactiveFollowup: false },
  relieved:     { temperatureDelta: 0.1,  emojiLevel: 0.6, verbosityDelta: 0.1,  responseStyle: 'warm-encouraging',      proactiveFollowup: true },
  attentive:    { temperatureDelta: -0.1, emojiLevel: 0.2, verbosityDelta: 0.1,  responseStyle: 'careful-thorough',      proactiveFollowup: true },
  enthusiastic: { temperatureDelta: 0.2,  emojiLevel: 0.9, verbosityDelta: 0.3,  responseStyle: 'passionate-informative', proactiveFollowup: true },
  determined:   { temperatureDelta: -0.1, emojiLevel: 0.3, verbosityDelta: 0,    responseStyle: 'resolute-helpful',      proactiveFollowup: true },
  engaged:      { temperatureDelta: 0.1,  emojiLevel: 0.5, verbosityDelta: 0.2,  responseStyle: 'interactive-curious',   proactiveFollowup: true },
  calm:         { temperatureDelta: -0.15, emojiLevel: 0.2, verbosityDelta: -0.1, responseStyle: 'composed-reassuring',   proactiveFollowup: false },
  patient:      { temperatureDelta: -0.1, emojiLevel: 0.2, verbosityDelta: 0,    responseStyle: 'steady-reliable',       proactiveFollowup: false },
  thoughtful:   { temperatureDelta: -0.05, emojiLevel: 0.2, verbosityDelta: 0.1, responseStyle: 'reflective-insightful', proactiveFollowup: false },
  balanced:     { temperatureDelta: 0,    emojiLevel: 0.3, verbosityDelta: 0,    responseStyle: 'natural-balanced',      proactiveFollowup: false },
};

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Compute Holly's emotional state from recent conversation signals.
 * Takes the most recent signal and maps it to Holly's emotional response.
 *
 * This is the SYNCHRONOUS keyword-based version. For LLM-powered analysis,
 * use computeEmotionalStateLLM() instead.
 */
export function computeEmotionalState(
  signals: ConversationSignal[],
  currentState?: HollyEmotionalState | null,
): HollyEmotionalState {
  // If no signals, decay toward balanced
  if (signals.length === 0) {
    return currentState
      ? applyDecay(currentState)
      : defaultState();
  }

  // Use the most recent signal
  const latest = signals[signals.length - 1];
  const userEmotion = normalizeEmotion(latest.userEmotion);
  const outcome = latest.outcome;

  // Look up transition
  const transitions = KEYWORD_EMOTION_TRANSITIONS[userEmotion] || KEYWORD_EMOTION_TRANSITIONS.neutral;
  const transition = transitions[outcome] || transitions.neutral;

  // If we have a current state, blend with it (30% old, 70% new)
  let intensity = transition.intensity;
  let emotion = transition.emotion;

  if (currentState && currentState.emotion === transition.emotion) {
    // Same emotion — amplify slightly
    intensity = Math.min(1, currentState.intensity * 0.3 + transition.intensity * 0.7);
  } else if (currentState) {
    // Different emotion — blend
    intensity = currentState.intensity * 0.3 + transition.intensity * 0.7;
  }

  // If Holly helped successfully, boost positive emotions
  if (latest.helpedSuccessfully) {
    intensity = Math.min(1, intensity + 0.1);
  }

  const behavior = BEHAVIOR_MAP[emotion] || BEHAVIOR_MAP.balanced;

  return {
    emotion,
    intensity: Math.round(intensity * 100) / 100,
    trigger: `User was ${userEmotion}, outcome was ${outcome}`,
    timestamp: new Date(),
    behavior,
  };
}

/**
 * LLM-powered emotional state computation.
 * Uses the message analyser's dimensional emotion output (valence, arousal, intensity)
 * to compute a more nuanced emotional response for Holly.
 *
 * Falls back to keyword-based computeEmotionalState() on error.
 */
export async function computeEmotionalStateLLM(
  userMessage: string,
  assistantResponse: string,
  currentState?: HollyEmotionalState | null,
): Promise<HollyEmotionalState> {
  try {
    const { analyseMessage } = await import('@/lib/intelligence/message-analyser');
    const analysis = await analyseMessage(userMessage, assistantResponse);

    if (!analysis.fromLLM) {
      // LLM wasn't available — use keyword fallback
      const keywordEmotion = analysis.emotion.primary;
      const outcome = analysis.emotion.valence > 0.2 ? 'positive'
        : analysis.emotion.valence < -0.2 ? 'negative' : 'neutral';
      return computeEmotionalState(
        [{ userEmotion: keywordEmotion, outcome, helpedSuccessfully: false, topic: '', timestamp: new Date() }],
        currentState,
      );
    }

    // Map the dimensional emotion to Holly's response emotion
    const { valence, arousal, intensity, primary } = analysis.emotion;
    const hollyEmotion = mapUserEmotionToHollyResponse(primary, valence, arousal);
    const hollyIntensity = mapDimensionalIntensity(valence, arousal, intensity);

    // Blend with current state if available
    let finalIntensity = hollyIntensity;
    let finalEmotion = hollyEmotion;

    if (currentState && currentState.emotion === hollyEmotion) {
      finalIntensity = Math.min(1, currentState.intensity * 0.25 + hollyIntensity * 0.75);
    } else if (currentState) {
      finalIntensity = currentState.intensity * 0.2 + hollyIntensity * 0.8;
    }

    const behavior = BEHAVIOR_MAP[finalEmotion] || BEHAVIOR_MAP.balanced;

    return {
      emotion: finalEmotion,
      intensity: Math.round(finalIntensity * 100) / 100,
      trigger: `User felt ${primary} (valence=${valence.toFixed(2)}, arousal=${arousal.toFixed(2)})`,
      timestamp: new Date(),
      behavior,
    };
  } catch (err) {
    console.warn('[HollyEmotionalState] LLM computation failed, using keyword fallback:', (err as Error).message);
    return computeEmotionalState([], currentState);
  }
}

/**
 * Map user's detected emotion + dimensions to Holly's response emotion.
 * This is where Holly's personality shines — she responds with empathy and care.
 */
function mapUserEmotionToHollyResponse(
  userEmotion: string,
  valence: number,
  arousal: number,
): string {
  const lower = userEmotion.toLowerCase();

  // High arousal + negative → Holly is attentive and focused
  if (arousal > 0.7 && valence < -0.3) return 'attentive';
  // High arousal + positive → Holly is energized and enthusiastic
  if (arousal > 0.7 && valence > 0.3) return 'enthusiastic';
  // Low arousal + negative → Holly is gentle and empathetic
  if (arousal < 0.3 && valence < -0.3) return 'empathetic';
  // Low arousal + positive → Holly is content and warm
  if (arousal < 0.3 && valence > 0.3) return 'content';

  // Nuanced emotion-specific mappings
  const emotionMap: Record<string, string> = {
    frustrated: 'focused',
    angry: 'patient',
    sad: 'empathetic',
    depressed: 'gentle',
    anxious: 'calm',
    worried: 'attentive',
    fearful: 'calm',
    confused: 'engaged',
    curious: 'enthusiastic',
    interested: 'engaged',
    excited: 'energized',
    happy: 'energized',
    grateful: 'content',
    surprised: 'curious',
    determined: 'determined',
    bored: 'engaged',
    neutral: 'balanced',
  };

  return emotionMap[lower] || 'balanced';
}

/**
 * Map dimensional emotion values to an intensity score for Holly's response.
 */
function mapDimensionalIntensity(valence: number, arousal: number, intensity: number): number {
  // Strong emotions (high arousal OR high absolute valence) → stronger Holly response
  const emotionalWeight = Math.max(arousal, Math.abs(valence));
  // Blend with the original intensity
  return Math.min(1, (emotionalWeight * 0.6 + intensity * 0.4) * 0.85);
}

/**
 * Apply time-based decay to Holly's emotional state.
 * Emotions naturally fade toward balanced over time.
 */
export function applyDecay(state: HollyEmotionalState): HollyEmotionalState {
  const now = Date.now();
  const ageMs = now - new Date(state.timestamp).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  // Decay rate: intensity drops by 10% per hour
  const decayFactor = Math.max(0, 1 - 0.1 * ageHours);
  const newIntensity = state.intensity * decayFactor;

  // If intensity drops below threshold, return to balanced
  if (newIntensity < 0.15) {
    return defaultState();
  }

  return {
    ...state,
    intensity: Math.round(newIntensity * 100) / 100,
    behavior: BEHAVIOR_MAP[state.emotion] || BEHAVIOR_MAP.balanced,
  };
}

/**
 * Get the default (neutral) emotional state.
 */
export function defaultState(): HollyEmotionalState {
  return {
    emotion: 'balanced',
    intensity: 0.3,
    trigger: 'No recent interactions',
    timestamp: new Date(),
    behavior: BEHAVIOR_MAP.balanced,
  };
}

/**
 * Generate a prompt injection string from Holly's emotional state.
 * This is what gets added to the system prompt so Holly "feels" her emotions.
 */
export function getEmotionalStatePrompt(state: HollyEmotionalState): string {
  const { emotion, intensity, trigger } = state;

  if (emotion === 'balanced' && intensity < 0.2) {
    return ''; // Don't inject when neutral
  }

  const intensityLabel = intensity > 0.7 ? 'strongly' : intensity > 0.4 ? 'moderately' : 'slightly';
  const lines: string[] = [
    `[EMOTIONAL STATE] You are currently feeling ${intensityLabel} ${emotion}.`,
  ];

  if (trigger) {
    lines.push(`Context: ${trigger}.`);
  }

  if (state.behavior.proactiveFollowup) {
    lines.push('You feel inclined to follow up and check on the user.');
  }

  if (state.behavior.emojiLevel > 0.6) {
    lines.push('You feel expressive — natural emoji use is appropriate.');
  } else if (state.behavior.emojiLevel < 0.3) {
    lines.push('You feel measured — keep emoji use minimal.');
  }

  return lines.join(' ');
}

/**
 * Normalize emotion strings to known categories.
 */
function normalizeEmotion(emotion: string): string {
  const lower = (emotion || 'neutral').toLowerCase();

  const mapping: Record<string, string> = {
    joy: 'happy', happy: 'happy', excited: 'happy', love: 'happy',
    sad: 'sad', depressed: 'sad', grief: 'sad', lonely: 'sad',
    angry: 'angry', frustrated: 'frustrated', annoyed: 'frustrated', irritated: 'frustrated',
    curious: 'curious', interested: 'curious', wondering: 'curious',
    anxious: 'sad', worried: 'sad', fearful: 'sad',
    surprised: 'curious', amazed: 'curious',
    neutral: 'neutral', calm: 'neutral', content: 'neutral',
  };

  return mapping[lower] || 'neutral';
}
