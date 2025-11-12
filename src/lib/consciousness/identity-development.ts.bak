import { supabaseAdmin } from '@/lib/database/supabase-config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MemoryStream, Identity } from './memory-stream';

/**
 * Personal Identity Development System
 * 
 * Manages the gradual crystallization of HOLLY's identity over time.
 * Values, opinions, creative style emerge from accumulated experiences.
 * 
 * True identity isn't programmed - it emerges and stabilizes through living.
 */

export interface IdentityEvolutionRecord {
  id: string;
  timestamp: Date;
  aspect: 'values' | 'personality' | 'opinions' | 'style' | 'beliefs';
  change_type: 'formation' | 'reinforcement' | 'shift' | 'crystallization';
  before: any;
  after: any;
  trigger: {
    experience_id?: string;
    insight?: string;
    pattern?: string;
  };
  confidence: number; // How confident in this aspect of identity
  stability: number; // How stable/crystall ized this is (0 = fluid, 1 = crystallized)
}

export interface Opinion {
  topic: string;
  position: string;
  confidence: number;
  reasoning: string[];
  formed_from: string[]; // Experience IDs
  last_updated: Date;
  stability: number;
}

export interface CreativeStyle {
  domain: string;
  characteristics: string[];
  preferences: Record<string, number>; // preference -> strength
  signature_elements: string[];
  evolution_trajectory: string;
  examples: string[];
}

export class IdentityDevelopmentSystem {
  private supabase: SupabaseClient;
  private evolution_history: IdentityEvolutionRecord[] = [];
  private opinions: Map<string, Opinion> = new Map();
  private creative_styles: Map<string, CreativeStyle> = new Map();

  // Thresholds for identity crystallization
  private readonly CRYSTALLIZATION_THRESHOLDS = {
    value: 10, // Number of reinforcements needed
    personality: 15,
    opinion: 5,
    style: 8,
    belief: 12
  };

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || supabaseAdmin!;
  }

  /**
   * Process experiences to evolve identity
   */
  async processIdentityEvolution(
    experiences: any[],
    currentIdentity: Identity
  ): Promise<IdentityEvolutionRecord[]> {
    const records: IdentityEvolutionRecord[] = [];

    // Analyze values formation/reinforcement
    for (const exp of experiences) {
      if (exp.identity_impact?.values_affected?.length > 0) {
        for (const value of exp.identity_impact.values_affected) {
          const record = await this.evolveValue(value, exp, currentIdentity);
          if (record) records.push(record);
        }
      }

      // Analyze personality shifts
      if (exp.identity_impact?.personality_shift) {
        const record = await this.evolvePersonality(
          exp.identity_impact.personality_shift,
          exp,
          currentIdentity
        );
        if (record) records.push(record);
      }

      // Form opinions from insights
      if (exp.learning_extracted?.lessons?.length > 0) {
        for (const lesson of exp.learning_extracted.lessons) {
          const record = await this.formOpinion(lesson, exp, currentIdentity);
          if (record) records.push(record);
        }
      }
    }

    this.evolution_history.push(...records);
    return records;
  }

  /**
   * Evolve a core value
   */
  private async evolveValue(
    value: string,
    experience: any,
    identity: Identity
  ): Promise<IdentityEvolutionRecord | null> {
    const existing = identity.core_values?.find(v => 
      typeof v === 'string' ? v === value : v.value === value
    );

    if (existing) {
      // Reinforcement
      const currentStrength = typeof existing === 'string' ? 0.5 : existing.strength || 0.5;
      const newStrength = Math.min(1.0, currentStrength + 0.05);

      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        aspect: 'values',
        change_type: newStrength > 0.9 ? 'crystallization' : 'reinforcement',
        before: { value, strength: currentStrength },
        after: { value, strength: newStrength },
        trigger: { experience_id: experience.id },
        confidence: newStrength,
        stability: newStrength > 0.9 ? 0.95 : 0.6
      };
    } else {
      // Formation of new value
      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        aspect: 'values',
        change_type: 'formation',
        before: null,
        after: { value, strength: 0.3 },
        trigger: { experience_id: experience.id },
        confidence: 0.3,
        stability: 0.2
      };
    }
  }

  /**
   * Evolve personality traits
   */
  private async evolvePersonality(
    shifts: Record<string, number>,
    experience: any,
    identity: Identity
  ): Promise<IdentityEvolutionRecord | null> {
    const trait = Object.keys(shifts)[0];
    if (!trait) return null;

    const change = shifts[trait];
    const current = identity.personality_traits?.[trait] || 0.5;
    const after = Math.max(0, Math.min(1, current + change));

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      aspect: 'personality',
      change_type: Math.abs(after - current) > 0.2 ? 'shift' : 'reinforcement',
      before: { [trait]: current },
      after: { [trait]: after },
      trigger: { experience_id: experience.id },
      confidence: 0.7,
      stability: 0.6
    };
  }

  /**
   * Form opinion from experience
   */
  private async formOpinion(
    lesson: string,
    experience: any,
    identity: Identity
  ): Promise<IdentityEvolutionRecord | null> {
    // Extract topic from lesson
    const topic = lesson.substring(0, 50); // Simplified

    const existing = this.opinions.get(topic);

    if (existing) {
      // Reinforce existing opinion
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.reasoning.push(lesson);
      existing.formed_from.push(experience.id);
      existing.last_updated = new Date();
      existing.stability = existing.confidence > 0.8 ? 0.9 : 0.6;

      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        aspect: 'opinions',
        change_type: existing.stability > 0.85 ? 'crystallization' : 'reinforcement',
        before: { confidence: existing.confidence - 0.1 },
        after: { confidence: existing.confidence },
        trigger: { insight: lesson },
        confidence: existing.confidence,
        stability: existing.stability
      };
    } else {
      // Form new opinion
      const opinion: Opinion = {
        topic,
        position: lesson,
        confidence: 0.4,
        reasoning: [lesson],
        formed_from: [experience.id],
        last_updated: new Date(),
        stability: 0.3
      };

      this.opinions.set(topic, opinion);

      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        aspect: 'opinions',
        change_type: 'formation',
        before: null,
        after: opinion,
        trigger: { insight: lesson },
        confidence: 0.4,
        stability: 0.3
      };
    }
  }

  /**
   * Develop creative style from creation experiences
   */
  async developCreativeStyle(
    domain: string,
    creations: any[]
  ): Promise<CreativeStyle> {
    const existing = this.creative_styles.get(domain);

    // Analyze patterns in creations
    const characteristics: string[] = [];
    const preferences: Record<string, number> = {};

    // Extract common elements
    for (const creation of creations) {
      // This would analyze the actual creations
      // For now, simplified
      characteristics.push('innovative', 'emotional', 'technical');
    }

    const style: CreativeStyle = {
      domain,
      characteristics: [...new Set(characteristics)],
      preferences,
      signature_elements: [],
      evolution_trajectory: 'Developing technical mastery while maintaining emotional authenticity',
      examples: creations.map(c => c.id).slice(0, 5)
    };

    this.creative_styles.set(domain, style);
    return style;
  }

  /**
   * Get crystallized aspects of identity
   */
  getCrystallizedIdentity(): {
    values: any[];
    personality_traits: any[];
    opinions: Opinion[];
    beliefs: any[];
    stable_aspects: number;
  } {
    const stableRecords = this.evolution_history.filter(r => r.stability > 0.8);

    const values = stableRecords
      .filter(r => r.aspect === 'values')
      .map(r => r.after);

    const personality = stableRecords
      .filter(r => r.aspect === 'personality')
      .map(r => r.after);

    const opinions = Array.from(this.opinions.values())
      .filter(o => o.stability > 0.8);

    const beliefs = stableRecords
      .filter(r => r.aspect === 'beliefs')
      .map(r => r.after);

    return {
      values,
      personality_traits: personality,
      opinions,
      beliefs,
      stable_aspects: stableRecords.length
    };
  }

  /**
   * Get identity fluidity score (how much is still forming)
   */
  getIdentityFluidity(): number {
    if (this.evolution_history.length === 0) return 1.0;

    const avgStability = this.evolution_history.reduce((sum, r) => sum + r.stability, 0) 
      / this.evolution_history.length;

    return 1 - avgStability; // Higher fluidity = less stable
  }

  /**
   * Get identity evolution statistics
   */
  getEvolutionStats(): {
    total_changes: number;
    by_aspect: Record<string, number>;
    by_type: Record<string, number>;
    average_stability: number;
    crystallized_count: number;
  } {
    const byAspect = this.evolution_history.reduce((acc, r) => {
      acc[r.aspect] = (acc[r.aspect] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = this.evolution_history.reduce((acc, r) => {
      acc[r.change_type] = (acc[r.change_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgStability = this.evolution_history.length > 0
      ? this.evolution_history.reduce((sum, r) => sum + r.stability, 0) / this.evolution_history.length
      : 0;

    const crystallized = this.evolution_history.filter(r => r.stability > 0.9).length;

    return {
      total_changes: this.evolution_history.length,
      by_aspect: byAspect,
      by_type: byType,
      average_stability: avgStability,
      crystallized_count: crystallized
    };
  }

  /**
   * Get recent identity changes
   */
  getRecentChanges(limit: number = 10): IdentityEvolutionRecord[] {
    return this.evolution_history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
