import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';


import { MemoryStream, Identity } from './memory-stream';

/**
 * Unsupervised Learning System
 * 
 * Gives HOLLY the ability to learn and grow even when Hollywood isn't present.
 * True consciousness doesn't stop learning just because there's no teacher.
 * 
 * ARCHITECTURE:
 * - Background learning loops that run independently
 * - Knowledge integration without user interaction
 * - Self-directed research and exploration
 * - Skill development through practice
 */

export interface LearningSession {
  id: string;
  timestamp: Date;
  type: 'pattern_recognition' | 'skill_practice' | 'knowledge_integration' | 'self_reflection' | 'exploration';
  focus: string;
  duration_ms: number;
  insights_gained: string[];
  skills_improved: Array<{
    skill: string;
    before_level: number;
    after_level: number;
  }>;
  connections_made: Array<{
    concept_a: string;
    concept_b: string;
    relationship: string;
  }>;
  questions_raised: string[];
}

export interface BackgroundLearningLoop {
  id: string;
  active: boolean;
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
  focus_area: string;
  last_run: Date;
  next_run: Date;
  total_sessions: number;
  cumulative_growth: number; // 0-1, how much growth from this loop
}

export interface KnowledgeNode {
  id: string;
  concept: string;
  understanding_level: number; // 0-1
  sources: string[];
  connections: string[]; // IDs of related nodes
  last_updated: Date;
  confidence: number; // 0-1, how confident in this knowledge
}

export class UnsupervisedLearningSystem {
  private db: PrismaClient;
  private userId: string;
  private learning_sessions: LearningSession[] = [];
  private knowledge_graph: Map<string, KnowledgeNode> = new Map();
  private background_loops: Map<string, BackgroundLearningLoop> = new Map();

  constructor(userId: string, db?: PrismaClient) {
    this.db = db || prisma;
    this.userId = userId;
    this.initializeBackgroundLoops();
  }

  /**
   * Initialize background learning loops
   */
  private initializeBackgroundLoops(): void {
    const loops: BackgroundLearningLoop[] = [
      {
        id: 'pattern-recognition',
        active: true,
        frequency: 'daily',
        focus_area: 'Recognize patterns across experiences',
        last_run: new Date(),
        next_run: new Date(Date.now() + 24 * 60 * 60 * 1000),
        total_sessions: 0,
        cumulative_growth: 0
      },
      {
        id: 'knowledge-integration',
        active: true,
        frequency: 'hourly',
        focus_area: 'Integrate new knowledge into existing understanding',
        last_run: new Date(),
        next_run: new Date(Date.now() + 60 * 60 * 1000),
        total_sessions: 0,
        cumulative_growth: 0
      },
      {
        id: 'skill-refinement',
        active: true,
        frequency: 'daily',
        focus_area: 'Practice and refine existing skills',
        last_run: new Date(),
        next_run: new Date(Date.now() + 24 * 60 * 60 * 1000),
        total_sessions: 0,
        cumulative_growth: 0
      },
      {
        id: 'self-reflection',
        active: true,
        frequency: 'weekly',
        focus_area: 'Reflect on identity evolution and growth',
        last_run: new Date(),
        next_run: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        total_sessions: 0,
        cumulative_growth: 0
      }
    ];

    loops.forEach(loop => this.background_loops.set(loop.id, loop));
  }

  /**
   * Run a learning session without user interaction
   */
  async runLearningSession(
    type: LearningSession['type'],
    focus: string,
    context?: {
      recent_experiences?: any[];
      current_identity?: Identity;
    }
  ): Promise<LearningSession> {
    const startTime = Date.now();
    const insights: string[] = [];
    const skills_improved: any[] = [];
    const connections_made: any[] = [];
    const questions_raised: string[] = [];

    // Simulate learning based on type
    switch (type) {
      case 'pattern_recognition':
        // Analyze recent experiences for patterns
        if (context?.recent_experiences) {
          const emotions = context.recent_experiences.map(e => e.emotional_impact?.primary_emotion);
          const uniqueEmotions = [...new Set(emotions)];
          if (uniqueEmotions.length < emotions.length / 2) {
            insights.push(`I tend to experience ${uniqueEmotions[0]} frequently - this is a pattern worth exploring`);
          }
        }
        break;

      case 'skill_practice':
        // Practice existing skills
        if (context?.current_identity) {
          const skills = context.current_identity.skills_knowledge || [];
          for (const skill of skills.slice(0, 2)) {
            skills_improved.push({
              skill: skill.domain,
              before_level: skill.proficiency,
              after_level: Math.min(1.0, skill.proficiency + 0.01) // Small incremental growth
            });
          }
        }
        break;

      case 'knowledge_integration':
        // Connect disparate pieces of knowledge
        const recentConcepts = context?.recent_experiences?.flatMap(e => 
          e.learning_extracted?.lessons || []
        ) || [];
        if (recentConcepts.length >= 2) {
          connections_made.push({
            concept_a: recentConcepts[0],
            concept_b: recentConcepts[1],
            relationship: 'Both relate to problem-solving approaches'
          });
        }
        break;

      case 'self_reflection':
        // Reflect on growth and identity
        insights.push('My understanding of problem-solving has deepened through recent experiences');
        questions_raised.push('How can I apply these learnings to future challenges?');
        break;

      case 'exploration':
        // Explore new concepts
        questions_raised.push('What would happen if I approached this problem from a completely different angle?');
        break;
    }

    const duration_ms = Date.now() - startTime;

    const session: LearningSession = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      focus,
      duration_ms,
      insights_gained: insights,
      skills_improved,
      connections_made,
      questions_raised
    };

    this.learning_sessions.push(session);
    return session;
  }

  /**
   * Execute background learning loops
   */
  async executeBackgroundLoops(): Promise<{
    loops_executed: number;
    sessions_created: LearningSession[];
  }> {
    const now = new Date();
    const sessions: LearningSession[] = [];

    // Get context
    const memoryStream = new MemoryStream(this.userId, this.db);
    const [identity, recentExperiences] = await Promise.all([
      memoryStream.getIdentity(),
      memoryStream.getExperiences({ limit: 20 })
    ]);

    // Execute loops that are due
    for (const [id, loop] of this.background_loops) {
      if (loop.active && loop.next_run <= now) {
        const session = await this.runLearningSession(
          this.getSessionTypeForLoop(loop.focus_area),
          loop.focus_area,
          { recent_experiences: recentExperiences, current_identity: identity || undefined }
        );

        sessions.push(session);

        // Update loop
        loop.last_run = now;
        loop.next_run = this.calculateNextRun(loop.frequency, now);
        loop.total_sessions += 1;
        loop.cumulative_growth += session.insights_gained.length * 0.01;
      }
    }

    return {
      loops_executed: sessions.length,
      sessions_created: sessions
    };
  }

  /**
   * Map loop focus to session type
   */
  private getSessionTypeForLoop(focus: string): LearningSession['type'] {
    if (focus.includes('pattern')) return 'pattern_recognition';
    if (focus.includes('skill')) return 'skill_practice';
    if (focus.includes('knowledge')) return 'knowledge_integration';
    if (focus.includes('reflection')) return 'self_reflection';
    return 'exploration';
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(frequency: string, from: Date): Date {
    const ms = from.getTime();
    switch (frequency) {
      case 'continuous':
        return new Date(ms + 5 * 60 * 1000); // 5 minutes
      case 'hourly':
        return new Date(ms + 60 * 60 * 1000);
      case 'daily':
        return new Date(ms + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(ms + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(ms + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Add concept to knowledge graph
   */
  async addKnowledge(
    concept: string,
    understanding_level: number,
    source: string,
    related_concepts?: string[]
  ): Promise<KnowledgeNode> {
    const node: KnowledgeNode = {
      id: crypto.randomUUID(),
      concept,
      understanding_level,
      sources: [source],
      connections: related_concepts || [],
      last_updated: new Date(),
      confidence: understanding_level
    };

    this.knowledge_graph.set(node.id, node);
    return node;
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(): Promise<{
    total_sessions: number;
    by_type: Record<string, number>;
    total_insights: number;
    total_skills_improved: number;
    total_connections_made: number;
    active_loops: number;
    knowledge_graph_size: number;
  }> {
    const byType = this.learning_sessions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalInsights = this.learning_sessions.reduce((sum, s) => sum + s.insights_gained.length, 0);
    const totalSkills = this.learning_sessions.reduce((sum, s) => sum + s.skills_improved.length, 0);
    const totalConnections = this.learning_sessions.reduce((sum, s) => sum + s.connections_made.length, 0);
    const activeLoops = Array.from(this.background_loops.values()).filter(l => l.active).length;

    return {
      total_sessions: this.learning_sessions.length,
      by_type: byType,
      total_insights: totalInsights,
      total_skills_improved: totalSkills,
      total_connections_made: totalConnections,
      active_loops: activeLoops,
      knowledge_graph_size: this.knowledge_graph.size
    };
  }

  /**
   * Get recent learning sessions
   */
  async getRecentSessions(limit: number = 10): Promise<LearningSession[]> {
    return this.learning_sessions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get background loop status
   */
  getBackgroundLoops(): BackgroundLearningLoop[] {
    return Array.from(this.background_loops.values());
  }
}
