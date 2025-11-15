/**
 * Predictive Creativity Engine
 * Proactively generates creative concepts and suggestions
 * Rebuilt for Prisma + Clerk
 */

import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export interface PredictiveInsight {
  type: 'suggestion' | 'warning' | 'opportunity' | 'next-step';
  category: 'music' | 'design' | 'code' | 'content';
  title: string;
  description: string;
  reasoning: string[];
  confidence: number; // 0-100
  urgency: 'low' | 'medium' | 'high';
  generatedAt: Date;
}

export interface CreativeConcept {
  id: string;
  title: string;
  description: string;
  type: 'music-release' | 'design-project' | 'app-idea' | 'content-series';
  inspiration: string[];
  suggestedSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  alignment: number; // 0-100, how well it aligns with user's style
  draftAssets?: {
    images?: string[];
    text?: string[];
    concepts?: string[];
  };
}

export class PredictiveEngine {
  private userId: string;
  private db: PrismaClient;

  constructor(userId: string, db: PrismaClient = prisma) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Predict next creative needs
   */
  async predictNextNeeds(): Promise<PredictiveInsight[]> {
    // Get recent project activity - using correct Project model
    const recentProjects = await this.db.project.findMany({
      where: { userId: this.userId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        contexts: true
      }
    });

    if (recentProjects.length === 0) return [];

    const insights: PredictiveInsight[] = [];

    // Detect patterns from project tags (since projectType doesn't exist)
    const projectTags = recentProjects.flatMap(p => p.tags);
    const mostCommonTag = this.getMostCommon(projectTags);

    if (mostCommonTag) {
      insights.push({
        type: 'suggestion',
        category: this.mapTagToCategory(mostCommonTag),
        title: `Continue ${mostCommonTag} momentum`,
        description: `You've been working on ${mostCommonTag} projects. Consider starting a new one while you're in the flow.`,
        reasoning: [
          `${projectTags.filter(t => t === mostCommonTag).length} recent ${mostCommonTag} projects`,
          'Momentum is high in this area'
        ],
        confidence: 75,
        urgency: 'medium',
        generatedAt: new Date()
      });
    }

    // Check for gaps
    const allCategories = ['music', 'design', 'code', 'content'];
    const activeCategories = new Set(projectTags.map(t => this.mapTagToCategory(t)));
    const missingCategories = allCategories.filter(c => !activeCategories.has(c as any));

    if (missingCategories.length > 0) {
      insights.push({
        type: 'opportunity',
        category: missingCategories[0] as any,
        title: `Explore ${missingCategories[0]}`,
        description: `You haven't worked on ${missingCategories[0]} recently. It might be time to diversify.`,
        reasoning: [
          'Creative diversity leads to innovation',
          'Skills in one area can inspire another'
        ],
        confidence: 60,
        urgency: 'low',
        generatedAt: new Date()
      });
    }

    return insights;
  }

  /**
   * Generate draft creative concepts
   */
  async generateDraftConcepts(): Promise<CreativeConcept[]> {
    // Get user's taste profile
    const tasteProfile = await this.db.tasteProfile.findUnique({
      where: { userId: this.userId }
    });

    if (!tasteProfile) return [];

    const concepts: CreativeConcept[] = [];
    
    // Access the correct preference fields
    const musicPrefs = tasteProfile.musicPreferences as any;
    const artPrefs = tasteProfile.artPreferences as any;
    const stylePrefs = tasteProfile.stylePreferences as any;

    // Generate concepts based on music preferences
    if (musicPrefs && Array.isArray(musicPrefs) && musicPrefs.length > 0) {
      concepts.push({
        id: `concept_${Date.now()}_music`,
        title: `${musicPrefs[0]} inspired track`,
        description: `Create a new track incorporating ${musicPrefs[0]} elements`,
        type: 'music-release',
        inspiration: musicPrefs.slice(0, 3),
        suggestedSteps: [
          'Start with a basic beat',
          'Add melodic elements',
          'Layer in the signature sound',
          'Polish and master'
        ],
        estimatedEffort: 'medium',
        alignment: 85
      });
    }

    // Generate concepts based on art preferences
    if (artPrefs && Array.isArray(artPrefs) && artPrefs.length > 0) {
      concepts.push({
        id: `concept_${Date.now()}_art`,
        title: `${artPrefs[0]} inspired design`,
        description: `Create a visual design inspired by ${artPrefs[0]}`,
        type: 'music-release', // Using available type
        inspiration: artPrefs.slice(0, 3),
        suggestedSteps: [
          'Research visual references',
          'Create mood board',
          'Sketch initial concepts',
          'Refine and finalize'
        ],
        estimatedEffort: 'medium',
        alignment: 80
      });
    }

    return concepts;
  }

  /**
   * Anticipate potential blockers
   */
  async anticipateBlockers(): Promise<PredictiveInsight[]> {
    const activeProjects = await this.db.project.findMany({
      where: {
        userId: this.userId,
        status: 'active'
      }
    });

    const blockers: PredictiveInsight[] = [];

    // Check for stale projects
    const now = new Date();
    for (const project of activeProjects) {
      const daysSinceActivity = Math.floor(
        (now.getTime() - project.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity > 7) {
        const mainTag = project.tags[0] || 'general';
        blockers.push({
          type: 'warning',
          category: this.mapTagToCategory(mainTag),
          title: `${project.name} is stalled`,
          description: `No activity for ${daysSinceActivity} days. Consider revisiting or archiving.`,
          reasoning: [
            'Long inactive periods often mean lost momentum',
            'Clarifying next steps can help restart progress'
          ],
          confidence: 80,
          urgency: 'medium',
          generatedAt: new Date()
        });
      }
    }

    return blockers;
  }

  /**
   * Suggest next steps for a project
   */
  async suggestNextSteps(projectId?: string): Promise<string[]> {
    if (projectId) {
      const project = await this.db.project.findUnique({
        where: { id: projectId }
      });

      if (!project) return [];

      // Get recent activities
      const activities = await this.db.projectActivity.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // Simple next step suggestions based on activities
      if (activities.length === 0) {
        return ['Define project scope', 'Set initial goals', 'Create first milestone'];
      }

      return ['Review recent progress', 'Identify bottlenecks', 'Plan next milestone'];
    }

    return ['Start a new project', 'Review existing projects', 'Explore new ideas'];
  }

  // Helper methods
  private getMostCommon(arr: string[]): string | null {
    if (arr.length === 0) return null;
    const counts: Map<string, number> = new Map();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  private mapTagToCategory(tag: string): 'music' | 'design' | 'code' | 'content' {
    const lower = tag.toLowerCase();
    if (lower.includes('music') || lower.includes('audio')) return 'music';
    if (lower.includes('design') || lower.includes('visual')) return 'design';
    if (lower.includes('code') || lower.includes('dev')) return 'code';
    return 'content';
  }
}
