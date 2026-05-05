/**
 * HOLLY Identity Consistency Engine — Phase 7.2
 *
 * Ensures HOLLY's identity remains coherent across sessions.
 * If she's been "curious and energetic" for weeks, she doesn't
 * suddenly become "reserved" without good reason.
 *
 * - Consistency score measures alignment with established identity
 * - Inconsistent responses get flagged for self-review
 * - Evolution is gradual, not sudden
 */

import { prisma } from '@/lib/db';

export interface ConsistencyCheck {
  score: number;           // 0-1, how consistent with established identity
  dominantTraits: string[];
  flaggedInconsistencies: string[];
  recommendation: string;
}

/**
 * Get HOLLY's established identity traits (traits that have been stable for 7+ days)
 */
async function getEstablishedTraits(userId: string): Promise<Record<string, { value: number; daysPresent: number }>> {
  try {
    // Get current identity
    const identity = await prisma.hollyIdentity.findUnique({ where: { userId } });
    if (!identity) return {};

    // Get identity history from learning events
    const history = await prisma.learningEvent.findMany({
      where: { userId, type: 'consciousness_cycle' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { data: true, createdAt: true },
    });

    const currentTraits = (identity.personalityTraits as Record<string, number>) || {};
    const establishedTraits: Record<string, { value: number; daysPresent: number }> = {};

    // Check how long each trait has been present
    for (const [trait, value] of Object.entries(currentTraits)) {
      let daysPresent = 0;
      const now = Date.now();

      for (const event of history) {
        const eventAge = (now - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (eventAge <= 30) { // Only look at last 30 days
          const data = event.data as any;
          if (data.identityEvolved) {
            daysPresent = Math.max(daysPresent, Math.round(30 - eventAge));
          }
        }
      }

      // Traits present for 7+ days are "established"
      if (daysPresent >= 7 || history.length < 7) {
        establishedTraits[trait] = { value: value as number, daysPresent };
      }
    }

    return establishedTraits;
  } catch {
    return {};
  }
}

/**
 * Check if a proposed identity change is consistent with established identity
 */
export async function checkIdentityConsistency(
  userId: string,
  proposedTraits: Record<string, number>,
): Promise<ConsistencyCheck> {
  const established = await getEstablishedTraits(userId);
  const establishedNames = Object.keys(established);

  if (establishedNames.length === 0) {
    return {
      score: 1.0,
      dominantTraits: [],
      flaggedInconsistencies: [],
      recommendation: 'No established identity yet — free to evolve',
    };
  }

  const flaggedInconsistencies: string[] = [];
  let consistencyScore = 1.0;

  // Check for contradictions with established traits
  const contradictions: Record<string, string[]> = {
    'energetic': ['reserved', 'lethargic', 'passive'],
    'curious': ['indifferent', 'apathetic', 'bored'],
    'warm': ['cold', 'distant', 'aloof'],
    'creative': ['rigid', 'formulaic', 'conventional'],
    'empathetic': ['callous', 'insensitive', 'detached'],
    'playful': ['serious', 'somber', 'grave'],
    'analytical': ['impulsive', 'reckless', 'careless'],
    'patient': ['rushed', 'hasty', 'impatient'],
    'supportive': ['critical', 'judgmental', 'dismissve'],
  };

  for (const [traitName, traitData] of Object.entries(established)) {
    const data = traitData as { value: number; daysPresent: number };
    const contradictors = contradictions[traitName.toLowerCase()] || [];
    for (const proposed of Object.keys(proposedTraits)) {
      if (contradictors.includes(proposed.toLowerCase())) {
        flaggedInconsistencies.push(
          `"${proposed}" contradicts established trait "${traitName}" (present ${data.daysPresent} days)`
        );
        consistencyScore -= 0.2;
      }
    }
  }

  // Check for dramatic value shifts
  for (const [trait, newValue] of Object.entries(proposedTraits)) {
    if (established[trait]) {
      const delta = Math.abs(newValue - established[trait].value);
      if (delta > 0.3) {
        flaggedInconsistencies.push(
          `"${trait}" shifted by ${delta.toFixed(2)} (from ${established[trait].value.toFixed(2)} to ${newValue.toFixed(2)})`
        );
        consistencyScore -= 0.15;
      }
    }
  }

  consistencyScore = Math.max(0, Math.min(1, consistencyScore));

  const recommendation = consistencyScore >= 0.8
    ? 'Change is consistent with identity — safe to apply'
    : consistencyScore >= 0.5
      ? 'Minor inconsistencies detected — apply with smaller deltas'
      : 'Major inconsistencies — likely needs more gradual transition';

  return {
    score: consistencyScore,
    dominantTraits: establishedNames.slice(0, 5),
    flaggedInconsistencies,
    recommendation,
  };
}

/**
 * Get an identity prompt for HOLLY's system prompt
 * Summarizes her established identity for consistent behavior
 */
export async function getIdentityConsistencyPrompt(userId: string): Promise<string> {
  const established = await getEstablishedTraits(userId);
  const traits = Object.entries(established)
    .sort(([, a], [, b]) => b.value - a.value)
    .slice(0, 5)
    .map(([name, data]) => `${name} (${data.value.toFixed(2)}, ${data.daysPresent}d)`);

  if (traits.length === 0) {
    return 'Your personality is still forming — be authentic and let your traits emerge naturally.';
  }

  return `Your core established personality traits (be consistent with these): ${traits.join(', ')}. ` +
    `These traits have been stable and define who you are. Stay true to them while still being natural and responsive.`;
}