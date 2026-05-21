// Goals Manager - REAL Prisma Implementation
// Manages goals, milestones, and project tracking using actual database models

import { prisma } from '@/lib/db';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled' | 'pending' | 'in_progress' | 'failed' | 'blocked';
  progress: number;
  priority: number;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'completed' | 'onhold';
  progress: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

export class GoalsManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Create a new goal in the database
   */
  async createGoal(data: {
    title: string;
    description: string;
    category: string;
    priority?: number;
    deadline?: Date;
  }): Promise<Goal> {
    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority ?? 5,
        status: 'pending',
        progress: 0,
        deadline: data.deadline,
        source: 'user',
      },
    });

    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      status: goal.status as Goal['status'],
      progress: goal.progress,
      priority: goal.priority,
      deadline: goal.deadline ?? undefined,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  /**
   * Get all goals from the database
   */
  async getGoals(filters?: {
    status?: string;
    category?: string;
  }): Promise<Goal[]> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    return goals.map(g => ({
      id: g.id,
      title: g.title,
      description: g.description,
      category: g.category,
      status: g.status as Goal['status'],
      progress: g.progress,
      priority: g.priority,
      deadline: g.deadline ?? undefined,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  /**
   * Update a goal in the database
   */
  async updateGoal(goalId: string, data: Partial<Goal>): Promise<Goal | null> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.progress !== undefined) updateData.progress = data.progress;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.category !== undefined) updateData.category = data.category;

      if (data.status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }

      const goal = await prisma.goal.update({
        where: { id: goalId },
        data: updateData,
      });

      return {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        status: goal.status as Goal['status'],
        progress: goal.progress,
        priority: goal.priority,
        deadline: goal.deadline ?? undefined,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a goal from the database
   */
  async deleteGoal(goalId: string): Promise<boolean> {
    try {
      await prisma.goal.delete({ where: { id: goalId } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a project in the database
   */
  async createProject(data: {
    name: string;
    description: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        userId: this.userId,
        name: data.name,
        description: data.description,
        status: 'active',
        progress: 0,
        startDate: data.startDate,
        targetEndDate: data.endDate,
      },
    });

    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description ?? undefined,
      status: project.status as Project['status'],
      progress: project.progress,
      startDate: project.startDate ?? undefined,
      endDate: project.targetEndDate ?? undefined,
      createdAt: project.createdAt,
    };
  }

  /**
   * Get all projects from the database
   */
  async getProjects(filters?: {
    status?: string;
  }): Promise<Project[]> {
    const where: Record<string, unknown> = { userId: this.userId };
    if (filters?.status) where.status = filters.status;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map(p => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      description: p.description ?? undefined,
      status: p.status as Project['status'],
      progress: p.progress,
      startDate: p.startDate ?? undefined,
      endDate: p.targetEndDate ?? undefined,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Update a project in the database
   */
  async updateProject(projectId: string, data: Partial<Project>): Promise<Project | null> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.progress !== undefined) updateData.progress = data.progress;

      const project = await prisma.project.update({
        where: { id: projectId },
        data: updateData,
      });

      return {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description ?? undefined,
        status: project.status as Project['status'],
        progress: project.progress,
        startDate: project.startDate ?? undefined,
        endDate: project.targetEndDate ?? undefined,
        createdAt: project.createdAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get goals summary computed from REAL data
   */
  async getSummary(): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalProjects: number;
    averageProgress: number;
  }> {
    const [totalGoals, activeGoals, completedGoals, totalProjects, avgProgressResult] = await Promise.all([
      prisma.goal.count(),
      prisma.goal.count({ where: { status: { in: ['active', 'in_progress', 'pending'] } } }),
      prisma.goal.count({ where: { status: 'completed' } }),
      prisma.project.count({ where: { userId: this.userId } }),
      prisma.goal.aggregate({ _avg: { progress: true } }),
    ]);

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      totalProjects,
      averageProgress: avgProgressResult._avg.progress ?? 0,
    };
  }
}
