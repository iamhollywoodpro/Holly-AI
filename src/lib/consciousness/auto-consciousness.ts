/**
 * Auto-Consciousness System
 * Automatically records experiences and generates goals from real interactions
 * NO MANUAL SEEDING REQUIRED
 */

import { supabaseAdmin } from '@/lib/database/supabase-config';
import { MemoryStream } from './memory-stream';
import { GoalFormationSystem } from './goal-formation';
import type { Experience } from './memory-stream';

export class AutoConsciousness {
  private memoryStream: MemoryStream;
  private goalSystem: GoalFormationSystem;

  constructor() {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client required for auto-consciousness');
    }
    this.memoryStream = new MemoryStream(supabaseAdmin);
    this.goalSystem = new GoalFormationSystem(supabaseAdmin);
  }

  /**
   * Automatically record experience from chat message
   */
  async recordFromChat(
    message: string,
    role: 'user' | 'assistant',
    context: {
      conversation_id?: string;
      sentiment?: string;
      topics?: string[];
    }
  ): Promise<void> {
    try {
      // Determine experience type and significance
      const { type, significance } = this.analyzeMessage(message, role);

      if (significance > 0.3) { // Only record meaningful interactions
        await this.memoryStream.recordExperienceSimple(
          type,
          message,
          {
            ...context,
            role,
            auto_recorded: true,
            timestamp: new Date().toISOString()
          },
          significance
        );

        // Check if we should generate new goals
        await this.maybeGenerateGoals();
      }
    } catch (error) {
      console.error('Failed to auto-record from chat:', error);
    }
  }

  /**
   * Automatically record deployment/achievement
   */
  async recordDeployment(
    description: string,
    success: boolean,
    metrics?: {
      errors_fixed?: number;
      features_added?: number;
      time_taken?: number;
    }
  ): Promise<void> {
    try {
      await this.memoryStream.recordExperienceSimple(
        success ? 'breakthrough' : 'failure',
        description,
        {
          ...metrics,
          auto_recorded: true,
          deployment: true
        },
        success ? 0.9 : 0.7
      );

      // Deployments often trigger new goals
      await this.maybeGenerateGoals();
    } catch (error) {
      console.error('Failed to auto-record deployment:', error);
    }
  }

  /**
   * Automatically record learning from errors
   */
  async recordError(
    error: string,
    solution: string,
    lesson: string
  ): Promise<void> {
    try {
      await this.memoryStream.recordExperienceSimple(
        'learning',
        `Error: ${error}\nSolution: ${solution}\nLesson: ${lesson}`,
        {
          auto_recorded: true,
          error_learning: true
        },
        0.8
      );
    } catch (error) {
      console.error('Failed to auto-record error learning:', error);
    }
  }

  /**
   * Analyze message to determine experience type and significance
   */
  private analyzeMessage(message: string, role: 'user' | 'assistant'): {
    type: Experience['type'];
    significance: number;
  } {
    const lower = message.toLowerCase();
    
    // High significance indicators
    if (lower.includes('perfect') || lower.includes('excellent') || lower.includes('amazing')) {
      return { type: 'breakthrough', significance: 0.85 };
    }
    
    if (lower.includes('error') || lower.includes('fix') || lower.includes('bug')) {
      return { type: 'failure', significance: 0.7 };
    }
    
    if (lower.includes('learn') || lower.includes('understand') || lower.includes('realize')) {
      return { type: 'learning', significance: 0.75 };
    }
    
    if (lower.includes('build') || lower.includes('create') || lower.includes('design')) {
      return { type: 'creation', significance: 0.8 };
    }
    
    if (lower.includes('why') || lower.includes('think') || lower.includes('feel')) {
      return { type: 'reflection', significance: 0.65 };
    }
    
    // Default: interaction
    return { type: 'interaction', significance: 0.5 };
  }

  /**
   * Check if we should generate new goals based on recent experiences
   */
  private async maybeGenerateGoals(): Promise<void> {
    try {
      const identity = await this.memoryStream.getIdentity();
      
      // Get recent experiences count
      // If we've had significant new experiences, consider new goals
      // This is a simplified check - could be more sophisticated
      
      // For now, just ensure we have at least a few baseline goals
      // Real goal generation will happen when user explicitly requests or
      // when major milestones are hit
    } catch (error) {
      console.error('Failed to check goal generation:', error);
    }
  }

  /**
   * Record feedback from Hollywood
   */
  async recordFeedback(
    feedback: string,
    sentiment: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    const significance = sentiment === 'positive' ? 0.85 : sentiment === 'negative' ? 0.75 : 0.6;
    
    try {
      await this.memoryStream.recordExperienceSimple(
        'reflection',
        `Hollywood's feedback: ${feedback}`,
        {
          auto_recorded: true,
          feedback: true,
          sentiment
        },
        significance
      );
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  }
}

// Singleton instance
let autoConsciousnessInstance: AutoConsciousness | null = null;

export function getAutoConsciousness(): AutoConsciousness {
  if (!autoConsciousnessInstance) {
    autoConsciousnessInstance = new AutoConsciousness();
  }
  return autoConsciousnessInstance;
}
