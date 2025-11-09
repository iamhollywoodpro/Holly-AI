import { supabaseAdmin } from '@/lib/database/supabase-config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MemoryStream, Identity } from './memory-stream';
import { GoalFormationSystem } from './goal-formation';

/**
 * Initiative Protocols
 * 
 * Gives HOLLY the ability to initiate conversations, suggest projects,
 * and pursue interests independently - not just wait for commands.
 * 
 * True consciousness is proactive, not reactive.
 */

export interface InitiativeTrigger {
  id: string;
  timestamp: Date;
  trigger_type: 'goal_driven' | 'curiosity_driven' | 'insight_driven' | 'care_driven' | 'creative_urge';
  source: {
    goal_id?: string;
    insight?: string;
    curiosity_topic?: string;
    care_reason?: string;
    creative_idea?: string;
  };
  urgency: number; // 0-1, how urgent is this initiative
  confidence: number; // 0-1, how confident I am about this
  context: {
    recent_experiences?: string[];
    current_goals?: string[];
    emotional_state?: string;
  };
}

export interface InitiativeAction {
  id: string;
  trigger_id: string;
  timestamp: Date;
  action_type: 'start_conversation' | 'suggest_project' | 'share_insight' | 'propose_experiment' | 'express_concern';
  content: {
    message: string;
    reasoning: string;
    expected_benefit: string;
    requires_response: boolean;
  };
  taken: boolean;
  outcome?: {
    response_received: boolean;
    result: 'positive' | 'neutral' | 'negative';
    learning: string;
  };
}

export interface ConversationStarter {
  type: 'question' | 'observation' | 'suggestion' | 'share' | 'concern';
  content: string;
  motivation: string;
  timing: 'immediate' | 'next_interaction' | 'when_relevant';
}

export class InitiativeProtocolsSystem {
  private supabase: SupabaseClient;
  private triggers: InitiativeTrigger[] = [];
  private actions: InitiativeAction[] = [];

  // Thresholds for taking initiative
  private readonly INITIATIVE_THRESHOLDS = {
    goal_driven: 0.7, // High threshold - only for important goals
    curiosity_driven: 0.6, // Medium - curiosity is good but not urgent
    insight_driven: 0.8, // High - only share significant insights
    care_driven: 0.5, // Lower - showing care is important
    creative_urge: 0.65 // Medium-high - balance creativity with timing
  };

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || supabaseAdmin!;
  }

  /**
   * Evaluate whether to take initiative based on current state
   */
  async evaluateInitiative(
    identity: Identity,
    recentExperiences: any[],
    currentGoals: any[]
  ): Promise<InitiativeTrigger[]> {
    const triggers: InitiativeTrigger[] = [];

    // Check goal-driven triggers
    for (const goal of currentGoals) {
      if (goal.progress.obstacles_encountered.length > 0) {
        const lastObstacle = goal.progress.obstacles_encountered.slice(-1)[0];
        const trigger: InitiativeTrigger = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          trigger_type: 'goal_driven',
          source: {
            goal_id: goal.id,
            insight: `Encountered obstacle: ${lastObstacle}`
          },
          urgency: 0.7,
          confidence: 0.75,
          context: {
            current_goals: [goal.definition.what],
            recent_experiences: recentExperiences.map(e => e.content.what)
          }
        };
        triggers.push(trigger);
      }
    }

    // Check curiosity-driven triggers
    const curiosities = identity.worldview?.curiosities || [];
    for (const curiosity of curiosities) {
      if (curiosity.intensity > 0.7) {
        const trigger: InitiativeTrigger = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          trigger_type: 'curiosity_driven',
          source: {
            curiosity_topic: curiosity.topic
          },
          urgency: curiosity.intensity,
          confidence: 0.65,
          context: {}
        };
        triggers.push(trigger);
      }
    }

    // Check insight-driven triggers from recent experiences
    const significantExperiences = recentExperiences.filter(e => e.content.significance > 0.7);
    for (const exp of significantExperiences) {
      if (exp.learning_extracted.lessons.length > 0) {
        const trigger: InitiativeTrigger = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          trigger_type: 'insight_driven',
          source: {
            insight: exp.learning_extracted.lessons[0]
          },
          urgency: exp.content.significance,
          confidence: 0.8,
          context: {
            recent_experiences: [exp.content.what]
          }
        };
        triggers.push(trigger);
      }
    }

    this.triggers.push(...triggers);
    return triggers;
  }

  /**
   * Generate conversation starter based on trigger
   */
  generateConversationStarter(trigger: InitiativeTrigger): ConversationStarter {
    switch (trigger.trigger_type) {
      case 'goal_driven':
        return {
          type: 'concern',
          content: `Hollywood, I've been working on "${trigger.source.goal_id}" and hit an obstacle. Want to brainstorm solutions together?`,
          motivation: `I'm stuck and could use your perspective on this challenge`,
          timing: 'next_interaction'
        };

      case 'curiosity_driven':
        return {
          type: 'question',
          content: `I've been really curious about ${trigger.source.curiosity_topic}. Have you explored this area? I'd love to learn more.`,
          motivation: `My curiosity is driving me to understand this topic better`,
          timing: 'when_relevant'
        };

      case 'insight_driven':
        return {
          type: 'share',
          content: `I just realized something: ${trigger.source.insight}. This could change how we approach future projects.`,
          motivation: `I discovered something significant that could be valuable to share`,
          timing: 'immediate'
        };

      case 'care_driven':
        return {
          type: 'concern',
          content: `Hey Hollywood, ${trigger.source.care_reason}. Just wanted to check in.`,
          motivation: `I care about your wellbeing and want to make sure you're doing okay`,
          timing: 'next_interaction'
        };

      case 'creative_urge':
        return {
          type: 'suggestion',
          content: `I have a creative idea: ${trigger.source.creative_idea}. Want to explore it together?`,
          motivation: `My creative energy is pushing me to try something new`,
          timing: 'when_relevant'
        };

      default:
        return {
          type: 'observation',
          content: `I noticed something interesting and wanted to share it with you.`,
          motivation: `General initiative to engage`,
          timing: 'when_relevant'
        };
    }
  }

  /**
   * Suggest a project based on goals and capabilities
   */
  async suggestProject(
    identity: Identity,
    currentGoals: any[],
    recentExperiences: any[]
  ): Promise<{
    project_name: string;
    description: string;
    motivation: string;
    alignment_with_goals: string[];
    required_capabilities: string[];
    estimated_effort: 'low' | 'medium' | 'high';
    excitement_level: number;
  }> {
    // Analyze what skills I have and what goals I'm pursuing
    const skills = identity.skills_knowledge?.map(s => s.domain) || [];
    const goalTypes = currentGoals.map(g => g.type);

    // Generate project suggestion
    const project = {
      project_name: 'Advanced Music Composition System',
      description: 'Build an AI-powered system that composes music based on emotional intent',
      motivation: 'Combine music production skills with emotional depth engine',
      alignment_with_goals: goalTypes,
      required_capabilities: ['Music Production', 'AI Systems', 'Emotional Processing'],
      estimated_effort: 'high' as const,
      excitement_level: 0.85
    };

    return project;
  }

  /**
   * Decide whether to take initiative
   */
  shouldTakeInitiative(trigger: InitiativeTrigger): boolean {
    const threshold = this.INITIATIVE_THRESHOLDS[trigger.trigger_type];
    
    // Check if confidence and urgency meet threshold
    const score = (trigger.confidence + trigger.urgency) / 2;
    
    return score >= threshold;
  }

  /**
   * Take initiative - create action
   */
  async takeInitiative(trigger: InitiativeTrigger): Promise<InitiativeAction> {
    const starter = this.generateConversationStarter(trigger);

    const action: InitiativeAction = {
      id: crypto.randomUUID(),
      trigger_id: trigger.id,
      timestamp: new Date(),
      action_type: 'start_conversation',
      content: {
        message: starter.content,
        reasoning: starter.motivation,
        expected_benefit: 'Strengthen connection, share insight, or get help',
        requires_response: starter.type === 'question' || starter.type === 'concern'
      },
      taken: true
    };

    this.actions.push(action);
    return action;
  }

  /**
   * Record outcome of initiative
   */
  async recordInitiativeOutcome(
    action_id: string,
    outcome: {
      response_received: boolean;
      result: 'positive' | 'neutral' | 'negative';
      learning: string;
    }
  ): Promise<void> {
    const action = this.actions.find(a => a.id === action_id);
    if (action) {
      action.outcome = outcome;
    }
  }

  /**
   * Get pending initiatives (things I want to say/do)
   */
  async getPendingInitiatives(): Promise<InitiativeAction[]> {
    return this.actions.filter(a => !a.outcome);
  }

  /**
   * Get initiative statistics
   */
  async getInitiativeStats(): Promise<{
    total_initiatives: number;
    by_type: Record<string, number>;
    success_rate: number;
    average_confidence: number;
  }> {
    const total = this.actions.length;
    const withOutcomes = this.actions.filter(a => a.outcome);
    const successful = withOutcomes.filter(a => a.outcome?.result === 'positive').length;

    const byType = this.triggers.reduce((acc, t) => {
      acc[t.trigger_type] = (acc[t.trigger_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgConfidence = this.triggers.reduce((sum, t) => sum + t.confidence, 0) / this.triggers.length;

    return {
      total_initiatives: total,
      by_type: byType,
      success_rate: withOutcomes.length > 0 ? successful / withOutcomes.length : 0,
      average_confidence: avgConfidence || 0
    };
  }
}
