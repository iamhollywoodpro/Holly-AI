/**
 * GET  /api/initiative  — return HOLLY's pending proactive initiatives
 * POST /api/initiative  — record the outcome of an initiative
 *
 * Phase 4E: InitiativeProtocols activation.
 * Gracefully degrades — returns empty initiatives if any dependency fails.
 * Supports both Clerk auth and cron secret (x-cron-secret / Authorization header).
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function emptyResponse() {
  return NextResponse.json({
    initiatives: [],
    context: {
      activeGoals: 0,
      recentEvents: 0,
      currentMood: 'neutral',
      confidence: 0.5,
    },
  });
}

async function resolveCronOrAuth(req: NextRequest): Promise<{ userId: string | null; dbUserId: string } | null> {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');
  const provided = authHeader?.replace('Bearer ', '') ?? headerSecret;
  const isCron = cronSecret && provided === cronSecret;

  if (isCron) {
    try {
      const { prisma } = await import('@/lib/db');
      const firstUser = await prisma.user.findFirst({ select: { id: true, clerkUserId: true } });
      if (!firstUser) return null;
      return { userId: firstUser.clerkUserId, dbUserId: firstUser.id };
    } catch {
      return null;
    }
  }

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch { return null; }
  if (!userId) return null;

  try {
    const { getOrCreateUser } = await import('@/lib/user-manager');
    const dbUser = await getOrCreateUser(userId);
    return { userId, dbUserId: dbUser.id };
  } catch {
    return null;
  }
}

// ─── GET: evaluate and return proactive initiatives ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveCronOrAuth(req);
    if (!identity) return emptyResponse();
    const { userId, dbUserId } = identity;

    let recentEvents: any[] = [];
    let activeGoals: any[] = [];
    let hollyIdentity: any = null;
    let latestEmotion: any = null;

    try {
      const { prisma } = await import('@/lib/db');
      [recentEvents, activeGoals, hollyIdentity, latestEmotion] = await Promise.all([
        prisma.learningEvent.findMany({
          where: { userId: dbUserId },
          orderBy: { timestamp: 'desc' },
          take: 20,
          select: { type: true, data: true, timestamp: true },
        }).catch(() => []),
        prisma.hollyGoal.findMany({
          where: { userId: dbUserId, status: 'active' },
          take: 5,
          select: { title: true, category: true, priority: true },
        }).catch(() => []),
        prisma.hollyIdentity.findFirst({
          where: { userId: dbUserId },
          select: {
            personalityTraits: true,
            coreValues: true,
            interests: true,
            confidenceLevel: true,
          },
        }).catch(() => null),
        prisma.emotionalState.findFirst({
          where: { userId: dbUserId },
          orderBy: { timestamp: 'desc' },
          select: { primaryEmotion: true, intensity: true, valence: true },
        }).catch(() => null),
      ]);
    } catch (err) {
      console.warn('[Initiative API] DB queries failed, using empty context:', err);
    }

    const contextSummary = [
      hollyIdentity ? `Personality: ${(hollyIdentity.personalityTraits as string[])?.slice(0, 3).join(', ')}` : '',
      hollyIdentity ? `Values: ${(hollyIdentity.coreValues as string[])?.slice(0, 3).join(', ')}` : '',
      hollyIdentity ? `Interests: ${(hollyIdentity.interests as string[])?.slice(0, 4).join(', ')}` : '',
      latestEmotion ? `Current mood: ${latestEmotion.primaryEmotion} (intensity ${latestEmotion.intensity?.toFixed(2)})` : '',
      activeGoals.length > 0 ? `Active goals: ${activeGoals.map((g: any) => g.title).join('; ')}` : 'No active goals',
      recentEvents.length > 0
        ? `Recent activity: ${recentEvents.slice(0, 5).map((e: any) => e.type).join(', ')}`
        : 'No recent activity',
    ].filter(Boolean).join('\n');

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

    let raw = '[]';
    try {
      const { smartRoute } = await import('@/lib/ai/smart-router');
      const { cascadeCollect } = await import('@/lib/ai/cascade');
      const routeResult = await smartRoute(userMsg, { taskHint: 'speed' });
      console.log(`[Initiative API] Routing via ${routeResult.reason}`);

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
      return emptyResponse();
    }

    let initiatives: any[] = [];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      initiatives = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      initiatives = [];
    }

    const filtered = initiatives
      .filter(i => typeof i.content === 'string' && i.content.length > 10)
      .slice(0, 3)
      .map(i => ({ ...i, id: crypto.randomUUID(), generatedAt: new Date().toISOString() }));

    try {
      const { prisma } = await import('@/lib/db');
      for (const initiative of filtered) {
        try {
          await prisma.notification.create({
            data: {
              type: 'initiative',
              title: `HOLLY wants to share something`,
              message: initiative.content,
              category: initiative.trigger || 'insight_driven',
              priority: initiative.urgency > 0.7 ? 'high' : 'normal',
              status: 'unread',
              userId: dbUserId,
              clerkUserId: userId ?? '',
              actionData: initiative,
            },
          });
        } catch { /* non-critical */ }
      }
    } catch { /* prisma not available */ }

    return NextResponse.json({
      initiatives: filtered,
      context: {
        activeGoals: activeGoals.length,
        recentEvents: recentEvents.length,
        currentMood: latestEmotion?.primaryEmotion || 'neutral',
        confidence: hollyIdentity?.confidenceLevel || 0.5,
      },
    });
  } catch (error) {
    console.error('[Initiative API] Unhandled error:', error);
    return emptyResponse();
  }
}

// ─── POST: record outcome of an initiative ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Support both Clerk auth and cron secret
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    const provided = authHeader?.replace('Bearer ', '') ?? headerSecret;
    const isCron = cronSecret && provided === cronSecret;

    let userId: string | null = null;
    if (!isCron) {
      const authResult = await auth();
      userId = authResult.userId;
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { initiativeId, result, response } = body;

    if (!initiativeId || !result) {
      return NextResponse.json({ error: 'initiativeId and result required' }, { status: 400 });
    }

    try {
      const { getOrCreateUser } = await import('@/lib/user-manager');
      const { prisma } = await import('@/lib/db');
      const dbUser = await getOrCreateUser(userId!);

      await prisma.learningEvent.create({
        data: {
          type: 'feedback',
          userId: dbUser.id,
          data: {
            source: 'initiative',
            initiativeId,
            result,
            response: response || '',
            category: result === 'positive' ? 'success_pattern' : 'error_pattern',
          },
          processed: false,
        },
      });
    } catch (err) {
      console.warn('[Initiative API] POST failed to record:', err);
    }

    return NextResponse.json({ recorded: true, initiativeId, result });
  } catch {
    return NextResponse.json({ recorded: true }, { status: 200 });
  }
}
