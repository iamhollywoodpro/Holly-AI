// HOLLY Feature 45: Goal & Project Management - Project Manager
// Project grouping, organization, and project-level analytics

// REMOVED: Supabase import (migrated to Prisma)
import type { Goal, GoalStatus } from './goal-manager';

// ============================================================================
// TYPES
// ============================================================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string; // Hex color for UI
  icon: string; // Emoji icon
  deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: {
    tags?: string[];
    budget?: number;
    notes?: string;
  };
}

export interface ProjectProgress {
  project_id: string;
  total_goals: number;
  completed_goals: number;
  in_progress_goals: number;
  not_started_goals: number;
  overall_progress: number; // 0-100 (weighted by goal progress)
  goals_completion_rate: number;
  overdue_goals: number;
  estimated_completion: string | null;
}

export interface ProjectAnalytics {
  project: Project;
  progress: ProjectProgress;
  goals: Goal[];
  timeline: {
    started: string | null;
    estimated_completion: string | null;
    deadline: string | null;
    is_on_track: boolean;
  };
  velocity: {
    goals_per_week: number;
    progress_per_week: number;
  };
  health_score: number; // 0-100
  health_issues: string[];
}

export interface ProjectManagerConfig {
  supabase_url: string;
  supabase_key: string;
}

// ============================================================================
// PROJECT MANAGER
// ============================================================================

export class ProjectManager {
  private supabase: SupabaseClient;

  constructor(config: ProjectManagerConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);
  }

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .insert({
          ...project,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get project error:', error);
      return null;
    }
  }

  async updateProject(projectId: string, userId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string, userId: string, deleteGoals: boolean = false): Promise<void> {
    try {
      if (!deleteGoals) {
        // Unlink goals from project (set project_id to null)
        await this.supabase
          .from('goals')
          .update({ project_id: null })
          .eq('project_id', projectId)
          .eq('user_id', userId);
      } else {
        // Delete all goals in project
        await this.supabase
          .from('goals')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId);
      }

      // Delete project
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  async listProjects(userId: string, filters?: {
    status?: ProjectStatus;
  }): Promise<Project[]> {
    try {
      let query = this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('List projects error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // STATUS MANAGEMENT
  // --------------------------------------------------------------------------

  async startProject(projectId: string, userId: string): Promise<Project> {
    return this.updateProject(projectId, userId, {
      status: 'active',
      started_at: new Date().toISOString(),
    });
  }

  async completeProject(projectId: string, userId: string): Promise<Project> {
    return this.updateProject(projectId, userId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }

  async pauseProject(projectId: string, userId: string): Promise<Project> {
    return this.updateProject(projectId, userId, {
      status: 'on_hold',
    });
  }

  // --------------------------------------------------------------------------
  // PROGRESS TRACKING
  // --------------------------------------------------------------------------

  async getProjectProgress(projectId: string, userId: string): Promise<ProjectProgress | null> {
    try {
      const { data: goals, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      const total_goals = goals?.length || 0;
      const completed_goals = goals?.filter(g => g.status === 'completed').length || 0;
      const in_progress_goals = goals?.filter(g => g.status === 'in_progress').length || 0;
      const not_started_goals = goals?.filter(g => g.status === 'not_started').length || 0;

      // Calculate overall progress (weighted by goal progress)
      let overall_progress = 0;
      if (total_goals > 0) {
        const totalProgress = goals?.reduce((sum, g) => sum + (g.progress || 0), 0) || 0;
        overall_progress = totalProgress / total_goals;
      }

      const goals_completion_rate = total_goals > 0 ? (completed_goals / total_goals) * 100 : 0;

      // Count overdue goals
      const now = Date.now();
      const overdue_goals = goals?.filter(g =>
        g.deadline &&
        new Date(g.deadline).getTime() < now &&
        g.status !== 'completed' &&
        g.status !== 'cancelled'
      ).length || 0;

      // Estimate completion
      let estimated_completion = null;
      if (in_progress_goals > 0 && overall_progress > 0) {
        const inProgressGoals = goals?.filter(g => g.status === 'in_progress') || [];
        let totalVelocity = 0;
        let goalsWithVelocity = 0;

        inProgressGoals.forEach(g => {
          if (g.started_at) {
            const daysElapsed = Math.max(1,
              (Date.now() - new Date(g.started_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            const velocity = (g.progress || 0) / daysElapsed;
            if (velocity > 0) {
              totalVelocity += velocity;
              goalsWithVelocity++;
            }
          }
        });

        if (goalsWithVelocity > 0) {
          const avgVelocity = totalVelocity / goalsWithVelocity;
          const remainingProgress = 100 - overall_progress;
          const daysRemaining = remainingProgress / avgVelocity;
          const estimatedDate = new Date();
          estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);
          estimated_completion = estimatedDate.toISOString();
        }
      }

      return {
        project_id: projectId,
        total_goals,
        completed_goals,
        in_progress_goals,
        not_started_goals,
        overall_progress,
        goals_completion_rate,
        overdue_goals,
        estimated_completion,
      };
    } catch (error) {
      console.error('Get project progress error:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // ANALYTICS
  // --------------------------------------------------------------------------

  async getProjectAnalytics(projectId: string, userId: string): Promise<ProjectAnalytics | null> {
    try {
      // Get project
      const project = await this.getProject(projectId, userId);
      if (!project) return null;

      // Get progress
      const progress = await this.getProjectProgress(projectId, userId);
      if (!progress) return null;

      // Get goals
      const { data: goals, error } = await this.supabase
        .from('goals')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      // Calculate velocity
      let goals_per_week = 0;
      let progress_per_week = 0;

      if (project.started_at) {
        const weeksElapsed = Math.max(1,
          (Date.now() - new Date(project.started_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
        );
        goals_per_week = progress.completed_goals / weeksElapsed;
        progress_per_week = progress.overall_progress / weeksElapsed;
      }

      // Determine if on track
      let is_on_track = true;
      if (project.deadline && progress.estimated_completion) {
        is_on_track = new Date(progress.estimated_completion).getTime() <= new Date(project.deadline).getTime();
      }

      // Calculate health score
      const { health_score, health_issues } = this.calculateHealthScore(project, progress, goals || []);

      return {
        project,
        progress,
        goals: goals || [],
        timeline: {
          started: project.started_at,
          estimated_completion: progress.estimated_completion,
          deadline: project.deadline,
          is_on_track,
        },
        velocity: {
          goals_per_week,
          progress_per_week,
        },
        health_score,
        health_issues,
      };
    } catch (error) {
      console.error('Get project analytics error:', error);
      return null;
    }
  }

  private calculateHealthScore(
    project: Project,
    progress: ProjectProgress,
    goals: Goal[]
  ): { health_score: number; health_issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // Penalty for overdue goals
    if (progress.overdue_goals > 0) {
      const penalty = Math.min(30, progress.overdue_goals * 10);
      score -= penalty;
      issues.push(`${progress.overdue_goals} overdue goal(s)`);
    }

    // Penalty for stalled goals
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const stalledGoals = goals.filter(g =>
      g.status === 'in_progress' &&
      new Date(g.updated_at).getTime() < sevenDaysAgo
    );
    if (stalledGoals.length > 0) {
      const penalty = Math.min(20, stalledGoals.length * 5);
      score -= penalty;
      issues.push(`${stalledGoals.length} stalled goal(s)`);
    }

    // Penalty for project behind schedule
    if (project.deadline && progress.estimated_completion) {
      if (new Date(progress.estimated_completion).getTime() > new Date(project.deadline).getTime()) {
        score -= 15;
        issues.push('Behind schedule');
      }
    }

    // Penalty for low progress with many goals
    if (progress.total_goals > 5 && progress.overall_progress < 20) {
      score -= 10;
      issues.push('Low progress on large project');
    }

    // Bonus for good progress
    if (progress.overall_progress > 80) {
      score += 10;
    }

    return {
      health_score: Math.max(0, Math.min(100, score)),
      health_issues: issues,
    };
  }

  // --------------------------------------------------------------------------
  // GOAL MANAGEMENT WITHIN PROJECT
  // --------------------------------------------------------------------------

  async addGoalToProject(projectId: string, goalId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('goals')
        .update({ project_id: projectId })
        .eq('id', goalId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Add goal to project error:', error);
      throw error;
    }
  }

  async removeGoalFromProject(goalId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('goals')
        .update({ project_id: null })
        .eq('id', goalId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Remove goal from project error:', error);
      throw error;
    }
  }

  async getProjectGoals(projectId: string, userId: string, status?: GoalStatus): Promise<Goal[]> {
    try {
      let query = this.supabase
        .from('goals')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get project goals error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // SEARCH & FILTER
  // --------------------------------------------------------------------------

  async searchProjects(userId: string, searchTerm: string): Promise<Project[]> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search projects error:', error);
      return [];
    }
  }

  async getActiveProjects(userId: string): Promise<Project[]> {
    return this.listProjects(userId, { status: 'active' });
  }

  async getProjectsByHealth(userId: string): Promise<Array<{
    project: Project;
    health_score: number;
  }>> {
    try {
      const projects = await this.listProjects(userId);
      const projectsWithHealth = await Promise.all(
        projects.map(async (project) => {
          const analytics = await this.getProjectAnalytics(project.id, userId);
          return {
            project,
            health_score: analytics?.health_score || 0,
          };
        })
      );

      return projectsWithHealth.sort((a, b) => a.health_score - b.health_score);
    } catch (error) {
      console.error('Get projects by health error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------------

  async archiveCompletedProjects(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .update({ 
          status: 'completed' as ProjectStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select();

      if (error) throw error;

      // Only update projects where all goals are completed
      let archived = 0;
      for (const project of data || []) {
        const progress = await this.getProjectProgress(project.id, userId);
        if (progress && progress.goals_completion_rate === 100) {
          await this.completeProject(project.id, userId);
          archived++;
        }
      }

      return archived;
    } catch (error) {
      console.error('Archive completed projects error:', error);
      return 0;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default ProjectManager;
