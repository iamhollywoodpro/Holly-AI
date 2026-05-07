/**
 * Goal Pursuit Engine — Holly actively works toward goals
 *
 * Holly doesn't just respond — she pursues objectives:
 * - Tracks user-stated goals and decomposes them into tasks
 * - Monitors progress and suggests next steps
 * - Autonomously initiates actions that move toward goals
 * - Celebrates milestones and adjusts strategies on setbacks
 */

import { prisma } from '@/lib/db';

export interface Goal {
  id?: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  priority: number;          // 0-1
  progress: number;          // 0-1
  milestones: Milestone[];
  deadline?: Date;
  createdAt?: Date;
}

export interface Milestone {
  title: string;
  completed: boolean;
  completedAt?: Date;
}

interface GoalSuggestion {
  goal: string;
  reason: string;
  priority: number;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export class GoalPursuitEngine {
  /**
   * Create a new goal from user input
   */
  async createGoal(userId: string, goal: Goal): Promise<Goal> {
    const milestones = goal.milestones.length > 0
      ? goal.milestones
      : this.decomposeIntoMilestones(goal.title, goal.description);

    try {
      const stored = await prisma.memoryEmbedding.create({
        data: {
          userId,
          content: `Goal: ${goal.title} — ${goal.description}`,
          type: 'goal',
          dimension: 0,
          metadata: {
            status: goal.status,
            priority: goal.priority,
            progress: goal.progress,
            milestones,
            source: 'goal_pursuit',
            type: 'goal',
          } as any,
        },
      });

      return { ...goal, id: stored.id, milestones, createdAt: stored.createdAt };
    } catch {
      return { ...goal, milestones, createdAt: new Date() };
    }
  }

  /**
   * Get all active goals for a user
   */
  async getActiveGoals(userId: string): Promise<Goal[]> {
    const goals = await prisma.memoryEmbedding.findMany({
      where: { userId, type: 'goal' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return goals.map(g => {
      const meta = (g.metadata || {}) as any;
      return {
        id: g.id,
        title: g.content.replace(/^Goal:\s*/, '').split('—')[0].trim(),
        description: g.content.replace(/^Goal:\s*/, '').split('—')[1]?.trim() || '',
        status: meta.status || 'active',
        priority: meta.priority || 0.5,
        progress: meta.progress || 0,
        milestones: meta.milestones || [],
        createdAt: g.createdAt,
      };
    }).filter(g => g.status === 'active');
  }

  /**
   * Update goal progress
   */
  async updateProgress(goalId: string, progress: number, completedMilestone?: string): Promise<void> {
    try {
      const goal = await prisma.memoryEmbedding.findUnique({ where: { id: goalId } });
      if (!goal) return;

      const meta = { ...((goal.metadata || {}) as any) };
      meta.progress = progress;

      if (completedMilestone && meta.milestones) {
        meta.milestones = meta.milestones.map((m: Milestone) =>
          m.title === completedMilestone ? { ...m, completed: true, completedAt: new Date() } : m
        );
      }

      if (progress >= 1) meta.status = 'completed';

      await prisma.memoryEmbedding.update({
        where: { id: goalId },
        data: { metadata: meta as any },
      });
    } catch {}
  }

  /**
   * Suggest goals based on user patterns
   */
  suggestGoals(recentTopics: string[], userPatterns: string[]): GoalSuggestion[] {
    const suggestions: GoalSuggestion[] = [];

    if (recentTopics.includes('music') && !recentTopics.includes('released')) {
      suggestions.push({ goal: 'Complete and release a music project', reason: 'Music is a recurring theme', priority: 0.8, estimatedEffort: 'high' });
    }
    if (recentTopics.includes('branding') || recentTopics.includes('marketing')) {
      suggestions.push({ goal: 'Develop a consistent brand identity', reason: 'Branding discussions detected', priority: 0.7, estimatedEffort: 'medium' });
    }
    if (userPatterns.includes('night_owl')) {
      suggestions.push({ goal: 'Optimize creative workflow for late-night sessions', reason: 'You work best at night', priority: 0.5, estimatedEffort: 'low' });
    }

    return suggestions;
  }

  /**
   * Decompose a goal into milestones
   */
  private decomposeIntoMilestones(title: string, _description: string): Milestone[] {
    // Simple decomposition — would use LLM for richer breakdown
    const generic = [
      { title: `Define scope for: ${title}`, completed: false },
      { title: 'Research and gather resources', completed: false },
      { title: 'Create first draft/prototype', completed: false },
      { title: 'Review and refine', completed: false },
      { title: 'Finalize and deliver', completed: false },
    ];
    return generic;
  }
}

export const goalPursuit = new GoalPursuitEngine();