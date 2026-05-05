// Goals API - Goal and Project Management
// Clerk + Prisma implementation

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { GoalsManager } from '@/lib/goals/goals-manager';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
  const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, data } = body;

    const goals = new GoalsManager(userId);

    switch (action) {
      case 'create_goal':
        const goal = await goals.createGoal(data);
        return NextResponse.json({ 
          success: true,
          goal
        });

      case 'update_goal':
        const updated = await goals.updateGoal(data.goalId, data.updates);
        return NextResponse.json({ 
          success: true,
          goal: updated
        });

      case 'delete_goal':
        await goals.deleteGoal(data.goalId);
        return NextResponse.json({ 
          success: true,
          message: 'Goal deleted'
        });

      case 'create_milestone':
        const milestone = await goals.createMilestone(data.goalId, data.milestone);
        return NextResponse.json({ 
          success: true,
          milestone
        });

      case 'complete_milestone':
        await goals.completeMilestone(data.milestoneId);
        return NextResponse.json({ 
          success: true,
          message: 'Milestone completed'
        });

      case 'create_project':
        const project = await goals.createProject(data);
        return NextResponse.json({ 
          success: true,
          project
        });

      case 'update_project':
        const updatedProject = await goals.updateProject(data.projectId, data.updates);
        return NextResponse.json({ 
          success: true,
          project: updatedProject
        });

      case 'get_summary':
        const summary = await goals.getSummary();
        return NextResponse.json({ 
          success: true,
          summary
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Goals API error:', error);
    return NextResponse.json(
      { error: error.message || 'Goals operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
  const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'goals', 'projects', or 'milestones'
    const id = searchParams.get('id');

    const goalsManager = new GoalsManager(userId);

    if (type === 'projects') {
      const projects = await goalsManager.getProjects();
      return NextResponse.json({ 
        success: true,
        projects
      });
    }

    if (type === 'milestones' && id) {
      const milestones = await goalsManager.getMilestones(id);
      return NextResponse.json({ 
        success: true,
        milestones
      });
    }

    // Default: get goals
    const goalsList = await goalsManager.getGoals();
    return NextResponse.json({ 
      success: true,
      goals: goalsList
    });
  } catch (error: any) {
    console.error('Goals API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get goals data' },
      { status: 500 }
    );
  }
}
