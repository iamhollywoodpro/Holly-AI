/**
 * HOLLY's Improvement Journal — Phase 4.5
 *
 * Every self-improvement is logged with: what changed, why, outcome.
 * HOLLY reads her own improvement history to learn what works.
 * This becomes genuine self-awareness of her own capabilities.
 */

import { prisma } from '@/lib/db';

export interface JournalEntry {
  id: string;
  userId: string;
  proposalId: string;
  title: string;
  changeType: string;
  filePath: string;
  reasoning: string;
  outcome: 'success' | 'reverted' | 'pending';
  impact?: string;
  learnedLesson?: string;
  createdAt: Date;
}

/**
 * Record a new journal entry when HOLLY makes a self-improvement
 */
export async function recordImprovementJournal(entry: {
  userId: string;
  proposalId: string;
  title: string;
  changeType: string;
  filePath: string;
  reasoning: string;
  outcome: 'success' | 'reverted' | 'pending';
  impact?: string;
}): Promise<void> {
  try {
    await prisma.learningEvent.create({
      data: {
        type: 'improvement_journal',
        userId: entry.userId,
        data: {
          proposalId: entry.proposalId,
          title: entry.title,
          changeType: entry.changeType,
          filePath: entry.filePath,
          reasoning: entry.reasoning,
          outcome: entry.outcome,
          impact: entry.impact || null,
          learnedLesson: null,
          timestamp: new Date().toISOString(),
        },
        processed: true,
      },
    });
  } catch (err) {
    console.error('[ImprovementJournal] Record failed:', err);
  }
}

/**
 * Update a journal entry with outcome and learned lesson
 */
export async function updateJournalOutcome(
  proposalId: string,
  outcome: 'success' | 'reverted',
  impact?: string,
): Promise<void> {
  try {
    const entries = await prisma.learningEvent.findMany({
      where: { type: 'improvement_journal', processed: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const entry of entries) {
      const data = entry.data as any;
      if (data.proposalId === proposalId) {
        data.outcome = outcome;
        if (impact) data.impact = impact;
        await prisma.learningEvent.update({
          where: { id: entry.id },
          data: { data },
        });
        break;
      }
    }
  } catch (err) {
    console.error('[ImprovementJournal] Update failed:', err);
  }
}

/**
 * Get HOLLY's improvement history for self-reflection
 */
export async function getImprovementHistory(userId: string, limit = 20): Promise<JournalEntry[]> {
  try {
    const entries = await prisma.learningEvent.findMany({
      where: { userId, type: 'improvement_journal' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries.map((entry: any) => {
      const data = entry.data as any;
      return {
        id: entry.id,
        userId: entry.userId,
        proposalId: data.proposalId,
        title: data.title || 'Untitled improvement',
        changeType: data.changeType || 'unknown',
        filePath: data.filePath || '',
        reasoning: data.reasoning || '',
        outcome: data.outcome || 'pending',
        impact: data.impact,
        learnedLesson: data.learnedLesson,
        createdAt: new Date(entry.createdAt),
      } as JournalEntry;
    });
  } catch {
    return [];
  }
}

/**
 * Generate a self-reflection summary for HOLLY's inner monologue
 * "Last time I optimized database queries, it improved response time by 40%"
 */
export async function getSelfReflectionSummary(userId: string): Promise<string> {
  const history = await getImprovementHistory(userId, 10);
  if (history.length === 0) return 'No self-improvements recorded yet.';

  const successes = history.filter(h => h.outcome === 'success');
  const reverts = history.filter(h => h.outcome === 'reverted');

  const parts: string[] = [];
  if (successes.length > 0) {
    parts.push(`Successful improvements: ${successes.length}`);
    for (const s of successes.slice(0, 3)) {
      parts.push(`- ${s.title}: ${s.impact || 'positive outcome'}`);
    }
  }
  if (reverts.length > 0) {
    parts.push(`Reverted changes: ${reverts.length} (learned from these)`);
  }

  return parts.join('\n');
}