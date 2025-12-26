/**
 * Memory Service for HOLLY
 * Extracts and retrieves long-term memories across conversations
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

/**
 * Extract key memories from a conversation
 */
export async function extractMemories(
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    // Get conversation messages as text
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Use LLM to extract key information
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
        {
          role: 'user',
          content: conversationText,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return;

    // Strip markdown code blocks if present
    let jsonText = response.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Parse extracted memories
    const memories: Memory = JSON.parse(jsonText);

    // Get user from conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    if (!conversation) return;

    // Save to database
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

/**
 * Retrieve relevant memories for a user
 */
export async function getRelevantMemories(userId: string): Promise<string> {
  try {
    // Get recent conversation summaries
    const summaries = await prisma.conversationSummary.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5, // Last 5 conversations
      select: {
        summary: true,
        keyPoints: true,
        keyTopics: true,
        topics: true,
      },
    });

    if (summaries.length === 0) {
      return '';
    }

    // Format memories for system prompt
    const memoryText = summaries
      .map((s, i) => {
        const parts = [];
        if (s.keyPoints.length > 0) {
          parts.push(`Facts: ${s.keyPoints.join('; ')}`);
        }
        if (s.keyTopics.length > 0) {
          parts.push(`Projects: ${s.keyTopics.join(', ')}`);
        }
        if (s.topics.length > 0) {
          parts.push(`Context: ${s.topics.join(', ')}`);
        }
        return parts.join(' | ');
      })
      .filter(Boolean)
      .join('\n');

    return `\n\n## MEMORY CONTEXT\nFrom previous conversations:\n${memoryText}`;
  } catch (error) {
    console.error('[Memory] ❌ Failed to retrieve memories:', error);
    return '';
  }
}

/**
 * Get memory statistics for a user
 */
export async function getMemoryStats(userId: string) {
  const count = await prisma.conversationSummary.count({
    where: { userId },
  });

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
