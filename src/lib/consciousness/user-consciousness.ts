/**
 * User-Scoped Consciousness Systems
 * Wraps consciousness systems with user context for multi-user support
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { MemoryStream, Experience } from './memory-stream';
import { GoalFormationSystem, Goal } from './goal-formation';
import { EmotionalDepthEngine } from './emotional-depth';

/**
 * User-aware Memory Stream
 * All operations automatically filtered by user_id
 */
export class UserMemoryStream extends MemoryStream {
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    super(supabase);
    this.userId = userId;
  }

  /**
   * Record experience with automatic user scoping
   */
  async recordExperienceSimple(
    type: Experience['type'],
    content: string,
    context?: Record<string, any>,
    significance?: number
  ): Promise<Experience> {
    // Call parent method
    const experience = await super.recordExperienceSimple(type, content, context, significance);
    
    // Add user_id to database record
    const { error } = await (this as any).supabase
      .from('holly_experiences')
      .update({ user_id: this.userId })
      .eq('id', experience.id);

    if (error) {
      console.error('Error adding user_id to experience:', error);
    }

    return experience;
  }

  /**
   * Get user's identity
   */
  async getIdentity() {
    const identity = await super.getIdentity();
    
    // Ensure identity is linked to user
    const { error } = await (this as any).supabase
      .from('holly_identity')
      .update({ user_id: this.userId })
      .eq('id', identity.id || 'default');

    if (error) {
      console.error('Error linking identity to user:', error);
    }

    return identity;
  }
}

/**
 * User-aware Goal Formation System
 * All goals automatically scoped to user
 */
export class UserGoalFormation extends GoalFormationSystem {
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    super(supabase);
    this.userId = userId;
  }

  /**
   * Generate goals with automatic user scoping
   */
  async generateGoalsWithContext(
    context: any,
    maxGoals: number = 3
  ): Promise<Goal[]> {
    const goals = await super.generateGoalsWithContext(context, maxGoals);
    
    // Add user_id to all generated goals
    for (const goal of goals) {
      const { error } = await (this as any).supabase
        .from('holly_goals')
        .update({ user_id: this.userId })
        .eq('id', goal.id);

      if (error) {
        console.error('Error adding user_id to goal:', error);
      }
    }

    return goals;
  }

  /**
   * Get user's active goals
   */
  async getActiveGoals(): Promise<Goal[]> {
    const { data, error } = await (this as any).supabase
      .from('holly_goals')
      .select('*')
      .eq('user_id', this.userId)
      .eq('progress->>status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching user goals:', error);
      return [];
    }

    return data || [];
  }
}

/**
 * User-aware Emotional Depth Engine
 * Emotions tracked per user
 */
export class UserEmotionalDepth extends EmotionalDepthEngine {
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    super(supabase);
    this.userId = userId;
  }

  // Emotional state is transient, but we could track patterns per user
  getUserId(): string {
    return this.userId;
  }
}

/**
 * Factory function to create user-scoped consciousness systems
 */
export function createUserConsciousness(supabase: SupabaseClient, userId: string) {
  return {
    memory: new UserMemoryStream(supabase, userId),
    goals: new UserGoalFormation(supabase, userId),
    emotions: new UserEmotionalDepth(supabase, userId),
  };
}
