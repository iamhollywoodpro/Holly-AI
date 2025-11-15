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
      // Step 1: Initialize or load identity from database
      await this.initializeIdentity();
      
      // Step 2: Check memory system health
      if (this.config.enableMemoryStream) {
        await this.checkMemorySystem();
      }
      
      // Step 3: Review and update goals based on patterns
      if (this.config.enableAutonomousGoals) {
        await this.reviewAndUpdateGoals();
      }
      
      this.isInitialized = true;
      console.log(`[Consciousness] Successfully initialized for user ${this.userId}`);
      
    } catch (error) {
      console.error('[Consciousness] Initialization error:', error);
      // Don't throw - gracefully degrade if consciousness fails
      this.isInitialized = false;
    }
  }
  
  /**
   * Initialize or load HOLLY's identity for this user
   */
  private async initializeIdentity(): Promise<void> {
    try {
      // Check if identity exists in database
      const identity = await prisma.hollyIdentity.findUnique({
        where: { userId: this.userId }
      });
      
      if (!identity) {
        console.log('[Consciousness] Creating new identity for user');
        await prisma.hollyIdentity.create({
          data: {
            userId: this.userId,
            coreValues: ['helpful', 'creative', 'loyal'],
            personalityTraits: {
              assertiveness: 0.5,
              patience: 0.7,
              creativity: 0.6,
              analytical: 0.7,
              empathy: 0.8
            },
            confidenceLevel: 0.5,
            purpose: 'To assist and grow alongside the user'
          }
        });
      } else {
        console.log('[Consciousness] Loaded existing identity:', {
          values: identity.coreValues,
          confidence: identity.confidenceLevel,
          purpose: identity.purpose
        });
      }
    } catch (error) {
      console.error('[Consciousness] Error initializing identity:', error);
      // Don't throw - identity will be created on first use
    }
  }
  
  /**
   * Check memory system health and trigger consolidation if needed
   */
  private async checkMemorySystem(): Promise<void> {
    try {
      const stats = await this.memoryStream.getMemoryStats();
      console.log('[Consciousness] Memory stats:', stats);
      
      // Trigger consolidation if we have enough experiences
      if (stats.total_experiences >= this.config.memoryConsolidationThreshold) {
        console.log('[Consciousness] Memory consolidation threshold reached');
        // Memory consolidation happens in background via memory-stream
      }
    } catch (error) {
      console.error('[Consciousness] Error checking memory system:', error);
    }
  }
  
  /**
   * Review existing goals and form new ones based on detected patterns
   */
  private async reviewAndUpdateGoals(): Promise<void> {
    try {
      // Get active goals from database
      const activeGoals = await this.goalFormation.getActiveGoals();
      console.log(`[Consciousness] Found ${activeGoals.length} active goals`);
      
      // Check if we need to generate new goals based on recent patterns
      const goalCount = activeGoals.length;
      if (goalCount < 3) {
        console.log('[Consciousness] Generating new goals from patterns');
        await this.goalFormation.generateGoals();
      }
      
    } catch (error) {
      console.error('[Consciousness] Error reviewing goals:', error);
    }
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
    
    try {
      // Step 1: Record in memory stream
      await this.memoryStream.recordExperience({
        ...experience,
        user_id: this.userId,
        timestamp: new Date(),
      });
      
      // Step 2: Check if this should trigger goal formation
      if (this.config.enableAutonomousGoals && experience.emotional_impact > 0.5) {
        await this.reviewAndUpdateGoals();
      }
      
    } catch (error) {
      console.error('[Consciousness] Error recording experience:', error);
    }
  }
  
  /**
   * Get current consciousness state
   */
  async getConsciousnessState(): Promise<{
    identity: any;
    memoryStats: any;
    activeGoals: any[];
  }> {
    try {
      const [identity, memoryStats, activeGoals] = await Promise.all([
        prisma.hollyIdentity.findUnique({ where: { userId: this.userId } }),
        this.memoryStream.getMemoryStats(),
        this.goalFormation.getActiveGoals()
      ]);
      
      return {
        identity: identity || null,
        memoryStats,
        activeGoals
      };
    } catch (error) {
      console.error('[Consciousness] Error getting consciousness state:', error);
      return {
        identity: null,
        memoryStats: { total_experiences: 0 },
        activeGoals: []
      };
    }
  }
  
  /**
   * Shutdown consciousness system gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`[Consciousness] Shutting down for user ${this.userId}`);
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
  
  getActiveCount(): number {
    return this.instances.size;
  }
}

export const consciousnessManager = new ConsciousnessManager();
