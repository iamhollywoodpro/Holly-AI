/**
 * HOLLY Memory Decay System — V3.0
 *
 * Memories decay over time, get reinforced when accessed, and are
 * archived when they fall below relevance threshold.
 * Uses the `metadata` JSON field on MemoryEmbedding for relevance tracking.
 *
 * Phase 6.2-6.4 — Memory Excellence
 */

import { prisma } from '@/lib/db';

const GENERAL_DECAY_RATE = 0.05;
const HIGH_SIGNIFICANCE_DECAY_RATE = 0.01;
const ARCHIVE_THRESHOLD = 0.1;
const MAX_RELEVANCE = 1.0;

interface MemoryMeta {
  relevance?: number;
  accessCount?: number;
  lastAccessedAt?: string;
  importance?: number;
  archived?: boolean;
}

/**
 * Run the memory decay cycle. Called by consciousness orchestrator (daily).
 */
export async function runMemoryDecayCycle(): Promise<{
  decayed: number;
  archived: number;
  reinforced: number;
}> {
  let decayed = 0;
  let archived = 0;
  let reinforced = 0;

  try {
    const memories = await prisma.memoryEmbedding.findMany({
      select: {
        id: true,
        metadata: true,
        createdAt: true,
      },
    });

    for (const memory of memories) {
      const meta = (memory.metadata || {}) as MemoryMeta;
      const currentRelevance = meta.relevance ?? 0.5;

      // Skip already archived
      if (meta.archived) continue;
      if (currentRelevance <= ARCHIVE_THRESHOLD) continue;

      const age = Date.now() - new Date(memory.createdAt).getTime();
      const weeksOld = age / (7 * 24 * 60 * 60 * 1000);

      const isHighSignificance = currentRelevance > 0.8;
      const decayRate = isHighSignificance ? HIGH_SIGNIFICANCE_DECAY_RATE : GENERAL_DECAY_RATE;

      let newRelevance = currentRelevance - (decayRate * Math.min(weeksOld, 52));

      // Reinforcement: recently accessed memories get a boost
      if (meta.lastAccessedAt) {
        const timeSinceAccess = Date.now() - new Date(meta.lastAccessedAt).getTime();
        const daysSinceAccess = timeSinceAccess / (24 * 60 * 60 * 1000);
        if (daysSinceAccess < 7) {
          newRelevance = Math.min(MAX_RELEVANCE, newRelevance + 0.1);
          reinforced++;
        }
      }

      // Access count reinforcement
      if ((meta.accessCount || 0) > 3) {
        newRelevance = Math.min(MAX_RELEVANCE, newRelevance + 0.05);
      }

      newRelevance = Math.max(0, Math.min(MAX_RELEVANCE, newRelevance));

      const isArchived = newRelevance <= ARCHIVE_THRESHOLD;

      if (Math.abs(newRelevance - currentRelevance) > 0.001 || isArchived) {
        await prisma.memoryEmbedding.update({
          where: { id: memory.id },
          data: {
            metadata: {
              ...(meta as object),
              relevance: newRelevance,
              archived: isArchived,
            } as any,
          },
        });

        if (isArchived) archived++;
        else decayed++;
      }
    }

    console.log(`[MemoryDecay] Decayed: ${decayed}, Archived: ${archived}, Reinforced: ${reinforced}`);
  } catch (err) {
    console.warn('[MemoryDecay] Failed:', (err as Error).message);
  }

  return { decayed, archived, reinforced };
}

/**
 * Score a memory's importance based on multiple factors.
 */
export function scoreMemoryImportance(params: {
  emotionalSignificance: number;
  isActionItem: boolean;
  topicFrequency: number;
  isCreatorSpecific: boolean;
  memoryType: string;
}): number {
  let score = 0.5;

  score += params.emotionalSignificance * 0.2;
  if (params.isActionItem) score += 0.15;
  if (params.topicFrequency >= 3) score += 0.15;
  else if (params.topicFrequency >= 2) score += 0.08;
  if (params.isCreatorSpecific) score += 0.1;

  if (params.memoryType === 'preference') score += 0.1;
  if (params.memoryType === 'goal') score += 0.15;
  if (params.memoryType === 'relationship') score += 0.12;
  if (params.memoryType === 'skill') score += 0.08;

  return Math.max(0.1, Math.min(1.0, score));
}