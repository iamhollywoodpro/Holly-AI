// HOLLY Feature 45: Goal & Project Management - Goal Coordinator
// High-level coordinator with AI-powered features

// REMOVED: Supabase import (migrated to Prisma)
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import GoalManager, { Goal } from './goal-manager';
import ProjectManager, { Project } from './project-manager';
import MilestoneTracker, { Milestone } from './milestone-tracker';

// ============================================================================
// TYPES
// ============================================================================

export interface GoalCoordinatorConfig {
  supabase_url: string;
  supabase_key: string;
  groq_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
}

export interface GoalBreakdown {
  goal: string;
  milestones: Array<{
    title: string;
    description: string;
    estimated_hours: number;
  }>;
  estimated_timeline: string;
  recommendations: string[];
}

export interface GoalSuggestion {
  next_actions: string[];
  potential_blockers: string[];
  optimization_tips: string[];
  motivational_message: string;
}

// ============================================================================
// GOAL COORDINATOR
// ============================================================================

export class GoalCoordinator {
  private supabase: SupabaseClient;
  private goalManager: GoalManager;
  private projectManager: ProjectManager;
  private milestoneTracker: MilestoneTracker;
  private groq: Groq | null = null;
  private anthropic: Anthropic | null = null;
  private gemini: GoogleGenerativeAI | null = null;

  constructor(config: GoalCoordinatorConfig) {
    this.supabase = createClient(config.supabase_url, config.supabase_key);
    
    this.goalManager = new GoalManager({
      supabase_url: config.supabase_url,
      supabase_key: config.supabase_key,
    });

    this.projectManager = new ProjectManager({
      supabase_url: config.supabase_url,
      supabase_key: config.supabase_key,
    });

    this.milestoneTracker = new MilestoneTracker({
      supabase_url: config.supabase_url,
      supabase_key: config.supabase_key,
    });

    // Initialize AI clients
    if (config.groq_api_key) {
      this.groq = new Groq({ apiKey: config.groq_api_key });
    }
    if (config.anthropic_api_key) {
      this.anthropic = new Anthropic({ apiKey: config.anthropic_api_key });
    }
    if (config.google_api_key) {
      this.gemini = new GoogleGenerativeAI(config.google_api_key);
    }
  }

  // --------------------------------------------------------------------------
  // AI-POWERED GOAL BREAKDOWN
  // --------------------------------------------------------------------------

  async breakdownGoal(goalTitle: string, goalDescription: string): Promise<GoalBreakdown> {
    try {
      const prompt = `You are a goal planning expert. Break down this goal into actionable milestones.

Goal: "${goalTitle}"
Description: "${goalDescription}"

Provide a JSON response with this structure:
{
  "milestones": [
    {
      "title": "Milestone name",
      "description": "What needs to be accomplished",
      "estimated_hours": number
    }
  ],
  "estimated_timeline": "X weeks/months",
  "recommendations": ["tip 1", "tip 2", "tip 3"]
}

Create 4-6 logical milestones that build toward the goal. Be specific and actionable.`;

      let result = '';

      if (this.groq) {
        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
        });
        result = completion.choices[0]?.message?.content || '{}';
      } else if (this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }],
        });
        result = message.content[0].type === 'text' ? message.content[0].text : '{}';
      } else if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent(prompt);
        result = response.response.text();
      } else {
        throw new Error('No AI provider available');
      }

      // Clean and parse
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        goal: goalTitle,
        milestones: parsed.milestones || [],
        estimated_timeline: parsed.estimated_timeline || 'Unknown',
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('Breakdown goal error:', error);
      // Fallback to basic breakdown
      return {
        goal: goalTitle,
        milestones: [
          { title: 'Phase 1: Planning', description: 'Plan and research', estimated_hours: 10 },
          { title: 'Phase 2: Execution', description: 'Execute main tasks', estimated_hours: 40 },
          { title: 'Phase 3: Review', description: 'Review and adjust', estimated_hours: 10 },
          { title: 'Phase 4: Completion', description: 'Finalize and complete', estimated_hours: 10 },
        ],
        estimated_timeline: '2-3 months',
        recommendations: ['Break tasks into smaller chunks', 'Set regular check-ins', 'Track progress weekly'],
      };
    }
  }

  async createGoalWithAI(
    userId: string,
    goalTitle: string,
    goalDescription: string,
    options?: {
      project_id?: string;
      category?: Goal['category'];
      priority?: Goal['priority'];
      deadline?: string;
    }
  ): Promise<{ goal: Goal; milestones: Milestone[] }> {
    try {
      // Get AI breakdown
      const breakdown = await this.breakdownGoal(goalTitle, goalDescription);

      // Create goal
      const goal = await this.goalManager.createGoal({
        user_id: userId,
        project_id: options?.project_id || null,
        title: goalTitle,
        description: goalDescription,
        category: options?.category || 'other',
        priority: options?.priority || 'medium',
        status: 'not_started',
        progress: 0,
        deadline: options?.deadline || null,
        started_at: null,
        completed_at: null,
        metadata: {
          estimated_hours: breakdown.milestones.reduce((sum, m) => sum + m.estimated_hours, 0),
          notes: breakdown.recommendations.join('\n'),
        },
      });

      // Create milestones
      const milestones = await this.milestoneTracker.bulkCreateMilestones(
        breakdown.milestones.map((m, index) => ({
          goal_id: goal.id,
          user_id: userId,
          title: m.title,
          description: m.description,
          order: index,
          completed: false,
          completion_date: null,
          metadata: {
            estimated_hours: m.estimated_hours,
          },
        }))
      );

      return { goal, milestones };
    } catch (error) {
      console.error('Create goal with AI error:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // AI-POWERED SUGGESTIONS
  // --------------------------------------------------------------------------

  async getSuggestions(goalId: string, userId: string): Promise<GoalSuggestion> {
    try {
      const goal = await this.goalManager.getGoal(goalId, userId);
      if (!goal) throw new Error('Goal not found');

      const milestones = await this.milestoneTracker.listMilestones(goalId, userId);
      const dependencies = await this.milestoneTracker.getDependencyGraph(goalId, userId);

      const prompt = `You are a productivity coach. Analyze this goal and provide actionable suggestions.

Goal: "${goal.title}"
Description: "${goal.description}"
Status: ${goal.status}
Progress: ${goal.progress}%
Priority: ${goal.priority}
Deadline: ${goal.deadline || 'None'}

Milestones:
${milestones.map(m => `- [${m.completed ? 'x' : ' '}] ${m.title}`).join('\n')}

Dependencies: ${dependencies.dependencies.length} blocking, ${dependencies.dependents.length} dependent

Provide JSON response:
{
  "next_actions": ["specific action 1", "specific action 2", "specific action 3"],
  "potential_blockers": ["blocker 1", "blocker 2"],
  "optimization_tips": ["tip 1", "tip 2"],
  "motivational_message": "Encouraging message about progress"
}`;

      let result = '';

      if (this.groq) {
        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 1000,
        });
        result = completion.choices[0]?.message?.content || '{}';
      } else if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent(prompt);
        result = response.response.text();
      } else {
        throw new Error('No AI provider available');
      }

      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        next_actions: parsed.next_actions || [],
        potential_blockers: parsed.potential_blockers || [],
        optimization_tips: parsed.optimization_tips || [],
        motivational_message: parsed.motivational_message || 'Keep up the great work!',
      };
    } catch (error) {
      console.error('Get suggestions error:', error);
      return {
        next_actions: ['Review your milestones', 'Update progress', 'Check dependencies'],
        potential_blockers: ['Time constraints', 'Resource availability'],
        optimization_tips: ['Break tasks into smaller chunks', 'Set daily goals'],
        motivational_message: 'You\'re making progress! Keep going!',
      };
    }
  }

  // --------------------------------------------------------------------------
  // DASHBOARD & INSIGHTS
  // --------------------------------------------------------------------------

  async getDashboard(userId: string): Promise<{
    projects: Array<{ project: Project; progress: number }>;
    active_goals: Goal[];
    overdue_goals: Goal[];
    upcoming_deadlines: Goal[];
    stalled_goals: Goal[];
    ready_to_start: string[];
    blocked_goals: string[];
    analytics: any;
  }> {
    try {
      // Get projects with progress
      const projects = await this.projectManager.listProjects(userId);
      const projectsWithProgress = await Promise.all(
        projects.map(async (project) => {
          const progress = await this.projectManager.getProjectProgress(project.id, userId);
          return {
            project,
            progress: progress?.overall_progress || 0,
          };
        })
      );

      // Get goals
      const active_goals = await this.goalManager.listGoals(userId, { status: 'in_progress' });
      const overdue_goals = await this.goalManager.getOverdueGoals(userId);
      const upcoming_deadlines = await this.goalManager.getUpcomingDeadlines(userId, 7);
      const stalled_goals = await this.goalManager.getStalledGoals(userId, 7);

      // Get dependency info
      const ready_to_start = await this.milestoneTracker.getReadyToStartGoals(userId);
      const blocked_goals = await this.milestoneTracker.getBlockedGoals(userId);

      // Get analytics
      const analytics = await this.goalManager.getAnalytics(userId);

      return {
        projects: projectsWithProgress,
        active_goals,
        overdue_goals,
        upcoming_deadlines,
        stalled_goals,
        ready_to_start,
        blocked_goals,
        analytics,
      };
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // SMART REMINDERS
  // --------------------------------------------------------------------------

  async getReminders(userId: string): Promise<Array<{
    type: 'overdue' | 'stalled' | 'deadline' | 'blocked' | 'ready';
    goal_id: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>> {
    const reminders: Array<{
      type: 'overdue' | 'stalled' | 'deadline' | 'blocked' | 'ready';
      goal_id: string;
      message: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    try {
      // Overdue goals
      const overdue = await this.goalManager.getOverdueGoals(userId);
      overdue.forEach(g => {
        reminders.push({
          type: 'overdue',
          goal_id: g.id,
          message: `"${g.title}" is overdue!`,
          priority: 'high',
        });
      });

      // Stalled goals
      const stalled = await this.goalManager.getStalledGoals(userId);
      stalled.forEach(g => {
        reminders.push({
          type: 'stalled',
          goal_id: g.id,
          message: `"${g.title}" hasn't been updated in 7+ days`,
          priority: 'medium',
        });
      });

      // Upcoming deadlines
      const upcoming = await this.goalManager.getUpcomingDeadlines(userId, 3);
      upcoming.forEach(g => {
        reminders.push({
          type: 'deadline',
          goal_id: g.id,
          message: `"${g.title}" deadline approaching`,
          priority: 'high',
        });
      });

      // Ready to start
      const ready = await this.milestoneTracker.getReadyToStartGoals(userId);
      for (const goalId of ready.slice(0, 3)) { // Top 3
        const goal = await this.goalManager.getGoal(goalId, userId);
        if (goal) {
          reminders.push({
            type: 'ready',
            goal_id: goalId,
            message: `"${goal.title}" is ready to start!`,
            priority: 'medium',
          });
        }
      }

      return reminders.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } catch (error) {
      console.error('Get reminders error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  getGoalManager(): GoalManager {
    return this.goalManager;
  }

  getProjectManager(): ProjectManager {
    return this.projectManager;
  }

  getMilestoneTracker(): MilestoneTracker {
    return this.milestoneTracker;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default GoalCoordinator;
