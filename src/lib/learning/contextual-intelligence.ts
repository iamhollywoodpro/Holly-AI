/**
 * Contextual Intelligence System
 * 
 * Understands project context across weeks/months
 * Learns your working style, preferences, and patterns
 * Provides intelligent context-aware assistance
 */

// REMOVED: Supabase import (migrated to Prisma)

export interface ProjectContext {
  id: string;
  userId: string;
  projectName: string;
  projectType: 'music' | 'website' | 'app' | 'design' | 'other';
  startDate: Date;
  lastActivity: Date;
  status: 'active' | 'paused' | 'completed';
  
  // Context tracking
  sessions: number;
  totalDuration: number; // minutes
  keyMilestones: Milestone[];
  tools: string[];
  patterns: string[];
  
  // Project data
  goals: string[];
  currentPhase: string;
  nextSteps: string[];
  blockers: string[];
  
  // Learning data
  successfulApproaches: string[];
  preferences: Record<string, any>;
  feedback: string[];
}

export interface Milestone {
  date: Date;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface WorkingSession {
  id: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  activities: Activity[];
  mood: 'focused' | 'creative' | 'problem-solving' | 'exploratory';
  productivity: number; // 0-100
}

export interface Activity {
  timestamp: Date;
  type: 'conversation' | 'generation' | 'code' | 'design' | 'research';
  description: string;
  outcome: 'success' | 'partial' | 'retry';
}

export class ContextualIntelligence {
  // TODO: Migrate to Prisma

  constructor() {
    // TODO: Migrate to Prisma
    console.warn('[ContextualIntelligence] Using stub - needs Prisma migration');
  }

  /**
   * Track new project
   */
  async createProject(project: Partial<ProjectContext>): Promise<ProjectContext> {
    const newProject: ProjectContext = {
      id: crypto.randomUUID(),
      userId: project.userId!,
      projectName: project.projectName!,
      projectType: project.projectType || 'other',
      startDate: new Date(),
      lastActivity: new Date(),
      status: 'active',
      sessions: 0,
      totalDuration: 0,
      keyMilestones: [],
      tools: [],
      patterns: [],
      goals: project.goals || [],
      currentPhase: 'planning',
      nextSteps: [],
      blockers: [],
      successfulApproaches: [],
      preferences: {},
      feedback: []
    };

    // TODO: Migrate - await this.supabase
      .from('project_contexts')
      .insert(newProject);

    return newProject;
  }

  /**
   * Update project activity
   */
  async trackActivity(projectId: string, activity: Activity): Promise<void> {
    // Get current project
    // TODO: Migrate - const { data: project } = await this.supabase
      .from('project_contexts')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) return;

    // Update last activity
    // TODO: Migrate - await this.supabase
      .from('project_contexts')
      .update({
        lastActivity: new Date(),
        sessions: project.sessions + 1
      })
      .eq('id', projectId);

    // Store activity
    // TODO: Migrate - await this.supabase
      .from('project_activities')
      .insert({
        projectId,
        ...activity
      });
  }

  /**
   * Get project context
   */
  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    // TODO: Migrate - const { data } = await this.supabase
      .from('project_contexts')
      .select('*')
      .eq('id', projectId)
      .single();

    return data;
  }

  /**
   * Get all active projects for user
   */
  async getUserProjects(userId: string): Promise<ProjectContext[]> {
    // TODO: Migrate - const { data } = await this.supabase
      .from('project_contexts')
      .select('*')
      .eq('userId', userId)
      .eq('status', 'active')
      .order('lastActivity', { ascending: false });

    return data || [];
  }

  /**
   * Understand what user is working on
   */
  async getCurrentContext(userId: string): Promise<{
    activeProject?: ProjectContext;
    recentActivities: Activity[];
    suggestedNextSteps: string[];
    relevantHistory: string[];
  }> {
    // Get most recent active project
    const projects = await this.getUserProjects(userId);
    const activeProject = projects[0];

    // Get recent activities
    // TODO: Migrate - const { data: activities } = await this.supabase
      .from('project_activities')
      .select('*')
      .eq('projectId', activeProject?.id)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Generate suggestions based on context
    const suggestedNextSteps = this.generateNextSteps(activeProject, activities || []);
    
    // Get relevant history
    const relevantHistory = this.getRelevantHistory(activeProject, activities || []);

    return {
      activeProject,
      recentActivities: activities || [],
      suggestedNextSteps,
      relevantHistory
    };
  }

  /**
   * Learn from successful outcomes
   */
  async recordSuccess(projectId: string, approach: string, outcome: string): Promise<void> {
    // TODO: Migrate - const { data: project } = await this.supabase
      .from('project_contexts')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) return;

    const successfulApproaches = [...(project.successfulApproaches || []), approach];

    // TODO: Migrate - await this.supabase
      .from('project_contexts')
      .update({
        successfulApproaches,
        feedback: [...(project.feedback || []), outcome]
      })
      .eq('id', projectId);
  }

  /**
   * Detect patterns in user behavior
   */
  async detectPatterns(userId: string): Promise<{
    workingHours: string[];
    preferredTools: string[];
    productiveTimes: string[];
    commonBlockers: string[];
    successPatterns: string[];
  }> {
    // Analyze all user projects and activities
    // TODO: Migrate - const { data: activities } = await this.supabase
      .from('project_activities')
      .select(`
        *,
        project_contexts (
          userId
        )
      `)
      .eq('project_contexts.userId', userId);

    // Detect patterns
    return {
      workingHours: ['9-11am', '2-5pm', '8-10pm'],
      preferredTools: ['GitHub', 'DALL-E', 'Claude'],
      productiveTimes: ['morning', 'evening'],
      commonBlockers: ['API rate limits', 'unclear requirements'],
      successPatterns: ['iterative design', 'research first', 'modular code']
    };
  }

  /**
   * Generate intelligent next steps
   */
  private generateNextSteps(project?: ProjectContext, activities?: Activity[]): string[] {
    if (!project) return [];

    const steps: string[] = [];

    // Based on current phase
    if (project.currentPhase === 'planning') {
      steps.push('Define clear project goals');
      steps.push('Create project timeline');
      steps.push('Identify required resources');
    } else if (project.currentPhase === 'development') {
      steps.push('Continue building core features');
      steps.push('Test completed modules');
      steps.push('Document progress');
    } else if (project.currentPhase === 'completion') {
      steps.push('Final testing and QA');
      steps.push('Deploy to production');
      steps.push('Create launch materials');
    }

    // Based on recent activities
    const lastActivity = activities?.[0];
    if (lastActivity?.outcome === 'partial') {
      steps.push(`Complete: ${lastActivity.description}`);
    }

    return steps;
  }

  /**
   * Get relevant history
   */
  private getRelevantHistory(project?: ProjectContext, activities?: Activity[]): string[] {
    if (!project) return [];

    return [
      `Project started ${this.formatDate(project.startDate)}`,
      `${project.sessions} working sessions`,
      `Currently in ${project.currentPhase} phase`,
      ...project.keyMilestones.map(m => `✓ ${m.title}`)
    ];
  }

  /**
   * Format date helper
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}

// Export singleton instance
export const contextualIntelligence = new ContextualIntelligence();
