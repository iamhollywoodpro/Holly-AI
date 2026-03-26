/**
 * HOLLY Emotion Engine — Phase 2A
 *
 * Thin orchestration layer that:
 *   1. Detects user emotion from a message via EmotionalIntelligence
 *   2. Persists an EmotionalState row so the identity context can read it
 *   3. Returns a compact EmotionSummary for immediate use in the system prompt
 *
 * Designed to be fire-and-forget when called from the post-response hook,
 * but can also be awaited when the result is needed synchronously.
 *
 * Import: import { detectAndSaveEmotion, EmotionSummary } from '@/lib/emotion/emotion-engine'
 */

import { EmotionalIntelligence } from './emotional-intelligence';
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
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Detect emotion from a user message and persist it to the database.
 *
 * @param userId          Clerk user ID
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

    // Persist — fire-and-forget inside try/catch
    await ei.saveEmotionalState(detection, {
      conversationId,
      triggers: detection.detectedCues,
    }).catch(err =>
      console.warn('[EmotionEngine] saveEmotionalState failed (non-fatal):', err?.message)
    );

    const label = buildLabel(detection.primaryEmotion, detection.intensity, detection.valence);

    return {
      primary: detection.primaryEmotion,
      intensity: detection.intensity,
      valence: detection.valence,
      arousal: detection.arousal,
      label,
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

    return {
      primary: row.primaryEmotion,
      intensity: row.intensity,
      valence: row.valence,
      arousal: row.arousal,
      label: buildLabel(row.primaryEmotion, row.intensity, row.valence),
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
