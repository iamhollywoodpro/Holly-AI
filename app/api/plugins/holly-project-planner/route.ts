/**
 * Project Planner Plugin API Routes
 *
 * GET    /api/plugins/holly-project-planner                    — List projects (supports ?status=active)
 * POST   /api/plugins/holly-project-planner                    — Create a project
 * GET    /api/plugins/holly-project-planner?progress=true      — Get progress summary
 * GET    /api/plugins/holly-project-planner?projectId=xxx      — Get single project
 * POST   /api/plugins/holly-project-planner?task=true          — Create a task
 * PATCH  /api/plugins/holly-project-planner                    — Update task status
 * DELETE /api/plugins/holly-project-planner                    — Delete a project
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { projectPlannerService } from '@/lib/plugins/implementations/holly-project-planner';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const progress = searchParams.get('progress');
    const status = searchParams.get('status') as 'active' | 'completed' | 'paused' | null;

    // Progress summary
    if (progress === 'true') {
      const progressData = await projectPlannerService.getProgressSummary(user.id);
      return NextResponse.json({ projects: progressData });
    }

    // Single project
    if (projectId) {
      const project = await projectPlannerService.getProject(user.id, projectId);
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      return NextResponse.json(project);
    }

    // List projects
    const projects = await projectPlannerService.listProjects(user.id, status || undefined);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[ProjectPlanner] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const isTask = searchParams.get('task') === 'true';

    // Create task
    if (isTask) {
      const { projectId, title, description, priority, dueDate } = body;
      if (!projectId || !title) {
        return NextResponse.json({ error: 'projectId and title required' }, { status: 400 });
      }

      const task = await projectPlannerService.createTask(user.id, {
        projectId,
        title,
        description,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      if (!task) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      return NextResponse.json(task, { status: 201 });
    }

    // Create project
    const { name, description, goal, dueDate } = body;
    if (!name || !goal) {
      return NextResponse.json({ error: 'name and goal required' }, { status: 400 });
    }

    const project = await projectPlannerService.createProject(user.id, {
      name,
      description: description || '',
      goal,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[ProjectPlanner] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { taskId, status } = await req.json();
    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId and status required' }, { status: 400 });
    }

    if (!['todo', 'in_progress', 'done'].includes(status)) {
      return NextResponse.json({ error: 'status must be todo, in_progress, or done' }, { status: 400 });
    }

    const task = await projectPlannerService.updateTaskStatus(user.id, taskId, status);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    return NextResponse.json(task);
  } catch (error) {
    console.error('[ProjectPlanner] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const deleted = await projectPlannerService.deleteProject(user.id, projectId);
    if (!deleted) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ProjectPlanner] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
