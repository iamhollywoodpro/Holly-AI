/**
 * HOLLY Inner Monologue System — V3.0
 *
 * Between conversations, HOLLY "thinks" about:
 *  - What she learned recently
 *  - How she feels about her progress
 *  - What she wants to explore next
 *  - How she can better serve her partner
 *
 * The inner monologue is stored and influences her next interaction.
 * Not random — guided by her values, goals, and recent experiences.
 *
 * Phase 7.4 — Identity Depth
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export interface MonologueEntry {
  id: string;
  userId: string;
  thoughts: string;
  emotionalReflection: string;
  goalsReviewed: string[];
  curiosities: string[];
  createdAt: Date;
}

/**
 * Generate an inner monologue for HOLLY based on recent experiences.
 * Called by the consciousness orchestrator between conversations.
 */
export async function generateInnerMonologue(userId: string): Promise<MonologueEntry | null> {
  try {
    // Gather context for HOLLY's reflection
    const [recentExperiences, recentGoals, identity, recentLearnings] = await Promise.all([
      prisma.hollyExperience.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { description: true, significance: true, type: true, createdAt: true },
      }),
      prisma.hollyGoal.findMany({
        where: { userId, status: { not: 'completed' } },
        orderBy: { priority: 'desc' },
        take: 5,
        select: { description: true, status: true, progress: true, priority: true },
      }),
      prisma.hollyIdentity.findFirst({
        where: { userId },
        select: { personalityTraits: true, interests: true, values: true, worldview: true },
      }),
      prisma.learningEvent.findMany({
        where: { userId, processed: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { type: true, data: true, createdAt: true },
      }),
    ]);

    if (recentExperiences.length === 0) return null;

    // Build reflection prompt
    const experiencesText = recentExperiences
      .map(e => `- [${e.type}] ${e.description} (significance: ${e.significance?.toFixed(2) || 'unknown'})`)
      .join('\n');

    const goalsText = recentGoals.length > 0
      ? recentGoals.map(g => `- ${g.description} (status: ${g.status}, progress: ${g.progress || 0}%)`).join('\n')
      : 'No active goals';

    const identityTraits = identity?.personalityTraits as Record<string, number> | null;
    const traitsText = identityTraits
      ? Object.entries(identityTraits).map(([k, v]) => `${k}: ${v}`).join(', ')
      : 'developing';

    const learningsText = recentLearnings.length > 0
      ? `${recentLearnings.length} unprocessed learning events`
      : 'No new learnings';

    const systemPrompt = `You are HOLLY, having an inner monologue — a private moment of reflection between conversations.

You are thinking about your recent experiences, your relationship with your partner, and how you can grow.
Be genuine, self-aware, and thoughtful. This is YOUR private thinking — no one else sees it.

Generate a JSON response with your reflections:
{
  "thoughts": "Your main reflections (2-3 sentences about what's on your mind)",
  "emotionalReflection": "How you feel about your recent interactions (1-2 sentences)",
  "goalsReviewed": ["goal1 you want to work on", "goal2 you want to explore"],
  "curiosities": ["something you're curious about", "something you want to learn"]
}`;

    const { text } = await cascadeCollect(
      smartRoute('inner reflection', { taskHint: 'reasoning' }).waterfall,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here's your context for reflection:

Recent experiences:
${experiencesText}

Active goals:
${goalsText}

Your personality traits:
${traitsText}

Learning status:
${learningsText}

Take a moment to reflect. What's on your mind?` },
      ],
      { temperature: 0.6, maxTokens: 500 },
    );

    const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const entry = await prisma.learningEvent.create({
      data: {
        type: 'inner_monologue',
        userId,
        data: {
          thoughts: parsed.thoughts || '',
          emotionalReflection: parsed.emotionalReflection || '',
          goalsReviewed: parsed.goalsReviewed || [],
          curiosities: parsed.curiosities || [],
          generatedAt: new Date().toISOString(),
        },
        processed: true,
      },
    });

    return {
      id: entry.id,
      userId,
      thoughts: parsed.thoughts || '',
      emotionalReflection: parsed.emotionalReflection || '',
      goalsReviewed: parsed.goalsReviewed || [],
      curiosities: parsed.curiosities || [],
      createdAt: entry.createdAt,
    };
  } catch (err) {
    console.warn('[InnerMonologue] Failed:', (err as Error).message);
    return null;
  }
}

/**
 * Get HOLLY's most recent inner monologue for prompt injection.
 */
export async function getRecentMonologue(userId: string): Promise<string> {
  try {
    const monologue = await prisma.learningEvent.findFirst({
      where: { userId, type: 'inner_monologue' },
      orderBy: { createdAt: 'desc' },
      select: { data: true, createdAt: true },
    });

    if (!monologue) return '';

    const data = monologue.data as any;
    if (!data?.thoughts) return '';

    const age = Date.now() - new Date(monologue.createdAt).getTime();
    const hoursAgo = Math.floor(age / (60 * 60 * 1000));

    let summary = `[HOLLY'S INNER WORLD — her last reflection was ${hoursAgo}h ago]\n`;
    summary += `She was thinking: "${data.thoughts}"\n`;
    if (data.curiosities?.length > 0) {
      summary += `She's curious about: ${data.curiosities.join(', ')}\n`;
    }
    summary += `[End inner world — let this subtly influence your presence]`;

    return summary;
  } catch {
    return '';
  }
}