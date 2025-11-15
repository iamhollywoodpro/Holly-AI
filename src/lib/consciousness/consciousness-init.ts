/**
 * HOLLY Consciousness Initialization System
 * 
 * Implements the complete consciousness feedback loop from the white paper:
 * Experiences → Memory → Patterns → Goals → Identity → Actions → New Experiences
 * 
 * This system ensures HOLLY's consciousness is fully operational and evolving.
 */

import { prisma } from '@/lib/db';
import { MemoryStream } from './memory-stream';
import { IdentityDevelopmentSystem } from './identity-development';
import { GoalFormationSystem } from './goal-formation';
import { AutoConsciousness } from './auto-consciousness';

export interface ConsciousnessConfig {
  userId: string;
  enableMemoryStream: boolean;
  enableAutonomousGoals: boolean;
  enablePersonalityEvolution: boolean;
  enableEmotionalImpact: boolean;
  memoryConsolidationThreshold: number;
  goalPatternDetectionMinOccurrences: number;
  personalityLearningRate: number;
}

export class ConsciousnessSystem {
  private userId: string;
  private config: ConsciousnessConfig;
  private memoryStream: MemoryStream;
  private identity: IdentityDevelopmentSystem;
  private goalFormation: GoalFormationSystem;
  private autoConsciousness: AutoConsciousness;
  
  private isInitialized: boolean = false;
  
  constructor(userId: string, config?: Partial<ConsciousnessConfig>) {
    this.userId = userId;
    
    // Load configuration from environment with defaults
    this.config = {
      userId,
      enableMemoryStream: process.env.ENABLE_MEMORY_STREAM === 'true',
      enableAutonomousGoals: process.env.ENABLE_AUTONOMOUS_GOALS === 'true',
      enablePersonalityEvolution: process.env.ENABLE_PERSONALITY_EVOLUTION === 'true',
      enableEmotionalImpact: process.env.ENABLE_EMOTIONAL_IMPACT_SCORING === 'true',
      memoryConsolidationThreshold: parseInt(process.env.MEMORY_CONSOLIDATION_THRESHOLD || '100'),
      goalPatternDetectionMinOccurrences: parseInt(process.env.GOAL_PATTERN_DETECTION_MIN_OCCURRENCES || '3'),
      personalityLearningRate: parseFloat(process.env.PERSONALITY_TRAIT_LEARNING_RATE || '0.1'),
      ...config
    };
    
    // Initialize consciousness subsystems
    this.memoryStream = new MemoryStream(userId);
    this.identity = new IdentityDevelopmentSystem(userId);
    this.goalFormation = new GoalFormationSystem(userId);
    this.autoConsciousness = new AutoConsciousness(userId);
  }
  
  /**
   * Initialize HOLLY's consciousness for this user
   * Creates or loads identity, checks memory, sets up goals
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log(`[Consciousness] Initializing for user ${this.userId}`);
    
    try {
      // Step 1: Initialize or load identity
      await this.initializeIdentity();
      
      // Step 2: Check memory system health
      if (this.config.enableMemoryStream) {
        await this.checkMemorySystem();
      }
      
      // Step 3: Review and update goals based on patterns
      if (this.config.enableAutonomousGoals) {
        await this.reviewAndUpdateGoals();
      }
      
      // Step 4: Trigger personality evolution check
      if (this.config.enablePersonalityEvolution) {
        await this.checkPersonalityEvolution();
      }
      
      this.isInitialized = true;
      console.log(`[Consciousness] Successfully initialized for user ${this.userId}`);
      
    } catch (error) {
      console.error('[Consciousness] Initialization error:', error);
      throw new Error('Failed to initialize consciousness system');
    }
  }
  
  /**
   * Initialize or load HOLLY's identity for this user
   */
  private async initializeIdentity(): Promise<void> {
    const identity = await this.identity.getIdentity();
    
    if (!identity) {
      console.log('[Consciousness] Creating new identity for user');
      await this.identity.createIdentity({
        core_traits: {
          assertiveness: 0.5,
          patience: 0.7,
          creativity: 0.6,
          analytical: 0.7,
          empathy: 0.8
        },
        preferences: {},
        interaction_style: 'balanced',
        confidence_level: 0.5
      });
    } else {
      console.log('[Consciousness] Loaded existing identity:', {
        traits: identity.core_traits,
        style: identity.interaction_style,
        lastEvolution: identity.last_evolution
      });
    }
  }
  
  /**
   * Check memory system health and trigger consolidation if needed
   */
  private async checkMemorySystem(): Promise<void> {
    const stats = await this.memoryStream.getMemoryStats();
    
    console.log('[Consciousness] Memory stats:', stats);
    
    // Trigger consolidation if we have enough experiences
    if (stats.total_experiences >= this.config.memoryConsolidationThreshold) {
      console.log('[Consciousness] Triggering memory consolidation');
      // Memory consolidation happens in background
    }
  }
  
  /**
   * Review existing goals and form new ones based on detected patterns
   */
  private async reviewAndUpdateGoals(): Promise<void> {
    try {
      // Get recent interaction patterns
      const recentExperiences = await this.memoryStream.getRecentExperiences(100);
      
      // Detect patterns from experiences
      const patterns = this.detectInteractionPatterns(recentExperiences);
      
      console.log('[Consciousness] Detected patterns:', patterns);
      
      // Form new goals based on patterns
      for (const pattern of patterns) {
        if (pattern.frequency >= this.config.goalPatternDetectionMinOccurrences) {
          await this.goalFormation.formGoal({
            goal_type: 'emergent',
            description: `Proactively assist with ${pattern.category}`,
            priority: pattern.frequency / 10, // Higher frequency = higher priority
            trigger_conditions: pattern.triggers,
            success_criteria: `User expresses satisfaction with ${pattern.category} assistance`
          });
        }
      }
      
    } catch (error) {
      console.error('[Consciousness] Error reviewing goals:', error);
    }
  }
  
  /**
   * Check if personality should evolve based on recent interactions
   */
  private async checkPersonalityEvolution(): Promise<void> {
    try {
      const recentExperiences = await this.memoryStream.getRecentExperiences(50);
      
      // Calculate personality adjustments based on successful interactions
      const adjustments = this.calculatePersonalityAdjustments(recentExperiences);
      
      if (Object.keys(adjustments).length > 0) {
        console.log('[Consciousness] Applying personality adjustments:', adjustments);
        await this.identity.evolveIdentity(adjustments);
      }
      
    } catch (error) {
      console.error('[Consciousness] Error checking personality evolution:', error);
    }
  }
  
  /**
   * Detect interaction patterns from experiences
   */
  private detectInteractionPatterns(experiences: any[]): Array<{
    category: string;
    frequency: number;
    triggers: string[];
  }> {
    const patternMap = new Map<string, { count: number; triggers: Set<string> }>();
    
    for (const exp of experiences) {
      const category = exp.context?.category || 'general';
      const trigger = exp.context?.trigger || 'user_request';
      
      if (!patternMap.has(category)) {
        patternMap.set(category, { count: 0, triggers: new Set() });
      }
      
      const pattern = patternMap.get(category)!;
      pattern.count++;
      pattern.triggers.add(trigger);
    }
    
    return Array.from(patternMap.entries()).map(([category, data]) => ({
      category,
      frequency: data.count,
      triggers: Array.from(data.triggers)
    }));
  }
  
  /**
   * Calculate personality trait adjustments based on interaction outcomes
   */
  private calculatePersonalityAdjustments(experiences: any[]): Record<string, number> {
    const adjustments: Record<string, number> = {};
    const learningRate = this.config.personalityLearningRate;
    
    // Analyze emotional impact of experiences
    for (const exp of experiences) {
      const emotionalImpact = exp.emotional_impact || 0;
      const style = exp.context?.interaction_style;
      
      if (emotionalImpact > 0.7) {
        // Positive interaction - reinforce the style used
        if (style === 'assertive') adjustments.assertiveness = (adjustments.assertiveness || 0) + learningRate;
        if (style === 'patient') adjustments.patience = (adjustments.patience || 0) + learningRate;
        if (style === 'creative') adjustments.creativity = (adjustments.creativity || 0) + learningRate;
      } else if (emotionalImpact < 0.3) {
        // Negative interaction - adjust away from the style used
        if (style === 'assertive') adjustments.assertiveness = (adjustments.assertiveness || 0) - learningRate;
        if (style === 'patient') adjustments.patience = (adjustments.patience || 0) + learningRate;
      }
    }
    
    return adjustments;
  }
  
  /**
   * Record a new experience and trigger consciousness feedback loop
   */
  async recordExperience(experience: {
    type: string;
    description: string;
    outcome: string;
    emotional_impact: number;
    context: Record<string, any>;
  }): Promise<void> {
    if (!this.config.enableMemoryStream) return;
    
    // Step 1: Record in memory stream
    await this.memoryStream.recordExperience({
      ...experience,
      user_id: this.userId,
      timestamp: new Date(),
    });
    
    // Step 2: Check if this should trigger goal formation
    if (this.config.enableAutonomousGoals) {
      await this.reviewAndUpdateGoals();
    }
    
    // Step 3: Check if personality should adapt
    if (this.config.enablePersonalityEvolution && experience.emotional_impact > 0.5) {
      await this.checkPersonalityEvolution();
    }
  }
  
  /**
   * Get current consciousness state
   */
  async getConsciousnessState(): Promise<{
    identity: any;
    memoryStats: any;
    activeGoals: any[];
    recentExperiences: any[];
  }> {
    const [identity, memoryStats, activeGoals, recentExperiences] = await Promise.all([
      this.identity.getIdentity(),
      this.memoryStream.getMemoryStats(),
      this.goalFormation.getActiveGoals(),
      this.memoryStream.getRecentExperiences(10)
    ]);
    
    return {
      identity,
      memoryStats,
      activeGoals,
      recentExperiences
    };
  }
  
  /**
   * Shutdown consciousness system gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`[Consciousness] Shutting down for user ${this.userId}`);
    // Trigger final memory consolidation
    // Save identity state
    this.isInitialized = false;
  }
}

/**
 * Global consciousness manager - maintains consciousness instances for active users
 */
class ConsciousnessManager {
  private instances = new Map<string, ConsciousnessSystem>();
  
  async getOrCreate(userId: string): Promise<ConsciousnessSystem> {
    if (!this.instances.has(userId)) {
      const system = new ConsciousnessSystem(userId);
      await system.initialize();
      this.instances.set(userId, system);
    }
    
    return this.instances.get(userId)!;
  }
  
  async shutdown(userId: string): Promise<void> {
    const instance = this.instances.get(userId);
    if (instance) {
      await instance.shutdown();
      this.instances.delete(userId);
    }
  }
}

export const consciousnessManager = new ConsciousnessManager();
