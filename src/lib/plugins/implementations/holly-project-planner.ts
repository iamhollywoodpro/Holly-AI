/**
 * Holly Project Planner Plugin — Goal decomposition & task tracking
 *
 * Break down goals into actionable tasks, track progress,
 * and provide proactive reminders. Projects have tasks with
 * priorities, due dates, and completion states.
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateProjectInput {
  name: string;
  description: string;
  goal: string;
  dueDate?: Date;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  goal: string;
  status: 'active' | 'completed' | 'paused';
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: Task[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  nextTask: Task | null;
  overdueTasks: number;
}

// ============================================================================
// PROJECT PLANNER SERVICE
// ============================================================================

export class ProjectPlannerService {
  /**
   * Create a new project.
   */
  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    return prisma.pluginProject.create({
      data: {
        userId,
        name: input.name.trim(),
        description: input.description,
        goal: input.goal,
        status: 'active',
        dueDate: input.dueDate || null,
      },
      include: { tasks: { orderBy: { createdAt: 'asc' } } },
    }) as unknown as Project;
  }

  /**
   * List all projects for a user.
   */
  async listProjects(userId: string, status?: 'active' | 'completed' | 'paused'): Promise<Project[]> {
    const where: any = { userId };
    if (status) where.status = status;

    return prisma.pluginProject.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { tasks: { orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] } },
    }) as unknown as Project[];
  }

  /**
   * Get a single project with its tasks.
   */
  async getProject(userId: string, projectId: string): Promise<Project | null> {
    const project = await prisma.pluginProject.findFirst({
      where: { id: projectId, userId },
      include: { tasks: { orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] } },
    });

    return project as unknown as Project | null;
  }

  /**
   * Add a task to a project.
   */
  async createTask(userId: string, input: CreateTaskInput): Promise<Task | null> {
    // Verify project ownership
    const project = await prisma.pluginProject.findFirst({
      where: { id: input.projectId, userId },
    });
    if (!project) return null;

    return prisma.pluginTask.create({
      data: {
        projectId: input.projectId,
        title: input.title.trim(),
        description: input.description || null,
        priority: input.priority,
        status: 'todo',
        dueDate: input.dueDate || null,
      },
    }) as unknown as Task;
  }

  /**
   * Update task status.
   */
  async updateTaskStatus(
    userId: string,
    taskId: string,
    status: 'todo' | 'in_progress' | 'done',
  ): Promise<Task | null> {
    // Verify ownership through project
    const task = await prisma.pluginTask.findFirst({
      where: { id: taskId, project: { userId } },
    });
    if (!task) return null;

    // If marking done, check if all tasks are done → auto-complete project
    const updated = await prisma.pluginTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'done' ? new Date() : null,
      },
    });

    if (status === 'done') {
      await this.checkProjectCompletion(task.projectId);
    }

    return updated as unknown as Task;
  }

  /**
   * Get progress summary for all active projects.
   */
  async getProgressSummary(userId: string): Promise<ProjectProgress[]> {
    const projects = await this.listProjects(userId, 'active');

    return projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'done').length;
      const overdueTasks = project.tasks.filter(t =>
        t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()
      ).length;
      const nextTask = project.tasks.find(t => t.status !== 'done') || null;

      return {
        projectId: project.id,
        projectName: project.name,
        totalTasks,
        completedTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        nextTask,
        overdueTasks,
      };
    });
  }

  /**
   * Delete a project and all its tasks.
   */
  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const project = await this.getProject(userId, projectId);
    if (!project) return false;

    await prisma.pluginTask.deleteMany({ where: { projectId } });
    await prisma.pluginProject.delete({ where: { id: projectId } });
    return true;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async checkProjectCompletion(projectId: string): Promise<void> {
    const tasks = await prisma.pluginTask.findMany({
      where: { projectId },
    });

    const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done');
    if (allDone) {
      await prisma.pluginProject.update({
        where: { id: projectId },
        data: { status: 'completed' },
      });
    }
  }
}

// Export singleton
export const projectPlannerService = new ProjectPlannerService();
