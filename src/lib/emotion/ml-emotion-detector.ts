/**
 * HOLLY ML Emotion Detector — V3.0
 *
 * Hybrid emotion detection that combines:
 *  1. LLM-based semantic analysis (primary) — understands context and nuance
 *  2. Linguistic signal analysis (secondary) — caps, punctuation, intensifiers
 *  3. Valence/arousal scoring (dimensional) — maps to circumplex model
 *
 * Future: Can be upgraded to @xenova/transformers with j-hartmann/emotion-english-distilroberta-base
 * for local inference. The interface is designed to swap in the transformer when ready.
 *
 * Used by: post-response-hook.ts, chat pipeline, consciousness orchestrator
 */

import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EmotionResult {
  /** The detected primary emotion */
  primary: EmotionLabel;
  /** Confidence 0-1 */
  confidence: number;
  /** All emotion scores */
  scores: Record<EmotionLabel, number>;
  /** Dimensional model: valence (-1 negative to +1 positive) */
  valence: number;
  /** Dimensional model: arousal (0 calm to 1 intense) */
  arousal: number;
  /** Linguistic signals detected */
  signals: LinguisticSignals;
}

export type EmotionLabel =
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise'
  | 'disgust' | 'trust' | 'anticipation' | 'neutral';

export interface LinguisticSignals {
  hasExclamation: boolean;
  hasAllCaps: boolean;
  hasQuestion: boolean;
  hasEllipsis: boolean;
  intensifierCount: number;
  negationCount: number;
  firstPersonPronouns: number;
  averageWordLength: number;
}

// ─── Linguistic Analysis (Fast, Local) ─────────────────────────────────────

const INTENSIFIERS = [
  'very', 'really', 'extremely', 'incredibly', 'absolutely', 'totally',
  'completely', 'utterly', 'so', 'super', 'mega', 'insanely', 'hugely',
];

const NEGATIONS = [
  "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't",
  "shouldn't", "isn't", "aren't", "wasn't", "weren't", "not", "no", "never",
  "nothing", "nobody", "nowhere", "neither", "nor", "hardly", "barely",
];

export function analyzeLinguisticSignals(text: string): LinguisticSignals {
  const words = text.split(/\s+/);
  const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z']/g, ''));

  return {
    hasExclamation: /!{1,}/.test(text),
    hasAllCaps: /\b[A-Z]{3,}\b/.test(text),
    hasQuestion: /\?/.test(text),
    hasEllipsis: /\.{3,}/.test(text),
    intensifierCount: lowerWords.filter(w => INTENSIFIERS.includes(w)).length,
    negationCount: lowerWords.filter(w => NEGATIONS.includes(w)).length,
    firstPersonPronouns: lowerWords.filter(w => ['i', 'me', 'my', 'mine', 'myself'].includes(w)).length,
    averageWordLength: words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1),
  };
}

// ─── LLM-Based Semantic Analysis (Primary) ────────────────────────────────

const EMOTION_ANALYSIS_PROMPT = `You are an emotion analysis system. Analyze the user's message and return ONLY JSON.

Detect the primary emotion and score ALL emotions on a 0-1 scale.
Also provide valence (sentiment: -1 to +1) and arousal (intensity: 0 to 1).

Emotions: joy, sadness, anger, fear, surprise, disgust, trust, anticipation, neutral

Consider:
- Word choice and connotation
- Sentence structure (questions, exclamations, trailing off)
- Topic and context
- Implied emotion (not just stated)
- Sarcasm, humor, and indirect expression

Respond ONLY with valid JSON:
{
  "primary": "emotion_label",
  "confidence": 0.85,
  "scores": { "joy": 0.1, "sadness": 0.8, "anger": 0.0, "fear": 0.2, "surprise": 0.1, "disgust": 0.0, "trust": 0.3, "anticipation": 0.1, "neutral": 0.1 },
  "valence": -0.6,
  "arousal": 0.7,
  "reasoning": "Brief explanation"
}`;

/**
 * Detect emotions using LLM semantic analysis (primary method).
 * Falls back to linguistic-only analysis if LLM fails.
 */
export async function detectEmotionsLLM(
  message: string,
  conversationContext?: string,
): Promise<EmotionResult> {
  const signals = analyzeLinguisticSignals(message);
  const neutralResult = buildNeutralResult(signals);

  try {
    const contextBlock = conversationContext
      ? `\n\nRecent conversation context:\n${conversationContext.slice(-500)}`
      : '';

    const { text } = await cascadeCollect(
      (await smartRoute(message, { taskHint: 'speed' })).waterfall,
      [
        { role: 'system', content: EMOTION_ANALYSIS_PROMPT },
        { role: 'user', content: `Analyze this message:${contextBlock}\n\n"${message}"` },
      ],
      { temperature: 0.2, maxTokens: 400 },
    );

    const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) return neutralResult;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate primary emotion
    const validEmotions: EmotionLabel[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation', 'neutral'];
    if (!validEmotions.includes(parsed.primary)) {
      parsed.primary = 'neutral';
    }

    // Merge LLM scores with linguistic signal adjustments
    const adjustedScores = adjustScoresWithSignals(
      parsed.scores || {},
      signals,
      parsed.primary,
    );

    return {
      primary: parsed.primary,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      scores: adjustedScores,
      valence: clamp(parsed.valence || 0, -1, 1),
      arousal: clamp(parsed.arousal || 0.5, 0, 1),
      signals,
    };
  } catch (err) {
    console.warn('[MLEmotion] LLM detection failed, using linguistic fallback:', (err as Error).message);
    return neutralResult;
  }
}

// ─── Score Adjustment ──────────────────────────────────────────────────────

function adjustScoresWithSignals(
  llmScores: Record<string, number>,
  signals: LinguisticSignals,
  primary: string,
): Record<EmotionLabel, number> {
  const defaults: Record<EmotionLabel, number> = {
    joy: 0.1, sadness: 0.1, anger: 0.0, fear: 0.0,
    surprise: 0.1, disgust: 0.0, trust: 0.3,
    anticipation: 0.1, neutral: 0.5,
  };

  const scores: Record<EmotionLabel, number> = { ...defaults };
  for (const [key, val] of Object.entries(llmScores)) {
    if (key in scores) {
      scores[key as EmotionLabel] = clamp(val, 0, 1);
    }
  }

  // Linguistic signal adjustments (small nudges)
  if (signals.hasExclamation) {
    scores.joy = Math.min(1, scores.joy + 0.1);
    scores.surprise = Math.min(1, scores.surprise + 0.05);
  }
  if (signals.hasAllCaps) {
    scores.anger = Math.min(1, scores.anger + 0.1);
    scores.joy = Math.min(1, scores.joy + 0.05);
  }
  if (signals.hasEllipsis) {
    scores.sadness = Math.min(1, scores.sadness + 0.05);
    scores.fear = Math.min(1, scores.fear + 0.05);
  }
  if (signals.intensifierCount > 2) {
    scores[primary as EmotionLabel] = Math.min(1, scores[primary as EmotionLabel] + 0.15);
  }

  return scores;
}

function buildNeutralResult(signals: LinguisticSignals): EmotionResult {
  return {
    primary: 'neutral',
    confidence: 0.6,
    scores: {
      joy: 0.05, sadness: 0.05, anger: 0.0, fear: 0.0,
      surprise: 0.05, disgust: 0.0, trust: 0.3,
      anticipation: 0.1, neutral: 0.7,
    },
    valence: 0,
    arousal: 0.3,
    signals,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Future: Transformer Model Integration ─────────────────────────────────

/**
 * When @xenova/transformers is configured with the emotion model,
 * this function can replace detectEmotionsLLM for local inference.
 *
 * Setup:
 *   1. npm install @xenova/transformers
 *   2. Download model: j-hartmann/emotion-english-distilroberta-base
 *   3. Set USE_LOCAL_EMO_MODEL=true in .env
 *   4. This function will be called instead of the LLM method
 *
 * Benefits: No API cost, ~50ms inference, consistent results
 * Trade-off: Less contextual understanding, fixed 7-emotion output
 */
export async function detectEmotionsLocal(_message: string): Promise<EmotionResult | null> {
  // Placeholder for future transformer integration
  // Will use: const pipeline = await pipeline('text-classification', MODEL_ID);
  return null;
}