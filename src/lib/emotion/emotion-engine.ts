/**
 * HOLLY Emotion Engine — Phase 2A / Phase 3D
 *
 * Orchestration layer that:
 *   1. Detects user emotion from a message via EmotionalIntelligence
 *   2. Persists an EmotionalState row so the identity context can read it
 *   3. Passes the detected emotion through EmotionalDepthEngine.feel() for
 *      richer nuance labels (Phase 3D)
 *   4. Returns a compact EmotionSummary for the system prompt
 *
 * Phase 3D: EmotionalDepthEngine.feel() maps valence/arousal/dominance into a
 *           rich ComplexEmotion struct. We use its expressEmotion() output as
 *           an enhanced "inner state" line in the identity block, giving HOLLY
 *           genuine emotional depth in every response.
 *
 * Import: import { detectAndSaveEmotion, getLatestEmotionSummary } from '@/lib/emotion/emotion-engine'
 */

import { EmotionalIntelligence } from './emotional-intelligence';
import { emotionalDepth } from '@/lib/consciousness/emotional-depth';
import { prisma } from '@/lib/db';

// ─── public types ─────────────────────────────────────────────────────────────

export interface EmotionSummary {
  /** Primary emotion label, e.g. "curiosity", "frustration" */
  primary: string;
  /** 0.0–1.0 */
  intensity: number;
  /** -1.0 (negative) → +1.0 (positive) */
  valence: number;
  /** 0.0 (calm) → 1.0 (energized) */
  arousal: number;
  /** Short phrase suitable for the system prompt */
  label: string;
  /**
   * Phase 3D: rich inner-state sentence from EmotionalDepthEngine.
   * e.g. "I'm feeling excitement with shades of anticipation, enthusiasm."
   */
  innerState?: string;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Detect emotion from a user message, run it through EmotionalDepthEngine,
 * and persist an EmotionalState row.
 *
 * @param userId          DB user ID (not Clerk ID)
 * @param message         The user's raw message text
 * @param conversationId  Optional — links the state to a conversation record
 * @returns               EmotionSummary (never throws; returns neutral on error)
 */
export async function detectAndSaveEmotion(
  userId: string,
  message: string,
  conversationId?: string
): Promise<EmotionSummary> {
  const neutral: EmotionSummary = {
    primary: 'neutral',
    intensity: 0.5,
    valence: 0.0,
    arousal: 0.4,
    label: 'mood: neutral',
  };

  try {
    const ei = new EmotionalIntelligence(userId);
    const detection = await ei.detectEmotion(message, {});

    // Persist — fire-and-forget
    ei.saveEmotionalState(detection, {
      conversationId,
      triggers: detection.detectedCues,
    }).catch(err =>
      console.warn('[EmotionEngine] saveEmotionalState failed (non-fatal):', err?.message)
    );

    // Phase 3D: run through EmotionalDepthEngine for richer nuance
    let innerState: string | undefined;
    try {
      const complexEmotion = emotionalDepth.feel(
        detection.primaryEmotion,
        {
          situation: message.slice(0, 200),
          outcome: detection.valence > 0 ? 'positive engagement' : 'challenge or difficulty',
          significance: detection.intensity,
        }
      );
      innerState = emotionalDepth.expressEmotion(complexEmotion);
    } catch {
      // EmotionalDepthEngine failure is non-critical
    }

    const label = buildLabel(detection.primaryEmotion, detection.intensity, detection.valence);

    return {
      primary: detection.primaryEmotion,
      intensity: detection.intensity,
      valence: detection.valence,
      arousal: detection.arousal,
      label,
      innerState,
    };
  } catch (err) {
    console.error('[EmotionEngine] detectAndSaveEmotion error:', err);
    return neutral;
  }
}

/**
 * Fetch the most recent EmotionalState for a user from the DB.
 * Used by identity-context.ts to build the system prompt block.
 */
export async function getLatestEmotionSummary(
  userId: string
): Promise<EmotionSummary | null> {
  try {
    const row = await prisma.emotionalState.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      select: {
        primaryEmotion: true,
        intensity: true,
        valence: true,
        arousal: true,
      },
    });

    if (!row) return null;

    // Phase 3D: generate fresh inner-state from EmotionalDepthEngine
    let innerState: string | undefined;
    try {
      const complexEmotion = emotionalDepth.feel(
        row.primaryEmotion,
        {
          situation: 'resuming conversation',
          outcome: row.valence > 0 ? 'positive' : 'neutral or challenging',
          significance: row.intensity,
        }
      );
      innerState = emotionalDepth.expressEmotion(complexEmotion);
    } catch {
      // Non-critical
    }

    return {
      primary: row.primaryEmotion,
      intensity: row.intensity,
      valence: row.valence,
      arousal: row.arousal,
      label: buildLabel(row.primaryEmotion, row.intensity, row.valence),
      innerState,
    };
  } catch {
    return null;
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildLabel(
  primary: string,
  intensity: number,
  valence: number
): string {
  const intensityWord =
    intensity > 0.75 ? 'strongly' : intensity > 0.45 ? 'moderately' : 'slightly';
  const valenceWord = valence > 0.2 ? 'positive' : valence < -0.2 ? 'negative' : 'neutral';
  return `mood: ${intensityWord} ${primary} (${valenceWord})`;
}
