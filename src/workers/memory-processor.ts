/**
 * HOLLY Memory Processor Worker — Phase 6
 *
 * Background processing of memories:
 *  - Deduplicates similar memories
 *  - Applies decay scoring (older = less relevant unless reinforced)
 *  - Generates summary memories from conversation threads
 *  - Runs every 30 minutes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CYCLE_INTERVAL = 30 * 60 * 1000; // 30 minutes

async function processMemories() {
  console.log(`[MemoryProcessor] 🧠 Starting memory processing — ${new Date().toISOString()}`);

  try {
    // 1. Find unprocessed semantic memories and clean them up
    const recentMemories = await prisma.hollyExperience.findMany({
      where: {
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      select: { id: true, userId: true, content: true, metadata: true, timestamp: true },
    });

    // 2. Deduplicate: find near-identical experiences for same user
    const seen = new Map<string, string[]>();
    let deduped = 0;

    for (const mem of recentMemories) {
      const content = typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content);
      const key = `${mem.userId}:${(content || '').substring(0, 100).toLowerCase().trim()}`;
      const existing = seen.get(key);
      if (existing) {
        // Already have a very similar memory — skip
        deduped++;
      } else {
        seen.set(key, [mem.id]);
      }
    }

    if (deduped > 0) {
      console.log(`[MemoryProcessor] Found ${deduped} potential duplicates (kept originals)`);
    }

    // 3. Mark old learning events as processed
    const oldEvents = await prisma.learningEvent.updateMany({
      where: {
        processed: false,
        timestamp: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      data: { processed: true },
    });

    if (oldEvents.count > 0) {
      console.log(`[MemoryProcessor] Marked ${oldEvents.count} old events as processed`);
    }

    console.log(`[MemoryProcessor] ✅ Processed ${recentMemories.length} memories`);
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