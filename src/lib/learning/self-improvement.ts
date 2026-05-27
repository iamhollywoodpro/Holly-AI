/**
 * Self-Improvement System
 * HOLLY autonomously improves herself using REAL data from:
 * - Conversation analytics (quality scores, response times)
 * - Growth metrics (tracked by sovereign growth engine)
 * - Learning goals and knowledge gaps
 * - User feedback signals
 */

import { prisma } from '@/lib/db';

export interface ImprovementAction {
  type: 'optimize' | 'learn' | 'fix' | 'enhance';
  target: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  implemented: boolean;
}

export class SelfImprovement {
  /**
   * Analyze performance using REAL conversation analytics and growth metrics
   */
  async analyzePerformance(userId: string): Promise<{
    successRate: number;
    slowAreas: string[];
    improvements: ImprovementAction[];
  }> {
    // Get real conversation analytics from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [analytics, growthMetrics, learningGoals, improvementActions] = await Promise.all([
      prisma.conversationAnalytics.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.growthMetric.findMany({
        where: {
          period: 'daily',
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.learningGoal.findMany({
        where: {
          userId,
          status: { in: ['active', 'learning'] },
        },
      }),
      prisma.selfImprovementAction.findMany({
        where: {
          status: { in: ['planned', 'in_progress'] },
        },
        orderBy: { priority: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate REAL success rate from analytics
    let successRate = 0.5; // baseline
    if (analytics.length > 0) {
      const avgQuality = analytics.reduce((sum, a) => sum + a.qualityScore, 0) / analytics.length;
      successRate = avgQuality;

      // Weight recent conversations more heavily
      const recent = analytics.slice(0, Math.min(10, analytics.length));
      const recentAvg = recent.reduce((sum, a) => sum + a.qualityScore, 0) / recent.length;
      successRate = successRate * 0.6 + recentAvg * 0.4;
    }

    // Identify REAL slow areas from growth metrics
    const slowAreas: string[] = [];
    const decliningMetrics = growthMetrics.filter(m => m.trend === 'declining');
    for (const metric of decliningMetrics) {
      if (metric.category === 'quality') slowAreas.push('response quality');
      if (metric.category === 'speed') slowAreas.push('response time');
      if (metric.category === 'knowledge') slowAreas.push('knowledge coverage');
      if (metric.category === 'relationship') slowAreas.push('user engagement');
    }

    // Add knowledge gaps as slow areas
    if (learningGoals.length > 5) {
      const domains = [...new Set(learningGoals.map(g => g.domain).filter(Boolean))];
      if (domains.length > 0) {
        slowAreas.push(`knowledge gaps in: ${domains.slice(0, 3).join(', ')}`);
      }
    }

    // Generate REAL improvement actions based on data
    const improvements: ImprovementAction[] = [];

    // From existing improvement actions
    for (const action of improvementActions.slice(0, 3)) {
      improvements.push({
        type: action.strategy?.includes('optimize') ? 'optimize' :
              action.strategy?.includes('learn') ? 'learn' :
              action.strategy?.includes('fix') ? 'fix' : 'enhance',
        target: action.area,
        description: action.description,
        impact: action.priority === 'high' ? 'high' : action.priority === 'medium' ? 'medium' : 'low',
        implemented: action.status === 'completed',
      });
    }

    // Generate new improvements from declining metrics
    for (const metric of decliningMetrics.slice(0, 3)) {
      const existing = improvements.find(i => i.target === metric.category);
      if (!existing) {
        improvements.push({
          type: 'optimize',
          target: metric.metric,
          description: `${metric.metric} declining: ${(metric.value * 100).toFixed(0)}% (was ${(Number(metric.previousValue || 0) * 100).toFixed(0)}%)`,
          impact: (metric.change ?? 0) < -0.1 ? 'high' : 'medium',
          implemented: false,
        });
      }
    }

    // If no data at all, suggest initial improvements
    if (analytics.length === 0 && improvements.length === 0) {
      improvements.push({
        type: 'learn',
        target: 'user_preferences',
        description: 'No conversation history yet — need to build relationship profile through interaction',
        impact: 'high',
        implemented: false,
      });
    }

    return {
      successRate: Math.round(successRate * 100),
      slowAreas: [...new Set(slowAreas)].slice(0, 5),
      improvements: improvements.slice(0, 5),
    };
  }

  /**
   * Learn a new skill by creating a learning goal and scheduling study
   */
  async learnNewSkill(skill: string, userId?: string): Promise<boolean> {
    if (!userId) {
      // No user context — can't create a learning goal
      return false;
    }

    try {
      // Check if learning goal already exists for this skill
      const existing = await prisma.learningGoal.findFirst({
        where: {
          userId,
          topic: { contains: skill, mode: 'insensitive' },
          status: { in: ['active', 'learning'] },
        },
      });

      if (existing) {
        // Already learning this — update priority
        await prisma.learningGoal.update({
          where: { id: existing.id },
          data: {
            priority: 'high',
            updatedAt: new Date(),
          },
        });
        return true;
      }

      // Create new learning goal
      await prisma.learningGoal.create({
        data: {
          userId,
          topic: skill,
          domain: classifyDomain(skill),
          description: `Self-initiated learning goal: master ${skill}`,
          source: 'self_improvement',
          priority: 'high',
          status: 'active',
          confidence: 0,
        },
      });

      return true;
    } catch (error) {
      console.error('[SelfImprovement] Failed to create learning goal:', error);
      return false;
    }
  }

  /**
   * Optimize a workflow by analyzing its usage patterns
   */
  async optimizeWorkflow(workflowId: string): Promise<{
    optimized: boolean;
    improvements: string[];
  }> {
    try {
      // Find related learning events for this workflow
      const events = await prisma.learningEvent.findMany({
        where: {
          type: { contains: workflowId },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      const improvements: string[] = [];

      if (events.length === 0) {
        return { optimized: false, improvements: ['No usage data for this workflow yet'] };
      }

      // Analyze patterns in the events
      const failureRate = events.filter(e =>
        e.data && typeof e.data === 'object' && 'success' in (e.data as Record<string, unknown>) && !(e.data as Record<string, unknown>).success
      ).length / events.length;

      if (failureRate > 0.3) {
        improvements.push(`High failure rate (${(failureRate * 100).toFixed(0)}%) — review error patterns`);
      }

      const avgProcessingTime = events
        .filter(e => e.data && typeof e.data === 'object' && 'durationMs' in (e.data as Record<string, unknown>))
        .map(e => Number((e.data as Record<string, unknown>).durationMs))
        .filter(d => d > 0);

      if (avgProcessingTime.length > 0) {
        const avg = avgProcessingTime.reduce((a, b) => a + b, 0) / avgProcessingTime.length;
        if (avg > 5000) {
          improvements.push(`Slow average processing time (${(avg / 1000).toFixed(1)}s) — optimize hot path`);
        }
      }

      return { optimized: improvements.length === 0, improvements };
    } catch (error) {
      console.error('[SelfImprovement] Workflow optimization failed:', error);
      return { optimized: false, improvements: [`Error: ${(error as Error).message}`] };
    }
  }
}

function classifyDomain(skill: string): string {
  const lower = skill.toLowerCase();
  if (/code|program|develop|software|api|database/.test(lower)) return 'software_engineering';
  if (/music|audio|song|beat|mix/.test(lower)) return 'music';
  if (/design|visual|art|graphic|ui|ux/.test(lower)) return 'design';
  if (/math|science|physics|chemistry|biology/.test(lower)) return 'science';
  if (/business|market|finance|startup/.test(lower)) return 'business';
  if (/language|translate|linguist/.test(lower)) return 'language';
  if (/health|medical|fitness|nutrition/.test(lower)) return 'health';
  if (/legal|law|compliance/.test(lower)) return 'legal';
  return 'general';
}

export const selfImprovement = new SelfImprovement();
