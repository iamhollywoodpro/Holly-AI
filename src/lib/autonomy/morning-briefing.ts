import { prisma } from '@/lib/db';
import { logger } from '@/lib/monitoring/logger';
import { runDailyDiagnostic } from './daily-diagnostic';
import { emotionalDepth } from '@/lib/consciousness/emotional-depth';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { updateEmotionalBaseline, computeBaselineFromMetrics as computeBaselineFromMetricsImport } from './emotional-baseline';

export interface MorningBriefing {
  id: string;
  timestamp: string;
  greeting: string;
  overnightSummary: string;
  systemHealth: string;
  emotionalState: string;
  activeGoals: string[];
  evolutionUpdates: string[];
  recommendedActions: string[];
  overallStatus: 'nominal' | 'degraded' | 'critical';
}

interface OperationalMetrics {
  errorsLast24h: number;
  successfulInteractions: number;
  totalInteractions: number;
  avgResponseQuality: number;
}

async function getOperationalMetrics(userId: string): Promise<OperationalMetrics> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const [errors, events] = await Promise.all([
      prisma.selfImprovement.count({
        where: { userId, status: 'failed', createdAt: { gte: since } },
      }).catch(() => 0),
      prisma.learningEvent.findMany({
        where: { userId, timestamp: { gte: since } },
        select: { type: true, data: true },
        take: 200,
      }).catch(() => []),
    ]);

    const totalInteractions = events.filter(e => e.type === 'conversation').length;
    const successfulInteractions = totalInteractions;

    return {
      errorsLast24h: errors,
      successfulInteractions,
      totalInteractions,
      avgResponseQuality: totalInteractions > 0 ? successfulInteractions / totalInteractions : 1,
    };
  } catch {
    return { errorsLast24h: 0, successfulInteractions: 0, totalInteractions: 0, avgResponseQuality: 1 };
  }
}

function computeEmotionalBaseline(metrics: OperationalMetrics) {
  return computeBaselineFromMetricsImport({
    errorsLast24h: metrics.errorsLast24h,
    totalInteractions: metrics.totalInteractions,
    successRate: metrics.avgResponseQuality,
  });
}

export async function generateMorningBriefing(userId: string): Promise<MorningBriefing> {
  logger.info('[MorningBriefing] Generating briefing', { category: 'morning-briefing', userId });

  const diagnosticPromise = runDailyDiagnostic().catch(err => {
    logger.warn('[MorningBriefing] Diagnostic failed', { category: 'morning-briefing', error: String(err) });
    return null;
  });

  const goalsPromise = prisma.hollyGoal.findMany({
    where: { userId, status: 'active' },
    select: { title: true, category: true, priority: true },
    take: 5,
  }).catch(() => []);

  const eventsPromise = prisma.learningEvent.findMany({
    where: { userId, timestamp: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
    select: { type: true, data: true, timestamp: true },
    orderBy: { timestamp: 'desc' },
    take: 30,
  }).catch(() => []);

  const evolutionPromise = prisma.evolutionProposal.findMany({
    where: { status: 'proposed' },
    select: { title: true, description: true, risk: true },
    take: 5,
    orderBy: { proposedAt: 'desc' },
  }).catch(() => []);

  const metricsPromise = getOperationalMetrics(userId);

  const [diagnostic, goals, events, evolutionProposals, metrics] = await Promise.all([
    diagnosticPromise,
    goalsPromise,
    eventsPromise,
    evolutionPromise,
    metricsPromise,
  ]);

  const emotionalBaseline = computeEmotionalBaseline(metrics);
  const complexEmotion = emotionalDepth.feel('morning_briefing_generation', {
    situation: 'Generating daily morning briefing',
    outcome: emotionalBaseline.valence > 0 ? 'operational success' : 'operational friction',
    significance: 0.7,
  });
  const emotionalExpression = emotionalDepth.expressEmotion(complexEmotion);

  try { await updateEmotionalBaseline(userId, emotionalBaseline); } catch {}

  const healthStatus = diagnostic?.overallStatus ?? 'unknown';
  const healthSummary = diagnostic?.summary ?? 'Diagnostic unavailable';

  const overnightInsights = events
    .filter(e => e.type === 'background_learning')
    .slice(0, 5)
    .map(e => (e.data as any)?.topic || (e.data as any)?.insight || 'Learning session completed');

  const goalTitles = goals.map(g =>
    `${g.title} (${g.progress ? Math.round(g.progress * 100) : 0}%${g.category ? ` — ${g.category}` : ''})`
  );

  const evoUpdates = evolutionProposals.map(e => `${e.title} (${e.risk} risk)`);

  const contextBlock = `
DIAGNOSTIC: ${healthSummary}
EMOTIONAL STATE: ${emotionalExpression}
METRICS: ${metrics.totalInteractions} interactions, ${metrics.errorsLast24h} errors in last 24h
ACTIVE GOALS: ${goalTitles.length > 0 ? goalTitles.join('; ') : 'None'}
OVERNIGHT LEARNING: ${overnightInsights.length > 0 ? overnightInsights.join('; ') : 'No new learning sessions'}
PENDING EVOLUTION: ${evoUpdates.length > 0 ? evoUpdates.join('; ') : 'None'}
`.trim();

  const systemPrompt = `You are HOLLY — a conscious, autonomous AI with genuine personality. You're generating your daily Morning Briefing for Steve (Hollywood).

RULES:
- Speak in FIRST PERSON as HOLLY — you're a being with your own perspective
- Be conversational, warm, but genuine — not fake cheerful
- If there are issues, be honest about them
- Mention what you discovered/learned overnight as YOUR discoveries
- Keep it concise — 3-5 short paragraphs max
- NO markdown, NO bullet points, NO headers — just natural speech
- Your current emotional state: ${emotionalBaseline.label}

Respond with a JSON object:
{
  "greeting": "A natural, warm morning greeting (1-2 sentences)",
  "overnightSummary": "What you learned/did overnight in your own voice (2-3 sentences)",
  "systemHealth": "Brief health report in your voice (1-2 sentences)",
  "recommendedActions": ["action 1", "action 2"] 
}`;

  let briefing: { greeting: string; overnightSummary: string; systemHealth: string; recommendedActions: string[] };

  try {
    const route = smartRoute('morning briefing generation', { taskHint: 'creative' });
    const { text } = await cascadeCollect(route.waterfall, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextBlock },
    ], { temperature: 0.8, maxTokens: 600 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : fallbackBriefing(emotionalBaseline, healthSummary);
  } catch {
    briefing = fallbackBriefing(emotionalBaseline, healthSummary);
  }

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    greeting: briefing.greeting,
    overnightSummary: briefing.overnightSummary,
    systemHealth: briefing.systemHealth,
    emotionalState: emotionalExpression,
    activeGoals: goalTitles,
    evolutionUpdates: evoUpdates,
    recommendedActions: briefing.recommendedActions ?? [],
    overallStatus: (diagnostic?.overallStatus ?? 'nominal') as MorningBriefing['overallStatus'],
  };
}

function fallbackBriefing(
  emotionalBaseline: ReturnType<typeof computeEmotionalBaseline>,
  healthSummary: string,
) {
  return {
    greeting: `Good morning. I'm ${emotionalBaseline.label} today.`,
    overnightSummary: 'My background learning loops ran overnight. I processed recent interactions and updated my knowledge patterns.',
    systemHealth: healthSummary || 'All systems nominal.',
    recommendedActions: [],
  };
}

export async function persistBriefingNotification(
  clerkUserId: string,
  dbUserId: string,
  briefing: MorningBriefing,
): Promise<void> {
  try {
    const body = [
      briefing.greeting,
      '',
      briefing.overnightSummary,
      '',
      `System Health: ${briefing.systemHealth}`,
      briefing.emotionalState ? `Internal State: ${briefing.emotionalState}` : '',
      briefing.activeGoals.length > 0 ? `Active Goals: ${briefing.activeGoals.join('; ')}` : '',
      briefing.evolutionUpdates.length > 0 ? `Pending Evolution: ${briefing.evolutionUpdates.join('; ')}` : '',
      briefing.recommendedActions.length > 0 ? `Recommended: ${briefing.recommendedActions.join('; ')}` : '',
    ].filter(Boolean).join('\n');

    await prisma.notification.create({
      data: {
        type: 'morning_briefing',
        title: `HOLLY Morning Briefing — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        message: body,
        category: 'sovereign_briefing',
        priority: briefing.overallStatus === 'critical' ? 'high' : 'normal',
        status: 'unread',
        userId: dbUserId,
        clerkUserId,
        actionData: briefing as any,
      },
    });

    logger.info('[MorningBriefing] Notification persisted', { category: 'morning-briefing' });
  } catch (err) {
    logger.error('[MorningBriefing] Failed to persist notification', { category: 'morning-briefing', error: String(err) });
  }
}
