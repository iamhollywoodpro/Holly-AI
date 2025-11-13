/**
 * Contextual Intelligence System
 * Tracks project patterns, learns from past work, suggests optimizations
 * Rebuilt for Prisma + Clerk
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
   * Track new project
   */
  async trackProject(projectData: {
    projectName: string;
    projectType: string;
    technologies?: string[];
    metadata?: Record<string, any>;
  }): Promise<ProjectContext> {
    const project = await this.db.projectContext.create({
      data: {
        userId: this.userId,
        projectName: projectData.projectName,
        projectType: projectData.projectType,
        status: 'active',
        startDate: new Date(),
        lastActivity: new Date(),
        technologies: projectData.technologies || [],
        patterns: [],
        preferences: projectData.metadata || {},
        feedback: [],
      }
    });

    return project as unknown as ProjectContext;
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
        userId: this.userId,
        projectId,
        activityType: activity.type,
        description: activity.description,
        outcome: activity.outcome || null,
        metadata: activity.metadata || {},
      }
    });

    // Update last activity
    await this.db.projectContext.update({
      where: { id: projectId },
      data: { lastActivity: new Date() }
    });
  }

  /**
   * Get project context
   */
  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    const project = await this.db.projectContext.findUnique({
      where: { id: projectId, userId: this.userId }
    });

    return project as unknown as ProjectContext | null;
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<ProjectContext[]> {
    const projects = await this.db.projectContext.findMany({
      where: { userId: this.userId },
      orderBy: { lastActivity: 'desc' },
      take: limit
    });

    return projects as unknown as ProjectContext[];
  }

  /**
   * Detect patterns across projects
   */
  async detectPatterns(): Promise<ContextualPattern[]> {
    const projects = await this.getRecentProjects(20);
    const patternMap: Map<string, { count: number; contexts: Set<string> }> = new Map();

    // Analyze patterns
    for (const project of projects) {
      for (const pattern of project.patterns) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { count: 0, contexts: new Set() });
        }
        const data = patternMap.get(pattern)!;
        data.count++;
        data.contexts.add(project.projectType);
      }
    }

    // Convert to array
    const patterns: ContextualPattern[] = Array.from(patternMap.entries()).map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      contexts: Array.from(data.contexts),
      effectiveness: Math.min(data.count / 10, 1.0) // Simple effectiveness score
    }));

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get contextual suggestions
   */
  async getSuggestions(currentContext: {
    projectType: string;
    technologies?: string[];
  }): Promise<string[]> {
    const patterns = await this.detectPatterns();
    const recentProjects = await this.getRecentProjects(5);

    const suggestions: string[] = [];

    // Suggest based on patterns
    for (const pattern of patterns) {
      if (pattern.contexts.includes(currentContext.projectType) && pattern.effectiveness > 0.5) {
        suggestions.push(`Consider using pattern: ${pattern.pattern} (used successfully ${pattern.frequency} times)`);
      }
    }

    // Suggest based on past projects
    for (const project of recentProjects) {
      if (project.projectType === currentContext.projectType) {
        for (const tech of project.technologies) {
          if (currentContext.technologies && !currentContext.technologies.includes(tech)) {
            suggestions.push(`Consider adding ${tech} (used in ${project.projectName})`);
          }
        }
      }
    }

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  /**
   * Record feedback on suggestion
   */
  async recordFeedback(projectId: string, feedback: string): Promise<void> {
    const project = await this.db.projectContext.findUnique({
      where: { id: projectId }
    });

    if (project) {
      await this.db.projectContext.update({
        where: { id: projectId },
        data: {
          feedback: [...(project.feedback as string[]), feedback]
        }
      });
    }
  }
}
