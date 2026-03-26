/**
 * Memory Service for HOLLY
 *
 * Extracts and retrieves long-term memories across conversations.
 *
 * Phase 1F upgrade: getRelevantMemories now accepts currentTopics so it
 * can score summaries by topic overlap (most relevant first) rather than
 * returning the 5 most-recent regardless of relevance.
 */

import { prisma } from '@/lib/db';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export interface Memory {
  facts: string[];
  preferences: string[];
  projects: string[];
  context: string[];
}

// ─── extract ──────────────────────────────────────────────────────────────────

/**
 * Extract key memories from a conversation and persist them.
 * Called in the background after each chat response.
 */
export async function extractMemories(
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a memory extraction system. Analyze the conversation and extract:
1. Key facts about the user
2. User preferences and work style
3. Projects or goals mentioned
4. Important context or technical details

Return a JSON object with arrays: facts, preferences, projects, context.
Keep each item concise (1-2 sentences max).`,
        },
        { role: 'user', content: conversationText },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return;

    let jsonText = response.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const memories: Memory = JSON.parse(jsonText);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });
    if (!conversation) return;

    await prisma.conversationSummary.upsert({
      where: { conversationId },
      create: {
        conversationId,
        userId: conversation.userId,
        summary: `Conversation about: ${memories.projects.join(', ')}`,
        keyPoints: [...memories.facts, ...memories.preferences],
        keyTopics: memories.projects,
        topics: memories.context,
        messageCount: messages.length,
        cached: true,
      },
      update: {
        keyPoints: [...memories.facts, ...memories.preferences],
        keyTopics: memories.projects,
        topics: memories.context,
        messageCount: messages.length,
        updatedAt: new Date(),
      },
    });

    console.log('[Memory] ✅ Extracted memories for conversation:', conversationId);
  } catch (error) {
    console.error('[Memory] ❌ Failed to extract memories:', error);
  }
}

// ─── retrieve ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant memories for a user.
 *
 * When currentTopics are supplied, summaries that share topic keywords with
 * the current message are surfaced first (topic-intersection scoring).
 * Falls back to recency ordering for non-topic-matched results.
 */
export async function getRelevantMemories(
  userId: string,
  currentTopics: string[] = []
): Promise<string> {
  try {
    // Pull a wider pool so we can score and trim to best 5
    const summaries = await prisma.conversationSummary.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 15,
      select: {
        summary: true,
        keyPoints: true,
        keyTopics: true,
        topics: true,
        updatedAt: true,
      },
    });

    if (summaries.length === 0) return '';

    // Score: +1 per topic overlap, +0.5 recency bonus for 3 most recent
    const topicSet = new Set(currentTopics.map(t => t.toLowerCase()));

    const scored = summaries.map((s, idx) => {
      const allTopics = [...s.keyTopics, ...s.topics].map(t => t.toLowerCase());
      const overlap = allTopics.filter(t => topicSet.has(t)).length;
      const recency = idx < 3 ? 0.5 : 0;
      return { s, score: overlap + recency };
    });

    const best = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ s }) => s);

    const memoryText = best
      .map(s => {
        const parts: string[] = [];
        if (s.keyPoints.length > 0) {
          parts.push(`Facts: ${s.keyPoints.slice(0, 5).join('; ')}`);
        }
        if (s.keyTopics.length > 0) {
          parts.push(`Projects: ${s.keyTopics.join(', ')}`);
        }
        if (s.topics.length > 0) {
          parts.push(`Context: ${s.topics.slice(0, 4).join(', ')}`);
        }
        return parts.join(' | ');
      })
      .filter(Boolean)
      .join('\n');

    if (!memoryText) return '';

    return `\n\n## MEMORY CONTEXT\nFrom previous conversations:\n${memoryText}`;
  } catch (error) {
    console.error('[Memory] ❌ Failed to retrieve memories:', error);
    return '';
  }
}

// ─── stats ────────────────────────────────────────────────────────────────────

export async function getMemoryStats(userId: string) {
  const count = await prisma.conversationSummary.count({ where: { userId } });
  const recent = await prisma.conversationSummary.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: { updatedAt: true },
  });

  return {
    totalMemories: count,
    lastUpdated: recent[0]?.updatedAt || null,
  };
}
