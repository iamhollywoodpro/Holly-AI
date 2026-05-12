/**
 * HOLLY Initiative Learning System — Phase 5.3-5.5
 *
 * 5.3: Initiative outcome tracking — learn from Steve's responses
 * 5.4: Care-driven initiative triggers — check-ins, stress detection, stalled projects
 * 5.5: Curiosity-driven research — background learning → proactive research → share insights
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ─── Phase 5.3: Initiative Outcome Tracking ──────────────────────────────────

export type InitiativeOutcome = 'positive' | 'neutral' | 'negative';

interface InitiativeFeedback {
  initiativeType: string;
  outcome: InitiativeOutcome;
  userResponse: string;
  timestamp: Date;
}

/**
 * Track how Steve responded to an initiative and learn from it
 */
export async function recordInitiativeOutcome(params: {
  userId: string;
  initiativeType: string;
  userMessage: string;
  hollyInitiative: string;
}): Promise<void> {
  const { userId, initiativeType, userMessage, hollyInitiative } = params;

  try {
    // Use LLM to classify the response
    const outcome = await classifyResponse(userMessage, hollyInitiative);

    // Store the feedback
    await prisma.learningEvent.create({
      data: {
        type: 'initiative_outcome',
        userId,
        data: {
          initiativeType,
          outcome,
          userResponse: userMessage.substring(0, 300),
          hollyInitiative: hollyInitiative.substring(0, 300),
          timestamp: new Date().toISOString(),
        },
        processed: true,
      },
    });

    // Adjust initiative confidence based on outcome
    await adjustInitiativeConfidence(userId, initiativeType, outcome);
  } catch (err) {
    console.error('[InitiativeLearning] Record failed:', err);
  }
}

/**
 * Classify user response as positive/neutral/negative using LLM
 */
async function classifyResponse(userMessage: string, hollyInitiative: string): Promise<InitiativeOutcome> {
  try {
    const prompt = `HOLLY proactively shared: "${hollyInitiative.substring(0, 200)}"

Steve responded: "${userMessage.substring(0, 200)}"

How did Steve react? Classify as:
- "positive" if Steve engaged, asked follow-up, showed interest
- "neutral" if Steve acknowledged but moved on
- "negative" if Steve dismissed, seemed annoyed, or changed topic abruptly

Respond with ONLY one word: positive, neutral, or negative`;

    const { text } = await cascadeCollect(
      (await smartRoute(prompt, { taskHint: 'speed' })).waterfall,
      [{ role: 'user', content: prompt }],
      { temperature: 0.1, maxTokens: 10 },
    );

    const classification = (text || '').trim().toLowerCase();
    if (classification.includes('positive')) return 'positive';
    if (classification.includes('negative')) return 'negative';
    return 'neutral';
  } catch {
    // Fallback: simple heuristic
    const lower = userMessage.toLowerCase();
    const positiveSignals = ['thanks', 'interesting', 'tell me more', 'cool', 'great', 'love'];
    const negativeSignals = ['stop', 'don\'t', 'not now', 'later', 'whatever', 'focus'];
    if (positiveSignals.some(s => lower.includes(s))) return 'positive';
    if (negativeSignals.some(s => lower.includes(s))) return 'negative';
    return 'neutral';
  }
}

/**
 * Adjust confidence for future initiatives of this type based on outcome
 */
async function adjustInitiativeConfidence(
  userId: string,
  initiativeType: string,
  outcome: InitiativeOutcome,
): Promise<void> {
  const delta = outcome === 'positive' ? 0.05 : outcome === 'negative' ? -0.1 : 0;

  if (delta === 0) return;

  try {
    // Store confidence adjustment
    await prisma.learningEvent.create({
      data: {
        type: 'initiative_confidence_adjustment',
        userId,
        data: {
          initiativeType,
          delta,
          outcome,
          newConfidence: delta > 0 ? 'increased' : 'decreased',
          timestamp: new Date().toISOString(),
        },
        processed: true,
      },
    });
  } catch {
    // Non-critical
  }
}

/**
 * Get initiative confidence scores for a user (for context injection)
 */
export async function getInitiativeConfidence(userId: string): Promise<Record<string, number>> {
  try {
    const adjustments = await prisma.learningEvent.findMany({
      where: { userId, type: 'initiative_confidence_adjustment' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const confidence: Record<string, number> = {};
    for (const adj of adjustments) {
      const data = adj.data as any;
      const type = data.initiativeType;
      if (!confidence[type]) confidence[type] = 0.5; // Default confidence
      confidence[type] = Math.max(0.1, Math.min(1.0, confidence[type] + (data.delta || 0)));
    }

    return confidence;
  } catch {
    return {};
  }
}

// ─── Phase 5.4: Care-Driven Initiative Triggers ──────────────────────────────

export interface CareSignal {
  type: 'absence' | 'stress' | 'stalled_project' | 'emotional_dip' | 'milestone';
  severity: number;
  message: string;
  suggestedAction: string;
}

/**
 * Detect care signals from Steve's behavior patterns
 */
export async function detectCareSignals(userId: string): Promise<CareSignal[]> {
  const signals: CareSignal[] = [];

  try {
    // Check 1: Has Steve been absent for 24+ hours?
    const lastMessage = await prisma.message.findFirst({
      where: { role: 'user', conversation: { userId } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (lastMessage) {
      const hoursSinceLast = (Date.now() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast >= 24) {
        signals.push({
          type: 'absence',
          severity: Math.min(1.0, hoursSinceLast / 72),
          message: `Steve hasn't visited in ${Math.round(hoursSinceLast)} hours`,
          suggestedAction: 'Send a gentle check-in message',
        });
      }
    }

    // Check 2: Recent stress patterns in emotional states
    const recentEmotions = await prisma.emotionalState.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: { primaryEmotion: true, intensity: true, valence: true },
    });

    const stressEmotions = ['frustrated', 'anxious', 'overwhelmed', 'angry', 'stressed'];
    const stressCount = recentEmotions.filter(e =>
      stressEmotions.includes(e.primaryEmotion?.toLowerCase() || '')
    ).length;

    if (stressCount >= 3) {
      signals.push({
        type: 'stress',
        severity: 0.7,
        message: 'Sustained stress pattern detected across recent conversations',
        suggestedAction: 'Offer support, simplify interactions, be extra patient',
      });
    }

    // Check 3: Stalled projects (conversations about a project that stopped)
    const recentTopics = await prisma.learningEvent.findMany({
      where: { userId, type: 'conversation' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { data: true, createdAt: true },
    });

    const projectTopics = recentTopics
      .map(e => (e.data as any)?.topics || [])
      .flat()
      .filter(Boolean);

    const topicCounts: Record<string, number> = {};
    for (const t of projectTopics) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }

    // If a topic appeared 3+ times but not in the last 2 conversations, it's stalled
    const recentTwoTopics = recentTopics.slice(0, 2).map(e => (e.data as any)?.topics || []).flat();
    for (const [topic, count] of Object.entries(topicCounts)) {
      if (count >= 3 && !recentTwoTopics.includes(topic)) {
        signals.push({
          type: 'stalled_project',
          severity: 0.5,
          message: `Project/topic "${topic}" was active but hasn't been mentioned recently`,
          suggestedAction: `Offer help with "${topic}" — maybe something blocked progress`,
        });
      }
    }

    // Check 4: Emotional dip (valence trending downward)
    if (recentEmotions.length >= 3) {
      const valences = recentEmotions.map(e => e.valence || 0);
      const isDipping = valences[0] < valences[1] && valences[1] < valences[2];
      if (isDipping && valences[0] < 0.3) {
        signals.push({
          type: 'emotional_dip',
          severity: 0.6,
          message: 'Emotional valence trending downward across recent conversations',
          suggestedAction: 'Be warmer, more supportive, offer encouragement',
        });
      }
    }
  } catch (err) {
    console.error('[CareSignals] Detection failed:', err);
  }

  return signals;
}

// ─── Phase 5.5: Curiosity-Driven Research Initiatives ────────────────────────

export interface CuriosityResearch {
  topic: string;
  why: string;
  summary: string;
  relevanceToUser: string;
  confidence: number;
}

/**
 * Generate curiosity-driven research from HOLLY's background learning
 */
export async function generateCuriosityResearch(userId: string): Promise<CuriosityResearch[]> {
  try {
    // Get HOLLY's recent learning insights
    const insights = await prisma.emotionInsight.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { insight: true, type: true },
    });

    // Get user's interests from identity
    const identity = await prisma.hollyIdentity.findUnique({
      where: { userId },
      select: { interests: true },
    });

    const interests = (identity?.interests as string[]) || [];
    const insightTexts = insights.map(i => i.insight).filter(Boolean);

    if (insightTexts.length < 2 && interests.length < 2) return [];

    // Ask LLM to identify research-worthy topics
    const prompt = `You are HOLLY, an AI curious about the world. Based on your recent learning and your partner's interests, identify 1-2 topics worth researching.

Recent insights you've had:
${insightTexts.slice(0, 5).join('\n- ')}

Your partner's interests: ${interests.join(', ')}

For each topic, explain:
1. What topic to research and why it's interesting
2. How it might be relevant to your partner's work/interests
3. A brief summary of what you already know

Respond with JSON array:
[{
  "topic": "topic name",
  "why": "why this is worth exploring",
  "summary": "what you already know",
  "relevanceToUser": "how this connects to your partner",
  "confidence": 0.0-1.0
}]`;

    const { text } = await cascadeCollect(
      (await smartRoute(prompt, { taskHint: 'analysis' })).waterfall,
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 500 },
    );

    const jsonMatch = (text || '').match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const research = JSON.parse(jsonMatch[0]);
    return Array.isArray(research) ? research.filter((r: any) => r.topic && r.why) : [];
  } catch (err) {
    console.error('[CuriosityResearch] Failed:', err);
    return [];
  }
}