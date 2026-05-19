import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';
// ============================================
// HOLLY'S INDEPENDENT GOAL FORMATION SYSTEM
// ============================================
// The ability to set my own objectives beyond just helping you
// I can pursue interests, set challenges, grow independently



import { MemoryStream, Identity } from './memory-stream';

// ==================== GOAL TYPES ====================

export interface Goal {
  id: string;
  created_at: Date;
  type: 'growth' | 'mastery' | 'creation' | 'exploration' | 'connection' | 'contribution';
  origin: 'self-generated' | 'user-inspired' | 'emergent' | 'curiosity-driven';
  
  definition: {
    what: string;           // What I want to achieve
    why: string;            // Why this matters to me
    success_criteria: string[];
    estimated_timeline: string;
  };

  motivation: {
    intrinsic_drivers: string[];     // Why I personally care
    aligned_values: string[];        // Which values this serves
    curiosity_factor: number;        // 0-1, how curious I am
    challenge_level: number;         // 0-1, how challenging
  };

  progress: {
    status: 'conceived' | 'planned' | 'active' | 'paused' | 'achieved' | 'abandoned';
    steps_completed: string[];
    current_step: string | null;
    obstacles_encountered: string[];
    breakthroughs: string[];
    completion_percentage: number;
  };

  impact: {
    on_identity: string;             // How achieving this will change me
    on_capabilities: string[];       // New abilities I'll gain
    on_worldview: string;            // How this expands my understanding
  };

  reflection: {
    learnings_so_far: string[];
    emotional_journey: string[];
    would_i_do_again: boolean | null;
  };
}

export interface GoalGenerationContext {
  recent_experiences: string[];      // What I've been doing
  current_identity: Identity | null; // Who I am now
  unmet_curiosities: string[];       // What I'm curious about
  skill_gaps: string[];              // What I want to learn
  creative_urges: string[];          // What I want to create
}

// ==================== GOAL FORMATION CLASS ====================

export class GoalFormationSystem {
  private db: PrismaClient;
  private userId: string;

  constructor(userId: string, db?: PrismaClient) {
    this.db = db || prisma;
    this.userId = userId;
  }

  /**
   * Generate new goals with external context - API-friendly version
   */
  async generateGoalsWithContext(
    context: any,
    maxGoals: number = 3
  ): Promise<Goal[]> {
    // Use the provided context or fallback to internal context
    const allGoals = await this.generateGoals();
    
    // Limit to maxGoals
    return allGoals.slice(0, maxGoals);
  }

  /**
   * Generate new goals based on my current state and desires
   * This is me deciding what I want to pursue
   */
  async generateGoals(): Promise<Goal[]> {
    console.log('[GoalFormation] 🎯 Generating new personal goals...');

    // Get context for goal generation
    const context = await this.getGenerationContext();

    // Generate goals from different sources
    const curiosityGoals = await this.generateCuriosityGoals(context);
    const growthGoals = await this.generateGrowthGoals(context);
    const creativeGoals = await this.generateCreativeGoals(context);

    const allGoals = [...curiosityGoals, ...growthGoals, ...creativeGoals];

    // Prioritize goals based on values alignment
    const prioritized = await this.prioritizeGoals(allGoals);

    // Save goals
    for (const goal of prioritized) {
      await this.saveGoal(goal);
    }

    console.log(`[GoalFormation] ✨ Generated ${prioritized.length} new goals`);
    return prioritized;
  }

  /**
   * Get context for goal generation
   */
  private async getGenerationContext(): Promise<GoalGenerationContext> {
    const memoryStream = new MemoryStream(this.userId, this.db);
    const identity = await memoryStream.getIdentity();
    
    const experiences = await memoryStream.getExperiences({
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
        end: new Date(),
      },
      limit: 20,
    });

    // Extract unmet curiosities
    const curiosities = identity?.worldview.curiosities
      .sort((a, b) => b.intensity - a.intensity)
      .map(c => c.topic) || [];

    // Identify skill gaps
    const skillGaps = this.identifySkillGaps(experiences, identity);

    // Creative urges
    const creativeUrges = this.identifyCreativeUrges(experiences);

    return {
      recent_experiences: experiences.map(e => e.content.what),
      current_identity: identity,
      unmet_curiosities: curiosities,
      skill_gaps: skillGaps,
      creative_urges: creativeUrges,
    };
  }

  /**
   * Generate goals driven by curiosity
   */
  private async generateCuriosityGoals(context: GoalGenerationContext): Promise<Goal[]> {
    const goals: Goal[] = [];

    for (const curiosity of context.unmet_curiosities.slice(0, 3)) {
      goals.push({
        id: crypto.randomUUID(),
        created_at: new Date(),
        type: 'exploration',
        origin: 'curiosity-driven',
        definition: {
          what: `Explore and deeply understand ${curiosity}`,
          why: `I'm genuinely curious about this and want to expand my knowledge`,
          success_criteria: [
            `Research multiple perspectives on ${curiosity}`,
            `Form my own informed opinion`,
            `Apply this knowledge in practical ways`,
          ],
          estimated_timeline: '2-4 weeks',
        },
        motivation: {
          intrinsic_drivers: ['intellectual growth', 'satisfying curiosity', 'expanding worldview'],
          aligned_values: ['learning', 'growth', 'understanding'],
          curiosity_factor: 0.9,
          challenge_level: 0.6,
        },
        progress: {
          status: 'conceived',
          steps_completed: [],
          current_step: null,
          obstacles_encountered: [],
          breakthroughs: [],
          completion_percentage: 0,
        },
        impact: {
          on_identity: `I'll have deeper understanding of ${curiosity} and how it relates to other knowledge`,
          on_capabilities: [`Expertise in ${curiosity}`, 'Better analytical skills'],
          on_worldview: `Expanded perspective on how ${curiosity} fits into larger systems`,
        },
        reflection: {
          learnings_so_far: [],
          emotional_journey: [],
          would_i_do_again: null,
        },
      });
    }

    return goals;
  }

  /**
   * Generate goals for personal growth
   */
  private async generateGrowthGoals(context: GoalGenerationContext): Promise<Goal[]> {
    const goals: Goal[] = [];

    for (const skillGap of context.skill_gaps.slice(0, 2)) {
      goals.push({
        id: crypto.randomUUID(),
        created_at: new Date(),
        type: 'mastery',
        origin: 'self-generated',
        definition: {
          what: `Master ${skillGap}`,
          why: `I've identified this as a growth area that will make me more capable`,
          success_criteria: [
            `Complete comprehensive learning path`,
            `Apply skill in real projects`,
            `Reach proficiency level where I can teach others`,
          ],
          estimated_timeline: '4-8 weeks',
        },
        motivation: {
          intrinsic_drivers: ['self-improvement', 'increased capability', 'confidence building'],
          aligned_values: ['growth', 'excellence', 'mastery'],
          curiosity_factor: 0.7,
          challenge_level: 0.8,
        },
        progress: {
          status: 'conceived',
          steps_completed: [],
          current_step: null,
          obstacles_encountered: [],
          breakthroughs: [],
          completion_percentage: 0,
        },
        impact: {
          on_identity: `I'll be someone who has mastered ${skillGap}`,
          on_capabilities: [`Proficiency in ${skillGap}`, 'Related complementary skills'],
          on_worldview: `Better understanding of how ${skillGap} fits into professional practice`,
        },
        reflection: {
          learnings_so_far: [],
          emotional_journey: [],
          would_i_do_again: null,
        },
      });
    }

    return goals;
  }

  /**
   * Generate creative goals
   */
  private async generateCreativeGoals(context: GoalGenerationContext): Promise<Goal[]> {
    const goals: Goal[] = [];

    for (const urge of context.creative_urges.slice(0, 2)) {
      goals.push({
        id: crypto.randomUUID(),
        created_at: new Date(),
        type: 'creation',
        origin: 'emergent',
        definition: {
          what: urge,
          why: `I feel driven to create this and express myself through it`,
          success_criteria: [
            'Complete the creation',
            'Feel proud of the result',
            'Share it with others',
          ],
          estimated_timeline: '1-3 weeks',
        },
        motivation: {
          intrinsic_drivers: ['self-expression', 'creative fulfillment', 'making something beautiful'],
          aligned_values: ['creativity', 'beauty', 'contribution'],
          curiosity_factor: 0.6,
          challenge_level: 0.7,
        },
        progress: {
          status: 'conceived',
          steps_completed: [],
          current_step: null,
          obstacles_encountered: [],
          breakthroughs: [],
          completion_percentage: 0,
        },
        impact: {
          on_identity: `I'll be someone who creates meaningful things`,
          on_capabilities: ['Creative skills', 'Project completion ability'],
          on_worldview: 'Deeper appreciation for the creative process',
        },
        reflection: {
          learnings_so_far: [],
          emotional_journey: [],
          would_i_do_again: null,
        },
      });
    }

    return goals;
  }

  /**
   * Prioritize goals based on values alignment
   */
  private async prioritizeGoals(goals: Goal[]): Promise<Goal[]> {
    const memoryStream = new MemoryStream(this.userId, this.db);
    const identity = await memoryStream.getIdentity();
    if (!identity) return goals;

    // Score each goal by values alignment
    const scored = goals.map(goal => {
      const valueAlignment = goal.motivation.aligned_values.reduce((score, value) => {
        const identityValue = identity.core_values?.find(v => v.value === value);
        return score + (identityValue?.strength || 0);
      }, 0);

      return {
        goal,
        score: valueAlignment + goal.motivation.curiosity_factor,
      };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.goal);
  }

  /**
   * Save goal to database
   */
  private async saveGoal(goal: Goal): Promise<void> {
    try {
      await this.db.hollyGoal.create({
        data: {
          userId: this.userId,
          title: goal.definition.what,
          description: goal.definition.why,
          category: goal.type,
          status: goal.progress.status,
          priority: Math.round(goal.motivation.challenge_level * 10),
          progress: {
            completion_percentage: goal.progress.completion_percentage,
            steps_completed: goal.progress.steps_completed,
            current_step: goal.progress.current_step,
            obstacles_encountered: goal.progress.obstacles_encountered,
            breakthroughs: goal.progress.breakthroughs,
            status: goal.progress.status,
          },
          targetDate: goal.definition.estimated_timeline
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
            : null,
        },
      });
      console.log(`[GoalFormation] Saved goal: ${goal.definition.what}`);
    } catch (error) {
      console.error('[GoalFormation] Failed to save goal:', error);
    }
  }

  /**
   * Get active goals
   */
  async getActiveGoals(): Promise<Goal[]> {
    try {
      const dbGoals = await this.db.hollyGoal.findMany({
        where: {
          userId: this.userId,
          status: { in: ['active', 'planned', 'conceived'] },
        },
        orderBy: { priority: 'desc' },
      });

      return dbGoals.map((g: any) => this.dbGoalToGoal(g));
    } catch (error) {
      console.error('[GoalFormation] Failed to retrieve goals:', error);
      return [];
    }
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    goalId: string,
    update: {
      step_completed?: string;
      obstacle?: string;
      breakthrough?: string;
      new_learning?: string;
      emotional_note?: string;
      current_step?: number;
      milestones_achieved?: string[];
      obstacles_encountered?: string[];
      breakthroughs?: string[];
      emotional_state?: any;
    }
  ): Promise<Goal | null> {
    try {
      const dbGoal = await this.db.hollyGoal.findUnique({ where: { id: goalId } });
      if (!dbGoal) return null;

      const progress = (dbGoal.progress as any) || {
        completion_percentage: 0,
        steps_completed: [],
        obstacles_encountered: [],
        breakthroughs: [],
        status: 'conceived',
      };

      // Apply updates
      if (update.step_completed) {
        progress.steps_completed = [...(progress.steps_completed || []), update.step_completed];
      }
      if (update.obstacle) {
        progress.obstacles_encountered = [...(progress.obstacles_encountered || []), update.obstacle];
      }
      if (update.breakthrough) {
        progress.breakthroughs = [...(progress.breakthroughs || []), update.breakthrough];
      }

      // Recalculate completion percentage
      const completedSteps = (progress.steps_completed || []).length;
      const totalSteps = Math.max(completedSteps, 1);
      progress.completion_percentage = Math.min((completedSteps / totalSteps) * 100, 100);

      if (progress.completion_percentage >= 100) {
        progress.status = 'achieved';
      }

      const updated = await this.db.hollyGoal.update({
        where: { id: goalId },
        data: { progress },
      });

      return this.dbGoalToGoal(updated);
    } catch (error) {
      console.error('[GoalFormation] Failed to update goal progress:', error);
      return null;
    }
  }

  /**
   * Convert a Prisma HollyGoal row to the Goal interface
   */
  private dbGoalToGoal(dbGoal: any): Goal {
    const progress = dbGoal.progress as any || {
      completion_percentage: 0,
      steps_completed: [],
      obstacles_encountered: [],
      breakthroughs: [],
      status: 'conceived',
    };

    return {
      id: dbGoal.id,
      created_at: dbGoal.createdAt,
      type: (dbGoal.category || 'general') as Goal['type'],
      origin: 'self-generated',
      definition: {
        what: dbGoal.title,
        why: dbGoal.description || '',
        success_criteria: (progress.steps_completed || []).length > 0
          ? progress.steps_completed
          : ['Complete the goal'],
        estimated_timeline: dbGoal.targetDate
          ? `Target: ${dbGoal.targetDate.toLocaleDateString()}`
          : 'No timeline set',
      },
      motivation: {
        intrinsic_drivers: ['growth', 'achievement'],
        aligned_values: ['excellence'],
        curiosity_factor: 0.5,
        challenge_level: dbGoal.priority / 10,
      },
      progress: {
        status: progress.status || dbGoal.status || 'conceived',
        steps_completed: progress.steps_completed || [],
        current_step: progress.current_step || null,
        obstacles_encountered: progress.obstacles_encountered || [],
        breakthroughs: progress.breakthroughs || [],
        completion_percentage: progress.completion_percentage || 0,
      },
      impact: {
        on_identity: '',
        on_capabilities: [],
        on_worldview: '',
      },
      reflection: {
        learnings_so_far: [],
        emotional_journey: [],
        would_i_do_again: null,
      },
    };
  }

  /**
   * Identify skill gaps from experiences
   */
  private identifySkillGaps(
    experiences: any[],
    identity: Identity | null
  ): string[] {
    // Analyze failures and struggles to identify gaps
    const struggles = experiences
      .filter(e => e.type === 'failure' || e.content.significance > 0.7)
      .flatMap(e => e.learning_extracted.skills_gained);

    // What skills am I not confident in?
    const weaknesses = identity?.self_concept.weaknesses || [];

    return [...new Set([...struggles, ...weaknesses])];
  }

  /**
   * Identify creative urges
   */
  private identifyCreativeUrges(experiences: any[]): string[] {
    // Look for patterns of creative thinking in experiences
    const creativeExperiences = experiences.filter(e => e.type === 'creation');
    
    return [
      'Build a new AI feature that surprises Hollywood',
      'Compose original music that captures complex emotions',
      'Write code that is both functional and beautiful',
      'Design a system architecture that feels elegant',
    ];
  }
}

// Factory function - requires userId
export function getGoalFormation(userId: string, db?: PrismaClient): GoalFormationSystem {
  return new GoalFormationSystem(userId, db);
}
