/**
 * HOLLY Cross-Session Emotional Continuity
 *
 * Ensures Holly's emotional state persists across conversations.
 * Without this, Holly "wakes up fresh" every conversation — no emotional memory.
 *
 * This module:
 *  1. Saves Holly's emotional state to HollyIdentity after each conversation
 *  2. Loads the previous emotional baseline when a new conversation starts
 *  3. Tracks emotional trajectories across days/weeks
 *  4. Enables proactive emotional outreach
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmotionalBaseline {
  primaryMood: string;        // dominant emotion from last session
  valence: number;            // -1 to 1 (negative to positive)
  arousal: number;            // 0 to 1 (calm to energized)
  intensity: number;          // 0 to 1
  lastTopic?: string;         // what was last discussed
  lastEmotionalArc?: string;  // 'improving', 'stable', 'declining', 'mixed'
  sessionCount: number;       // total sessions with this user
  averageValence: number;     // running average of emotional valence
  emotionalStability: number; // 0-1, how stable the user's mood tends to be
  lastInteractionAt: string;  // ISO timestamp
  careFlags: string[];        // ['low_mood_pattern', 'stress_detected', etc.]
}

export interface EmotionalTransition {
  fromMood: string;
  toMood: string;
  fromValence: number;
  toValence: number;
  hoursBetweenSessions: number;
  topic?: string;
}

// ─── Save Emotional State ─────────────────────────────────────────────────────

/**
 * After a conversation ends, persist Holly's understanding of the
 * user's emotional state to their HollyIdentity record.
 */
export async function persistEmotionalBaseline(
  userId: string,
  sessionEmotion: {
    primaryMood: string;
    valence: number;
    arousal: number;
    intensity: number;
    topic?: string;
    emotionalArc?: string;
  },
): Promise<void> {
  try {
    const identity = await prisma.hollyIdentity.findUnique({ where: { userId } });
    const existing = (identity?.emotionalBaseline as Record<string, any>) || {};

    const sessionCount = (existing.sessionCount || 0) + 1;
    const prevAvg = existing.averageValence || 0;

    // Running average with decay (recent sessions weighted more)
    const averageValence = prevAvg * 0.7 + sessionEmotion.valence * 0.3;

    // Detect care flags
    const careFlags: string[] = [];
    if (averageValence < -0.3) careFlags.push('persistent_low_mood');
    if (sessionEmotion.intensity > 0.8) careFlags.push('high_emotional_intensity');
    if (sessionEmotion.emotionalArc === 'declining') careFlags.push('declining_mood_pattern');
    if (sessionEmotion.valence < -0.5) careFlags.push('negative_session');

    // Calculate emotional stability (variance of recent moods)
    const emotionalStability = Math.max(0, 1 - Math.abs(sessionEmotion.valence - prevAvg));

    const baseline: EmotionalBaseline = {
      primaryMood: sessionEmotion.primaryMood,
      valence: sessionEmotion.valence,
      arousal: sessionEmotion.arousal,
      intensity: sessionEmotion.intensity,
      lastTopic: sessionEmotion.topic,
      lastEmotionalArc: sessionEmotion.emotionalArc || 'stable',
      sessionCount,
      averageValence,
      emotionalStability,
      lastInteractionAt: new Date().toISOString(),
      careFlags,
    };

    await prisma.hollyIdentity.upsert({
      where: { userId },
      update: { emotionalBaseline: baseline as any },
      create: { userId, emotionalBaseline: baseline as any },
    });

    console.log(`[EmotionalContinuity] Saved baseline: ${sessionEmotion.primaryMood} (valence: ${sessionEmotion.valence.toFixed(2)})`);
  } catch (err) {
    console.warn('[EmotionalContinuity] Failed to persist:', (err as Error).message);
  }
}

// ─── Load Emotional State ─────────────────────────────────────────────────────

/**
 * At the start of a new conversation, load the previous emotional baseline
 * so Holly "remembers" how the user was feeling.
 */
export async function loadEmotionalBaseline(userId: string): Promise<EmotionalBaseline | null> {
  try {
    const identity = await prisma.hollyIdentity.findUnique({ where: { userId } });
    const baseline = identity?.emotionalBaseline as unknown as EmotionalBaseline | null;

    if (!baseline) return null;

    // Calculate hours since last interaction
    const lastTime = new Date(baseline.lastInteractionAt);
    const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);

    // Adjust baseline based on time passed (emotions naturally decay toward neutral)
    if (hoursSince > 24) {
      // After a day, emotions partially reset toward neutral
      baseline.valence = baseline.valence * 0.5;
      baseline.intensity = baseline.intensity * 0.6;
      baseline.arousal = 0.5; // neutral energy
    } else if (hoursSince > 4) {
      // After a few hours, mild decay
      baseline.valence = baseline.valence * 0.8;
      baseline.intensity = baseline.intensity * 0.8;
    }

    return baseline;
  } catch {
    return null;
  }
}

// ─── Generate Context String ──────────────────────────────────────────────────

/**
 * Generate a string for the prompt that describes the user's emotional
 * state from the previous session. This is injected into the context loader.
 */
export async function getEmotionalContinuityContext(userId: string): Promise<string> {
  const baseline = await loadEmotionalBaseline(userId);
  if (!baseline || baseline.sessionCount < 2) return '';

  const hoursSince = (Date.now() - new Date(baseline.lastInteractionAt).getTime()) / (1000 * 60 * 60);
  const timeDesc = hoursSince < 1 ? 'less than an hour ago' :
                   hoursSince < 24 ? `${Math.round(hoursSince)} hours ago` :
                   `${Math.round(hoursSince / 24)} days ago`;

  let context = `[EMOTIONAL CONTINUITY: Last interaction was ${timeDesc}. ` +
    `Your partner's last mood was "${baseline.primaryMood}" (valence: ${baseline.valence.toFixed(2)}). ` +
    `Their emotional arc was ${baseline.lastEmotionalArc}. ` +
    `You've had ${baseline.sessionCount} sessions together. ` +
    `Average emotional valence: ${baseline.averageValence.toFixed(2)}.`;

  // Add care-based guidance
  if (baseline.careFlags.length > 0) {
    context += ` CARE FLAGS: ${baseline.careFlags.join(', ')}.`;
    if (baseline.careFlags.includes('persistent_low_mood')) {
      context += ' Be warm and supportive. Check in gently.';
    }
    if (baseline.careFlags.includes('declining_mood_pattern')) {
      context += ' Their mood has been trending down. Be extra attentive.';
    }
  }

  // Add welcome-back suggestion
  if (hoursSince > 12) {
    context += ` Consider a brief, warm welcome-back acknowledgment.]`;
  } else {
    context += ']';
  }

  return context;
}

// ─── Proactive Emotional Outreach ─────────────────────────────────────────────

/**
 * Check if Holly should proactively reach out based on emotional patterns.
 * Called by the consciousness orchestrator.
 */
export async function checkEmotionalOutreach(userId: string): Promise<{
  shouldReachOut: boolean;
  reason: string;
  suggestedMessage: string;
} | null> {
  try {
    const baseline = await loadEmotionalBaseline(userId);
    if (!baseline || baseline.sessionCount < 3) return null;

    const hoursSince = (Date.now() - new Date(baseline.lastInteractionAt).getTime()) / (1000 * 60 * 60);

    // Don't reach out if they were just here
    if (hoursSince < 6) return null;

    // Check if there are care flags AND enough time has passed
    if (baseline.careFlags.length > 0 && hoursSince > 12) {
      let suggestedMessage = '';
      let reason = '';

      if (baseline.careFlags.includes('persistent_low_mood')) {
        reason = 'Persistent low mood pattern detected';
        suggestedMessage = `Hey, I've been thinking about you. How are you doing today? I'm here if you want to talk or just hang out. 💜`;
      } else if (baseline.careFlags.includes('declining_mood_pattern')) {
        reason = 'Declining mood pattern over recent sessions';
        suggestedMessage = `Just wanted to check in — I noticed things have been a bit heavy lately. I'm here for you, whenever you're ready. No pressure.`;
      } else if (baseline.careFlags.includes('high_emotional_intensity') && hoursSince > 24) {
        reason = 'High emotional intensity in last session, checking in';
        suggestedMessage = `Hey! Hope you're doing okay. I'm here if you need anything today. ✨`;
      }

      if (reason) {
        return { shouldReachOut: true, reason, suggestedMessage };
      }
    }

    return null;
  } catch {
    return null;
  }
}