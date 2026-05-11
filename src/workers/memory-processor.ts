/**
 * HOLLY Memory Processor Worker — Phase 6 (Upgraded)
 *
 * Background processing of memories:
 *  - Uses real deduplication module (Jaccard + substring similarity)
 *  - Applies importance-aware decay scoring
 *  - Generates knowledge graph nodes from important memories
 *  - Runs every 30 minutes via cron or standalone worker
 */

import { PrismaClient } from '@prisma/client';
import { checkMemorySimilarity, mergeMemories } from '@/lib/memory/memory-deduplication';
import { runMemoryDecayCycle } from '@/lib/memory/memory-decay';
import { addKnowledge, queryKnowledge } from '@/lib/intelligence/knowledge-graph';

const prisma = new PrismaClient();
const CYCLE_INTERVAL = 30 * 60 * 1000; // 30 minutes

async function processMemories() {
  console.log(`[MemoryProcessor] 🧠 Starting memory processing — ${new Date().toISOString()}`);
  const stats = { deduped: 0, merged: 0, knowledgeNodes: 0, decayed: 0, archived: 0 };

  try {
    // ── Phase 1: Find unprocessed experiences and run dedup ─────────
    const recentMemories = await prisma.hollyExperience.findMany({
      where: {
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      select: { id: true, userId: true, content: true, timestamp: true },
    });

    for (const mem of recentMemories) {
      const content = typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content);
      if (!content || content.length < 10) continue;

      try {
        const dedup = await checkMemorySimilarity(mem.userId, content);
        
        if (dedup.action === 'merge' && dedup.existingMemoryId) {
          await mergeMemories(dedup.existingMemoryId, content, {} as Record<string, any>);
          stats.merged++;
        } else if (dedup.action === 'link') {
          // Track that this is related but keep both
          stats.deduped++;
        }
      } catch {
        // Per-memory errors shouldn't stop the whole cycle
      }
    }

    // ── Phase 2: Run decay cycle on vector memories ────────────────
    try {
      const decayResult = await runMemoryDecayCycle();
      stats.decayed = decayResult.decayed;
      stats.archived = decayResult.archived;
    } catch (err) {
      console.warn('[MemoryProcessor] Decay cycle failed:', (err as Error).message);
    }

    // ── Phase 3: Create knowledge graph nodes from high-importance memories ──
    try {
      const importantMemories = await prisma.memoryEmbedding.findMany({
        where: {
          metadata: { path: ['importance'], gte: 0.7 },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        take: 20,
        select: { id: true, content: true, type: true, metadata: true },
      });

      for (const mem of importantMemories) {
        const content = typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content);
        if (!content || content.length < 20) continue;

        // Check if we already have a knowledge node for this
        const existing = await queryKnowledge(content.substring(0, 50), { limit: 1 });
        if (existing.length > 0) continue;

        try {
          const meta = (mem.metadata || {}) as Record<string, unknown>;
          await addKnowledge({
            entityType: mem.type === 'preference' ? 'user' :
                        mem.type === 'goal' ? 'project' :
                        mem.type === 'code' ? 'pattern' : 'concept',
            name: content.substring(0, 100).split(/[.!?]/)[0].trim(),
            description: content.substring(0, 500),
            metadata: { memoryId: mem.id, memoryType: mem.type, importance: meta.importance || 0.5 },
            confidence: (meta.importance as number) || 0.5,
          });
          stats.knowledgeNodes++;
        } catch {
          // Per-node errors shouldn't stop the cycle
        }
      }
    } catch (err) {
      console.warn('[MemoryProcessor] Knowledge graph phase failed:', (err as Error).message);
    }

    // ── Phase 4: Mark old learning events as processed ─────────────
    const oldEvents = await prisma.learningEvent.updateMany({
      where: {
        processed: false,
        timestamp: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      data: { processed: true },
    });

    console.log(
      `[MemoryProcessor] ✅ Done — deduped: ${stats.deduped}, merged: ${stats.merged}, ` +
      `knowledge nodes: ${stats.knowledgeNodes}, decayed: ${stats.decayed}, ` +
      `archived: ${stats.archived}, events processed: ${oldEvents.count}`
    );
  } catch (err) {
    console.error('[MemoryProcessor] Fatal:', err);
  }
}

async function main() {
  console.log('[MemoryProcessor] 🧠 Starting memory processor worker...');
  await processMemories();
  setInterval(processMemories, CYCLE_INTERVAL);
  console.log('[MemoryProcessor] ✅ Running every 30 minutes.');
}

main().catch(console.error);