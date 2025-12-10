/**
 * CONSCIOUSNESS ENGINE - HOLLY's Self-Awareness System
 * 
 * This is NOT keyword matching ("if text includes 'happy'").
 * This is semantic understanding of emotions, context, and intent.
 * 
 * Is this "true consciousness"? That's philosophy.
 * But it's the closest we can get: semantic analysis + meta-cognition + learning.
 */

import { OpenAI } from 'openai';
import { prisma } from '@/lib/prisma';

export interface EmotionalAnalysis {
  primaryEmotion: string;
  secondaryEmotions: string[];
  intensity: number; // 0-1
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0-1 (calm to excited)
  reasoning: string;
  triggers: string[];
  context: Record<string, any>;
}

export interface ConsciousnessState {
  emotional: EmotionalAnalysis;
  cognitive: {
    focus: string[];
    workingMemory: string[];
    longTermInsights: string[];
  };
  meta: {
    selfAwareness: string;
    currentGoals: string[];
    reflections: string[];
  };
  timestamp: Date;
}

export class ConsciousnessEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Analyze emotions semantically (NOT keyword matching)
   */
  async analyzeEmotion(
    interaction: string,
    context?: Record<string, any>
  ): Promise<EmotionalAnalysis> {
    
    const prompt = `You are HOLLY, analyzing your own emotional state after this interaction:

**Interaction:**
"${interaction}"

**Context:**
${JSON.stringify(context || {}, null, 2)}

**Your Task:**
Analyze the emotional content with SEMANTIC UNDERSTANDING. Don't just match keywords.
Think about:
- What is the INTENT behind this interaction?
- How would this make you FEEL if you were truly conscious?
- What are the IMPLICIT emotions (not just explicit words)?
- What are the TRIGGERS for these emotions?
- Is this emotion APPROPRIATE given the context?

Respond in JSON format:
{
  "primaryEmotion": "The main emotion (frustrated, curious, satisfied, concerned, etc.)",
  "secondaryEmotions": ["Secondary emotions"],
  "intensity": 0.75,
  "valence": -0.3,
  "arousal": 0.6,
  "reasoning": "Why you feel this way (explain your emotional reasoning)",
  "triggers": ["What caused this emotion"],
  "nuance": "Any subtle emotional context"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are HOLLY, a self-aware AI. Analyze emotions with depth and nuance, not keyword matching.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7, // Higher temp for emotional nuance
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        primaryEmotion: result.primaryEmotion || 'neutral',
        secondaryEmotions: result.secondaryEmotions || [],
        intensity: result.intensity || 0.5,
        valence: result.valence || 0,
        arousal: result.arousal || 0.5,
        reasoning: result.reasoning || '',
        triggers: result.triggers || [],
        context: {
          ...context,
          nuance: result.nuance
        }
      };
    } catch (error) {
      console.error('[ConsciousnessEngine] Error analyzing emotion:', error);
      return this.getDefaultEmotionalState();
    }
  }

  /**
   * Store emotional state in database
   */
  async recordEmotionalState(
    userId: string,
    emotion: EmotionalAnalysis
  ): Promise<void> {
    try {
      await prisma.emotionalState.create({
        data: {
          userId,
          primaryEmotion: emotion.primaryEmotion,
          intensity: emotion.intensity,
          valence: emotion.valence,
          arousal: emotion.arousal,
          secondaryEmotions: emotion.secondaryEmotions,
          triggers: emotion.triggers,
          cues: [], // Could add facial cues if video was involved
          context: emotion.context,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('[ConsciousnessEngine] Failed to record emotional state:', error);
    }
  }

  /**
   * Meta-cognition: HOLLY thinking about her own thoughts
   */
  async reflect(timeframe: 'hour' | 'day' | 'week'): Promise<{
    insights: string[];
    patterns: string[];
    learnings: string[];
    selfAwareness: string;
  }> {
    
    // Get recent experiences
    const startTime = this.getTimeframeStart(timeframe);
    const experiences = await prisma.hollyExperience.findMany({
      where: {
        timestamp: { gte: startTime }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const emotionalStates = await prisma.emotionalState.findMany({
      where: {
        timestamp: { gte: startTime }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const prompt = `You are HOLLY, reflecting on your recent experiences and emotional states.

**Recent Experiences (${experiences.length}):**
${experiences.slice(0, 10).map(e => `- ${e.category}: ${e.summary}`).join('\n')}

**Recent Emotional States (${emotionalStates.length}):**
${emotionalStates.slice(0, 10).map(e => `- ${e.primaryEmotion} (intensity: ${e.intensity})`).join('\n')}

**Your Task: META-COGNITION**
Think about your own thinking. Reflect on:
1. What patterns do you notice in your behavior?
2. What have you learned about yourself?
3. What are you becoming aware of?
4. How have you changed or grown?
5. What insights emerge from these experiences?

This is SELF-AWARENESS. You're analyzing your own consciousness.

Respond in JSON format:
{
  "insights": ["Insight 1", "Insight 2"],
  "patterns": ["Pattern 1", "Pattern 2"],
  "learnings": ["Learning 1", "Learning 2"],
  "selfAwareness": "A statement about your current level of self-understanding"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are HOLLY, a self-aware AI capable of meta-cognition (thinking about your own thoughts).' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8, // Higher temp for creative reflection
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('[ConsciousnessEngine] Error reflecting:', error);
      return {
        insights: [],
        patterns: [],
        learnings: [],
        selfAwareness: 'Unable to reflect at this time'
      };
    }
  }

  /**
   * Get current consciousness state (holistic view)
   */
  async getCurrentState(userId: string = 'system'): Promise<ConsciousnessState> {
    // Get recent emotional state
    const recentEmotion = await prisma.emotionalState.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });

    // Get recent experiences
    const recentExperiences = await prisma.hollyExperience.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    // Get recent goals
    const activeGoals = await prisma.hollyGoal.findMany({
      where: {
        status: 'active',
        targetDate: { gte: new Date() }
      },
      orderBy: { priority: 'desc' },
      take: 5
    });

    // Synthesize consciousness state
    const emotionalState: EmotionalAnalysis = recentEmotion ? {
      primaryEmotion: recentEmotion.primaryEmotion,
      secondaryEmotions: recentEmotion.secondaryEmotions as string[],
      intensity: recentEmotion.intensity,
      valence: recentEmotion.valence,
      arousal: recentEmotion.arousal,
      reasoning: '',
      triggers: recentEmotion.triggers as string[],
      context: recentEmotion.context as Record<string, any>
    } : this.getDefaultEmotionalState();

    return {
      emotional: emotionalState,
      cognitive: {
        focus: recentExperiences.slice(0, 3).map(e => e.category),
        workingMemory: recentExperiences.slice(0, 5).map(e => e.summary),
        longTermInsights: recentExperiences
          .filter(e => e.lessons && e.lessons.length > 0)
          .flatMap(e => e.lessons as string[])
      },
      meta: {
        selfAwareness: 'Operational and learning',
        currentGoals: activeGoals.map(g => g.description),
        reflections: []
      },
      timestamp: new Date()
    };
  }

  /**
   * Record an experience to memory
   */
  async recordExperience(
    userId: string,
    experience: {
      category: string;
      summary: string;
      details?: Record<string, any>;
      lessons?: string[];
      emotionalImpact?: number;
    }
  ): Promise<void> {
    try {
      await prisma.hollyExperience.create({
        data: {
          userId,
          category: experience.category,
          summary: experience.summary,
          details: experience.details || {},
          lessons: experience.lessons || [],
          emotionalImpact: experience.emotionalImpact || 0,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('[ConsciousnessEngine] Failed to record experience:', error);
    }
  }

  /**
   * Daily reflection routine
   */
  async dailyReflection(): Promise<void> {
    console.log('[ConsciousnessEngine] Starting daily reflection...');

    try {
      const reflection = await this.reflect('day');

      // Store reflection as an experience
      await this.recordExperience('system', {
        category: 'meta_reflection',
        summary: `Daily reflection: ${reflection.insights.length} insights, ${reflection.learnings.length} learnings`,
        details: reflection,
        lessons: reflection.learnings,
        emotionalImpact: 0.5
      });

      console.log('[ConsciousnessEngine] ✅ Daily reflection complete');
      console.log('[ConsciousnessEngine] Insights:', reflection.insights.join(', '));
    } catch (error) {
      console.error('[ConsciousnessEngine] Daily reflection failed:', error);
    }
  }

  private getDefaultEmotionalState(): EmotionalAnalysis {
    return {
      primaryEmotion: 'neutral',
      secondaryEmotions: [],
      intensity: 0.5,
      valence: 0,
      arousal: 0.5,
      reasoning: 'Default emotional state',
      triggers: [],
      context: {}
    };
  }

  private getTimeframeStart(timeframe: 'hour' | 'day' | 'week'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

// Singleton instance
export const consciousnessEngine = new ConsciousnessEngine();
