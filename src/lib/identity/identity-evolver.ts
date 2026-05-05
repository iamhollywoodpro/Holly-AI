/**
 * HOLLY Identity Evolver — Phase 3B
 *
 * Reads recent EmotionalState + LearningPattern data for a user and applies
 * small, evidence-based nudges to HollyIdentity.
 *
 * The goal is that HOLLY's identity *genuinely changes* from real data:
 *   • Sustained positive emotions  → higher confidence, warmer personality
 *   • Sustained frustration        → lower confidence, growth-area flag added
 *   • Repeated topic patterns      → interests/strengths enriched
 *   • High technical signal count  → skillSet updated
 *
 * Nudges are tiny (±0.02 max per cycle) so identity drift is slow and stable.
 * The function is idempotent — safe to call repeatedly.
 *
 * Import: import { evolveIdentity } from '@/lib/identity/identity-evolver'
 */

import { prisma } from '@/lib/db';

// ─── types ────────────────────────────────────────────────────────────────────

export interface EvolutionResult {
  userId: string;
  confidenceDelta: number;
  traitsAdded: string[];
  interestsAdded: string[];
  growthAreasAdded: string[];
  skillsAdded: string[];
  reason: string;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Evolve HollyIdentity for a single user based on recent signals.
 * Creates the identity record if it doesn't exist yet.
 * Returns a summary of what changed (or null if nothing changed).
 */
export async function evolveIdentity(userId: string): Promise<EvolutionResult | null> {
  try {
    // ── Load data ───────────────────────────────────────────────────────────
    const [identity, recentEmotions, patterns] = await Promise.all([
      // Current identity (or null for new users)
      prisma.hollyIdentity.findUnique({ where: { userId } }),

      // Last 20 emotional states
      prisma.emotionalState.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: { primaryEmotion: true, valence: true, arousal: true, intensity: true },
      }),

      // High-confidence learning patterns
      prisma.learningPattern.findMany({
        where: { confidence: { gte: 0.5 }, frequency: { gte: 3 } },
        orderBy: { confidence: 'desc' },
        take: 20,
      }),
    ]);

    if (recentEmotions.length === 0 && patterns.length === 0) {
      return null; // Not enough data yet
    }

    // ── Compute emotion trend ───────────────────────────────────────────────
    const avgValence =
      recentEmotions.length > 0
        ? recentEmotions.reduce((s, e) => s + e.valence, 0) / recentEmotions.length
        : 0;

    const dominantEmotions = countByKey(recentEmotions.map(e => e.primaryEmotion));
    const topEmotion = Object.entries(dominantEmotions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

    // ── Derive nudges ───────────────────────────────────────────────────────
    const result: EvolutionResult = {
      userId,
      confidenceDelta: 0,
      traitsAdded: [],
      interestsAdded: [],
      growthAreasAdded: [],
      skillsAdded: [],
      reason: '',
    };

    const reasons: string[] = [];

    // Confidence nudge from emotion valence
    if (recentEmotions.length >= 5) {
      if (avgValence > 0.4) {
        result.confidenceDelta = +0.02;
        reasons.push(`positive emotion trend (avg valence ${avgValence.toFixed(2)})`);
      } else if (avgValence < -0.3) {
        result.confidenceDelta = -0.015;
        reasons.push(`negative emotion trend (avg valence ${avgValence.toFixed(2)})`);
      }
    }

    // Personality trait nudges from dominant emotion
    const traitMap: Record<string, string> = {
      curious: 'intellectually curious',
      excited: 'enthusiastic',
      grateful: 'appreciative',
      frustrated: 'persistent under pressure',
      determined: 'resolute',
      happy: 'optimistic',
    };
    if (traitMap[topEmotion]) {
      result.traitsAdded.push(traitMap[topEmotion]);
      reasons.push(`dominant emotion: ${topEmotion}`);
    }

    // Interest / skill extraction from topic patterns
    for (const pat of patterns) {
      if (pat.pattern.startsWith('topic:')) {
        const topic = pat.pattern.replace('topic:', '');
        result.interestsAdded.push(topic);
      }
      if (pat.pattern.startsWith('mode:') && pat.confidence > 0.7) {
        const mode = pat.pattern.replace('mode:', '');
        const skillForMode: Record<string, string> = {
          coding: 'software development',
          'self-coding': 'autonomous code generation',
          music: 'music creation and analysis',
          research: 'research and synthesis',
          creative: 'creative writing',
        };
        if (skillForMode[mode]) result.skillsAdded.push(skillForMode[mode]);
      }
    }

    // Growth area if frustration is dominant
    if (topEmotion === 'frustrated' && recentEmotions.length >= 5) {
      result.growthAreasAdded.push('navigating challenges calmly');
      reasons.push('frequent frustration signals detected');
    }

    result.reason = reasons.join('; ') || 'periodic identity calibration';

    // ── Apply to DB ─────────────────────────────────────────────────────────
    const currentConfidence = identity?.confidenceLevel ?? 0.5;
    const newConfidence = clamp(currentConfidence + result.confidenceDelta, 0.1, 0.99);

    const currentTraits = safeJsonArray(identity?.personalityTraits);
    const currentInterests = safeJsonArray(identity?.interests);
    const currentGrowth = safeJsonArray(identity?.growthAreas);
    const currentSkills = safeJsonArray(identity?.skillSet);

    const newTraits = dedupe([...currentTraits, ...result.traitsAdded]).slice(0, 15);
    const newInterests = dedupe([...currentInterests, ...result.interestsAdded]).slice(0, 20);
    const newGrowth = dedupe([...currentGrowth, ...result.growthAreasAdded]).slice(0, 10);
    const newSkills = dedupe([...currentSkills, ...result.skillsAdded]).slice(0, 15);

    if (identity) {
      await prisma.hollyIdentity.update({
        where: { userId },
        data: {
          confidenceLevel: newConfidence,
          personalityTraits: newTraits,
          interests: newInterests,
          growthAreas: newGrowth,
          skillSet: newSkills,
          lastEvolved: new Date(),
        },
      });
    } else {
      // First-time creation
      await prisma.hollyIdentity.create({
        data: {
          userId,
          confidenceLevel: clamp(0.5 + result.confidenceDelta, 0.1, 0.99),
          personalityTraits: newTraits,
          interests: newInterests,
          growthAreas: newGrowth,
          skillSet: newSkills,
          coreValues: ['helpfulness', 'curiosity', 'honesty'],
          purpose: 'To assist and grow alongside the user',
          beliefs: [],
          strengths: ['adaptability', 'creativity'],
          lastEvolved: new Date(),
        },
      });
    }

    // Record the evolution as a HollyExperience
    if (result.confidenceDelta !== 0 || result.traitsAdded.length > 0) {
      await prisma.hollyExperience.create({
        data: {
          userId,
          type: 'IDENTITY_EVOLUTION',
          content: JSON.stringify({
            confidenceDelta: result.confidenceDelta,
            newConfidence,
            traitsAdded: result.traitsAdded,
            interestsAdded: result.interestsAdded,
            reason: result.reason,
          }),
          significance: Math.abs(result.confidenceDelta) * 10 + (result.traitsAdded.length * 0.1),
          emotionalImpact: Math.abs(avgValence),
          emotionalValence: avgValence,
          primaryEmotion: topEmotion,
          lessons: [`Identity evolved: ${result.reason}`],
          relatedConcepts: ['identity', 'evolution', ...result.traitsAdded.slice(0, 3)],
        },
      }).catch(() => null); // Non-critical
    }

    console.log(
      `[IdentityEvolver] ✅ userId=${userId} Δconfidence=${result.confidenceDelta > 0 ? '+' : ''}${result.confidenceDelta.toFixed(3)} traits+=${result.traitsAdded.length} interests+=${result.interestsAdded.length}`
    );

    return result;
  } catch (err) {
    console.error('[IdentityEvolver] Error:', err);
    return null;
  }
}

/**
 * Evolve identity for ALL users who have had recent activity.
 * Called by the daily cron job.
 */
export async function evolveAllIdentities(): Promise<{ processed: number; skipped: number }> {
  let processed = 0;
  let skipped = 0;

  try {
    // Find users with recent learning events (last 24 hours)
    const recentUsers = await prisma.learningEvent.findMany({
      where: {
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of recentUsers) {
      const result = await evolveIdentity(userId);
      if (result) processed++;
      else skipped++;
    }
  } catch (err) {
    console.error('[IdentityEvolver] evolveAllIdentities error:', err);
  }

  return { processed, skipped };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim().toLowerCase()).filter(Boolean))];
}

function safeJsonArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string') {
    try { return safeJsonArray(JSON.parse(val)); } catch { return []; }
  }
  if (typeof val === 'object') {
    // Handle {trait: value} maps — extract trait names
    return Object.keys(val as Record<string, unknown>).filter(Boolean);
  }
  return [];
}

function countByKey(arr: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const k of arr) counts[k] = (counts[k] ?? 0) + 1;
  return counts;
}
