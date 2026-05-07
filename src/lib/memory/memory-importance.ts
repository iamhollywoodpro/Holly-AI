/**
 * HOLLY Memory Importance Scoring Engine
 *
 * Every memory Holly stores gets a multi-signal importance score (0-1).
 * This score determines: retention priority, decay resistance, retrieval ranking,
 * and which memories influence identity evolution.
 *
 * Signals:
 *  1. Recency — newer memories score higher (time-decay curve)
 *  2. Emotional weight — high-arousal or high-valence memories are stickier
 *  3. Referenced count — memories recalled multiple times gain importance
 *  4. Relationship density — memories linked to many other memories are hubs
 *  5. User feedback — explicit positive/negative signals from user
 *  6. Topic significance — certain topics (identity, emotions, goals) are inherently important
 *  7. Conversation outcome — memories from long/positive conversations rank higher
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryImportanceInput {
  memoryId: string;
  userId: string;
  type: string;
  content: any;
  significance?: number;      // original score
  emotionalValence?: number;   // -1 to 1
  emotionalArousal?: number;   // 0 to 1
  relatedConcepts?: string[];
  createdAt: Date;
  lastReferencedAt?: Date;
  referenceCount?: number;
  conversationLength?: number;
  topicTags?: string[];
}

export interface MemoryImportanceResult {
  memoryId: string;
  score: number;              // 0-1 composite
  breakdown: {
    recency: number;
    emotionalWeight: number;
    referenceScore: number;
    relationshipDensity: number;
    topicSignificance: number;
    userSignal: number;
  };
  tier: 'core' | 'important' | 'standard' | 'ephemeral';
  shouldRetain: boolean;
  shouldInfluenceIdentity: boolean;
}

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  recency:             0.15,
  emotionalWeight:     0.25,
  referenceScore:      0.20,
  relationshipDensity: 0.10,
  topicSignificance:   0.15,
  userSignal:          0.15,
};

// ─── Tier Thresholds ──────────────────────────────────────────────────────────

const TIER_THRESHOLDS = {
  core:       0.8,   // never decay, always influence identity
  important:  0.6,   // slow decay, influence identity
  standard:   0.35,  // normal decay
  ephemeral:  0.0,   // fast decay candidates
};

// ─── High-Significance Topics ─────────────────────────────────────────────────

const HIGH_SIGNIFICANCE_TOPICS = new Set([
  'identity', 'emotions', 'goals', 'values', 'relationships',
  'breakthrough', 'conflict', 'milestone', 'creative', 'self-reflection',
  'grief', 'love', 'fear', 'hope', 'growth', 'purpose',
]);

// ─── Signal Calculators ───────────────────────────────────────────────────────

function calcRecency(createdAt: Date, lastReferencedAt?: Date): number {
  const now = Date.now();
  const referenced = lastReferencedAt ? new Date(lastReferencedAt).getTime() : new Date(createdAt).getTime();
  const hoursSinceReference = (now - referenced) / (1000 * 60 * 60);

  // Exponential decay: half-life of 72 hours (3 days)
  // Recency boost if referenced in last 24 hours
  if (hoursSinceReference < 1) return 1.0;
  if (hoursSinceReference < 24) return 0.9;

  return Math.max(0.1, Math.exp(-hoursSinceReference / 72));
}

function calcEmotionalWeight(valence?: number, arousal?: number): number {
  if (valence === undefined && arousal === undefined) return 0.3;

  // High arousal + extreme valence (positive or negative) = high emotional weight
  const v = valence ?? 0;
  const a = arousal ?? 0.3;

  // Extremity of valence (how far from neutral)
  const valenceExtremity = Math.abs(v);
  // High arousal memories are stickier
  const arousalFactor = a;

  return Math.min(1.0, (valenceExtremity * 0.6 + arousalFactor * 0.4));
}

function calcReferenceScore(referenceCount: number): number {
  if (referenceCount === 0) return 0.1;
  // Logarithmic scaling: each additional reference adds less
  return Math.min(1.0, 0.3 + 0.2 * Math.log2(referenceCount + 1));
}

function calcRelationshipDensity(relatedConcepts: string[]): number {
  if (!relatedConcepts || relatedConcepts.length === 0) return 0.1;
  // More connections = higher density
  return Math.min(1.0, 0.2 + 0.15 * Math.log2(relatedConcepts.length + 1));
}

function calcTopicSignificance(topics: string[], type: string): number {
  // Check if any topic is high-significance
  const significantMatches = topics.filter(t =>
    HIGH_SIGNIFICANCE_TOPICS.has(t.toLowerCase())
  ).length;

  // Type-based significance
  const typeSignificance: Record<string, number> = {
    'knowledge_connection': 0.7,
    'emotional_breakthrough': 0.9,
    'goal_formation': 0.8,
    'identity_shift': 0.9,
    'relationship_milestone': 0.85,
    'creative_insight': 0.7,
    'care_signal': 0.6,
    'feedback': 0.5,
    'casual': 0.2,
  };

  const topicScore = significantMatches > 0
    ? Math.min(1.0, 0.4 + 0.2 * significantMatches)
    : 0.2;

  const typeScore = typeSignificance[type] || 0.3;

  return (topicScore + typeScore) / 2;
}

async function calcUserSignal(memoryId: string, userId: string): Promise<number> {
  try {
    // Check for explicit feedback on this memory's conversation
    const feedback = await prisma.responseFeedback.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { sentiment: true },
    });

    if (feedback?.sentiment === 'positive') return 0.8;
    if (feedback?.sentiment === 'negative') return 0.3;
    return 0.5; // neutral / no signal
  } catch {
    return 0.5;
  }
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

export async function scoreMemoryImportance(
  input: MemoryImportanceInput,
): Promise<MemoryImportanceResult> {
  const recency = calcRecency(input.createdAt, input.lastReferencedAt);
  const emotionalWeight = calcEmotionalWeight(input.emotionalValence, input.emotionalArousal);
  const referenceScore = calcReferenceScore(input.referenceCount || 0);
  const relationshipDensity = calcRelationshipDensity(input.relatedConcepts || []);
  const topicSignificance = calcTopicSignificance(
    input.topicTags || input.relatedConcepts || [],
    input.type,
  );
  const userSignal = await calcUserSignal(input.memoryId, input.userId);

  // Weighted composite
  const score =
    recency * WEIGHTS.recency +
    emotionalWeight * WEIGHTS.emotionalWeight +
    referenceScore * WEIGHTS.referenceScore +
    relationshipDensity * WEIGHTS.relationshipDensity +
    topicSignificance * WEIGHTS.topicSignificance +
    userSignal * WEIGHTS.userSignal;

  // Clamp to 0-1
  const clampedScore = Math.max(0, Math.min(1, score));

  // Determine tier
  let tier: MemoryImportanceResult['tier'] = 'ephemeral';
  if (clampedScore >= TIER_THRESHOLDS.core) tier = 'core';
  else if (clampedScore >= TIER_THRESHOLDS.important) tier = 'important';
  else if (clampedScore >= TIER_THRESHOLDS.standard) tier = 'standard';

  return {
    memoryId: input.memoryId,
    score: clampedScore,
    breakdown: {
      recency,
      emotionalWeight,
      referenceScore,
      relationshipDensity,
      topicSignificance,
      userSignal,
    },
    tier,
    shouldRetain: tier !== 'ephemeral' || clampedScore > 0.2,
    shouldInfluenceIdentity: tier === 'core' || tier === 'important',
  };
}

// ─── Batch Scoring (for decay cycle) ─────────────────────────────────────────

export async function batchScoreMemories(
  userId: string,
  limit: number = 100,
): Promise<MemoryImportanceResult[]> {
  const memories = await prisma.hollyExperience.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      content: true,
      significance: true,
      relatedConcepts: true,
      timestamp: true,
      integrationStatus: true,
    },
  });

  const results: MemoryImportanceResult[] = [];

  for (const mem of memories) {
    const content = mem.content as any;
    const result = await scoreMemoryImportance({
      memoryId: mem.id,
      userId,
      type: mem.type,
      content: mem.content,
      significance: mem.significance ?? undefined,
      emotionalValence: content?.emotionalValence,
      emotionalArousal: content?.emotionalArousal,
      relatedConcepts: (mem.relatedConcepts as string[]) || [],
      createdAt: mem.timestamp,
      topicTags: content?.topics || [],
    });
    results.push(result);

    // Update the memory's significance in DB
    try {
      await prisma.hollyExperience.update({
        where: { id: mem.id },
        data: {
          significance: result.score,
          integrationStatus: result.shouldRetain ? 'integrated' : 'archived',
        },
      });
    } catch { /* skip */ }
  }

  console.log(`[MemoryImportance] Scored ${results.length} memories: ` +
    `${results.filter(r => r.tier === 'core').length} core, ` +
    `${results.filter(r => r.tier === 'important').length} important, ` +
    `${results.filter(r => r.tier === 'standard').length} standard, ` +
    `${results.filter(r => r.tier === 'ephemeral').length} ephemeral`);

  return results;
}