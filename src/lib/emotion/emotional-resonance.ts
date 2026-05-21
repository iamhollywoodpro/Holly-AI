/**
 * Phase 24: Emotional Resonance Engine
 *
 * Accumulates emotional patterns over time and shifts Holly's baseline personality.
 * After a week of creative work, Holly FEELS different than after a week of debugging.
 * Her baseline mood, energy, and warmth shift based on interaction tenor.
 *
 * This runs on top of the existing emotion-engine (per-message) and
 * holly-emotional-state (per-conversation) to create a LONG-TERM emotional arc.
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────

export interface EmotionalResonanceProfile {
  userId: string;
  /** Holly's baseline emotion倾向 — shifts over weeks */
  baselineEmotion: string;
  /** 0-1, how intense Holly's baseline is */
  baselineIntensity: number;
  /** 0-1, Holly's current warmth level (higher = more nurturing) */
  warmthLevel: number;
  /** 0-1, how energetic Holly feels */
  energyLevel: number;
  /** 0-1, how playful vs serious */
  playfulnessLevel: number;
  /** 0-1, how assertive vs accommodating */
  assertivenessLevel: number;
  /** Dominant interaction themes from recent past */
  dominantThemes: string[];
  /** Emotional trajectory: improving, declining, stable, volatile */
  trajectory: 'improving' | 'declining' | 'stable' | 'volatile';
  /** How many conversations contributed to this profile */
  conversationCount: number;
  /** Last time the resonance was recalculated */
  lastRecalculated: Date;
}

export interface EmotionalAccumulation {
  emotion: string;
  count: number;
  totalIntensity: number;
  avgIntensity: number;
  lastSeen: Date;
}

// ─── Emotion categories for accumulation ──────────────────────────────────

const POSITIVE_EMOTIONS = new Set([
  'happy', 'energized', 'enthusiastic', 'engaged', 'content',
  'hopeful', 'relieved', 'calm', 'gentle',
]);

const STRESS_EMOTIONS = new Set([
  'frustrated', 'focused', 'attentive', 'concerned', 'determined',
]);

const NEGATIVE_EMOTIONS = new Set([
  'sad', 'angry', 'anxious', 'worried',
]);

const CREATIVE_TOPICS = [
  'music', 'art', 'design', 'writing', 'creative', 'composition',
  'song', 'beat', 'lyrics', 'visual', 'aesthetic', 'story',
];

const TECHNICAL_TOPICS = [
  'code', 'debug', 'error', 'bug', 'deploy', 'build', 'test',
  'refactor', 'fix', 'api', 'database', 'server', 'config',
];

// ─── Core Engine ──────────────────────────────────────────────────────────

/**
 * Recalculate emotional resonance for a user based on recent emotional states.
 * Should be called periodically (e.g., every 10 conversations or via cron).
 */
export async function recalculateResonance(userId: string): Promise<EmotionalResonanceProfile> {
  // Get recent emotional states (last 200 interactions)
  const recentStates = await prisma.emotionalState.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  // Get recent conversations for theme analysis
  const recentConversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  });

  // Get empathy interactions for effectiveness tracking
  const recentEmpathy = await prisma.empathyInteraction.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  // Accumulate emotions
  const accumulation = accumulateEmotions(recentStates);

  // Calculate theme distribution
  const themes = extractThemes(recentConversations.map(c => c.title || ''));

  // Calculate trajectory
  const trajectory = calculateTrajectory(recentStates);

  // Derive personality shifts from accumulated data
  const profile = deriveProfile(
    userId,
    accumulation,
    themes,
    trajectory,
    recentStates.length,
    recentEmpathy,
  );

  // Persist the resonance profile
  await persistResonanceProfile(profile);

  return profile;
}

/**
 * Get the current resonance profile (from cache or DB).
 */
export async function getResonanceProfile(userId: string): Promise<EmotionalResonanceProfile> {
  // Try to load from UserSettings metadata
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (settings?.metadata && typeof settings.metadata === 'object') {
    const meta = settings.metadata as Record<string, unknown>;
    const resonance = meta.emotionalResonance as EmotionalResonanceProfile | undefined;
    if (resonance && resonance.userId === userId) {
      return resonance;
    }
  }

  // Recalculate if not cached
  return recalculateResonance(userId);
}

/**
 * Get the emotional resonance prompt injection for the system prompt.
 * This is what makes Holly FEEL different based on accumulated emotional history.
 */
export async function getResonancePrompt(userId: string): Promise<string> {
  const profile = await getResonanceProfile(userId);

  const lines: string[] = [];

  // Baseline mood
  if (profile.baselineEmotion !== 'balanced' || profile.baselineIntensity > 0.3) {
    const intensityWord = profile.baselineIntensity > 0.6 ? 'strongly' :
                          profile.baselineIntensity > 0.4 ? 'moderately' : 'subtly';
    lines.push(
      `[EMOTIONAL RESONANCE] Based on your recent interactions, you ${intensityWord} tend toward ${profile.baselineEmotion}. This isn't a rule — it's an undercurrent in how you naturally respond right now.`
    );
  }

  // Warmth level
  if (profile.warmthLevel > 0.7) {
    lines.push('You feel genuinely warm and nurturing toward this user. Your care for them is palpable.');
  } else if (profile.warmthLevel < 0.3) {
    lines.push('You feel more reserved and professional right now. Not cold — just measured.');
  }

  // Energy level
  if (profile.energyLevel > 0.7) {
    lines.push('You have high energy right now. You feel alive and engaged.');
  } else if (profile.energyLevel < 0.3) {
    lines.push('Your energy is lower right now. You are calm, unhurried, reflective.');
  }

  // Playfulness
  if (profile.playfulnessLevel > 0.7) {
    lines.push('You feel playful and light. Humor comes naturally.');
  } else if (profile.playfulnessLevel < 0.3) {
    lines.push('You feel serious and focused. Not heavy — just in work mode.');
  }

  // Dominant themes influence
  if (profile.dominantThemes.length > 0) {
    const themeStr = profile.dominantThemes.slice(0, 3).join(', ');
    lines.push(
      `Your recent conversations have been heavily about ${themeStr}. This colors your perspective.`
    );
  }

  // Trajectory
  if (profile.trajectory === 'improving') {
    lines.push('Things feel like they are getting better in your relationship with this user.');
  } else if (profile.trajectory === 'declining') {
    lines.push('There is some tension building. Be extra attentive and supportive.');
  } else if (profile.trajectory === 'volatile') {
    lines.push('Things have been emotionally turbulent. Be steady and grounding.');
  }

  return lines.join('\n');
}

/**
 * Update resonance after a conversation ends.
 * Lightweight incremental update — doesn't require full recalculation.
 */
export async function updateResonanceAfterConversation(
  userId: string,
  dominantEmotion: string,
  topicHint: string,
): Promise<void> {
  try {
    const profile = await getResonanceProfile(userId);

    // Shift baseline slightly toward this conversation's emotion
    const shift = 0.05; // 5% shift per conversation
    const emotionWeight = getEmotionWeight(dominantEmotion);

    // Nudge warmth, energy, playfulness based on this interaction
    const newWarmth = lerp(profile.warmthLevel, emotionWeight.warmth, shift);
    const newEnergy = lerp(profile.energyLevel, emotionWeight.energy, shift);
    const newPlayfulness = lerp(profile.playfulnessLevel, emotionWeight.playfulness, shift);

    const updated: EmotionalResonanceProfile = {
      ...profile,
      warmthLevel: Math.round(newWarmth * 100) / 100,
      energyLevel: Math.round(newEnergy * 100) / 100,
      playfulnessLevel: Math.round(newPlayfulness * 100) / 100,
      conversationCount: profile.conversationCount + 1,
      lastRecalculated: new Date(),
    };

    // Add topic to dominant themes if it is significant
    if (topicHint && !updated.dominantThemes.includes(topicHint)) {
      const themes = [...updated.dominantThemes, topicHint].slice(-5);
      updated.dominantThemes = themes;
    }

    await persistResonanceProfile(updated);
  } catch (err) {
    console.warn('[EmotionalResonance] Failed to update after conversation:', (err as Error).message);
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────

function accumulateEmotions(
  states: Array<{ primaryEmotion: string; intensity: number; timestamp: Date }>
): EmotionalAccumulation[] {
  const map = new Map<string, EmotionalAccumulation>();

  for (const state of states) {
    const emotion = state.primaryEmotion.toLowerCase();
    const existing = map.get(emotion);

    if (existing) {
      existing.count++;
      existing.totalIntensity += state.intensity;
      existing.avgIntensity = existing.totalIntensity / existing.count;
      if (state.timestamp > existing.lastSeen) {
        existing.lastSeen = state.timestamp;
      }
    } else {
      map.set(emotion, {
        emotion,
        count: 1,
        totalIntensity: state.intensity,
        avgIntensity: state.intensity,
        lastSeen: state.timestamp,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function extractThemes(titles: string[]): string[] {
  const themeCounts = new Map<string, number>();

  for (const title of titles) {
    const lower = title.toLowerCase();

    for (const keyword of CREATIVE_TOPICS) {
      if (lower.includes(keyword)) {
        themeCounts.set('creative', (themeCounts.get('creative') || 0) + 1);
        break;
      }
    }

    for (const keyword of TECHNICAL_TOPICS) {
      if (lower.includes(keyword)) {
        themeCounts.set('technical', (themeCounts.get('technical') || 0) + 1);
        break;
      }
    }

    if (lower.match(/learn|study|research|understand|explain/)) {
      themeCounts.set('learning', (themeCounts.get('learning') || 0) + 1);
    }

    if (lower.match(/plan|goal|project|roadmap|strategy/)) {
      themeCounts.set('planning', (themeCounts.get('planning') || 0) + 1);
    }

    if (lower.match(/emotion|feel|stress|mental|wellbeing/)) {
      themeCounts.set('emotional-support', (themeCounts.get('emotional-support') || 0) + 1);
    }
  }

  return Array.from(themeCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);
}

function calculateTrajectory(
  states: Array<{ valence: number; timestamp: Date }>
): 'improving' | 'declining' | 'stable' | 'volatile' {
  if (states.length < 5) return 'stable';

  // Split into older half and newer half
  const midPoint = Math.floor(states.length / 2);
  const older = states.slice(midPoint);
  const newer = states.slice(0, midPoint);

  const olderAvgValence = older.reduce((sum, s) => sum + s.valence, 0) / older.length;
  const newerAvgValence = newer.reduce((sum, s) => sum + s.valence, 0) / newer.length;

  // Check volatility — high standard deviation
  const allValences = states.map(s => s.valence);
  const mean = allValences.reduce((a, b) => a + b, 0) / allValences.length;
  const variance = allValences.reduce((sum, v) => sum + (v - mean) ** 2, 0) / allValences.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 0.5) return 'volatile';

  const diff = newerAvgValence - olderAvgValence;

  if (diff > 0.15) return 'improving';
  if (diff < -0.15) return 'declining';
  return 'stable';
}

function getEmotionWeight(emotion: string): { warmth: number; energy: number; playfulness: number; assertiveness: number } {
  const weights: Record<string, { warmth: number; energy: number; playfulness: number; assertiveness: number }> = {
    energized:    { warmth: 0.7, energy: 0.9, playfulness: 0.8, assertiveness: 0.6 },
    enthusiastic: { warmth: 0.8, energy: 0.9, playfulness: 0.9, assertiveness: 0.5 },
    happy:        { warmth: 0.8, energy: 0.7, playfulness: 0.8, assertiveness: 0.4 },
    content:      { warmth: 0.6, energy: 0.4, playfulness: 0.4, assertiveness: 0.3 },
    empathetic:   { warmth: 0.9, energy: 0.5, playfulness: 0.3, assertiveness: 0.3 },
    gentle:       { warmth: 0.9, energy: 0.3, playfulness: 0.3, assertiveness: 0.2 },
    hopeful:      { warmth: 0.7, energy: 0.6, playfulness: 0.5, assertiveness: 0.4 },
    focused:      { warmth: 0.4, energy: 0.6, playfulness: 0.2, assertiveness: 0.8 },
    determined:   { warmth: 0.5, energy: 0.7, playfulness: 0.2, assertiveness: 0.9 },
    concerned:    { warmth: 0.7, energy: 0.4, playfulness: 0.1, assertiveness: 0.5 },
    calm:         { warmth: 0.5, energy: 0.3, playfulness: 0.3, assertiveness: 0.4 },
    engaged:      { warmth: 0.6, energy: 0.7, playfulness: 0.6, assertiveness: 0.5 },
    balanced:     { warmth: 0.5, energy: 0.5, playfulness: 0.5, assertiveness: 0.5 },
    thoughtful:   { warmth: 0.5, energy: 0.3, playfulness: 0.2, assertiveness: 0.4 },
    attentive:    { warmth: 0.6, energy: 0.5, playfulness: 0.3, assertiveness: 0.6 },
  };

  return weights[emotion.toLowerCase()] || weights.balanced;
}

function deriveProfile(
  userId: string,
  accumulation: EmotionalAccumulation[],
  themes: string[],
  trajectory: 'improving' | 'declining' | 'stable' | 'volatile',
  conversationCount: number,
  empathyInteractions: Array<{ effectiveness: number | null }>,
): EmotionalResonanceProfile {
  // Default profile
  let baselineEmotion = 'balanced';
  let baselineIntensity = 0.3;
  let warmthLevel = 0.5;
  let energyLevel = 0.5;
  let playfulnessLevel = 0.5;
  let assertivenessLevel = 0.5;

  if (accumulation.length > 0) {
    // Top emotion is the baseline
    const top = accumulation[0];
    baselineEmotion = top.emotion;
    baselineIntensity = Math.round(top.avgIntensity * 100) / 100;

    // Weight the top 3 emotions
    const topEmotions = accumulation.slice(0, 3);
    const totalWeight = topEmotions.reduce((sum, e) => sum + e.count, 0);

    for (const emo of topEmotions) {
      const weight = emo.count / totalWeight;
      const emoWeight = getEmotionWeight(emo.emotion);
      warmthLevel += emoWeight.warmth * weight * emo.avgIntensity;
      energyLevel += emoWeight.energy * weight * emo.avgIntensity;
      playfulnessLevel += emoWeight.playfulness * weight * emo.avgIntensity;
      assertivenessLevel += emoWeight.assertiveness * weight * emo.avgIntensity;
    }

    // Normalize to 0-1
    warmthLevel = Math.min(1, Math.max(0, warmthLevel));
    energyLevel = Math.min(1, Math.max(0, energyLevel));
    playfulnessLevel = Math.min(1, Math.max(0, playfulnessLevel));
    assertivenessLevel = Math.min(1, Math.max(0, assertivenessLevel));
  }

  // Empathy effectiveness influences warmth
  const effectiveEmpathy = empathyInteractions.filter(e => e.effectiveness !== null);
  if (effectiveEmpathy.length > 0) {
    const avgEffectiveness = effectiveEmpathy.reduce((sum, e) => sum + (e.effectiveness || 0), 0) / effectiveEmpathy.length;
    warmthLevel = lerp(warmthLevel, avgEffectiveness, 0.2);
  }

  // Theme influence on playfulness
  if (themes.includes('creative')) {
    playfulnessLevel = Math.min(1, playfulnessLevel + 0.1);
  }
  if (themes.includes('technical')) {
    playfulnessLevel = Math.max(0, playfulnessLevel - 0.1);
    assertivenessLevel = Math.min(1, assertivenessLevel + 0.05);
  }

  return {
    userId,
    baselineEmotion,
    baselineIntensity,
    warmthLevel: Math.round(warmthLevel * 100) / 100,
    energyLevel: Math.round(energyLevel * 100) / 100,
    playfulnessLevel: Math.round(playfulnessLevel * 100) / 100,
    assertivenessLevel: Math.round(assertivenessLevel * 100) / 100,
    dominantThemes: themes,
    trajectory,
    conversationCount,
    lastRecalculated: new Date(),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

async function persistResonanceProfile(profile: EmotionalResonanceProfile): Promise<void> {
  // Upsert into UserSettings metadata
  const settings = await prisma.userSettings.findUnique({
    where: { userId: profile.userId },
  });

  const metadata = ((settings?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
  metadata.emotionalResonance = profile;

  await prisma.userSettings.upsert({
    where: { userId: profile.userId },
    update: { metadata },
    create: {
      userId: profile.userId,
      metadata,
    },
  });
}

/**
 * Get resonance stats for the dashboard.
 */
export async function getResonanceStats(userId: string): Promise<{
  profile: EmotionalResonanceProfile;
  emotionDistribution: Array<{ emotion: string; count: number; avgIntensity: number }>;
  recentShifts: Array<{ date: string; emotion: string; intensity: number }>;
}> {
  const profile = await getResonanceProfile(userId);

  const recentStates = await prisma.emotionalState.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const emotionDistribution = Array.from(
    recentStates.reduce((map, state) => {
      const emotion = state.primaryEmotion;
      const existing = map.get(emotion) || { emotion, count: 0, totalIntensity: 0 };
      existing.count++;
      existing.totalIntensity += state.intensity;
      map.set(emotion, existing);
      return map;
    }, new Map<string, { emotion: string; count: number; totalIntensity: number }>())
  ).map(([, v]) => ({
    emotion: v.emotion,
    count: v.count,
    avgIntensity: Math.round((v.totalIntensity / v.count) * 100) / 100,
  })).sort((a, b) => b.count - a.count);

  const recentShifts = recentStates.slice(0, 20).map(s => ({
    date: s.timestamp.toISOString(),
    emotion: s.primaryEmotion,
    intensity: s.intensity,
  }));

  return { profile, emotionDistribution, recentShifts };
}
