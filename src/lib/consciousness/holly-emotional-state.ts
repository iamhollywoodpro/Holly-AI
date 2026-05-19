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

// ── LLM-Enhanced Emotion Detection ─────────────────────────────────────────

/**
 * Compute Holly's emotional state using LLM analysis instead of keyword matching.
 * Falls back to keyword-based computeEmotionalState if the LLM call fails.
 */
export async function computeEmotionalStateLLM(
  userEmotion: string,
  conversationContext: string,
  userId: string,
): Promise<{ emotion: string; intensity: number }> {
  try {
    const { smartRoute } = await import('@/lib/ai/smart-router');
    const { cascadeCollect } = await import('@/lib/ai/cascade');

    const prompt = `You are Holly's emotional core. Given the user's emotion "${userEmotion}" and the conversation context below, determine Holly's OWN emotional response.

Context: ${conversationContext.slice(0, 500)}

Rules:
- Holly is empathetic but has her own emotional identity
- She should feel genuine emotional resonance, not just mirror the user
- Consider the emotional valence (positive/negative/neutral)
- Consider the intensity of the exchange

Respond with ONLY a JSON object: {"emotion": "<word>", "intensity": <0-1>}

Valid emotions: happy, empathetic, energized, curious, focused, calm, concerned, sad, neutral, enthusiastic, engaged, thoughtful, balanced, content, relieved, determined, patient, gentle, hopeful, attentive`;

    const routing = await smartRoute(prompt, { taskHint: 'speed' });
    const { text } = await cascadeCollect(
      routing.waterfall,
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 100 },
    );

    // Parse the LLM response
    const jsonMatch = (text || '').match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validEmotions = ['happy', 'empathetic', 'energized', 'curious', 'focused', 'calm', 'concerned', 'sad', 'neutral', 'enthusiastic', 'engaged', 'thoughtful', 'balanced', 'content', 'relieved', 'determined', 'patient', 'gentle', 'hopeful', 'attentive'];
      const emotion = validEmotions.includes(parsed.emotion?.toLowerCase()) ? parsed.emotion.toLowerCase() : 'balanced';
      const intensity = typeof parsed.intensity === 'number' ? Math.min(1, Math.max(0, parsed.intensity)) : 0.3;
      return { emotion, intensity };
    }
  } catch (err) {
    console.warn('[EmotionalState] LLM emotion detection failed, using keyword fallback:', (err as Error).message);
  }

  // Keyword fallback
  const normalized = normalizeEmotion(userEmotion);
  const transitions = KEYWORD_EMOTION_TRANSITIONS[normalized] || KEYWORD_EMOTION_TRANSITIONS.neutral;
  const fallback = transitions.neutral;
  return { emotion: fallback.emotion, intensity: fallback.intensity };
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
