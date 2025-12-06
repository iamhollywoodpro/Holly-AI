/**
 * TASK SCHEDULER
 * Task scheduling, queue management, priority handling
 */

import { prisma } from '@/lib/prisma';

export interface TaskDefinition {
  description: string;
  complexity?: string;
  priority?: string;
  requiredSkills?: string[];
  dependencies?: string[];
  estimatedTime?: number; // minutes
}

export interface Task {
  id: string;
  description: string;
  complexity: string;
  status: string;
  priority: string;
  requiredSkills: string[];
  dependencies: string[];
  estimatedTime?: number;
  actualTime?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskFilters {
  status?: string;
  complexity?: string;
  priority?: string;
  limit?: number;
}

/**
 * Schedule a task
 */
export async function scheduleTask(
  task: TaskDefinition
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const newTask = await prisma.taskAnalysis.create({
      data: {
        taskDescription: task.description,
        complexity: task.complexity || 'moderate',
        estimatedTime: task.estimatedTime,
        requiredSkills: task.requiredSkills || [],
        dependencies: task.dependencies || [],
        risks: [],
        approach: {
          strategy: 'standard',
          steps: [],
        },
        status: 'pending',
      },
    });

    return { success: true, taskId: newTask.id };
  } catch (error) {
    console.error('Error scheduling task:', error);
    return { success: false, error: 'Failed to schedule task' };
  }
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
  try {
    const task = await prisma.taskAnalysis.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      description: task.taskDescription,
      complexity: task.complexity,
      status: task.status,
      priority: 'normal', // TaskAnalysis doesn't have priority field
      requiredSkills: task.requiredSkills,
      dependencies: task.dependencies,
      estimatedTime: task.estimatedTime ?? undefined,
      actualTime: task.actualTime ?? undefined,
      createdAt: task.createdAt,
      completedAt: task.completedAt ?? undefined,
    };
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

/**
 * List tasks with filters
 */
export async function listTasks(filters?: TaskFilters): Promise<Task[]> {
  try {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.complexity) {
      where.complexity = filters.complexity;
    }

    const tasks = await prisma.taskAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    return tasks.map((task) => ({
      id: task.id,
      description: task.taskDescription,
      complexity: task.complexity,
      status: task.status,
      priority: 'normal',
      requiredSkills: task.requiredSkills,
      dependencies: task.dependencies,
      estimatedTime: task.estimatedTime ?? undefined,
      actualTime: task.actualTime ?? undefined,
      createdAt: task.createdAt,
      completedAt: task.completedAt ?? undefined,
    }));
  } catch (error) {
    console.error('Error listing tasks:', error);
    return [];
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.taskAnalysis.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : undefined,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating task status:', error);
    return { success: false, error: 'Failed to update task status' };
  }
}

/**
 * Prioritize task (mock implementation since TaskAnalysis doesn't have priority)
 */
export async function prioritizeTask(
  taskId: string,
  priority: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TaskAnalysis model doesn't have a priority field
    // In production, you would add this field or use a separate priority table
    
    const task = await prisma.taskAnalysis.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Mock implementation - just return success
    return { success: true };
  } catch (error) {
    console.error('Error prioritizing task:', error);
    return { success: false, error: 'Failed to prioritize task' };
  }
}

/**
 * Get task queue
 */
export async function getTaskQueue(queueName?: string): Promise<Task[]> {
  try {
    // Get pending and in_progress tasks, ordered by creation date
    const tasks = await prisma.taskAnalysis.findMany({
      where: {
        status: {
          in: ['pending', 'in_progress'],
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return tasks.map((task) => ({
      id: task.id,
      description: task.taskDescription,
      complexity: task.complexity,
      status: task.status,
      priority: 'normal',
      requiredSkills: task.requiredSkills,
      dependencies: task.dependencies,
      estimatedTime: task.estimatedTime ?? undefined,
      actualTime: task.actualTime ?? undefined,
      createdAt: task.createdAt,
      completedAt: task.completedAt ?? undefined,
    }));
  } catch (error) {
    console.error('Error getting task queue:', error);
    return [];
  }
}
