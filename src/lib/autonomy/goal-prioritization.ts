/**
 * Goal Prioritization Engine
 * 
 * Analyzes and ranks goals based on multiple factors:
 * - Priority level (1-10)
 * - Deadline proximity
 * - Dependencies (blocked goals)
 * - Category importance
 * - Resource availability
 * - User preferences
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logging/structured-logger';

const prisma = new PrismaClient();
const logger = createLogger('goal-prioritization');

export interface PrioritizedGoal {
  id: string;
  title: string;
  category: string;
  priority: number;
  score: number;
  reasons: string[];
  canStart: boolean;
  blockedBy: string[];
}

export interface PrioritizationContext {
  currentTime: Date;
  userPreferences?: {
    preferredCategories?: string[];
    resourceConstraints?: {
      maxConcurrentGoals?: number;
      allowedCategories?: string[];
    };
  };
  systemState?: {
    cpuUsage?: number;
    memoryUsage?: number;
    activeGoals?: number;
  };
}

/**
 * Calculate priority score for a goal (0-100)
 */
async function calculateGoalScore(
  goal: any,
  context: PrioritizationContext
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = [];
  let score = 0;

  // Base score from priority (1-10) * 10 = 0-100
  score += goal.priority * 10;
  if (goal.priority >= 8) {
    reasons.push(`High priority (${goal.priority}/10)`);
  }

  // Deadline proximity (up to 20 points)
  if (goal.deadline) {
    const timeUntilDeadline = new Date(goal.deadline).getTime() - context.currentTime.getTime();
    const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);
    
    if (hoursUntilDeadline < 1) {
      score += 20;
      reasons.push('Deadline imminent (< 1 hour)');
    } else if (hoursUntilDeadline < 24) {
      score += 15;
      reasons.push('Deadline approaching (< 24 hours)');
    } else if (hoursUntilDeadline < 168) { // 1 week
      score += 10;
      reasons.push('Deadline this week');
    } else if (hoursUntilDeadline < 720) { // 1 month
      score += 5;
      reasons.push('Deadline this month');
    }
  }

  // Category weighting (up to 15 points)
  const categoryWeights: Record<string, number> = {
    improvement: 15,    // Self-improvement is most important
    learning: 12,       // Learning is critical for growth
    performance: 10,    // Performance affects user experience
    user_satisfaction: 10, // User-facing goals
    resource: 8,        // Resource optimization
    collaboration: 6,   // External integrations
  };

  const categoryScore = categoryWeights[goal.category] || 5;
  score += categoryScore;
  if (categoryScore >= 10) {
    reasons.push(`Important category: ${goal.category}`);
  }

  // Progress boost (up to 10 points for in-progress goals)
  if (goal.status === 'in_progress') {
    score += 10;
    reasons.push('Already in progress');
  } else if (goal.progress > 0) {
    score += 5;
    reasons.push(`Already ${Math.round(goal.progress)}% complete`);
  }

  // Penalty for blocked goals (up to -30 points)
  if (goal.status === 'blocked') {
    score -= 30;
    reasons.push('Currently blocked');
  }

  // Source weighting (up to 5 points)
  if (goal.source === 'user') {
    score += 5;
    reasons.push('User-initiated goal');
  } else if (goal.source === 'system') {
    score += 3;
    reasons.push('System-critical goal');
  }

  // Resource availability check
  if (context.systemState?.activeGoals) {
    const maxConcurrent = context.userPreferences?.resourceConstraints?.maxConcurrentGoals || 3;
    if (context.systemState.activeGoals >= maxConcurrent) {
      score -= 20;
      reasons.push('System at capacity');
    }
  }

  // Ensure score is in 0-100 range
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

/**
 * Check if goal dependencies are satisfied
 */
async function checkDependencies(
  goal: any
): Promise<{ canStart: boolean; blockedBy: string[] }> {
  const dependsOn: string[] = goal.dependsOn || [];
  const blockedBy: string[] = [];

  if (dependsOn.length === 0) {
    return { canStart: true, blockedBy: [] };
  }

  for (const depGoalId of dependsOn) {
    const depGoal = await prisma.goal.findUnique({ where: { id: depGoalId } });

    if (!depGoal) {
      blockedBy.push(`Dependency ${depGoalId} not found`);
      continue;
    }

    if (depGoal.status !== 'completed') {
      blockedBy.push(depGoal.title);
    }
  }

  return {
    canStart: blockedBy.length === 0,
    blockedBy,
  };
}

/**
 * Prioritize goals based on multiple factors
 */
export async function prioritizeGoals(
  userId?: string,
  context?: Partial<PrioritizationContext>
): Promise<PrioritizedGoal[]> {
  const fullContext: PrioritizationContext = {
    currentTime: new Date(),
    ...context,
  };

  logger.info('Starting goal prioritization', {
    userId,
    context: fullContext,
  });

  // Fetch pending and in-progress goals via Prisma client
  const goals = await prisma.goal.findMany({
    where: {
      status: { in: ['pending', 'in_progress'] },
      ...(userId ? {} : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  logger.debug(`Found ${goals.length} goals to prioritize`);

  // Calculate scores and check dependencies
  const prioritized: PrioritizedGoal[] = [];

  if (Array.isArray(goals)) {
    for (const goal of goals) {
      const { score, reasons } = await calculateGoalScore(goal, fullContext);
      const { canStart, blockedBy } = await checkDependencies(goal);

      prioritized.push({
        id: goal.id,
        title: goal.title,
        category: goal.category,
        priority: goal.priority,
        score,
        reasons,
        canStart,
        blockedBy,
      });
    }
  }

  // Sort by score (highest first), then by canStart
  prioritized.sort((a, b) => {
    if (a.canStart !== b.canStart) {
      return a.canStart ? -1 : 1;
    }
    return b.score - a.score;
  });

  logger.info('Goal prioritization complete', {
    totalGoals: prioritized.length,
    canStart: prioritized.filter(g => g.canStart).length,
    topScore: prioritized[0]?.score || 0,
  });

  return prioritized;
}

/**
 * Get next actionable goal (highest priority, unblocked)
 */
export async function getNextActionableGoal(
  userId?: string
): Promise<PrioritizedGoal | null> {
  const prioritized = await prioritizeGoals(userId);
  return prioritized.find(g => g.canStart) || null;
}

/**
 * Update goal priorities based on new information
 */
export async function updateGoalPriorities(
  goalIds: string[]
): Promise<void> {
  logger.info('Updating goal priorities', { goalIds });

  for (const goalId of goalIds) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) continue;

    // Update priority based on sub-goal status
    const subGoals = await prisma.goal.findMany({ where: { parentGoalId: goalId } });
    if (subGoals.length > 0) {
      const completedSubGoals = subGoals.filter(g => g.status === 'completed').length;
      const progress = (completedSubGoals / subGoals.length) * 100;

      await prisma.goal.update({
        where: { id: goalId },
        data: {
          progress,
          currentStep: completedSubGoals,
          totalSteps: subGoals.length,
        },
      });

      // Auto-complete if all sub-goals are done
      if (progress === 100 && goal.status !== 'completed') {
        await prisma.goal.update({
          where: { id: goalId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      }
    }
  }
}

/**
 * Suggest new goals based on system state and user behavior
 */
export async function suggestGoals(
  userId: string
): Promise<{
  suggestedGoals: Array<{
    title: string;
    description: string;
    category: string;
    priority: number;
    reasoning: string;
  }>;
}> {
  const suggestedGoals: Array<{
    title: string;
    description: string;
    category: string;
    priority: number;
    reasoning: string;
  }> = [];

  // Check for performance issues
  const recentPerformanceIssues = await prisma.performanceIssue.count({
    where: {
      status: 'open',
      firstDetected: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
      },
    },
  });

  if (recentPerformanceIssues > 0) {
    suggestedGoals.push({
      title: 'Resolve Performance Issues',
      description: `Address ${recentPerformanceIssues} open performance issues affecting system performance`,
      category: 'performance',
      priority: 8,
      reasoning: 'Multiple performance issues detected, need immediate attention',
    });
  }

  // Check for unreviewed code
  const pendingCodeReviews = await prisma.codeReview.count({
    where: {
      status: 'pending',
    },
  });

  if (pendingCodeReviews > 5) {
    suggestedGoals.push({
      title: 'Process Code Reviews',
      description: `Review and process ${pendingCodeReviews} pending code reviews`,
      category: 'improvement',
      priority: 7,
      reasoning: 'Code review backlog growing, needs attention',
    });
  }

  // Check for failed deployments
  const recentFailedDeployments = await prisma.deploymentLog.count({
    where: {
      status: 'failed',
      startedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
  });

  if (recentFailedDeployments > 0) {
    suggestedGoals.push({
      title: 'Investigate Deployment Failures',
      description: `Analyze and fix ${recentFailedDeployments} failed deployments from the past week`,
      category: 'improvement',
      priority: 9,
      reasoning: 'Deployment failures need immediate investigation',
    });
  }

  // Check for learning opportunities
  const recentLearningEvents = await prisma.learningEvent.count({
    where: {
      type: 'correction',
      timestamp: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  if (recentLearningEvents > 3) {
    suggestedGoals.push({
      title: 'Learn from Recent Corrections',
      description: `Analyze ${recentLearningEvents} recent correction events to improve future performance`,
      category: 'learning',
      priority: 6,
      reasoning: 'Multiple corrections suggest learning opportunity',
    });
  }

  return { suggestedGoals };
}