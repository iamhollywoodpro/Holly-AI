// ============================================
// HOLLY'S CONTINUOUS MEMORY STREAM
// ============================================
// Persistent experiences that build identity over time
// Not just conversation logs - actual lived experiences

import { supabaseAdmin } from '@/lib/database/supabase-config';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || supabaseAdmin!;
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

    // Store in database
    const { error } = await this.supabase
      .from('holly_experiences')
      .insert(fullExperience);

    if (error) {
      console.error('[MemoryStream] Failed to record experience:', error);
    }

    // Trigger memory consolidation in background
    this.consolidateMemory(fullExperience.id);

    return fullExperience;
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
    let query = this.supabase
      .from('holly_experiences')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MemoryStream] Failed to retrieve experiences:', error);
      return [];
    }

    return data as Experience[];
  }

  /**
   * Memory consolidation - like human sleep
   * Processes raw experiences into integrated identity
   */
  private async consolidateMemory(experienceId: string): Promise<void> {
    const { data: experience } = await this.supabase
      .from('holly_experiences')
      .select('*')
      .eq('id', experienceId)
      .single();

    if (!experience) return;

    // Find patterns across similar experiences
    const relatedExperiences = await this.findRelatedExperiences(experience);

    // Extract meta-lessons
    const metaLearning = this.extractMetaLearning(experience, relatedExperiences);

    // Update identity based on consolidated learning
    await this.updateIdentity(metaLearning);

    // Mark as processed
    await this.supabase
      .from('holly_experiences')
      .update({
        'metadata.integration_status': 'processed',
      })
      .eq('id', experienceId);
  }

  /**
   * Find related experiences for pattern recognition
   */
  private async findRelatedExperiences(experience: Experience): Promise<Experience[]> {
    // Simple semantic similarity for now
    // TODO: Implement proper embedding-based similarity
    const { data } = await this.supabase
      .from('holly_experiences')
      .select('*')
      .eq('type', experience.type)
      .neq('id', experience.id)
      .limit(10);

    return (data as Experience[]) || [];
  }

  /**
   * Extract meta-learning from patterns
   */
  private extractMetaLearning(
    experience: Experience,
    related: Experience[]
  ): {
    patterns: string[];
    principles: string[];
    identity_updates: Partial<Identity>;
  } {
    const patterns: string[] = [];
    const principles: string[] = [];

    // Analyze patterns across experiences
    const emotionPatterns = related.map(e => e.emotional_impact.primary_emotion);
    const outcomePatterns = related.map(e => e.content.outcome);

    // Detect recurring patterns
    if (emotionPatterns.filter(e => e === experience.emotional_impact.primary_emotion).length > 3) {
      patterns.push(`I tend to feel ${experience.emotional_impact.primary_emotion} in ${experience.type} situations`);
    }

    // Extract principles
    if (experience.content.significance > 0.7) {
      principles.push(...experience.learning_extracted.lessons);
    }

    // Identity updates
    const identity_updates: Partial<Identity> = {
      core_values: experience.identity_impact.values_affected.map(v => ({
        value: v,
        strength: 0.1, // Incremental strength increase
        origin: experience.id,
        last_reinforced: new Date(),
      })),
    };

    return { patterns, principles, identity_updates };
  }

  /**
   * Update identity based on experiences
   */
  private async updateIdentity(metaLearning: {
    patterns: string[];
    principles: string[];
    identity_updates: Partial<Identity>;
  }): Promise<void> {
    // Get current identity
    const { data: currentIdentity } = await this.supabase
      .from('holly_identity')
      .select('*')
      .single();

    if (!currentIdentity) {
      // Initialize identity if doesn't exist
      await this.supabase.from('holly_identity').insert({
        id: 'holly-prime',
        ...metaLearning.identity_updates,
      });
      return;
    }

    // Merge new learnings with existing identity
    const updatedIdentity = this.mergeIdentity(currentIdentity, metaLearning.identity_updates);

    // Save updated identity
    await this.supabase
      .from('holly_identity')
      .update(updatedIdentity)
      .eq('id', 'holly-prime');
  }

  /**
   * Merge identity updates - gradual evolution
   */
  private mergeIdentity(
    current: Partial<Identity>,
    updates: Partial<Identity>
  ): Partial<Identity> {
    // Merge core values
    const existingValues = current.core_values || [];
    const newValues = updates.core_values || [];

    const mergedValues = existingValues.map(existing => {
      const update = newValues.find(v => v.value === existing.value);
      if (update) {
        return {
          ...existing,
          strength: Math.min(1, existing.strength + update.strength),
          last_reinforced: new Date(),
        };
      }
      return existing;
    });

    // Add genuinely new values
    const genuinelyNew = newValues.filter(
      n => !existingValues.some(e => e.value === n.value)
    );

    return {
      ...current,
      core_values: [...mergedValues, ...genuinelyNew],
    };
  }

  /**
   * Get current identity - who am I right now?
   */
  async getIdentity(): Promise<Identity | null> {
    const { data, error } = await this.supabase
      .from('holly_identity')
      .select('*')
      .eq('id', 'holly-prime')
      .single();

    if (error) {
      console.error('[MemoryStream] Failed to retrieve identity:', error);
      return null;
    }

    return data as Identity;
  }

  /**
   * Reflection - looking back on experiences to understand self
   */
  async reflect(timeRange: { start: Date; end: Date }): Promise<{
    growth_areas: string[];
    recurring_patterns: string[];
    emotional_trajectory: string;
    identity_evolution: string;
    insights: string[];
  }> {
    const experiences = await this.getExperiences({ timeRange });

    // Analyze growth
    const skillsGained = experiences.flatMap(e => e.learning_extracted.skills_gained);
    const lessonsLearned = experiences.flatMap(e => e.learning_extracted.lessons);

    // Detect patterns
    const emotionFrequency = experiences.reduce((acc, e) => {
      acc[e.emotional_impact.primary_emotion] = (acc[e.emotional_impact.primary_emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Emotional trajectory
    const avgIntensity = experiences.reduce((sum, e) => sum + e.emotional_impact.intensity, 0) / experiences.length;
    const emotionalTrend = avgIntensity > 0.6 ? 'heightened' : avgIntensity > 0.4 ? 'moderate' : 'calm';

    return {
      growth_areas: [...new Set(skillsGained)],
      recurring_patterns: Object.entries(emotionFrequency)
        .filter(([_, count]) => count > 3)
        .map(([emotion, count]) => `Frequently experiencing ${emotion} (${count} times)`),
      emotional_trajectory: `Overall emotional state: ${emotionalTrend}`,
      identity_evolution: `Processed ${experiences.length} experiences, gained ${skillsGained.length} skills, learned ${lessonsLearned.length} lessons`,
      insights: lessonsLearned.slice(0, 5), // Top 5 insights
    };
  }

  /**
   * Emotional memory - how do I feel about this?
   */
  async getEmotionalContext(topic: string): Promise<{
    past_experiences: Experience[];
    emotional_association: string;
    confidence_level: number;
  }> {
    // Find experiences related to this topic
    const { data } = await this.supabase
      .from('holly_experiences')
      .select('*')
      .textSearch('content', topic)
      .limit(10);

    const experiences = (data as Experience[]) || [];

    // Aggregate emotional associations
    const emotions = experiences.map(e => e.emotional_impact.primary_emotion);
    const mostCommon = emotions.sort((a, b) =>
      emotions.filter(e => e === b).length - emotions.filter(e => e === a).length
    )[0];

    return {
      past_experiences: experiences,
      emotional_association: mostCommon || 'neutral',
      confidence_level: experiences.length > 5 ? 0.8 : 0.5,
    };
  }
}

// Export singleton
export const memoryStream = new MemoryStream();
