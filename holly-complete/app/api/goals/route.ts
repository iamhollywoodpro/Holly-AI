// HOLLY Feature 45: Goal & Project Management - API Routes
// REST API endpoints for goals, projects, milestones, and dependencies

import { NextRequest, NextResponse } from 'next/server';
import GoalCoordinator from '@/lib/goals/goal-coordinator';

// ============================================================================
// INITIALIZE
// ============================================================================

const getCoordinator = () => {
  return new GoalCoordinator({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    groq_api_key: process.env.GROQ_API_KEY,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
    google_api_key: process.env.GOOGLE_API_KEY,
  });
};

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const coordinator = getCoordinator();
    const goalManager = coordinator.getGoalManager();
    const projectManager = coordinator.getProjectManager();
    const milestoneTracker = coordinator.getMilestoneTracker();

    switch (action) {
      // -----------------------------------------------------------------------
      // GOAL OPERATIONS
      // -----------------------------------------------------------------------
      case 'create_goal': {
        const { title, description, project_id, category, priority, deadline } = body;
        if (!title) {
          return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }

        const goal = await goalManager.createGoal({
          user_id,
          project_id: project_id || null,
          title,
          description: description || '',
          category: category || 'other',
          priority: priority || 'medium',
          status: 'not_started',
          progress: 0,
          deadline: deadline || null,
          started_at: null,
          completed_at: null,
          metadata: {},
        });

        return NextResponse.json({ success: true, goal });
      }

      case 'create_goal_with_ai': {
        const { title, description, project_id, category, priority, deadline } = body;
        if (!title) {
          return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }

        const result = await coordinator.createGoalWithAI(user_id, title, description, {
          project_id,
          category,
          priority,
          deadline,
        });

        return NextResponse.json({ success: true, ...result });
      }

      case 'update_goal': {
        const { goal_id, updates } = body;
        if (!goal_id) {
          return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
        }

        const goal = await goalManager.updateGoal(goal_id, user_id, updates);
        return NextResponse.json({ success: true, goal });
      }

      case 'delete_goal': {
        const { goal_id } = body;
        if (!goal_id) {
          return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
        }

        await goalManager.deleteGoal(goal_id, user_id);
        return NextResponse.json({ success: true });
      }

      case 'start_goal': {
        const { goal_id } = body;
        const goal = await goalManager.startGoal(goal_id, user_id);
        return NextResponse.json({ success: true, goal });
      }

      case 'complete_goal': {
        const { goal_id } = body;
        const goal = await goalManager.completeGoal(goal_id, user_id);
        return NextResponse.json({ success: true, goal });
      }

      case 'update_progress': {
        const { goal_id, progress } = body;
        const goal = await goalManager.updateProgress(goal_id, user_id, progress);
        return NextResponse.json({ success: true, goal });
      }

      case 'list_goals': {
        const { project_id, status, category, priority } = body;
        const goals = await goalManager.listGoals(user_id, {
          project_id,
          status,
          category,
          priority,
        });
        return NextResponse.json({ success: true, goals, count: goals.length });
      }

      case 'search_goals': {
        const { search_term } = body;
        const goals = await goalManager.searchGoals(user_id, search_term);
        return NextResponse.json({ success: true, goals, count: goals.length });
      }

      case 'get_goal_progress': {
        const { goal_id } = body;
        const progress = await goalManager.getGoalProgress(goal_id, user_id);
        return NextResponse.json({ success: true, progress });
      }

      case 'get_goal_analytics': {
        const { project_id, since } = body;
        const analytics = await goalManager.getAnalytics(user_id, { project_id, since });
        return NextResponse.json({ success: true, analytics });
      }

      // -----------------------------------------------------------------------
      // PROJECT OPERATIONS
      // -----------------------------------------------------------------------
      case 'create_project': {
        const { name, description, color, icon, deadline } = body;
        if (!name) {
          return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const project = await projectManager.createProject({
          user_id,
          name,
          description: description || '',
          status: 'planning',
          color: color || '#3B82F6',
          icon: icon || '📊',
          deadline: deadline || null,
          started_at: null,
          completed_at: null,
          metadata: {},
        });

        return NextResponse.json({ success: true, project });
      }

      case 'update_project': {
        const { project_id, updates } = body;
        if (!project_id) {
          return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
        }

        const project = await projectManager.updateProject(project_id, user_id, updates);
        return NextResponse.json({ success: true, project });
      }

      case 'delete_project': {
        const { project_id, delete_goals } = body;
        if (!project_id) {
          return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
        }

        await projectManager.deleteProject(project_id, user_id, delete_goals || false);
        return NextResponse.json({ success: true });
      }

      case 'start_project': {
        const { project_id } = body;
        const project = await projectManager.startProject(project_id, user_id);
        return NextResponse.json({ success: true, project });
      }

      case 'complete_project': {
        const { project_id } = body;
        const project = await projectManager.completeProject(project_id, user_id);
        return NextResponse.json({ success: true, project });
      }

      case 'list_projects': {
        const { status } = body;
        const projects = await projectManager.listProjects(user_id, { status });
        return NextResponse.json({ success: true, projects, count: projects.length });
      }

      case 'get_project_progress': {
        const { project_id } = body;
        const progress = await projectManager.getProjectProgress(project_id, user_id);
        return NextResponse.json({ success: true, progress });
      }

      case 'get_project_analytics': {
        const { project_id } = body;
        const analytics = await projectManager.getProjectAnalytics(project_id, user_id);
        return NextResponse.json({ success: true, analytics });
      }

      case 'add_goal_to_project': {
        const { project_id, goal_id } = body;
        await projectManager.addGoalToProject(project_id, goal_id, user_id);
        return NextResponse.json({ success: true });
      }

      // -----------------------------------------------------------------------
      // MILESTONE OPERATIONS
      // -----------------------------------------------------------------------
      case 'create_milestone': {
        const { goal_id, title, description, order } = body;
        if (!goal_id || !title) {
          return NextResponse.json(
            { error: 'goal_id and title are required' },
            { status: 400 }
          );
        }

        const milestone = await milestoneTracker.createMilestone({
          goal_id,
          user_id,
          title,
          description: description || '',
          order: order || 0,
          completed: false,
          completion_date: null,
          metadata: {},
        });

        return NextResponse.json({ success: true, milestone });
      }

      case 'create_milestone_template': {
        const { goal_id, template_name } = body;
        if (!goal_id || !template_name) {
          return NextResponse.json(
            { error: 'goal_id and template_name are required' },
            { status: 400 }
          );
        }

        const milestones = await milestoneTracker.createMilestoneTemplate(
          goal_id,
          user_id,
          template_name
        );

        return NextResponse.json({ success: true, milestones, count: milestones.length });
      }

      case 'update_milestone': {
        const { milestone_id, updates } = body;
        if (!milestone_id) {
          return NextResponse.json({ error: 'milestone_id is required' }, { status: 400 });
        }

        const milestone = await milestoneTracker.updateMilestone(
          milestone_id,
          user_id,
          updates
        );
        return NextResponse.json({ success: true, milestone });
      }

      case 'delete_milestone': {
        const { milestone_id } = body;
        if (!milestone_id) {
          return NextResponse.json({ error: 'milestone_id is required' }, { status: 400 });
        }

        await milestoneTracker.deleteMilestone(milestone_id, user_id);
        return NextResponse.json({ success: true });
      }

      case 'complete_milestone': {
        const { milestone_id } = body;
        const milestone = await milestoneTracker.completeMilestone(milestone_id, user_id);
        return NextResponse.json({ success: true, milestone });
      }

      case 'list_milestones': {
        const { goal_id } = body;
        if (!goal_id) {
          return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
        }

        const milestones = await milestoneTracker.listMilestones(goal_id, user_id);
        return NextResponse.json({ success: true, milestones, count: milestones.length });
      }

      case 'reorder_milestones': {
        const { goal_id, milestone_ids } = body;
        if (!goal_id || !milestone_ids) {
          return NextResponse.json(
            { error: 'goal_id and milestone_ids are required' },
            { status: 400 }
          );
        }

        await milestoneTracker.reorderMilestones(goal_id, user_id, milestone_ids);
        return NextResponse.json({ success: true });
      }

      // -----------------------------------------------------------------------
      // DEPENDENCY OPERATIONS
      // -----------------------------------------------------------------------
      case 'create_dependency': {
        const { goal_id, depends_on_goal_id, dependency_type } = body;
        if (!goal_id || !depends_on_goal_id) {
          return NextResponse.json(
            { error: 'goal_id and depends_on_goal_id are required' },
            { status: 400 }
          );
        }

        const dependency = await milestoneTracker.createDependency({
          goal_id,
          depends_on_goal_id,
          dependency_type: dependency_type || 'blocks',
          user_id,
        });

        return NextResponse.json({ success: true, dependency });
      }

      case 'delete_dependency': {
        const { dependency_id } = body;
        await milestoneTracker.deleteDependency(dependency_id, user_id);
        return NextResponse.json({ success: true });
      }

      case 'get_dependency_graph': {
        const { goal_id } = body;
        const graph = await milestoneTracker.getDependencyGraph(goal_id, user_id);
        return NextResponse.json({ success: true, graph });
      }

      case 'get_critical_path': {
        const { project_id } = body;
        const criticalPath = await milestoneTracker.getCriticalPath(project_id, user_id);
        return NextResponse.json({ success: true, critical_path: criticalPath });
      }

      case 'get_blocked_goals': {
        const blockedGoals = await milestoneTracker.getBlockedGoals(user_id);
        return NextResponse.json({ success: true, blocked_goals: blockedGoals });
      }

      case 'get_ready_to_start_goals': {
        const readyGoals = await milestoneTracker.getReadyToStartGoals(user_id);
        return NextResponse.json({ success: true, ready_goals: readyGoals });
      }

      // -----------------------------------------------------------------------
      // AI-POWERED OPERATIONS
      // -----------------------------------------------------------------------
      case 'breakdown_goal': {
        const { goal_title, goal_description } = body;
        if (!goal_title) {
          return NextResponse.json({ error: 'goal_title is required' }, { status: 400 });
        }

        const breakdown = await coordinator.breakdownGoal(goal_title, goal_description);
        return NextResponse.json({ success: true, breakdown });
      }

      case 'get_suggestions': {
        const { goal_id } = body;
        if (!goal_id) {
          return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
        }

        const suggestions = await coordinator.getSuggestions(goal_id, user_id);
        return NextResponse.json({ success: true, suggestions });
      }

      // -----------------------------------------------------------------------
      // DASHBOARD & INSIGHTS
      // -----------------------------------------------------------------------
      case 'get_dashboard': {
        const dashboard = await coordinator.getDashboard(user_id);
        return NextResponse.json({ success: true, dashboard });
      }

      case 'get_reminders': {
        const reminders = await coordinator.getReminders(user_id);
        return NextResponse.json({ success: true, reminders, count: reminders.length });
      }

      // -----------------------------------------------------------------------
      // UNKNOWN ACTION
      // -----------------------------------------------------------------------
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Goals API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const action = searchParams.get('action');

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const coordinator = getCoordinator();

    switch (action) {
      case 'get_dashboard': {
        const dashboard = await coordinator.getDashboard(user_id);
        return NextResponse.json({ success: true, dashboard });
      }

      case 'get_reminders': {
        const reminders = await coordinator.getReminders(user_id);
        return NextResponse.json({ success: true, reminders, count: reminders.length });
      }

      case 'list_goals': {
        const goals = await coordinator.getGoalManager().listGoals(user_id);
        return NextResponse.json({ success: true, goals, count: goals.length });
      }

      case 'list_projects': {
        const projects = await coordinator.getProjectManager().listProjects(user_id);
        return NextResponse.json({ success: true, projects, count: projects.length });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Goals API GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
