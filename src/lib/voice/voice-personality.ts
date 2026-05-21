/**
 * Phase 18: Voice Personality Integration
 *
 * Bridges the adaptive personality engine (Phase 12) to the TTS pipeline.
 * Holly's voice adapts the same way her text does — more formal when you are,
 * faster when you're in a hurry, warmer when you're stressed.
 *
 * Maps CommunicationStyle traits → TTS parameters:
 * - formality → voice selection, pitch
 * - verbosity → speed (faster for verbose users)
 * - empathyLevel → warmth, pitch modulation
 * - humorLevel → prosody variation
 * - directness → pace, emphasis
 */

import { prisma } from '@/lib/db';

// ── Types ──────────────────────────────────────────────────────────────

export interface VoicePersonalityParams {
  /** TTS voice to use (provider-specific voice ID) */
  voice: string;
  /** Speech rate: 0.5 (slow) to 2.0 (fast), default 1.0 */
  speed: number;
  /** Pitch shift: -12 (deep) to +12 (high), default 0 */
  pitch: number;
  /** Emotion/warmth: 0 (neutral) to 1 (warm/expressive) */
  warmth: number;
  /** Prosody variation: 0 (monotone) to 1 (dynamic) */
  expressiveness: number;
  /** Model temperature for TTS: 0.0 (consistent) to 1.0 (varied) */
  temperature: number;
  /** Voice description for models that support it */
  voiceDescription: string;
}

export interface PersonalityTraits {
  formality: number;
  verbosity: number;
  technicalLevel: number;
  humorLevel: number;
  empathyLevel: number;
  directness: number;
}

export interface VoicePersonalityResult {
  params: VoicePersonalityParams;
  traits: PersonalityTraits;
  source: 'cached' | 'loaded' | 'default';
}

// ── Voice Profiles ─────────────────────────────────────────────────────

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  basePitch: number;
  baseSpeed: number;
  warmth: number;
  expressiveness: number;
}

const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'holly-warm',
    name: 'Holly (Warm)',
    description: 'Warm, intelligent, slightly playful. Default Holly voice.',
    basePitch: 2,
    baseSpeed: 1.0,
    warmth: 0.7,
    expressiveness: 0.6,
  },
  {
    id: 'holly-professional',
    name: 'Holly (Professional)',
    description: 'Clear, composed, efficient. For formal/technical conversations.',
    basePitch: 0,
    baseSpeed: 1.1,
    warmth: 0.4,
    expressiveness: 0.3,
  },
  {
    id: 'holly-creative',
    name: 'Holly (Creative)',
    description: 'Expressive, dynamic, varied tone. For brainstorming and creative work.',
    basePitch: 3,
    baseSpeed: 0.95,
    warmth: 0.8,
    expressiveness: 0.8,
  },
  {
    id: 'holly-supportive',
    name: 'Holly (Supportive)',
    description: 'Gentle, patient, empathetic. For when you need support.',
    basePitch: 1,
    baseSpeed: 0.9,
    warmth: 0.9,
    expressiveness: 0.5,
  },
  {
    id: 'holly-energetic',
    name: 'Holly (Energetic)',
    description: 'Quick, upbeat, enthusiastic. For high-energy collaboration.',
    basePitch: 4,
    baseSpeed: 1.15,
    warmth: 0.6,
    expressiveness: 0.7,
  },
];

// ── Cache ──────────────────────────────────────────────────────────────

const personalityCache = new Map<string, { result: VoicePersonalityResult; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Core: Personality → Voice Params ───────────────────────────────────

function selectVoiceProfile(traits: PersonalityTraits): VoiceProfile {
  // High formality + high technical → professional
  if (traits.formality > 0.7 && traits.technicalLevel > 0.6) {
    return VOICE_PROFILES[1]; // professional
  }
  // High empathy + low directness → supportive
  if (traits.empathyLevel > 0.7 && traits.directness < 0.4) {
    return VOICE_PROFILES[3]; // supportive
  }
  // High humor + high verbosity → creative
  if (traits.humorLevel > 0.7 && traits.verbosity > 0.6) {
    return VOICE_PROFILES[2]; // creative
  }
  // High directness + high technical → energetic
  if (traits.directness > 0.7 && traits.verbosity < 0.4) {
    return VOICE_PROFILES[4]; // energetic
  }
  // Default: warm Holly
  return VOICE_PROFILES[0];
}

function mapTraitsToVoiceParams(traits: PersonalityTraits): VoicePersonalityParams {
  const profile = selectVoiceProfile(traits);

  // Adjust speed based on verbosity (concise users → faster, verbose → slower)
  const speedAdjust = (traits.verbosity - 0.5) * 0.3; // -0.15 to +0.15
  const speed = Math.max(0.7, Math.min(1.4, profile.baseSpeed - speedAdjust));

  // Adjust pitch based on formality (more formal → slightly lower)
  const pitchAdjust = (0.5 - traits.formality) * 3; // -1.5 to +1.5
  const pitch = profile.basePitch + pitchAdjust;

  // Warmth from empathy
  const warmth = Math.max(0, Math.min(1,
    profile.warmth * 0.6 + traits.empathyLevel * 0.4
  ));

  // Expressiveness from humor
  const expressiveness = Math.max(0, Math.min(1,
    profile.expressiveness * 0.6 + traits.humorLevel * 0.4
  ));

  // Temperature from overall variation
  const temperature = Math.max(0.1, Math.min(0.8,
    0.3 + expressiveness * 0.3 + warmth * 0.2
  ));

  return {
    voice: profile.id,
    speed,
    pitch: Math.round(pitch),
    warmth,
    expressiveness,
    temperature,
    voiceDescription: profile.description,
  };
}

// ── Public API ─────────────────────────────────────────────────────────

const DEFAULT_TRAITS: PersonalityTraits = {
  formality: 0.5,
  verbosity: 0.5,
  technicalLevel: 0.3,
  humorLevel: 0.5,
  empathyLevel: 0.7,
  directness: 0.6,
};

/**
 * Get voice parameters adapted to a user's communication style.
 * Caches for 5 minutes, auto-invalidates on style change.
 */
export async function getVoicePersonality(
  userId: string,
): Promise<VoicePersonalityResult> {
  // Check cache
  const cached = personalityCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return { ...cached.result, source: 'cached' };
  }

  try {
    // Load communication style
    const style = await prisma.communicationStyle.findUnique({
      where: { userId },
    });

    const traits: PersonalityTraits = style
      ? {
          formality: style.formality,
          verbosity: style.verbosity,
          technicalLevel: style.technicalLevel,
          humorLevel: style.humorLevel,
          empathyLevel: style.empathyLevel,
          directness: style.directness,
        }
      : DEFAULT_TRAITS;

    const params = mapTraitsToVoiceParams(traits);
    const result: VoicePersonalityResult = {
      params,
      traits,
      source: style ? 'loaded' : 'default',
    };

    // Cache it
    personalityCache.set(userId, { result, cachedAt: Date.now() });

    return result;
  } catch (error) {
    console.error('[VoicePersonality] Failed to load style:', error);
    return {
      params: mapTraitsToVoiceParams(DEFAULT_TRAITS),
      traits: DEFAULT_TRAITS,
      source: 'default',
    };
  }
}

/**
 * Get voice params as a VoiceOutputOptions object (compatible with enhanced-voice-output).
 */
export async function getVoiceOutputOptions(
  userId: string,
): Promise<{
  speed: number;
  temperature: number;
  voiceDescription: string;
}> {
  const { params } = await getVoicePersonality(userId);
  return {
    speed: params.speed,
    temperature: params.temperature,
    voiceDescription: params.voiceDescription,
  };
}

/**
 * Invalidate cached voice personality for a user.
 * Called when CommunicationStyle is updated.
 */
export function invalidateVoicePersonality(userId: string): void {
  personalityCache.delete(userId);
}

/**
 * Get all available voice profiles.
 */
export function getVoiceProfiles(): VoiceProfile[] {
  return [...VOICE_PROFILES];
}

/**
 * Get the current voice personality stats.
 */
export function getVoicePersonalityStats(): {
  cachedUsers: number;
  profiles: number;
} {
  return {
    cachedUsers: personalityCache.size,
    profiles: VOICE_PROFILES.length,
  };
}
