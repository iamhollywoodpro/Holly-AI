// HOLLY Feature 45: Goal & Project Management - Milestone Tracker
// Milestone tracking, dependencies, and critical path analysis

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description: string;
  order: number; // Display order
  completed: boolean;
  completion_date: string | null;
  created_at: string;
  updated_at: string;
  metadata: {
    estimated_hours?: number;
    actual_hours?: number;
    notes?: string;
  };
}

export type DependencyType = 'blocks' | 'related_to';

export interface GoalDependency {
  id: string;
  goal_id: string; // The goal that has a dependency
  depends_on_goal_id: string; // The goal it depends on
  dependency_type: DependencyType;
  user_id: string;
  created_at: string;
}

export interface DependencyGraph {
  goal_id: string;
  dependencies: string[]; // Goals this depends on
  dependents: string[]; // Goals that depend on this
  can_start: boolean;
  blocking: string[]; // Goals this is blocking
  critical_path: boolean;
}

export interface MilestoneTrackerConfig {
  supabase_url: string;
  supabase_key: string;
}

// ============================================================================
// MILESTONE TRACKER
// ============================================================================

export class MilestoneTracker {
  private supabase: SupabaseClient;

  constructor(config: MilestoneTrackerConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);
  }

  // --------------------------------------------------------------------------
  // MILESTONE CRUD
  // --------------------------------------------------------------------------

  async createMilestone(milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>): Promise<Milestone> {
    try {
      const { data, error } = await this.supabase
        .from('milestones')
        .insert({
          ...milestone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create milestone error:', error);
      throw error;
    }
  }

  async getMilestone(milestoneId: string, userId: string): Promise<Milestone | null> {
    try {
      const { data, error } = await this.supabase
        .from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get milestone error:', error);
      return null;
    }
  }

  async updateMilestone(milestoneId: string, userId: string, updates: Partial<Milestone>): Promise<Milestone> {
    try {
      const { data, error } = await this.supabase
        .from('milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update milestone error:', error);
      throw error;
    }
  }

  async deleteMilestone(milestoneId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete milestone error:', error);
      throw error;
    }
  }

  async listMilestones(goalId: string, userId: string): Promise<Milestone[]> {
    try {
      const { data, error } = await this.supabase
        .from('milestones')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .order('order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('List milestones error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // MILESTONE COMPLETION
  // --------------------------------------------------------------------------

  async completeMilestone(milestoneId: string, userId: string): Promise<Milestone> {
    return this.updateMilestone(milestoneId, userId, {
      completed: true,
      completion_date: new Date().toISOString(),
    });
  }

  async uncompleteMilestone(milestoneId: string, userId: string): Promise<Milestone> {
    return this.updateMilestone(milestoneId, userId, {
      completed: false,
      completion_date: null,
    });
  }

  async bulkCompleteMilestones(milestoneIds: string[], userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('milestones')
        .update({
          completed: true,
          completion_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', milestoneIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Bulk complete milestones error:', error);
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // MILESTONE REORDERING
  // --------------------------------------------------------------------------

  async reorderMilestones(goalId: string, userId: string, milestoneIds: string[]): Promise<void> {
    try {
      // Update each milestone with new order
      for (let i = 0; i < milestoneIds.length; i++) {
        await this.supabase
          .from('milestones')
          .update({ 
            order: i,
            updated_at: new Date().toISOString(),
          })
          .eq('id', milestoneIds[i])
          .eq('goal_id', goalId)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Reorder milestones error:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // DEPENDENCY MANAGEMENT
  // --------------------------------------------------------------------------

  async createDependency(dependency: Omit<GoalDependency, 'id' | 'created_at'>): Promise<GoalDependency> {
    try {
      // Check for circular dependencies
      const hasCircular = await this.checkCircularDependency(
        dependency.goal_id,
        dependency.depends_on_goal_id,
        dependency.user_id
      );

      if (hasCircular) {
        throw new Error('Circular dependency detected');
      }

      const { data, error } = await this.supabase
        .from('goal_dependencies')
        .insert({
          ...dependency,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create dependency error:', error);
      throw error;
    }
  }

  async deleteDependency(dependencyId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('goal_dependencies')
        .delete()
        .eq('id', dependencyId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete dependency error:', error);
      throw error;
    }
  }

  async getDependencies(goalId: string, userId: string): Promise<GoalDependency[]> {
    try {
      const { data, error } = await this.supabase
        .from('goal_dependencies')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get dependencies error:', error);
      return [];
    }
  }

  async getDependents(goalId: string, userId: string): Promise<GoalDependency[]> {
    try {
      const { data, error } = await this.supabase
        .from('goal_dependencies')
        .select('*')
        .eq('depends_on_goal_id', goalId)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get dependents error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // DEPENDENCY ANALYSIS
  // --------------------------------------------------------------------------

  async getDependencyGraph(goalId: string, userId: string): Promise<DependencyGraph> {
    try {
      const dependencies = await this.getDependencies(goalId, userId);
      const dependents = await this.getDependents(goalId, userId);

      // Get blocking dependencies (type = 'blocks')
      const blocking = dependents
        .filter(d => d.dependency_type === 'blocks')
        .map(d => d.goal_id);

      // Check if can start (all blocking dependencies are completed)
      let can_start = true;
      for (const dep of dependencies) {
        if (dep.dependency_type === 'blocks') {
          const { data: dependencyGoal } = await this.supabase
            .from('goals')
            .select('status')
            .eq('id', dep.depends_on_goal_id)
            .single();

          if (dependencyGoal && dependencyGoal.status !== 'completed') {
            can_start = false;
            break;
          }
        }
      }

      // Check if on critical path (has blocking dependents)
      const critical_path = blocking.length > 0;

      return {
        goal_id: goalId,
        dependencies: dependencies.map(d => d.depends_on_goal_id),
        dependents: dependents.map(d => d.goal_id),
        can_start,
        blocking,
        critical_path,
      };
    } catch (error) {
      console.error('Get dependency graph error:', error);
      return {
        goal_id: goalId,
        dependencies: [],
        dependents: [],
        can_start: true,
        blocking: [],
        critical_path: false,
      };
    }
  }

  private async checkCircularDependency(
    goalId: string,
    dependsOnGoalId: string,
    userId: string,
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    // If we've seen this goal before, we have a cycle
    if (visited.has(dependsOnGoalId)) {
      return true;
    }

    // If the dependency points back to the original goal, we have a cycle
    if (dependsOnGoalId === goalId) {
      return true;
    }

    visited.add(dependsOnGoalId);

    // Get all dependencies of the depends_on_goal
    const dependencies = await this.getDependencies(dependsOnGoalId, userId);

    // Recursively check each dependency
    for (const dep of dependencies) {
      if (await this.checkCircularDependency(goalId, dep.depends_on_goal_id, userId, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  async getCriticalPath(projectId: string, userId: string): Promise<string[]> {
    try {
      // Get all goals in project
      const { data: goals, error } = await this.supabase
        .from('goals')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error || !goals) return [];

      const goalIds = goals.map(g => g.id);
      const criticalPathGoals: string[] = [];

      // Find goals that are on critical path (have blocking dependents)
      for (const goalId of goalIds) {
        const graph = await this.getDependencyGraph(goalId, userId);
        if (graph.critical_path) {
          criticalPathGoals.push(goalId);
        }
      }

      return criticalPathGoals;
    } catch (error) {
      console.error('Get critical path error:', error);
      return [];
    }
  }

  async getBlockedGoals(userId: string): Promise<string[]> {
    try {
      const { data: goals, error } = await this.supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .in('status', ['not_started', 'in_progress']);

      if (error || !goals) return [];

      const blockedGoals: string[] = [];

      for (const goal of goals) {
        const graph = await this.getDependencyGraph(goal.id, userId);
        if (!graph.can_start) {
          blockedGoals.push(goal.id);
        }
      }

      return blockedGoals;
    } catch (error) {
      console.error('Get blocked goals error:', error);
      return [];
    }
  }

  async getReadyToStartGoals(userId: string): Promise<string[]> {
    try {
      const { data: goals, error } = await this.supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'not_started');

      if (error || !goals) return [];

      const readyGoals: string[] = [];

      for (const goal of goals) {
        const graph = await this.getDependencyGraph(goal.id, userId);
        if (graph.can_start) {
          readyGoals.push(goal.id);
        }
      }

      return readyGoals;
    } catch (error) {
      console.error('Get ready to start goals error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // BATCH OPERATIONS
  // --------------------------------------------------------------------------

  async bulkCreateMilestones(milestones: Array<Omit<Milestone, 'id' | 'created_at' | 'updated_at'>>): Promise<Milestone[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await this.supabase
        .from('milestones')
        .insert(
          milestones.map(m => ({
            ...m,
            created_at: now,
            updated_at: now,
          }))
        )
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Bulk create milestones error:', error);
      return [];
    }
  }

  async bulkDeleteMilestones(milestoneIds: string[], userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('milestones')
        .delete()
        .in('id', milestoneIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Bulk delete milestones error:', error);
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // MILESTONE TEMPLATES
  // --------------------------------------------------------------------------

  async createMilestoneTemplate(goalId: string, userId: string, templateName: string): Promise<Milestone[]> {
    const templates: Record<string, string[]> = {
      software_project: [
        'Requirements & Planning',
        'Design & Architecture',
        'Core Development',
        'Testing & QA',
        'Deployment & Launch',
      ],
      learning: [
        'Identify Resources',
        'Complete Fundamentals',
        'Build Practice Projects',
        'Master Advanced Concepts',
        'Apply in Real World',
      ],
      fitness: [
        'Establish Baseline',
        'Build Consistency',
        'Increase Intensity',
        'Track Progress',
        'Achieve Target',
      ],
      career: [
        'Skill Assessment',
        'Learn Required Skills',
        'Build Portfolio',
        'Network & Apply',
        'Land Opportunity',
      ],
      default: [
        'Phase 1: Planning',
        'Phase 2: Execution',
        'Phase 3: Review',
        'Phase 4: Completion',
      ],
    };

    const milestoneNames = templates[templateName] || templates.default;

    const milestones = milestoneNames.map((name, index) => ({
      goal_id: goalId,
      user_id: userId,
      title: name,
      description: '',
      order: index,
      completed: false,
      completion_date: null,
      metadata: {},
    }));

    return this.bulkCreateMilestones(milestones);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default MilestoneTracker;
