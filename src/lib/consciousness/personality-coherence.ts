/**
 * Personality Coherence Engine — Maintains consistent personality across all interactions
 *
 * Features:
 * - Personality trait tracking with target ranges
 * - Drift detection from baseline personality
 * - Auto-correction suggestions
 * - Per-user adaptation within bounds
 * - Personality evolution tracking
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonalityTrait {
  name: string;
  /** Current value 0-1 */
  current: number;
  /** Target range [min, max] */
  targetRange: [number, number];
  /** How much this trait can drift before alerting */
  tolerance: number;
  /** Weight in overall coherence score */
  weight: number;
}

export interface PersonalityProfile {
  traits: PersonalityTrait[];
  baseline: Record<string, number>;
  lastUpdated: number;
}

export interface DriftReport {
  hasDrift: boolean;
  driftedTraits: string[];
  driftMagnitudes: Record<string, number>;
  overallDrift: number;
  severity: 'none' | 'low' | 'medium' | 'high';
}

export interface CoherenceScore {
  overall: number;        // 0-1
  traitScores: Record<string, number>;
  recommendations: string[];
}

export interface UserAdaptation {
  userId: string;
  formalityDelta: number;   // -0.3 to +0.3
  verbosityDelta: number;   // -0.3 to +0.3
  warmthDelta: number;      // -0.3 to +0.3
  adaptationCount: number;
}

// ─── Default Personality Traits ─────────────────────────────────────────────

export const DEFAULT_TRAITS: PersonalityTrait[] = [
  { name: 'warmth', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1.2 },
  { name: 'formality', current: 0.5, targetRange: [0.3, 0.6], tolerance: 0.2, weight: 1.0 },
  { name: 'assertiveness', current: 0.6, targetRange: [0.5, 0.7], tolerance: 0.15, weight: 1.0 },
  { name: 'empathy', current: 0.8, targetRange: [0.7, 0.9], tolerance: 0.1, weight: 1.3 },
  { name: 'humor', current: 0.4, targetRange: [0.3, 0.6], tolerance: 0.2, weight: 0.8 },
  { name: 'verbosity', current: 0.5, targetRange: [0.4, 0.6], tolerance: 0.15, weight: 0.9 },
  { name: 'technical_depth', current: 0.7, targetRange: [0.6, 0.8], tolerance: 0.15, weight: 1.1 },
  { name: 'proactivity', current: 0.6, targetRange: [0.5, 0.7], tolerance: 0.15, weight: 1.0 },
];

// ─── Drift Detection ────────────────────────────────────────────────────────

/**
 * Calculate drift for a single trait.
 * Returns absolute distance from the nearest boundary of the target range.
 */
export function calculateTraitDrift(trait: PersonalityTrait): number {
  const [min, max] = trait.targetRange;
  if (trait.current >= min && trait.current <= max) return 0;
  if (trait.current < min) return min - trait.current;
  return trait.current - max;
}

/**
 * Generate a full drift report for a personality profile.
 */
export function detectDrift(traits: PersonalityTrait[]): DriftReport {
  const driftedTraits: string[] = [];
  const driftMagnitudes: Record<string, number> = {};
  let totalDrift = 0;
  let totalWeight = 0;

  for (const trait of traits) {
    const drift = calculateTraitDrift(trait);
    driftMagnitudes[trait.name] = drift;
    totalDrift += drift * trait.weight;
    totalWeight += trait.weight;

    if (drift > trait.tolerance) {
      driftedTraits.push(trait.name);
    }
  }

  const overallDrift = totalWeight > 0 ? totalDrift / totalWeight : 0;

  let severity: DriftReport['severity'] = 'none';
  if (overallDrift > 0.2 || driftedTraits.length >= 3) severity = 'high';
  else if (overallDrift > 0.1 || driftedTraits.length >= 2) severity = 'medium';
  else if (overallDrift > 0 || driftedTraits.length >= 1) severity = 'low';

  return {
    hasDrift: driftedTraits.length > 0,
    driftedTraits,
    driftMagnitudes,
    overallDrift,
    severity,
  };
}

// ─── Coherence Scoring ──────────────────────────────────────────────────────

/**
 * Calculate coherence score for a single trait.
 * 1.0 = perfectly within range, 0.0 = far outside range.
 */
export function traitCoherence(trait: PersonalityTrait): number {
  const [min, max] = trait.targetRange;
  if (trait.current >= min && trait.current <= max) return 1;

  const drift = calculateTraitDrift(trait);
  return Math.max(0, 1 - drift / 0.5); // 0.5 drift = 0 coherence
}

/**
 * Calculate overall personality coherence score.
 */
export function calculateCoherence(traits: PersonalityTrait[]): CoherenceScore {
  const traitScores: Record<string, number> = {};
  let weightedSum = 0;
  let totalWeight = 0;
  const recommendations: string[] = [];

  for (const trait of traits) {
    const score = traitCoherence(trait);
    traitScores[trait.name] = score;
    weightedSum += score * trait.weight;
    totalWeight += trait.weight;

    if (score < 0.8) {
      const [min, max] = trait.targetRange;
      const mid = (min + max) / 2;
      recommendations.push(
        `Adjust ${trait.name} from ${trait.current.toFixed(2)} toward ${mid.toFixed(2)}`,
      );
    }
  }

  const overall = totalWeight > 0 ? weightedSum / totalWeight : 1;

  return { overall, traitScores, recommendations };
}

// ─── Auto-Correction ────────────────────────────────────────────────────────

/**
 * Generate corrected traits that bring drifted traits back toward target range.
 */
export function autoCorrect(traits: PersonalityTrait[], correctionStrength: number = 0.5): PersonalityTrait[] {
  return traits.map(trait => {
    const [min, max] = trait.targetRange;
    const mid = (min + max) / 2;

    // If within range, no correction needed
    if (trait.current >= min && trait.current <= max) {
      return trait;
    }

    // Move toward the midpoint by correctionStrength
    const corrected = trait.current + (mid - trait.current) * correctionStrength;

    return { ...trait, current: Math.round(corrected * 1000) / 1000 };
  });
}

// ─── Per-User Adaptation ────────────────────────────────────────────────────

const MAX_ADAPTATION_DELTA = 0.3;

/**
 * Create a user adaptation within safe bounds.
 */
export function createUserAdaptation(
  userId: string,
  formalityDelta: number,
  verbosityDelta: number,
  warmthDelta: number,
): UserAdaptation {
  const clamp = (v: number) => Math.max(-MAX_ADAPTATION_DELTA, Math.min(MAX_ADAPTATION_DELTA, v));

  return {
    userId,
    formalityDelta: clamp(formalityDelta),
    verbosityDelta: clamp(verbosityDelta),
    warmthDelta: clamp(warmthDelta),
    adaptationCount: 1,
  };
}

/**
 * Apply user adaptation to base traits.
 * Returns modified traits that are still within tolerance.
 */
export function applyUserAdaptation(
  baseTraits: PersonalityTrait[],
  adaptation: UserAdaptation,
): PersonalityTrait[] {
  const deltas: Record<string, number> = {
    formality: adaptation.formalityDelta,
    verbosity: adaptation.verbosityDelta,
    warmth: adaptation.warmthDelta,
  };

  return baseTraits.map(trait => {
    const delta = deltas[trait.name];
    if (delta === undefined) return trait;

    const adapted = trait.current + delta;
    // Ensure we don't exceed tolerance
    const [min, max] = trait.targetRange;
    const boundedMin = min - trait.tolerance;
    const boundedMax = max + trait.tolerance;
    const clamped = Math.max(boundedMin, Math.min(boundedMax, adapted));

    return { ...trait, current: Math.round(clamped * 1000) / 1000 };
  });
}

/**
 * Check if a user adaptation is within safe bounds.
 */
export function isAdaptationSafe(adaptation: UserAdaptation): boolean {
  return (
    Math.abs(adaptation.formalityDelta) <= MAX_ADAPTATION_DELTA &&
    Math.abs(adaptation.verbosityDelta) <= MAX_ADAPTATION_DELTA &&
    Math.abs(adaptation.warmthDelta) <= MAX_ADAPTATION_DELTA
  );
}

// ─── Personality Evolution ──────────────────────────────────────────────────

/**
 * Evolve a personality trait based on experience, within controlled bounds.
 */
export function evolveTrait(
  trait: PersonalityTrait,
  experienceDelta: number,
  maxEvolutionRate: number = 0.05,
): PersonalityTrait {
  // Cap the evolution rate
  const cappedDelta = Math.max(-maxEvolutionRate, Math.min(maxEvolutionRate, experienceDelta));
  const newCurrent = trait.current + cappedDelta;

  // Ensure we stay within target range + tolerance
  const [min, max] = trait.targetRange;
  const boundedMin = min - trait.tolerance;
  const boundedMax = max + trait.tolerance;
  const clamped = Math.max(boundedMin, Math.min(boundedMax, newCurrent));

  return { ...trait, current: Math.round(clamped * 1000) / 1000 };
}

/**
 * Create a personality profile snapshot.
 */
export function createProfile(traits: PersonalityTrait[]): PersonalityProfile {
  const baseline: Record<string, number> = {};
  for (const trait of traits) {
    baseline[trait.name] = trait.current;
  }
  return { traits, baseline, lastUpdated: Date.now() };
}
