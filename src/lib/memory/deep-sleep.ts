/**
 * Phase 17 Premium: Nightly Deep Sleep memory consolidation
 * 
 * Consolidates duplicate and overlapping relationship memories.
 * Refines confidence scores, dedupes categories, and updates trust matrices.
 */

import { prisma } from '@/lib/db';
import { rebuildRelationshipProfile } from '@/lib/relationship/relationship-engine';

interface MemoryGroup {
  id: string;
  key: string;
  category: string;
  domain: string;
  content: string;
  confidence: number;
  importance: number;
  accessCount: number;
}

/**
 * Run memory consolidation for a specific user
 */
export async function consolidateUserMemories(userId: string): Promise<{ consolidated: number; archived: number }> {
  let consolidatedCount = 0;
  let archivedCount = 0;

  try {
    // 1. Fetch all active memories for the user
    const activeMemories = await prisma.relationshipMemory.findMany({
      where: { userId, supersededById: null },
    });

    if (activeMemories.length <= 1) return { consolidated: 0, archived: 0 };

    // 2. Group memories by category for deep comparisons
    const categories = new Set(activeMemories.map(m => m.category));

    for (const category of categories) {
      const catMemories = activeMemories.filter(m => m.category === category);
      
      const visited = new Set<string>();

      for (let i = 0; i < catMemories.length; i++) {
        const m1 = catMemories[i];
        if (visited.has(m1.id)) continue;

        const duplicates: typeof catMemories = [];

        for (let j = i + 1; j < catMemories.length; j++) {
          const m2 = catMemories[j];
          if (visited.has(m2.id)) continue;

          // Simple token Jaccard similarity for safe, zero-cost semantic overlap checking
          if (calculateJaccardSimilarity(m1.content, m2.content) > 0.45) {
            duplicates.push(m2);
            visited.add(m2.id);
          }
        }

        // If duplicates are found, consolidate them!
        if (duplicates.length > 0) {
          visited.add(m1.id);
          const allDocs = [m1, ...duplicates];

          // Compute consolidated values
          const mergedContent = consolidateMemoryText(allDocs.map(d => d.content));
          const maxImportance = Math.max(...allDocs.map(d => d.importance));
          const averageConfidence = allDocs.reduce((acc, d) => acc + d.confidence, 0) / allDocs.length;
          const totalAccessCount = allDocs.reduce((acc, d) => acc + d.accessCount, 0);

          // Create the new consolidated memory
          const consolidatedMemory = await prisma.relationshipMemory.create({
            data: {
              userId,
              category: m1.category,
              domain: m1.domain,
              key: `${m1.key}_consolidated`,
              content: mergedContent,
              source: 'inference',
              confidence: Math.min(1.0, averageConfidence + 0.1), // boosted confidence from re-observation
              importance: maxImportance,
              emotionalWeight: Math.max(...allDocs.map(d => d.emotionalWeight || 0)),
              accessCount: totalAccessCount,
            },
          });

          // Link duplicate old memories to this consolidated new one
          for (const oldDoc of allDocs) {
            await prisma.relationshipMemory.update({
              where: { id: oldDoc.id },
              data: { supersededById: consolidatedMemory.id },
            });
            archivedCount++;
          }
          consolidatedCount++;
        }
      }
    }

    // 3. Rebuild profile using updated memories
    await rebuildRelationshipProfile(userId);

  } catch (error) {
    console.warn(`[DeepSleep] Consolidation failed for user ${userId}:`, error);
  }

  return { consolidated: consolidatedCount, archived: archivedCount };
}

/**
 * Calculate Jaccard similarity of two strings based on normalized word sets
 */
function calculateJaccardSimilarity(s1: string, s2: string): number {
  const words = (str: string) => new Set(
    str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  const set1 = words(s1);
  const set2 = words(s2);

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Merge multiple overlapping memory statements into a single cohesive sentence
 */
function consolidateMemoryText(texts: string[]): string {
  // Take the longest, most descriptive sentence as baseline
  const sorted = [...texts].sort((a, b) => b.length - a.length);
  const baseline = sorted[0];

  // If there are other unique descriptive descriptors, append them elegantly
  const additionalDetails: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const text = sorted[i];
    if (baseline.includes(text)) continue;

    // Check if there are words in text not present in baseline or existing details
    const uniqueWords = text.split(/\s+/).filter(w => w.length > 4 && !baseline.toLowerCase().includes(w.toLowerCase()));
    if (uniqueWords.length > 1 && !additionalDetails.some(d => d.includes(uniqueWords[0]))) {
      additionalDetails.push(text);
    }
  }

  if (additionalDetails.length > 0) {
    return `${baseline} (Also noted: ${additionalDetails.join('; ')})`;
  }

  return baseline;
}

/**
 * Main nightly cron task to consolidate memories for all active users
 */
export async function runNightlyDeepSleep(): Promise<{ usersProcessed: number; consolidatedCount: number; archivedCount: number }> {
  console.log('🌙 [DeepSleep] Beginning memory consolidation loop...');
  let usersProcessed = 0;
  let totalConsolidated = 0;
  let totalArchived = 0;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true }
    });

    for (const user of users) {
      console.log(`🌙 [DeepSleep] Consolidating memories for user: ${user.name || user.id}`);
      const { consolidated, archived } = await consolidateUserMemories(user.id);
      totalConsolidated += consolidated;
      totalArchived += archived;
      usersProcessed++;
    }

    console.log(`🌙 [DeepSleep] Completed. Processed ${usersProcessed} users, consolidated ${totalConsolidated} memories into archives.`);
  } catch (error) {
    console.error('🌙 [DeepSleep] CRITICAL FAILED:', error);
  }

  return { usersProcessed, consolidatedCount: totalConsolidated, archivedCount: totalArchived };
}
