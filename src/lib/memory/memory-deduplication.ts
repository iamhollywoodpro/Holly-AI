/**
 * HOLLY Memory Deduplication & Importance Scoring — Phase 6.3-6.4
 *
 * 6.3: Before storing new memory, check similarity with existing memories
 *      Similarity > 0.9: merge into existing
 *      Similarity > 0.7: link as related
 *      Similarity < 0.7: store as new
 *
 * 6.4: Score memory importance based on emotional significance,
 *      action items, repeated topics, and creator-specific patterns
 */

import { prisma } from '@/lib/db';

// ─── Phase 6.3: Memory Deduplication ─────────────────────────────────────────

export interface DeduplicationResult {
  action: 'store_new' | 'merge' | 'link';
  existingMemoryId?: string;
  similarity: number;
}

/**
 * Check a new memory against existing memories for duplication
 */
export async function checkMemorySimilarity(
  userId: string,
  newContent: string,
): Promise<DeduplicationResult> {
  try {
    // Get recent memories for this user
    const recentMemories = await prisma.memoryEmbedding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, content: true, embedding: true },
    });

    if (recentMemories.length === 0) {
      return { action: 'store_new', similarity: 0 };
    }

    // Text-based similarity (fast, no embedding needed)
    let bestMatch: { id: string; similarity: number; importance: number } | null = null;

    const newLower = newContent.toLowerCase();
    const newWords = new Set(newLower.split(/\s+/).filter(w => w.length > 3));

    for (const memory of recentMemories) {
      const existingContent = typeof memory.content === 'string'
        ? memory.content
        : JSON.stringify(memory.content);

      const existingLower = existingContent.toLowerCase();
      const existingWords = new Set(existingLower.split(/\s+/).filter(w => w.length > 3));

      // Jaccard similarity
      const intersection = new Set([...newWords].filter(w => existingWords.has(w)));
      const union = new Set([...newWords, ...existingWords]);
      const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

      // Also check substring similarity for exact phrase matches
      const substringBonus = newLower.includes(existingLower.substring(0, 30)) ||
        existingLower.includes(newLower.substring(0, 30)) ? 0.2 : 0;

      const similarity = Math.min(1.0, jaccardSimilarity + substringBonus);

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { id: memory.id, similarity, importance: 0.5 };
      }
    }

    if (!bestMatch) return { action: 'store_new', similarity: 0 };

    if (bestMatch.similarity >= 0.9) {
      return { action: 'merge', existingMemoryId: bestMatch.id, similarity: bestMatch.similarity };
    }
    if (bestMatch.similarity >= 0.7) {
      return { action: 'link', existingMemoryId: bestMatch.id, similarity: bestMatch.similarity };
    }
    return { action: 'store_new', similarity: bestMatch.similarity };
  } catch (err) {
    console.error('[MemoryDedup] Check failed:', err);
    return { action: 'store_new', similarity: 0 };
  }
}

/**
 * Merge a new memory into an existing one
 */
export async function mergeMemories(
  existingId: string,
  newContent: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    const existing = await prisma.memoryEmbedding.findUnique({
      where: { id: existingId },
      select: { id: true, content: true },
    });

    if (!existing) return;

    const mergedContent = `${existing.content}\n[Updated]: ${newContent}`;

    await prisma.memoryEmbedding.update({
      where: { id: existingId },
      data: {
        content: mergedContent,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[MemoryDedup] Merge failed:', err);
  }
}

// ─── Phase 6.4: Memory Importance Scoring ────────────────────────────────────

export interface ImportanceFactors {
  emotionalSignificance: number;  // High-emotion exchanges matter more
  isActionItem: boolean;          // Things Steve asked HOLLY to remember
  topicFrequency: number;         // Mentioned 3+ times = important
  isCreatorSpecific: boolean;     // Steve's preferences, patterns, goals
  recency: number;                // More recent = higher score
}

/**
 * Score a memory's importance across multiple dimensions
 */
export function scoreMemoryImportance(factors: ImportanceFactors): number {
  let score = 0.3; // Base score

  // Emotional significance (0-0.2)
  score += factors.emotionalSignificance * 0.2;

  // Action items (0 or 0.15)
  if (factors.isActionItem) score += 0.15;

  // Topic frequency (0-0.15)
  score += Math.min(0.15, factors.topicFrequency * 0.05);

  // Creator-specific (0 or 0.1)
  if (factors.isCreatorSpecific) score += 0.1;

  // Recency (0-0.1)
  score += factors.recency * 0.1;

  return Math.min(1.0, Math.max(0.1, score));
}

/**
 * Detect if a message contains an action item (Steve asking HOLLY to remember)
 */
export function detectActionItem(message: string): boolean {
  const actionPhrases = [
    'remember this', 'keep in mind', 'don\'t forget', 'make a note',
    'save this', 'write this down', 'important:', 'note:',
    'i want you to remember', 'for future reference', 'keep track of',
    'this is important', 'pay attention to',
  ];
  const lower = message.toLowerCase();
  return actionPhrases.some(p => lower.includes(p));
}

/**
 * Detect if a message is creator-specific (about Steve's preferences/patterns)
 */
export function detectCreatorSpecific(message: string): boolean {
  const creatorPhrases = [
    'i prefer', 'i like', 'i don\'t like', 'my style', 'my approach',
    'i usually', 'my workflow', 'i always', 'i never', 'in my opinion',
    'my goal', 'my vision', 'i want', 'my plan', 'my project',
  ];
  const lower = message.toLowerCase();
  return creatorPhrases.some(p => lower.includes(p));
}

/**
 * Count how often a topic has been mentioned in recent conversations
 */
export async function getTopicFrequency(userId: string, topic: string): Promise<number> {
  try {
    const recentEvents = await prisma.learningEvent.findMany({
      where: { userId, type: 'conversation' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { data: true },
    });

    let count = 0;
    for (const event of recentEvents) {
      const topics = (event.data as any)?.topics || [];
      if (topics.includes(topic)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}