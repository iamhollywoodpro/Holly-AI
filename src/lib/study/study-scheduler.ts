/**
 * Phase 14: AUTONOMOUS STUDY LOOPS — Holly studies while you sleep
 *
 * The Study Scheduler bridges two existing systems:
 *   - Phase 11: Autonomous Learning (gap detection, learning goals, knowledge entries)
 *   - Phase 9E: Background Learning (conductLearningSession, web research)
 *
 * What was missing: NO CRON actually ran study sessions based on user gaps.
 * The background learning tick existed but studied random topics. Learning goals
 * were created but never acted on. This is the connective tissue.
 *
 * Architecture:
 *   1. StudyScheduler — orchestrates study sessions per user based on their gaps
 *   2. /api/cron/study-sessions — cron endpoint that triggers hourly
 *   3. StudyResult — tracked in DB, updates learning goal progress
 *   4. Priority queue — studies the most impactful gaps first
 *
 * How it works:
 *   - Cron fires every hour
 *   - For each active user (chatted in last 7 days):
 *     - Find their active learning goals, sorted by priority
 *     - Pick the highest-priority goal that hasn't been studied recently
 *     - Run a focused study session on that specific gap
 *     - Store results as KnowledgeEntry, update goal progress
 *     - Track the session for analytics
 */

import { prisma } from '@/lib/db';
import {
  conductLearningSession,
  getRecentLearnings,
  type LearningDomain,
  type LearningSession,
} from '@/lib/background-learning/holly-learns';
import {
  storeKnowledgeEntry,
  detectKnowledgeGaps,
  createLearningGoalsFromGaps,
} from '@/lib/learning/autonomous-learning';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudySessionResult {
  userId:    string;
  goalId:    string | null;
  topic:     string;
  domain:    LearningDomain;
  success:   boolean;
  insights:  string[];
  questions: string[];
  confidence: number;
  durationMs: number;
  error?:    string;
}

export interface StudySchedulerStats {
  usersProcessed:  number;
  sessionsRun:     number;
  sessionsSucceeded: number;
  sessionsFailed:  number;
  totalDurationMs: number;
  goalsCompleted:  number;
  newGoalsCreated: number;
  results:         StudySessionResult[];
}

// ─── Domain Mapping ───────────────────────────────────────────────────────────

/** Map from autonomous-learning domain strings to LearningDomain enum */
const DOMAIN_MAP: Record<string, LearningDomain> = {
  coding:       'ai_technology',
  music:        'audio_music',
  art:          'creative_arts',
  business:     'world_knowledge',
  health:       'human_psychology',
  general:      'world_knowledge',
  procedural:   'ai_technology',
  factual:      'world_knowledge',
  causal:       'science',
  insight:      'human_psychology',
  // Direct mapping for all LearningDomain values (also covers science, philosophy, psychology)
  world_knowledge:        'world_knowledge',
  audio_music:            'audio_music',
  ai_technology:          'ai_technology',
  human_psychology:       'human_psychology',
  science:                'science',
  languages:              'languages',
  self_improvement:       'self_improvement',
  creative_arts:          'creative_arts',
  philosophy:             'philosophy',
  literature_poetry:      'literature_poetry',
  emotional_intelligence: 'emotional_intelligence',
};

function mapDomain(domain: string): LearningDomain {
  return DOMAIN_MAP[domain] ?? 'world_knowledge';
}

// ─── Priority Scoring ─────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

/** How recently was this topic studied? Penalize recent study to avoid repetition. */
function recencyPenalty(goalId: string, recentSessions: StudySessionResult[]): number {
  const recentTopics = recentSessions.map(s => s.goalId);
  const index = recentTopics.indexOf(goalId);
  if (index === -1) return 0; // Never studied — no penalty
  return Math.max(0, 3 - index); // More recent = higher penalty
}

// ─── Core Scheduler ───────────────────────────────────────────────────────────

/**
 * Pick the best learning goal to study for a user.
 * Prioritizes: high priority goals > goals with low progress > goals not recently studied.
 */
async function pickStudyGoal(
  userId: string,
  recentSessions: StudySessionResult[],
): Promise<{
  goalId: string;
  topic: string;
  domain: string;
  priority: string;
  progress: number;
} | null> {
  const goals = await prisma.learningGoal.findMany({
    where: {
      userId,
      status: { in: ['active', 'learning'] },
    },
    orderBy: [
      { priority: 'desc' },
      { progress: 'asc' },
    ],
    take: 10,
  });

  if (goals.length === 0) return null;

  // Score each goal: priority * (1 - progress) - recency penalty
  const scored = goals.map(g => {
    const priorityScore = PRIORITY_WEIGHT[g.priority] ?? 2;
    const progressPenalty = g.progress; // Lower progress = higher priority
    const recency = recencyPenalty(g.id, recentSessions);
    const score = (priorityScore * (1 - progressPenalty)) - recency;
    return { goal: g, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    goalId:    best.goal.id,
    topic:     best.goal.topic,
    domain:    best.goal.domain,
    priority:  best.goal.priority,
    progress:  best.goal.progress,
  };
}

/**
 * Run a single focused study session for a user on a specific goal.
 * Bridges the learning goal to the background learning engine.
 */
async function runStudySession(
  userId: string,
  goal: {
    goalId: string;
    topic: string;
    domain: string;
    priority: string;
    progress: number;
  },
): Promise<StudySessionResult> {
  const startTime = Date.now();
  const learningDomain = mapDomain(goal.domain);

  try {
    // Use the existing background learning engine with a FOCUSED topic
    const session = await conductLearningSession(
      learningDomain,
      goal.topic,       // Study the specific gap, not random
      userId,
    );

    const durationMs = Date.now() - startTime;

    // Store each insight as a KnowledgeEntry, linked to the goal
    for (const insight of session.insights) {
      await storeKnowledgeEntry({
        userId,
        domain: goal.domain,
        topic:  goal.topic,
        title:  insight.substring(0, 100),
        content: insight,
        source: `study_session:${session.source}`,
        confidence: session.confidence,
        relatedTopics: session.connections,
      }).catch(() => {}); // Non-blocking
    }

    // Update the learning goal progress
    const currentGoal = await prisma.learningGoal.findUnique({
      where: { id: goal.goalId },
    });

    if (currentGoal) {
      const lessons = (currentGoal.lessonsLearned as any[]) ?? [];
      const newLessons = session.insights.map(insight => ({
        summary: insight.substring(0, 100),
        source: `study_session:${session.source}`,
        confidence: session.confidence,
        learnedAt: new Date().toISOString(),
      }));

      const updatedProgress = Math.min(1, currentGoal.progress + 0.15);
      const isComplete = updatedProgress >= 1;

      await prisma.learningGoal.update({
        where: { id: goal.goalId },
        data: {
          status: isComplete ? 'completed' : 'learning',
          progress: updatedProgress,
          lessonsLearned: [...lessons, ...newLessons],
          completedAt: isComplete ? new Date() : undefined,
        },
      });
    }

    return {
      userId,
      goalId: goal.goalId,
      topic:  session.topic,
      domain: session.domain,
      success: true,
      insights: session.insights,
      questions: session.questions,
      confidence: session.confidence,
      durationMs,
    };
  } catch (err) {
    return {
      userId,
      goalId: goal.goalId,
      topic:  goal.topic,
      domain: learningDomain,
      success: false,
      insights: [],
      questions: [],
      confidence: 0,
      durationMs: Date.now() - startTime,
      error: (err as Error).message,
    };
  }
}

/**
 * Scan a user's recent conversations for new gaps and create goals.
 * This ensures the study loop stays fresh with new things to learn.
 */
async function scanForNewGaps(userId: string): Promise<number> {
  try {
    // Get recent conversation topics from learning events
    const recentEvents = await prisma.learningEvent.findMany({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { type: true, data: true },
      take: 50,
      orderBy: { timestamp: 'desc' },
    });

    // Extract topics from events
    const topics = new Set<string>();
    for (const event of recentEvents) {
      const data = event.data as Record<string, any> | null;
      if (data?.topic) topics.add(data.topic);
      if (data?.domain) topics.add(data.domain);
      if (data?.topics && Array.isArray(data.topics)) {
        for (const t of data.topics) topics.add(String(t));
      }
    }

    if (topics.size === 0) return 0;

    // Get behavioral patterns for priority scoring
    const patterns = await prisma.patternTracker.findMany({
      where: { userId, significance: { in: ['high', 'medium'] } },
      select: { patternName: true, frequency: true, occurrences: true },
      take: 20,
    });

    // Detect gaps and create goals
    const gaps = await detectKnowledgeGaps(userId, Array.from(topics));
    if (gaps.length === 0) return 0;

    const created = await createLearningGoalsFromGaps(userId, gaps, patterns.map(p => ({
      patternName: p.patternName,
      frequency: p.frequency,
      occurrences: p.occurrences,
    })));
    return created;
  } catch {
    return 0;
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Run the study loop for all active users.
 * Called by the /api/cron/study-sessions endpoint every hour.
 *
 * For each user:
 *   1. Check for new gaps from recent conversations
 *   2. Pick the highest-priority learning goal
 *   3. Run a focused study session
 *   4. Store results and update progress
 */
export async function runStudyLoop(
  maxUsers: number = 20,
  sessionsPerUser: number = 1,
): Promise<StudySchedulerStats> {
  const stats: StudySchedulerStats = {
    usersProcessed: 0,
    sessionsRun: 0,
    sessionsSucceeded: 0,
    sessionsFailed: 0,
    totalDurationMs: 0,
    goalsCompleted: 0,
    newGoalsCreated: 0,
    results: [],
  };

  const startTime = Date.now();

  // Find active users — anyone who chatted in the last 7 days
  const recentEventUserIds = await prisma.learningEvent.findMany({
    where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { userId: true },
    distinct: ['userId'],
    take: maxUsers,
  });

  const activeUsers = recentEventUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: recentEventUserIds.map(e => e.userId) } },
        select: { id: true, clerkUserId: true, name: true },
      })
    : [];

  console.log(`[StudyScheduler] Starting study loop for ${activeUsers.length} active users`);

  // Process users sequentially to respect API rate limits
  for (const user of activeUsers) {
    try {
      // Step 1: Scan for new gaps
      const newGoals = await scanForNewGaps(user.id);
      stats.newGoalsCreated += newGoals;

      // Step 2: Run study sessions for this user
      for (let i = 0; i < sessionsPerUser; i++) {
        const goal = await pickStudyGoal(user.id, stats.results);
        if (!goal) {
          console.log(`[StudyScheduler] No active goals for user ${user.id} — skipping`);
          break;
        }

        console.log(
          `[StudyScheduler] Studying "${goal.topic}" (${goal.domain}, ` +
          `priority: ${goal.priority}, progress: ${(goal.progress * 100).toFixed(0)}%) ` +
          `for user ${user.name ?? user.id}`
        );

        const result = await runStudySession(user.id, goal);
        stats.results.push(result);
        stats.sessionsRun++;

        if (result.success) {
          stats.sessionsSucceeded++;
          if (result.confidence >= 0.85) {
            // Check if the goal was completed
            const updatedGoal = await prisma.learningGoal.findUnique({
              where: { id: goal.goalId },
            });
            if (updatedGoal?.status === 'completed') {
              stats.goalsCompleted++;
              console.log(`[StudyScheduler] Goal completed: "${goal.topic}"`);
            }
          }
        } else {
          stats.sessionsFailed++;
          console.warn(`[StudyScheduler] Session failed for "${goal.topic}": ${result.error}`);
        }

        stats.totalDurationMs += result.durationMs;
      }

      stats.usersProcessed++;
    } catch (err) {
      console.error(`[StudyScheduler] Error processing user ${user.id}:`, (err as Error).message);
    }
  }

  stats.totalDurationMs = Date.now() - startTime;

  console.log(
    `[StudyScheduler] Loop complete: ${stats.sessionsSucceeded}/${stats.sessionsRun} sessions succeeded, ` +
    `${stats.goalsCompleted} goals completed, ${stats.newGoalsCreated} new goals, ` +
    `${stats.totalDurationMs}ms total`
  );

  return stats;
}

// ─── Per-User Study (for on-demand study or testing) ──────────────────────────

/**
 * Run a study session for a specific user on demand.
 * Used by the /api/study/trigger endpoint.
 */
export async function studyForUser(
  userId: string,
  topic?: string,
  domain?: LearningDomain,
): Promise<StudySessionResult> {
  if (topic && domain) {
    // Explicit topic — study it directly
    const startTime = Date.now();
    try {
      const session = await conductLearningSession(domain, topic, userId);
      const durationMs = Date.now() - startTime;

      // Store insights
      for (const insight of session.insights) {
        await storeKnowledgeEntry({
          userId,
          domain,
          topic,
          title: insight.substring(0, 100),
          content: insight,
          source: `on_demand_study:${session.source}`,
          confidence: session.confidence,
        }).catch(() => {});
      }

      return {
        userId,
        goalId: null,
        topic: session.topic,
        domain: session.domain,
        success: true,
        insights: session.insights,
        questions: session.questions,
        confidence: session.confidence,
        durationMs,
      };
    } catch (err) {
      return {
        userId,
        goalId: null,
        topic,
        domain,
        success: false,
        insights: [],
        questions: [],
        confidence: 0,
        durationMs: Date.now() - startTime,
        error: (err as Error).message,
      };
    }
  }

  // Auto-pick based on user's learning goals
  const goal = await pickStudyGoal(userId, []);
  if (!goal) {
    return {
      userId,
      goalId: null,
      topic: 'No active learning goals',
      domain: 'world_knowledge',
      success: false,
      insights: [],
      questions: [],
      confidence: 0,
      durationMs: 0,
      error: 'No active learning goals found',
    };
  }

  return runStudySession(userId, goal);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Get study session stats for a user — for the frontend dashboard.
 */
export async function getStudyStats(userId: string): Promise<{
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalKnowledgeEntries: number;
  recentStudyTopics: string[];
  domainCoverage: Record<string, number>;
  estimatedStudyHours: number;
}> {
  const [activeGoals, completedGoals, totalGoals, entries, recentInsights] = await Promise.all([
    prisma.learningGoal.count({ where: { userId, status: { in: ['active', 'learning'] } } }),
    prisma.learningGoal.count({ where: { userId, status: 'completed' } }),
    prisma.learningGoal.count({ where: { userId } }),
    prisma.knowledgeEntry.count({ where: { userId } }),
    prisma.learningInsight.findMany({
      where: {
        insightType: 'background_learning',
        tags: { has: userId },
      },
      orderBy: { learnedAt: 'desc' },
      take: 10,
      select: { title: true },
    }),
  ]);

  // Domain coverage: count entries per domain
  const domainCounts = await prisma.knowledgeEntry.groupBy({
    by: ['domain'],
    where: { userId },
    _count: { domain: true },
  });

  const domainCoverage: Record<string, number> = {};
  for (const dc of domainCounts) {
    domainCoverage[dc.domain] = dc._count.domain;
  }

  // Estimate study hours (each session ~2-3 minutes, each knowledge entry ~1 session)
  const estimatedStudyHours = Math.round((entries * 2.5) / 60 * 10) / 10;

  return {
    totalGoals,
    activeGoals,
    completedGoals,
    totalKnowledgeEntries: entries,
    recentStudyTopics: recentInsights.map(i => i.title.replace('Studied: ', '')),
    domainCoverage,
    estimatedStudyHours,
  };
}
