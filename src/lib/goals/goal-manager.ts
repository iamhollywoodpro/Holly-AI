// HOLLY Feature 45: Goal & Project Management - Goal Manager
// Core goal operations: CRUD, progress tracking, status management

// REMOVED: Supabase import (migrated to Prisma)

// ============================================================================
// TYPES
// ============================================================================

export type GoalStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalCategory = 'career' | 'personal' | 'health' | 'financial' | 'learning' | 'creative' | 'other';

export interface Goal {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number; // 0-100
  deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: {
    estimated_hours?: number;
    actual_hours?: number;
    tags?: string[];
    notes?: string;
  };
}

export interface GoalProgress {
  goal_id: string;
  progress: number;
  milestones_completed: number;
  milestones_total: number;
  tasks_completed: number;
  tasks_total: number;
  last_activity: string;
  velocity: number; // Progress per day
  estimated_completion: string | null;
}

export interface GoalAnalytics {
  total_goals: number;
  completed_goals: number;
  in_progress_goals: number;
  completion_rate: number;
  average_time_to_complete: number; // days
  goals_by_category: Record<GoalCategory, number>;
  goals_by_priority: Record<GoalPriority, number>;
  overdue_goals: number;
  stalled_goals: number; // No progress in 7+ days
}

export interface GoalManagerConfig {
  supabase_url: string;
  supabase_key: string;
}

// ============================================================================
// GOAL MANAGER
// ============================================================================

export class GoalManager {
  private supabase: SupabaseClient;

  constructor(config: GoalManagerConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);
  }

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  async createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal> {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .insert({
          ...goal,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create goal error:', error);
      throw error;
    }
  }

  async getGoal(goalId: string, userId: string): Promise<Goal | null> {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get goal error:', error);
      return null;
    }
  }

  async updateGoal(goalId: string, userId: string, updates: Partial<Goal>): Promise<Goal> {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update goal error:', error);
      throw error;
    }
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete goal error:', error);
      throw error;
    }
  }

  async listGoals(userId: string, filters?: {
    project_id?: string;
    status?: GoalStatus;
    category?: GoalCategory;
    priority?: GoalPriority;
  }): Promise<Goal[]> {
    try {
      let query = this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('List goals error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // STATUS MANAGEMENT
  // --------------------------------------------------------------------------

  async startGoal(goalId: string, userId: string): Promise<Goal> {
    return this.updateGoal(goalId, userId, {
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });
  }

  async completeGoal(goalId: string, userId: string): Promise<Goal> {
    return this.updateGoal(goalId, userId, {
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    });
  }

  async pauseGoal(goalId: string, userId: string): Promise<Goal> {
    return this.updateGoal(goalId, userId, {
      status: 'on_hold',
    });
  }

  async cancelGoal(goalId: string, userId: string): Promise<Goal> {
    return this.updateGoal(goalId, userId, {
      status: 'cancelled',
    });
  }

  // --------------------------------------------------------------------------
  // PROGRESS TRACKING
  // --------------------------------------------------------------------------

  async updateProgress(goalId: string, userId: string, progress: number): Promise<Goal> {
    try {
      // Clamp progress between 0-100
      const clampedProgress = Math.max(0, Math.min(100, progress));

      // Auto-complete if progress reaches 100
      const updates: Partial<Goal> = {
        progress: clampedProgress,
      };

      if (clampedProgress === 100) {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      } else if (clampedProgress > 0) {
        // Auto-start if not started
        const goal = await this.getGoal(goalId, userId);
        if (goal && goal.status === 'not_started') {
          updates.status = 'in_progress';
          updates.started_at = new Date().toISOString();
        }
      }

      return this.updateGoal(goalId, userId, updates);
    } catch (error) {
      console.error('Update progress error:', error);
      throw error;
    }
  }

  async getGoalProgress(goalId: string, userId: string): Promise<GoalProgress | null> {
    try {
      // Get goal
      const goal = await this.getGoal(goalId, userId);
      if (!goal) return null;

      // Get milestones
      const { data: milestones } = await this.supabase
        .from('milestones')
        .select('*')
        .eq('goal_id', goalId);

      const milestones_total = milestones?.length || 0;
      const milestones_completed = milestones?.filter(m => m.completed).length || 0;

      // Calculate velocity (progress per day since started)
      let velocity = 0;
      let estimated_completion = null;

      if (goal.started_at && goal.status === 'in_progress') {
        const daysElapsed = Math.max(1, 
          (Date.now() - new Date(goal.started_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        velocity = goal.progress / daysElapsed;

        // Estimate completion
        if (velocity > 0) {
          const daysRemaining = (100 - goal.progress) / velocity;
          const estimatedDate = new Date();
          estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);
          estimated_completion = estimatedDate.toISOString();
        }
      }

      // Get last activity (most recent milestone or goal update)
      const last_activity = goal.updated_at;

      return {
        goal_id: goalId,
        progress: goal.progress,
        milestones_completed,
        milestones_total,
        tasks_completed: 0, // TODO: Implement task tracking
        tasks_total: 0,
        last_activity,
        velocity,
        estimated_completion,
      };
    } catch (error) {
      console.error('Get goal progress error:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // ANALYTICS
  // --------------------------------------------------------------------------

  async getAnalytics(userId: string, options?: {
    project_id?: string;
    since?: string; // ISO date
  }): Promise<GoalAnalytics> {
    try {
      let query = this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);

      if (options?.project_id) {
        query = query.eq('project_id', options.project_id);
      }
      if (options?.since) {
        query = query.gte('created_at', options.since);
      }

      const { data: goals, error } = await query;

      if (error) throw error;

      const total_goals = goals?.length || 0;
      const completed_goals = goals?.filter(g => g.status === 'completed').length || 0;
      const in_progress_goals = goals?.filter(g => g.status === 'in_progress').length || 0;
      const completion_rate = total_goals > 0 ? (completed_goals / total_goals) * 100 : 0;

      // Average time to complete
      const completedWithDates = goals?.filter(
        g => g.status === 'completed' && g.started_at && g.completed_at
      ) || [];
      
      let average_time_to_complete = 0;
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, g) => {
          const start = new Date(g.started_at!).getTime();
          const end = new Date(g.completed_at!).getTime();
          const days = (end - start) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        average_time_to_complete = totalDays / completedWithDates.length;
      }

      // Goals by category
      const goals_by_category: Record<GoalCategory, number> = {
        career: 0,
        personal: 0,
        health: 0,
        financial: 0,
        learning: 0,
        creative: 0,
        other: 0,
      };
      goals?.forEach(g => {
        goals_by_category[g.category] = (goals_by_category[g.category] || 0) + 1;
      });

      // Goals by priority
      const goals_by_priority: Record<GoalPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      goals?.forEach(g => {
        goals_by_priority[g.priority] = (goals_by_priority[g.priority] || 0) + 1;
      });

      // Overdue goals
      const now = Date.now();
      const overdue_goals = goals?.filter(g => 
        g.deadline && 
        new Date(g.deadline).getTime() < now &&
        g.status !== 'completed' &&
        g.status !== 'cancelled'
      ).length || 0;

      // Stalled goals (no update in 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const stalled_goals = goals?.filter(g =>
        g.status === 'in_progress' &&
        new Date(g.updated_at).getTime() < sevenDaysAgo
      ).length || 0;

      return {
        total_goals,
        completed_goals,
        in_progress_goals,
        completion_rate,
        average_time_to_complete,
        goals_by_category,
        goals_by_priority,
        overdue_goals,
        stalled_goals,
      };
    } catch (error) {
      console.error('Get analytics error:', error);
      return {
        total_goals: 0,
        completed_goals: 0,
        in_progress_goals: 0,
        completion_rate: 0,
        average_time_to_complete: 0,
        goals_by_category: {
          career: 0,
          personal: 0,
          health: 0,
          financial: 0,
          learning: 0,
          creative: 0,
          other: 0,
        },
        goals_by_priority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        overdue_goals: 0,
        stalled_goals: 0,
      };
    }
  }

  // --------------------------------------------------------------------------
  // SEARCH & FILTER
  // --------------------------------------------------------------------------

  async searchGoals(userId: string, searchTerm: string): Promise<Goal[]> {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search goals error:', error);
      return [];
    }
  }

  async getOverdueGoals(userId: string): Promise<Goal[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .lt('deadline', now)
        .in('status', ['not_started', 'in_progress', 'on_hold'])
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get overdue goals error:', error);
      return [];
    }
  }

  async getStalledGoals(userId: string, daysSinceUpdate: number = 7): Promise<Goal[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceUpdate);

      const { data, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .lt('updated_at', cutoffDate.toISOString())
        .order('updated_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get stalled goals error:', error);
      return [];
    }
  }

  async getUpcomingDeadlines(userId: string, daysAhead: number = 7): Promise<Goal[]> {
    try {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);

      const { data, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .gte('deadline', now.toISOString())
        .lte('deadline', future.toISOString())
        .in('status', ['not_started', 'in_progress', 'on_hold'])
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get upcoming deadlines error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------------

  async bulkUpdateStatus(goalIds: string[], userId: string, status: GoalStatus): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .in('id', goalIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Bulk update status error:', error);
      return 0;
    }
  }

  async bulkDelete(goalIds: string[], userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('goals')
        .delete()
        .in('id', goalIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Bulk delete error:', error);
      return 0;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default GoalManager;
