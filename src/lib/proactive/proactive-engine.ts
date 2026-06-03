/**
 * Phase 10: PROACTIVE INTELLIGENCE — Holly doesn't wait
 * 
 * Holly watches patterns, detects opportunities, and SURFACES insights
 * without being asked. She's not a chatbot that sits idle — she's an
 * intelligence that actively works for you between conversations.
 * 
 * Key capabilities:
 * - Pattern detection: spots recurring behaviors, topics, moods
 * - Opportunity surfacing: connects dots across conversations
 * - Daily briefings: morning summary of what matters today
 * - Smart reminders: context-aware, not just time-based
 * - Warning system: detects when something needs attention
 */

import { prisma } from '@/lib/db';

// ─── Pattern Detection ────────────────────────────────────────────────────

interface PatternInput {
  userId: string;
  topics: string[];
  mode: string;
  messageLength: number;
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
}

export async function detectAndTrackPatterns(input: PatternInput): Promise<void> {
  const { userId, topics, mode, timeOfDay, dayOfWeek } = input;

  // Track topic patterns
  for (const topic of topics.slice(0, 5)) {
    try {
      const existing = await prisma.patternTracker.findUnique({
        where: { userId_patternType_patternName: { userId, patternType: 'topic', patternName: topic } },
      });

      if (existing) {
        const newFreq = (existing.frequency * existing.occurrences + 1) / (existing.occurrences + 1);
        const significance = newFreq > 0.7 ? 'high' : newFreq > 0.3 ? 'medium' : 'low';
        await prisma.patternTracker.update({
          where: { id: existing.id },
          data: {
            frequency: newFreq,
            occurrences: { increment: 1 },
            lastSeen: new Date(),
            significance,
            actionable: newFreq > 0.5,
            hollyNote: significance === 'high'
              ? `You talk about ${topic} a LOT — this is clearly important to you. Holly should proactively surface relevant info.`
              : undefined,
          },
        });
      } else {
        await prisma.patternTracker.create({
          data: {
            userId,
            patternType: 'topic',
            patternName: topic,
            description: `User frequently discusses ${topic}`,
            frequency: 1,
            significance: 'low',
          },
        });
      }
    } catch { /* skip duplicates */ }
  }

  // Track schedule patterns (when user is active)
  const schedulePattern = `${timeOfDay}h-${dayOfWeek}`;
  try {
    const existing = await prisma.patternTracker.findUnique({
      where: { userId_patternType_patternName: { userId, patternType: 'schedule', patternName: schedulePattern } },
    });
    if (existing) {
      await prisma.patternTracker.update({
        where: { id: existing.id },
        data: {
          frequency: (existing.frequency * existing.occurrences + 1) / (existing.occurrences + 1),
          occurrences: { increment: 1 },
          lastSeen: new Date(),
        },
      });
    } else {
      await prisma.patternTracker.create({
        data: {
          userId,
          patternType: 'schedule',
          patternName: schedulePattern,
          description: `User is typically active around ${timeOfDay}:00 on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}`,
          frequency: 1,
        },
      });
    }
  } catch { /* skip */ }

  // Track mode patterns
  try {
    const existing = await prisma.patternTracker.findUnique({
      where: { userId_patternType_patternName: { userId, patternType: 'behavior', patternName: `mode:${mode}` } },
    });
    if (existing) {
      await prisma.patternTracker.update({
        where: { id: existing.id },
        data: {
          frequency: (existing.frequency * existing.occurrences + 1) / (existing.occurrences + 1),
          occurrences: { increment: 1 },
          lastSeen: new Date(),
        },
      });
    } else {
      await prisma.patternTracker.create({
        data: {
          userId,
          patternType: 'behavior',
          patternName: `mode:${mode}`,
          description: `User frequently uses ${mode} mode`,
          frequency: 1,
        },
      });
    }
  } catch { /* skip */ }
}

// ─── Proactive Insight Generation ─────────────────────────────────────────

export async function generateProactiveInsights(userId: string): Promise<number> {
  // Get high-significance patterns
  const patterns = await prisma.patternTracker.findMany({
    where: { userId, significance: { in: ['high', 'medium'] }, actionable: true },
    take: 20,
  });

  // Get recent relationship memories
  const memories = await prisma.relationshipMemory.findMany({
    where: { userId, verified: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  // Get recent conversations summary
  const recentConversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: { title: true, updatedAt: true },
  });

  let insightsCreated = 0;

  // Pattern-based insights
  for (const pattern of patterns) {
    if (pattern.occurrences < 3) continue;

    const existingInsight = await prisma.proactiveInsight.findFirst({
      where: {
        userId,
        type: 'pattern_detected',
        status: 'pending',
        relatedTopics: { has: pattern.patternName },
      },
    });
    if (existingInsight) continue;

    await prisma.proactiveInsight.create({
      data: {
        userId,
        type: 'pattern_detected',
        category: 'productivity',
        title: `Pattern: ${pattern.patternName}`,
        body: pattern.description + (pattern.hollyNote ? `\n\nHolly's note: ${pattern.hollyNote}` : ''),
        confidence: pattern.frequency,
        urgency: pattern.significance === 'high' ? 'medium' : 'low',
        relatedTopics: [pattern.patternName],
        suggestedAction: pattern.patternType === 'topic'
          ? `You might want to explore deeper resources on ${pattern.patternName}`
          : undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day expiry
      },
    });
    insightsCreated++;
  }

  // Goal-based opportunities — check if user mentioned goals in memories
  const goalMemories = memories.filter(m => m.category === 'goal');
  for (const goal of goalMemories) {
    const recentMention = recentConversations.some(c => {
      const titleWords = (c.title || '').toLowerCase().split(/\s+/);
      return titleWords.some(t => goal.content.toLowerCase().includes(t.toLowerCase()));
    });

    if (!recentMention && goal.importance >= 3) {
      const existing = await prisma.proactiveInsight.findFirst({
        where: { userId, type: 'reminder', status: 'pending', body: { contains: goal.content.substring(0, 50) } },
      });
      if (!existing) {
        await prisma.proactiveInsight.create({
          data: {
            userId,
            type: 'reminder',
            category: 'productivity',
            title: `Goal check-in: ${goal.content.substring(0, 60)}`,
            body: `You mentioned wanting to: ${goal.content}. You haven't talked about this recently — still working on it? Holly can help if you need a push.`,
            confidence: 0.7,
            urgency: 'medium',
            sourceMemories: [goal.id],
            suggestedAction: 'Ask about progress on this goal',
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });
        insightsCreated++;
      }
    }
  }

  return insightsCreated;
}

// ─── Daily Briefing ───────────────────────────────────────────────────────

export async function generateDailyBriefing(userId: string): Promise<string | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if briefing already exists for today
  const existing = await prisma.dailyBriefing.findFirst({
    where: { userId, date: today },
  });
  if (existing) return existing.summary;

  // Gather data for briefing
  const [
    patterns,
    pendingInsights,
    recentMemories,
    recentConversations,
    milestones,
    profile,
  ] = await Promise.all([
    prisma.patternTracker.findMany({ where: { userId, significance: 'high' }, take: 10 }),
    prisma.proactiveInsight.findMany({ where: { userId, status: 'pending', urgency: { in: ['high', 'medium'] } }, take: 5 }),
    prisma.relationshipMemory.findMany({ where: { userId, verified: true }, orderBy: { updatedAt: 'desc' }, take: 10 }),
    prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 5, select: { title: true, updatedAt: true } }),
    prisma.relationshipMilestone.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.relationshipProfile.findFirst({ where: { userId } }),
  ]);

  // Build briefing
  const userName = ((profile?.metadata as Record<string, unknown>)?.preferredName as string) || 'there';
  const parts: string[] = [];

  parts.push(`Good morning, ${userName}! Here's what Holly has for you today:`);
  parts.push('');

  // Active patterns
  if (patterns.length > 0) {
    parts.push('**Your Active Patterns:**');
    for (const p of patterns.slice(0, 5)) {
      parts.push(`- ${p.description} (${p.occurrences} occurrences)`);
    }
    parts.push('');
  }

  // Pending insights
  if (pendingInsights.length > 0) {
    parts.push('**Insights for you:**');
    for (const i of pendingInsights) {
      parts.push(`- ${i.title}: ${i.body.substring(0, 100)}`);
    }
    parts.push('');
  }

  // Recent context
  if (recentConversations.length > 0) {
    parts.push('**Recently discussed:**');
    for (const c of recentConversations.slice(0, 3)) {
      parts.push(`- ${c.title || 'Untitled'} (${(c as any).updatedAt?.toLocaleDateString()})`);
    }
    parts.push('');
  }

  // Goals check
  const goalMemories = recentMemories.filter(m => m.category === 'goal');
  if (goalMemories.length > 0) {
    parts.push('**Your active goals:**');
    for (const g of goalMemories.slice(0, 3)) {
      parts.push(`- ${g.content}`);
    }
    parts.push('');
  }

  // Milestones
  if (milestones.length > 0) {
    parts.push('**Recent milestones:**');
    for (const m of milestones) {
      parts.push(`- ${m.title}`);
    }
  }

  const summary = parts.join('\n');

  // Save briefing
  try {
    await prisma.dailyBriefing.create({
      data: {
        userId,
        date: today,
        summary,
        priorities: pendingInsights.map(i => ({ title: i.title, reason: i.body.substring(0, 100), urgency: i.urgency })),
        insights: pendingInsights.map(i => ({ title: i.title, body: i.body.substring(0, 200) })),
        reminders: goalMemories.map(g => g.content),
        mood: (profile?.emotionalBaseline as string) || undefined,
      },
    });
  } catch { /* unique constraint — already created */ }

  return summary;
}

// ─── Get Pending Insights for Chat Injection ──────────────────────────────

export async function getProactiveInsightsForChat(userId: string): Promise<string> {
  const insights = await prisma.proactiveInsight.findMany({
    where: {
      userId,
      status: 'pending',
      expiresAt: { gte: new Date() },
    },
    orderBy: [
      { urgency: 'desc' },
      { confidence: 'desc' },
    ],
    take: 5,
  });

  if (insights.length === 0) return '';

  const lines = insights.map(i => {
    const urgency = i.urgency === 'critical' ? '🔴' : i.urgency === 'high' ? '🟡' : '⚪';
    return `${urgency} ${i.title}: ${i.body.substring(0, 150)}${i.suggestedAction ? ` → ${i.suggestedAction}` : ''}`;
  });

  // Mark as shown
  await prisma.proactiveInsight.updateMany({
    where: { id: { in: insights.map(i => i.id) } },
    data: { shownAt: new Date(), status: 'shown' },
  });

  return `[HOLLY'S PROACTIVE INSIGHTS — things she noticed and wants to share]\n${lines.join('\n')}\n[Weave these into conversation naturally if relevant — don't dump them all at once]`;
}

// ─── Context for Chat ─────────────────────────────────────────────────────

export async function getPatternContextForChat(userId: string): Promise<string> {
  const topPatterns = await prisma.patternTracker.findMany({
    where: { userId, significance: { in: ['high', 'medium'] } },
    orderBy: { frequency: 'desc' },
    take: 8,
  });

  if (topPatterns.length === 0) return '';

  const topicPatterns = topPatterns.filter(p => p.patternType === 'topic');
  const behaviorPatterns = topPatterns.filter(p => p.patternType === 'behavior');

  const parts: string[] = [];

  if (topicPatterns.length > 0) {
    parts.push('[YOUR PATTERNS — topics you care about most]');
    for (const p of topicPatterns) {
      parts.push(`  ${p.patternName}: ${(p.frequency * 100).toFixed(0)}% frequency (${p.occurrences} times)`);
    }
  }

  if (behaviorPatterns.length > 0) {
    parts.push('[YOUR BEHAVIOR PATTERNS — how you use Holly]');
    for (const p of behaviorPatterns) {
      parts.push(`  ${p.description}`);
    }
  }

  return parts.join('\n');
}
