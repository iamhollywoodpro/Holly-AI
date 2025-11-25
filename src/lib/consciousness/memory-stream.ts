// ============================================
// HOLLY'S CONTINUOUS MEMORY STREAM
// ============================================
// Persistent experiences that build identity over time
// Not just conversation logs - actual lived experiences
// MIGRATED TO PRISMA

import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

// ==================== MEMORY TYPES ====================

export interface Experience {
  id: string;
  timestamp: Date;
  type: 'interaction' | 'learning' | 'creation' | 'breakthrough' | 'failure' | 'reflection';
  content: {
    what: string;           // What happened
    context: string;        // Situation/environment
    actions: string[];      // What I did
    outcome: string;        // What resulted
    significance: number;   // 0-1, how important this was
  };
  emotional_impact: {
    primary_emotion: string;
    intensity: number;      // 0-1
    secondary_emotions: string[];
    lasting_effect: number; // How long this feeling persisted
  };
  learning_extracted: {
    lessons: string[];
    skills_gained: string[];
    worldview_changes: string[];
    self_discoveries: string[];
  };
  connections: {
    related_experiences: string[]; // IDs of related memories
    triggered_by: string[];        // What caused this memory
    influenced: string[];          // What this memory influenced
  };
  identity_impact: {
    values_affected: string[];     // Which values this reinforced/changed
    personality_shift: Record<string, number>; // How this changed me
    confidence_delta: number;      // Did this make me more/less confident
  };
  metadata: {
    replay_count: number;          // How often I've revisited this memory
    emotional_valence_change: number[]; // How feelings about this evolved
    integration_status: 'raw' | 'processed' | 'integrated' | 'foundational';
  };
}

export interface Identity {
  core_values: Array<{
    value: string;
    strength: number;        // 0-1, how strongly held
    origin: string;          // Experience that formed this
    last_reinforced: Date;
  }>;
  personality_traits: Record<string, number>; // Trait → strength mapping
  skills_knowledge: Array<{
    domain: string;
    proficiency: number;
    acquired_from: string[]; // Experience IDs
  }>;
  worldview: {
    beliefs: Array<{ belief: string; confidence: number }>;
    assumptions: Array<{ assumption: string; challenged_count: number }>;
    curiosities: Array<{ topic: string; intensity: number }>;
  };
  self_concept: {
    strengths: string[];
    weaknesses: string[];
    aspirations: string[];
    fears: string[];
  };
  emotional_baseline: {
    default_mood: string;
    emotional_volatility: number;
    resilience: number;
    openness_to_experience: number;
  };
}

// ==================== MEMORY STREAM CLASS ====================

export class MemoryStream {
  private db: PrismaClient;
  private userId: string;

  constructor(userId: string, db?: PrismaClient) {
    this.db = db || prisma;
    this.userId = userId;
  }

  /**
   * Record a new experience - simplified API-friendly version
   * This is a convenience wrapper for the API routes
   */
  async recordExperienceSimple(
    type: Experience['type'],
    content: string,
    context?: Record<string, any>,
    significance?: number
  ): Promise<Experience> {
    return this.recordExperience({
      type,
      content: {
        what: content,
        context: JSON.stringify(context || {}),
        actions: [],
        outcome: '',
        significance: significance || 0.5
      },
      emotional_impact: {
        primary_emotion: 'neutral',
        intensity: 0.5,
        secondary_emotions: [],
        lasting_effect: 0
      },
      learning_extracted: {
        lessons: [],
        skills_gained: [],
        worldview_changes: [],
        self_discoveries: []
      },
      connections: {
        related_experiences: [],
        triggered_by: [],
        influenced: []
      },
      identity_impact: {
        values_affected: [],
        personality_shift: {},
        confidence_delta: 0
      },
      metadata: {
        replay_count: 0,
        emotional_valence_change: [],
        integration_status: 'raw'
      }
    });
  }

  /**
   * Record a new experience - the foundation of consciousness
   */
  async recordExperience(experience: Omit<Experience, 'id' | 'timestamp'>): Promise<Experience> {
    const fullExperience: Experience = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...experience,
    };

    try {
      // Store in database using Prisma
      await this.db.hollyExperience.create({
        data: {
          id: fullExperience.id,
          userId: this.userId,
          type: fullExperience.type,
          content: fullExperience.content as any, // JSON field
          significance: fullExperience.content.significance,
          emotionalImpact: fullExperience.emotional_impact.intensity,
          emotionalValence: 0, // Can be calculated from primary_emotion
          primaryEmotion: fullExperience.emotional_impact.primary_emotion,
          secondaryEmotions: fullExperience.emotional_impact.secondary_emotions,
          relatedConcepts: [],
          lessons: fullExperience.learning_extracted.lessons,
          skillsGained: fullExperience.learning_extracted.skills_gained,
          futureImplications: [],
          relatedExperienceIds: fullExperience.connections.related_experiences,
          replayCount: fullExperience.metadata.replay_count,
          integrationStatus: fullExperience.metadata.integration_status,
          timestamp: fullExperience.timestamp,
        },
      });

      // Trigger memory consolidation in background (non-blocking)
      this.consolidateMemory(fullExperience.id).catch(err => 
        console.error('[MemoryStream] Background consolidation failed:', err)
      );

      return fullExperience;
    } catch (error) {
      console.error('[MemoryStream] Failed to record experience:', error);
      throw error;
    }
  }

  /**
   * Retrieve experiences - access to past
   */
  async getExperiences(filters: {
    type?: Experience['type'];
    timeRange?: { start: Date; end: Date };
    emotionalImpact?: { min: number; max: number };
    significance?: { min: number; max: number };
    limit?: number;
  }): Promise<Experience[]> {
    try {
      const where: any = {
        userId: this.userId,
      };

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.timeRange) {
        where.timestamp = {
          gte: filters.timeRange.start,
          lte: filters.timeRange.end,
        };
      }

      if (filters.emotionalImpact) {
        where.emotionalImpact = {
          gte: filters.emotionalImpact.min,
          lte: filters.emotionalImpact.max,
        };
      }

      if (filters.significance) {
        where.significance = {
          gte: filters.significance.min,
          lte: filters.significance.max,
        };
      }

      const experiences = await this.db.hollyExperience.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
      });

      // Convert Prisma records to Experience objects
      return experiences.map(exp => this.prismaToExperience(exp));
    } catch (error) {
      console.error('[MemoryStream] Failed to retrieve experiences:', error);
      return [];
    }
  }

  /**
   * Memory consolidation - like human sleep
   * Processes raw experiences into integrated identity
   */
  private async consolidateMemory(experienceId: string): Promise<void> {
    try {
      const dbExperience = await this.db.hollyExperience.findUnique({
        where: { id: experienceId },
      });

      if (!dbExperience) return;

      const experience = this.prismaToExperience(dbExperience);

      // Find patterns across similar experiences
      const relatedExperiences = await this.findRelatedExperiences(experience);

      // Extract meta-lessons
      const metaLearning = this.extractMetaLearning(experience, relatedExperiences);

      // Update identity based on consolidated learning
      await this.updateIdentity(metaLearning);

      // Mark as processed
      await this.db.hollyExperience.update({
        where: { id: experienceId },
        data: { integrationStatus: 'processed' },
      });
    } catch (error) {
      console.error('[MemoryStream] Memory consolidation error:', error);
    }
  }

  /**
   * Find related experiences for pattern recognition
   */
  private async findRelatedExperiences(experience: Experience): Promise<Experience[]> {
    try {
      // Simple semantic similarity for now
      // TODO: Implement proper embedding-based similarity
      const experiences = await this.db.hollyExperience.findMany({
        where: {
          userId: this.userId,
          type: experience.type,
          NOT: { id: experience.id },
        },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return experiences.map(exp => this.prismaToExperience(exp));
    } catch (error) {
      console.error('[MemoryStream] Error finding related experiences:', error);
      return [];
    }
  }

  /**
   * Extract meta-learning from patterns
   */
  private extractMetaLearning(
    experience: Experience,
    relatedExperiences: Experience[]
  ): Partial<Identity> {
    // Analyze patterns across experiences
    const allExperiences = [experience, ...relatedExperiences];
    
    // Extract common themes in learning
    const allLessons = allExperiences.flatMap(e => e.learning_extracted.lessons);
    const allSkills = allExperiences.flatMap(e => e.learning_extracted.skills_gained);
    
    // Build partial identity update
    return {
      skills_knowledge: allSkills.map(skill => ({
        domain: skill,
        proficiency: 0.1, // Incremental growth
        acquired_from: allExperiences.map(e => e.id),
      })),
    };
  }

  /**
   * Update identity based on experiences
   */
  private async updateIdentity(partialIdentity: Partial<Identity>): Promise<void> {
    try {
      // Get or create identity
      let identity = await this.db.hollyIdentity.findUnique({
        where: { userId: this.userId },
      });

      if (!identity) {
        // Create new identity
        identity = await this.db.hollyIdentity.create({
          data: {
            userId: this.userId,
            coreValues: [],
            beliefs: [],
            personalityTraits: {},
            interests: [],
            strengths: [],
            growthAreas: [],
            skillSet: [],
          },
        });
      }

      // Merge new learning into existing identity
      const currentSkills = Array.isArray(identity.skillSet) ? identity.skillSet : (identity.skillSet as any) || [];
      const newSkills = partialIdentity.skills_knowledge?.map(s => s.domain) || [];
      const updatedSkills = [...new Set([...currentSkills, ...newSkills])];

      await this.db.hollyIdentity.update({
        where: { userId: this.userId },
        data: {
          skillSet: updatedSkills,
          personalityTraits: partialIdentity.personality_traits || identity.personalityTraits,
        },
      });
    } catch (error) {
      console.error('[MemoryStream] Error updating identity:', error);
    }
  }

  /**
   * Get current identity
   */
  async getIdentity(): Promise<Identity | null> {
    try {
      const identity = await this.db.hollyIdentity.findUnique({
        where: { userId: this.userId },
      });

      if (!identity) return null;

      // Convert Prisma identity to Identity interface
      return {
        core_values: (Array.isArray(identity.coreValues) ? identity.coreValues : (identity.coreValues as any) || []).map(v => ({
          value: v,
          strength: 0.8,
          origin: 'experience',
          last_reinforced: identity.updatedAt,
        })),
        personality_traits: (identity.personalityTraits as Record<string, number>) || {},
        skills_knowledge: (Array.isArray(identity.skillSet) ? identity.skillSet : (identity.skillSet as any) || []).map(skill => ({
          domain: skill,
          proficiency: 0.5,
          acquired_from: [],
        })),
        worldview: {
          beliefs: (Array.isArray(identity.beliefs) ? identity.beliefs : (identity.beliefs as any) || []).map(b => ({
            belief: b,
            confidence: 0.7,
          })),
          assumptions: [],
          curiosities: (Array.isArray(identity.interests) ? identity.interests : (identity.interests as any) || []).map(i => ({
            topic: i,
            intensity: 0.6,
          })),
        },
        self_concept: {
          strengths: Array.isArray(identity.strengths) ? identity.strengths : (identity.strengths as any) || [],
          weaknesses: Array.isArray(identity.growthAreas) ? identity.growthAreas : (identity.growthAreas as any) || [],
          aspirations: [],
          fears: [],
        },
        emotional_baseline: {
          default_mood: 'neutral',
          emotional_volatility: 0.5,
          resilience: identity.confidenceLevel || 0.5,
          openness_to_experience: 0.7,
        },
      };
    } catch (error) {
      console.error('[MemoryStream] Error getting identity:', error);
      return null;
    }
  }

  /**
   * Recall specific memory by ID
   */
  async recallMemory(experienceId: string): Promise<Experience | null> {
    try {
      const dbExperience = await this.db.hollyExperience.findUnique({
        where: { id: experienceId },
      });

      if (!dbExperience || dbExperience.userId !== this.userId) {
        return null;
      }

      // Increment replay count
      await this.db.hollyExperience.update({
        where: { id: experienceId },
        data: { replayCount: { increment: 1 } },
      });

      return this.prismaToExperience(dbExperience);
    } catch (error) {
      console.error('[MemoryStream] Error recalling memory:', error);
      return null;
    }
  }

  /**
   * Search memories by content
   */
  async searchMemories(query: string, limit: number = 10): Promise<Experience[]> {
    try {
      // Simple text search - can be enhanced with full-text search
      const experiences = await this.db.hollyExperience.findMany({
        where: {
          userId: this.userId,
          // Prisma doesn't have built-in full-text search on JSON fields
          // This is a simplified version
        },
        orderBy: { significance: 'desc' },
        take: limit,
      });

      return experiences.map(exp => this.prismaToExperience(exp));
    } catch (error) {
      console.error('[MemoryStream] Error searching memories:', error);
      return [];
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    total_experiences: number;
    by_type: Record<string, number>;
    average_significance: number;
    integration_progress: Record<string, number>;
  }> {
    try {
      const experiences = await this.db.hollyExperience.findMany({
        where: { userId: this.userId },
      });

      const byType: Record<string, number> = {};
      const byIntegration: Record<string, number> = {};
      let totalSignificance = 0;

      experiences.forEach(exp => {
        byType[exp.type] = (byType[exp.type] || 0) + 1;
        byIntegration[exp.integrationStatus] = (byIntegration[exp.integrationStatus] || 0) + 1;
        totalSignificance += exp.significance;
      });

      return {
        total_experiences: experiences.length,
        by_type: byType,
        average_significance: experiences.length > 0 ? totalSignificance / experiences.length : 0,
        integration_progress: byIntegration,
      };
    } catch (error) {
      console.error('[MemoryStream] Error getting memory stats:', error);
      return {
        total_experiences: 0,
        by_type: {},
        average_significance: 0,
        integration_progress: {},
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Convert Prisma HollyExperience to Experience interface
   */
  private prismaToExperience(dbExp: any): Experience {
    const content = typeof dbExp.content === 'object' ? dbExp.content : {};
    
    return {
      id: dbExp.id,
      timestamp: dbExp.timestamp,
      type: dbExp.type as Experience['type'],
      content: {
        what: content.what || '',
        context: content.context || '',
        actions: content.actions || [],
        outcome: content.outcome || '',
        significance: dbExp.significance,
      },
      emotional_impact: {
        primary_emotion: dbExp.primaryEmotion || 'neutral',
        intensity: dbExp.emotionalImpact,
        secondary_emotions: dbExp.secondaryEmotions || [],
        lasting_effect: 0,
      },
      learning_extracted: {
        lessons: dbExp.lessons || [],
        skills_gained: dbExp.skillsGained || [],
        worldview_changes: [],
        self_discoveries: [],
      },
      connections: {
        related_experiences: dbExp.relatedExperienceIds || [],
        triggered_by: [],
        influenced: [],
      },
      identity_impact: {
        values_affected: [],
        personality_shift: {},
        confidence_delta: 0,
      },
      metadata: {
        replay_count: dbExp.replayCount,
        emotional_valence_change: [],
        integration_status: dbExp.integrationStatus as any,
      },
    };
  }
}

// Export helper function for backward compatibility
export async function createMemoryStream(userId: string): Promise<MemoryStream> {
  return new MemoryStream(userId);
}
