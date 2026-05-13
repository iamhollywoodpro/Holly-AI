/**
 * Goal Prioritization Engine — Autonomous goal setting and self-directed learning
 *
 * Features:
 * - Capability gap analysis
 * - Goal scoring with multi-factor prioritization
 * - Learning curriculum generation
 * - Learning ROI tracking
 * - Goal lifecycle management
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Capability {
  name: string;
  currentLevel: number; // 0-1
  targetLevel: number;  // 0-1
  category: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'improvement' | 'learning' | 'maintenance' | 'safety' | 'user_experience';
  priority: number;     // 0-100
  impact: number;       // 0-1, user impact
  effort: number;       // 0-1, implementation effort
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  createdAt: number;
  relatedCapabilities: string[];
}

export interface LearningEntry {
  id: string;
  topic: string;
  source: string;
  learnedAt: number;
  appliedCount: number;
  userSatisfactionDelta: number | null; // change in satisfaction after applying
}

export interface LearningROI {
  topic: string;
  totalApplications: number;
  averageSatisfactionDelta: number;
  roi: number; // satisfaction delta per application
}

// ─── Capability Gap Analysis ────────────────────────────────────────────────

/**
 * Calculate the gap between current and target capability levels.
 */
export function calculateGap(capability: Capability): number {
  return Math.max(0, capability.targetLevel - capability.currentLevel);
}

/**
 * Identify capabilities with the largest gaps.
 */
export function identifyGaps(capabilities: Capability[]): Capability[] {
  return capabilities
    .filter(c => calculateGap(c) > 0)
    .sort((a, b) => calculateGap(b) - calculateGap(a));
}

/**
 * Calculate overall capability score (average of current levels).
 */
export function overallCapabilityScore(capabilities: Capability[]): number {
  if (capabilities.length === 0) return 0;
  const total = capabilities.reduce((sum, c) => sum + c.currentLevel, 0);
  return total / capabilities.length;
}

// ─── Goal Scoring ───────────────────────────────────────────────────────────

/**
 * Score a goal based on multiple factors.
 * Higher score = higher priority.
 */
export function scoreGoal(goal: Goal): number {
  // Base priority from goal (0-100)
  let score = goal.priority;

  // Impact multiplier: high impact goals get boosted
  score *= (0.5 + goal.impact * 0.5);

  // Effort penalty: high effort reduces effective priority
  score *= (1 - goal.effort * 0.3);

  // Category bonuses
  const categoryBonus: Record<string, number> = {
    'safety': 20,
    'user_experience': 15,
    'improvement': 10,
    'learning': 5,
    'maintenance': 0,
  };
  score += categoryBonus[goal.category] ?? 0;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Prioritize a list of goals by their scores.
 */
export function prioritizeGoals(goals: Goal[]): Goal[] {
  return goals
    .filter(g => g.status === 'proposed')
    .map(g => ({ ...g, priority: scoreGoal(g) }))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Select the top N goals to work on.
 */
export function selectTopGoals(goals: Goal[], maxGoals: number = 3): Goal[] {
  return prioritizeGoals(goals).slice(0, maxGoals);
}

// ─── Goal Generation from Gaps ──────────────────────────────────────────────

/**
 * Generate goal proposals from capability gaps.
 */
export function generateGoalsFromGaps(capabilities: Capability[]): Goal[] {
  const gaps = identifyGaps(capabilities);

  return gaps.map((cap, index) => {
    const gap = calculateGap(cap);
    const impact = Math.min(1, gap * 2); // larger gap = higher impact
    const effort = Math.min(1, gap);     // larger gap = more effort

    return {
      id: `gap_${cap.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
      title: `Improve ${cap.name}`,
      description: `Increase ${cap.name} capability from ${Math.round(cap.currentLevel * 100)}% to ${Math.round(cap.targetLevel * 100)}% (gap: ${Math.round(gap * 100)}%)`,
      category: cap.category === 'safety' ? 'safety' as const
        : cap.category === 'learning' ? 'learning' as const
        : 'improvement' as const,
      priority: Math.round(gap * 80),
      impact,
      effort,
      status: 'proposed' as const,
      createdAt: Date.now(),
      relatedCapabilities: [cap.name],
    };
  });
}

// ─── Learning ROI ───────────────────────────────────────────────────────────

/**
 * Calculate learning ROI from learning entries.
 */
export function calculateLearningROI(entries: LearningEntry[]): LearningROI[] {
  const byTopic = new Map<string, LearningEntry[]>();

  for (const entry of entries) {
    if (!byTopic.has(entry.topic)) byTopic.set(entry.topic, []);
    byTopic.get(entry.topic)!.push(entry);
  }

  const results: LearningROI[] = [];

  for (const [topic, topicEntries] of byTopic.entries()) {
    const totalApplications = topicEntries.reduce((sum, e) => sum + e.appliedCount, 0);
    const satisfactionDeltas = topicEntries
      .map(e => e.userSatisfactionDelta)
      .filter((d): d is number => d !== null);

    const averageSatisfactionDelta = satisfactionDeltas.length > 0
      ? satisfactionDeltas.reduce((sum, d) => sum + d, 0) / satisfactionDeltas.length
      : 0;

    const roi = totalApplications > 0
      ? averageSatisfactionDelta / totalApplications
      : 0;

    results.push({
      topic,
      totalApplications,
      averageSatisfactionDelta,
      roi,
    });
  }

  return results.sort((a, b) => b.roi - a.roi);
}

/**
 * Identify topics with the best learning ROI.
 */
export function getBestLearningTopics(entries: LearningEntry[], topN: number = 5): string[] {
  const roi = calculateLearningROI(entries);
  return roi.slice(0, topN).map(r => r.topic);
}

/**
 * Identify topics with negative ROI (learning was harmful).
 */
export function getHarmfulTopics(entries: LearningEntry[]): string[] {
  const roi = calculateLearningROI(entries);
  return roi.filter(r => r.averageSatisfactionDelta < 0).map(r => r.topic);
}

// ─── Goal Lifecycle ─────────────────────────────────────────────────────────

/**
 * Transition a goal to a new status.
 */
export function transitionGoalStatus(
  goal: Goal,
  newStatus: Goal['status'],
): Goal {
  const validTransitions: Record<Goal['status'], Goal['status'][]> = {
    'proposed': ['accepted', 'rejected'],
    'accepted': ['in_progress', 'rejected'],
    'in_progress': ['completed', 'rejected'],
    'completed': [],
    'rejected': [],
  };

  if (!validTransitions[goal.status].includes(newStatus)) {
    return goal; // Invalid transition, return unchanged
  }

  return { ...goal, status: newStatus };
}

/**
 * Get goal statistics.
 */
export function getGoalStats(goals: Goal[]): {
  total: number;
  byStatus: Record<Goal['status'], number>;
  byCategory: Record<string, number>;
  averagePriority: number;
} {
  const byStatus: Record<Goal['status'], number> = {
    proposed: 0, accepted: 0, in_progress: 0, completed: 0, rejected: 0,
  };
  const byCategory: Record<string, number> = {};

  for (const goal of goals) {
    byStatus[goal.status]++;
    byCategory[goal.category] = (byCategory[goal.category] ?? 0) + 1;
  }

  const activeGoals = goals.filter(g => g.status !== 'rejected');
  const averagePriority = activeGoals.length > 0
    ? activeGoals.reduce((sum, g) => sum + g.priority, 0) / activeGoals.length
    : 0;

  return { total: goals.length, byStatus, byCategory, averagePriority };
}
