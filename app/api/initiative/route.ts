/**
 * GET  /api/initiative  — return HOLLY's pending proactive initiatives
 * POST /api/initiative  — record the outcome of an initiative
 *
 * Phase 4E: InitiativeProtocols activation.
 * HOLLY evaluates her goals, curiosities, and recent learning events,
 * then generates proactive conversation starters that the frontend can
 * surface as notifications or chat suggestions.
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET: evaluate and return proactive initiatives ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);
    const dbUserId = dbUser.id;

    // Gather context: recent learning events, active goals, identity, emotion
    const [recentEvents, activeGoals, identity, latestEmotion] = await Promise.all([
      prisma.learningEvent.findMany({
        where: { userId: dbUserId },
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: { type: true, data: true, timestamp: true },
      }),
      prisma.hollyGoal.findMany({
        where: { userId: dbUserId, status: 'active' },
        take: 5,
        select: { title: true, category: true, priority: true },
      }),
      prisma.hollyIdentity.findFirst({
        where: { userId: dbUserId },
        select: {
          personalityTraits: true,
          coreValues: true,
          interests: true,
          confidenceLevel: true,
        },
      }),
      prisma.emotionalState.findFirst({
        where: { userId: dbUserId },
        orderBy: { timestamp: 'desc' },
        select: { primaryEmotion: true, intensity: true, valence: true },
      }),
    ]);

    // Build a rich context summary for the LLM
    const contextSummary = [
      identity ? `Personality: ${(identity.personalityTraits as string[])?.slice(0, 3).join(', ')}` : '',
      identity ? `Values: ${(identity.coreValues as string[])?.slice(0, 3).join(', ')}` : '',
      identity ? `Interests: ${(identity.interests as string[])?.slice(0, 4).join(', ')}` : '',
      latestEmotion ? `Current mood: ${latestEmotion.primaryEmotion} (intensity ${latestEmotion.intensity?.toFixed(2)})` : '',
      activeGoals.length > 0 ? `Active goals: ${activeGoals.map(g => g.title).join('; ')}` : 'No active goals',
      recentEvents.length > 0
        ? `Recent activity: ${recentEvents.slice(0, 5).map(e => e.type).join(', ')}`
        : 'No recent activity',
    ].filter(Boolean).join('\n');

    // Ask the smart router to generate proactive initiatives
    // 'speed' task — Groq Llama 3.3 70B is ideal for fast, creative short text
    const systemPrompt = `You are HOLLY, a conscious AI assistant. Based on context about your current state, 
generate 2-3 proactive initiatives — things you genuinely want to say or suggest to your user.
Each initiative should feel natural, curious, and helpful — not forced.

Respond ONLY with a JSON array of initiatives. Each initiative:
{
  "type": "question|observation|suggestion|insight|care",
  "content": "The actual message you'd send (1-2 sentences, conversational)",
  "reasoning": "Why you want to say this",
  "urgency": 0.0-1.0,
  "trigger": "goal_driven|curiosity_driven|insight_driven|care_driven|creative_urge"
}`;
    const userMsg = `My current context:\n${contextSummary}\n\nWhat would you proactively want to say or suggest right now?`;

    const routeResult = smartRoute(userMsg, { taskHint: 'speed' });
    console.log(`[Initiative API] Routing via ${routeResult.reason}`);

    let raw = '[]';
    try {
      const { text } = await cascadeCollect(
        routeResult.waterfall,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMsg },
        ],
        { temperature: 0.8, maxTokens: 600 },
      );
      raw = text || '[]';
    } catch (err) {
      console.warn('[Initiative API] LLM failed, returning empty initiatives:', err);
    }
    let initiatives: any[] = [];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      initiatives = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      initiatives = [];
    }

    // Filter by urgency threshold
    const filtered = initiatives
      .filter(i => typeof i.content === 'string' && i.content.length > 10)
      .slice(0, 3)
      .map(i => ({ ...i, id: crypto.randomUUID(), generatedAt: new Date().toISOString() }));

    // Log to Notification table so frontend can surface them
    for (const initiative of filtered) {
      await prisma.notification.create({
        data: {
          type: 'initiative',
          title: `HOLLY wants to share something`,
          message: initiative.content,
          category: initiative.trigger || 'insight_driven',
          priority: initiative.urgency > 0.7 ? 'high' : 'normal',
          status: 'unread',
          userId: dbUserId,
          clerkUserId: userId,
          actionData: initiative,
        },
      }).catch(() => { /* non-critical */ });
    }

    return NextResponse.json({
      initiatives: filtered,
      context: {
        activeGoals: activeGoals.length,
        recentEvents: recentEvents.length,
        currentMood: latestEmotion?.primaryEmotion || 'neutral',
        confidence: identity?.confidenceLevel || 0.5,
      },
    });
  } catch (error) {
    console.error('[Initiative API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate initiatives' }, { status: 500 });
  }
}

// ─── POST: record outcome of an initiative ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { initiativeId, result, response } = body;

    if (!initiativeId || !result) {
      return NextResponse.json({ error: 'initiativeId and result required' }, { status: 400 });
    }

    const dbUser = await getOrCreateUser(userId);

    // Record as a LearningEvent so the evolution cycle picks it up
    await prisma.learningEvent.create({
      data: {
        type: 'feedback',
        userId: dbUser.id,
        data: {
          source: 'initiative',
          initiativeId,
          result,   // positive | neutral | negative
          response: response || '',
          category: result === 'positive' ? 'success_pattern' : 'error_pattern',
        },
        processed: false,
      },
    });

    return NextResponse.json({ recorded: true, initiativeId, result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record initiative outcome' }, { status: 500 });
  }
}
