/**
 * Contextual Intelligence System
 * Tracks project patterns, learns from past work, suggests optimizations
 * FIXED: Now uses correct Prisma schema (Project model)
 */

import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export interface ProjectContext {
  id: string;
  userId: string;
  projectName: string;
  projectType: string;
  startDate: Date;
  lastActivity: Date;
  status: string;
  technologies: string[];
  patterns: string[];
  preferences: Record<string, any>;
  feedback: string[];
}

export interface ContextualPattern {
  pattern: string;
  frequency: number;
  contexts: string[];
  effectiveness: number;
}

export class ContextualIntelligence {
  private userId: string;
  private db: PrismaClient;

  constructor(userId: string, db: PrismaClient = prisma) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Track new project - Uses correct Project model
   */
  async trackProject(projectData: {
    projectName: string;
    projectType: string;
    technologies?: string[];
    metadata?: Record<string, any>;
  }): Promise<ProjectContext> {
    // Create using actual Project model schema
    const project = await this.db.project.create({
      data: {
        userId: this.userId,
        name: projectData.projectName,
        description: projectData.metadata?.description || null,
        status: 'active',
        priority: 5,
        tags: projectData.technologies || [],
      }
    });

    // Return in expected format
    return {
      id: project.id,
      userId: project.userId,
      projectName: project.name,
      projectType: project.tags[0] || 'general',
      startDate: project.startDate,
      lastActivity: project.updatedAt,
      status: project.status,
      technologies: project.tags,
      patterns: [],
      preferences: {},
      feedback: [],
    };
  }

  /**
   * Record project activity
   */
  async recordActivity(projectId: string, activity: {
    type: string;
    description: string;
    outcome?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.db.projectActivity.create({
      data: {
        projectId,
        activityType: activity.type,
        description: activity.description,
        metadata: activity.metadata || {},
      }
    });

    // Update project's updatedAt timestamp
    await this.db.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() }
    });
  }

  /**
   * Get project context
   */
  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: {
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!project) return null;

    return {
      id: project.id,
      userId: project.userId,
      projectName: project.name,
      projectType: project.tags[0] || 'general',
      startDate: project.startDate,
      lastActivity: project.updatedAt,
      status: project.status,
      technologies: project.tags,
      patterns: [],
      preferences: {},
      feedback: [],
    };
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<ProjectContext[]> {
    const projects = await this.db.project.findMany({
      where: { userId: this.userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return projects.map(project => ({
      id: project.id,
      userId: project.userId,
      projectName: project.name,
      projectType: project.tags[0] || 'general',
      startDate: project.startDate,
      lastActivity: project.updatedAt,
      status: project.status,
      technologies: project.tags,
      patterns: [],
      preferences: {},
      feedback: [],
    }));
  }

  /**
   * Detect patterns - NO PARAMETERS (as verified in audit)
   */
  async detectPatterns(): Promise<ContextualPattern[]> {
    const projects = await this.db.project.findMany({
      where: { userId: this.userId },
      include: {
        activities: true
      }
    });

    // Simple pattern detection based on tags
    const tagCounts = new Map<string, number>();
    projects.forEach(project => {
      project.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const patterns: ContextualPattern[] = [];
    tagCounts.forEach((frequency, pattern) => {
      if (frequency >= 2) {
        patterns.push({
          pattern,
          frequency,
          contexts: ['project'],
          effectiveness: 75 + (frequency * 5)
        });
      }
    });

    return patterns;
  }

  /**
   * Get suggestions based on current context
   */
  async getSuggestions(currentContext: {
    projectType?: string;
    technologies?: string[];
    phase?: string;
  }): Promise<string[]> {
    const suggestions: string[] = [];

    // Get user's project history
    const projects = await this.db.project.findMany({
      where: { 
        userId: this.userId,
        status: 'completed'
      },
      take: 10
    });

    if (projects.length > 0) {
      suggestions.push('Based on your past projects, consider reviewing successful patterns');
    }

    if (currentContext.projectType) {
      suggestions.push(`Consider best practices for ${currentContext.projectType} projects`);
    }

    if (currentContext.technologies && currentContext.technologies.length > 0) {
      suggestions.push(`Leverage your experience with ${currentContext.technologies[0]}`);
    }

    return suggestions;
  }

  /**
   * Record feedback for a project
   */
  async recordFeedback(projectId: string, feedback: string): Promise<void> {
    // Store as project activity
    await this.db.projectActivity.create({
      data: {
        projectId,
        activityType: 'feedback',
        description: feedback,
        metadata: { type: 'user_feedback' }
      }
    });
  }
}
