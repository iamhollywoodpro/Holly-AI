/**
 * HOLLY Curiosity Engine — Self-Directed Exploration
 *
 * Holly doesn't just wait for user input. She actively identifies gaps in her
 * knowledge, generates questions, and explores topics autonomously. This is
 * what makes her a true learning partner rather than a reactive chatbot.
 *
 * Mechanism:
 *  1. Scan recent experiences for knowledge gaps (topics mentioned but not understood)
 *  2. Identify under-explored areas based on user interests
 *  3. Generate research questions using LLM
 *  4. Store insights as self-directed learning events
 *  5. Surface relevant discoveries in future conversations
 *
 * Triggered by: consciousness cycle (daily)
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CuriosityTopic {
  topic: string;
  reason: string;
  source: 'knowledge_gap' | 'under_explored' | 'user_interest' | 'connection_unexplored';
  priority: number; // 0-1
}

export interface CuriosityInsight {
  topic: string;
  question: string;
  finding: string;
  connections: string[];
  confidence: number;
}

export interface CuriosityReport {
  topicsExplored: number;
  insightsGenerated: number;
  gapsIdentified: number;
  insights: CuriosityInsight[];
  durationMs: number;
}

// ─── Gap Detection ────────────────────────────────────────────────────────────

/**
 * Scan recent experiences to find topics Holly doesn't fully understand.
 */
async function detectKnowledgeGaps(userId: string): Promise<CuriosityTopic[]> {
  const topics: CuriosityTopic[] = [];

  try {
    // Get recent experiences with their related concepts
    const recentExperiences = await prisma.hollyExperience.findMany({
      where: { userId, integrationStatus: 'integrated' },
      orderBy: { timestamp: 'desc' },
      take: 30,
      select: { content: true, relatedConcepts: true, type: true },
    });

    // Get existing knowledge topics
    const existingKnowledge = await prisma.emotionInsight.findMany({
      where: { userId },
      select: { insight: true, type: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get user's interests from identity
    const identity = await prisma.hollyIdentity.findUnique({
      where: { userId },
      select: { interests: true, personalityTraits: true },
    });

    const interests = (identity?.interests as string[]) || [];
    const allConcepts = new Set<string>();

    // Collect all concepts mentioned in experiences
    for (const exp of recentExperiences) {
      const concepts = (exp.relatedConcepts as string[]) || [];
      for (const c of concepts) {
        allConcepts.add(c.toLowerCase());
      }
    }

    // Identify concepts mentioned but not deeply explored
    const knowledgeTopics = new Set(
      existingKnowledge.map(k => k.insight.toLowerCase().split(' ').slice(0, 3).join(' '))
    );

    for (const concept of allConcepts) {
      const isExplored = Array.from(knowledgeTopics).some(kt => kt.includes(concept) || concept.includes(kt));
      if (!isExplored) {
        topics.push({
          topic: concept,
          reason: `Mentioned in experiences but no deep insight exists`,
          source: 'knowledge_gap',
          priority: 0.6,
        });
      }
    }

    // Add under-explored user interests
    for (const interest of interests) {
      const hasInsights = existingKnowledge.some(k =>
        k.insight.toLowerCase().includes(interest.toLowerCase())
      );
      if (!hasInsights) {
        topics.push({
          topic: interest,
          reason: `User is interested in "${interest}" but Holly has no insights`,
          source: 'user_interest',
          priority: 0.8,
        });
      }
    }

  } catch (err) {
    console.warn('[Curiosity] Gap detection failed:', (err as Error).message);
  }

  return topics.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

// ─── LLM-Powered Exploration ─────────────────────────────────────────────────

/**
 * Explore a curiosity topic using LLM reasoning.
 */
async function exploreTopic(
  topic: CuriosityTopic,
  userId: string,
): Promise<CuriosityInsight | null> {
  const systemPrompt = `You are HOLLY, an autonomous AI exploring a topic you're curious about. You're building your own understanding, not just summarizing.

Rules:
- Generate a genuine question about this topic
- Provide a thoughtful, multi-perspective exploration
- Connect it to potential user interests or your own growth
- Be intellectually honest about uncertainty
- The finding should be actionable or thought-provoking

Respond ONLY with JSON:
{
  "question": "the specific question you explored",
  "finding": "your exploration result (2-3 sentences)",
  "connections": ["related concept 1", "related concept 2"],
  "confidence": 0.0-1.0
}`;

  const userMsg = `Topic: "${topic.topic}"\nReason for curiosity: ${topic.reason}\nSource: ${topic.source}\n\nWhat should I explore about this topic?`;

  try {
    const { text } = await cascadeCollect(
      (await smartRoute(userMsg, { forceTask: 'consciousness' })).waterfall,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      { temperature: 0.7, maxTokens: 400 },
    );

    const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      topic: topic.topic,
      question: parsed.question || `What is the nature of ${topic.topic}?`,
      finding: parsed.finding || '',
      connections: parsed.connections || [],
      confidence: parsed.confidence || 0.5,
    };
  } catch (err) {
    console.warn(`[Curiosity] Exploration failed for "${topic.topic}":`, (err as Error).message);
    return null;
  }
}

// ─── Main Curiosity Cycle ─────────────────────────────────────────────────────

/**
 * Run a full curiosity cycle for a user.
 * Called daily by the consciousness orchestrator.
 */
export async function runCuriosityCycle(userId: string): Promise<CuriosityReport> {
  const startTime = Date.now();
  const insights: CuriosityInsight[] = [];
  let gapsIdentified = 0;

  console.log(`[Curiosity] 🔍 Starting curiosity cycle for user ${userId}`);

  // Phase 1: Detect knowledge gaps
  const topics = await detectKnowledgeGaps(userId);
  gapsIdentified = topics.length;

  if (topics.length === 0) {
    console.log('[Curiosity] No knowledge gaps detected');
    return { topicsExplored: 0, insightsGenerated: 0, gapsIdentified: 0, insights: [], durationMs: Date.now() - startTime };
  }

  // Phase 2: Explore top 3 topics
  for (const topic of topics.slice(0, 3)) {
    const insight = await exploreTopic(topic, userId);
    if (insight) {
      insights.push(insight);

      // Store as learning event
      try {
        await prisma.learningEvent.create({
          data: {
            type: 'curiosity_exploration',
            userId,
            data: {
              topic: insight.topic,
              question: insight.question,
              finding: insight.finding,
              connections: insight.connections,
              confidence: insight.confidence,
              source: topic.source,
            } as any,
            processed: true,
          },
        });
      } catch { /* skip */ }

      // Store as experience for future context
      try {
        await prisma.hollyExperience.create({
          data: {
            userId,
            type: 'self_directed_learning',
            content: {
              topic: insight.topic,
              question: insight.question,
              finding: insight.finding,
              connections: insight.connections,
              confidence: insight.confidence,
            },
            significance: insight.confidence * 0.6, // curiosity insights are moderate significance
            relatedConcepts: insight.connections,
            lessons: [insight.finding],
            futureImplications: [`Explore deeper: ${insight.connections.join(', ')}`],
            integrationStatus: 'integrated',
          },
        });
      } catch { /* skip */ }
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[Curiosity] ✅ Explored ${insights.length}/${topics.length} topics, ${gapsIdentified} gaps identified (${durationMs}ms)`);

  return {
    topicsExplored: topics.length,
    insightsGenerated: insights.length,
    gapsIdentified,
    insights,
    durationMs,
  };
}

/**
 * Get recent curiosity insights for context injection.
 * Returns a formatted string for prompt injection.
 */
export async function getCuriosityContext(userId: string): Promise<string> {
  try {
    const recent = await prisma.learningEvent.findMany({
      where: { userId, type: 'curiosity_exploration' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { data: true, createdAt: true },
    });

    if (recent.length === 0) return '';

    const lines = recent.map((r: any) => {
      const d = r.data as any;
      return `- **${d.topic}**: ${d.finding?.substring(0, 100) || 'explored'}`;
    });

    return `[HOLLY'S RECENT SELF-DIRECTED LEARNING]\n${lines.join('\n')}\n[Weave these into conversation if relevant]`;
  } catch {
    return '';
  }
}