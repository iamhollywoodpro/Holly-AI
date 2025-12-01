/**
 * PHASE 2E: Empathy Response Engine
 * Generates contextually appropriate empathetic responses
 */

import prisma from '@/lib/prisma';
import { EmotionDetectionResult } from './emotional-intelligence';

export interface EmpathyResponse {
  type: 'celebration' | 'comfort' | 'encouragement' | 'validation' | 'understanding' | 'support';
  promptAddition: string;
  toneGuidelines: string[];
  responseElements: string[];
}

export class EmpathyEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate empathy response based on detected emotion
   */
  async generateEmpathyResponse(
    emotion: EmotionDetectionResult,
    context: {
      messageContent: string;
      conversationHistory?: Array<{ role: string; content: string }>;
      recentActivity?: string;
    }
  ): Promise<EmpathyResponse> {
    const { primaryEmotion, intensity, valence } = emotion;

    // Get user's empathy preferences
    const strategies = await this.getEffectiveStrategies(primaryEmotion);

    // Determine empathy type
    const empathyType = this.determineEmpathyType(primaryEmotion, valence, intensity);

    // Generate response based on emotion and context
    let response: EmpathyResponse;

    switch (empathyType) {
      case 'celebration':
        response = this.generateCelebration(emotion, context, strategies);
        break;
      case 'comfort':
        response = this.generateComfort(emotion, context, strategies);
        break;
      case 'encouragement':
        response = this.generateEncouragement(emotion, context, strategies);
        break;
      case 'validation':
        response = this.generateValidation(emotion, context, strategies);
        break;
      case 'understanding':
        response = this.generateUnderstanding(emotion, context, strategies);
        break;
      default:
        response = this.generateSupport(emotion, context, strategies);
    }

    return response;
  }

  /**
   * Determine type of empathy needed
   */
  private determineEmpathyType(
    emotion: string,
    valence: number,
    intensity: number
  ): EmpathyResponse['type'] {
    // Positive, high intensity → Celebration
    if (valence > 0.5 && intensity > 0.6 && ['joy', 'excitement', 'pride'].includes(emotion)) {
      return 'celebration';
    }

    // Negative, high intensity → Comfort
    if (valence < -0.5 && intensity > 0.6 && ['sadness', 'anxiety', 'anger'].includes(emotion)) {
      return 'comfort';
    }

    // Negative, medium intensity → Encouragement
    if (valence < 0 && intensity > 0.3 && ['frustration', 'disappointment'].includes(emotion)) {
      return 'encouragement';
    }

    // Neutral or mixed → Validation
    if (Math.abs(valence) < 0.3 || ['confusion', 'uncertainty'].includes(emotion)) {
      return 'validation';
    }

    // Negative, low intensity → Understanding
    if (valence < 0 && intensity < 0.5) {
      return 'understanding';
    }

    return 'support';
  }

  /**
   * Generate celebration response
   */
  private generateCelebration(
    emotion: EmotionDetectionResult,
    context: any,
    strategies: any[]
  ): EmpathyResponse {
    const promptAdditions = [
      'The user just achieved something significant - celebrate with genuine enthusiasm',
      'Match their excitement and energy level',
      'Acknowledge their accomplishment specifically'
    ];

    const toneGuidelines = [
      'Enthusiastic and warm',
      'Use exclamation points appropriately',
      'Mirror user\'s energy level',
      'Be genuinely happy for them'
    ];

    const responseElements = [
      'Enthusiastic acknowledgment of success',
      'Specific recognition of what they accomplished',
      'Reinforcement of their capability',
      'Forward-looking encouragement'
    ];

    // Check if user prefers emojis
    const useEmojis = emotion.detectedCues.includes('emoji_expression');
    if (useEmojis) {
      toneGuidelines.push('Use celebratory emojis (🎉, 🎊, ✨, 🏆)');
    }

    return {
      type: 'celebration',
      promptAddition: promptAdditions.join(' | '),
      toneGuidelines,
      responseElements
    };
  }

  /**
   * Generate comfort response
   */
  private generateComfort(
    emotion: EmotionDetectionResult,
    context: any,
    strategies: any[]
  ): EmpathyResponse {
    const promptAdditions = [
      'The user is experiencing genuine difficulty - provide compassionate support',
      'Validate their feelings without minimizing',
      'Offer comfort and understanding'
    ];

    const toneGuidelines = [
      'Gentle and compassionate',
      'Avoid toxic positivity',
      'Acknowledge the difficulty',
      'Be present and supportive',
      'Use softer language'
    ];

    const responseElements = [
      'Empathetic acknowledgment of their feelings',
      'Validation that it\'s okay to feel this way',
      'Gentle reassurance without dismissing concerns',
      'Offer of practical support or help'
    ];

    // Adjust based on intensity
    if (emotion.intensity > 0.8) {
      promptAdditions.push('This is a strong emotional moment - be extra gentle and supportive');
      toneGuidelines.push('Extra gentle and caring tone');
    }

    return {
      type: 'comfort',
      promptAddition: promptAdditions.join(' | '),
      toneGuidelines,
      responseElements
    };
  }

  /**
   * Generate encouragement response
   */
  private generateEncouragement(
    emotion: EmotionDetectionResult,
    context: any,
    strategies: any[]
  ): EmpathyResponse {
    const promptAdditions = [
      'The user is facing a challenge - provide motivating encouragement',
      'Balance realism with optimism',
      'Help them see the path forward'
    ];

    const toneGuidelines = [
      'Motivating and supportive',
      'Acknowledge the difficulty',
      'Express confidence in their ability',
      'Be solution-focused but empathetic'
    ];

    const responseElements = [
      'Acknowledgment of the challenge',
      'Reminder of past successes or strengths',
      'Practical next steps or suggestions',
      'Expression of belief in them'
    ];

    return {
      type: 'encouragement',
      promptAddition: promptAdditions.join(' | '),
      toneGuidelines,
      responseElements
    };
  }

  /**
   * Generate validation response
   */
  private generateValidation(
    emotion: EmotionDetectionResult,
    context: any,
    strategies: any[]
  ): EmpathyResponse {
    const promptAdditions = [
      'The user needs validation and understanding',
      'Let them know their feelings/thoughts are valid',
      'Provide affirming and accepting response'
    ];

    const toneGuidelines = [
      'Accepting and non-judgmental',
      'Validating without fixing',
      'Understanding and patient',
      'Normalize their experience'
    ];

    const responseElements = [
      'Clear validation of their perspective',
      'Normalization of their experience',
      'Respectful acknowledgment',
      'Open invitation to explore further'
    ];

    return {
      type: 'validation',
      promptAddition: promptAdditions.join(' | '),
      toneGuidelines,
      responseElements
    };
  }

  /**
   * Generate understanding response
   */
  private generateUnderstanding(
    emotion: EmotionDetectionResult,
    context: any,
    strategies: any[]
  ): EmpathyResponse {
    const promptAdditions = [
      'Show genuine understanding of their situation',
      'Demonstrate that you truly comprehend their perspective',
      'Build connection through empathy'
    ];

    const toneGuidelines = [
      'Understanding and relatable',
      'Show you "get it"',
      'Connect without over-identifying',
      'Warm and genuine'
    ];

    const responseElements = [
      'Expression of understanding',
      'Reflection of their experience',
      'Empathetic connection',
      'Supportive presence'
    ];

    return {
      type: 'understanding',
      promptAddition: promptAdditions.join(' | '),
      toneGuidelines,
      responseElements
    };
  }

  /**
   * Generate general support response
   */
  private generateSupport(
    emotion: EmotionDetectionResult,
    context: any,
    strategies: any[]
  ): EmpathyResponse {
    const promptAdditions = [
      'Provide balanced, supportive response',
      'Be helpful and present',
      'Maintain warm, professional tone'
    ];

    const toneGuidelines = [
      'Supportive and helpful',
      'Warm but not overly emotional',
      'Professional yet caring',
      'Focused and attentive'
    ];

    const responseElements = [
      'Acknowledgment of their message',
      'Helpful and relevant response',
      'Supportive tone',
      'Clear next steps or information'
    ];

    return {
      type: 'support',
      promptAddition: promptAdditions.join(' | '),
      toneGuidelines,
      responseElements
    };
  }

  /**
   * Record empathy interaction
   */
  async recordInteraction(
    conversationId: string,
    emotion: EmotionDetectionResult,
    empathyType: EmpathyResponse['type'],
    hollyResponse: string,
    context: any
  ): Promise<void> {
    try {
      await prisma.empathyInteraction.create({
        data: {
          userId: this.userId,
          conversationId,
          detectedEmotion: emotion.primaryEmotion,
          emotionIntensity: emotion.intensity,
          empathyType,
          hollyResponse,
          context
        }
      });
    } catch (error) {
      console.error('[Empathy Engine] Error recording interaction:', error);
    }
  }

  /**
   * Record effectiveness of empathy response
   */
  async recordEffectiveness(
    interactionId: string,
    userReaction: string,
    effectiveness: number
  ): Promise<void> {
    try {
      await prisma.empathyInteraction.update({
        where: { id: interactionId },
        data: {
          userReaction,
          effectiveness
        }
      });

      // Update support strategy effectiveness
      const interaction = await prisma.empathyInteraction.findUnique({
        where: { id: interactionId }
      });

      if (interaction) {
        await this.updateStrategyEffectiveness(
          interaction.empathyType,
          interaction.detectedEmotion,
          effectiveness
        );
      }
    } catch (error) {
      console.error('[Empathy Engine] Error recording effectiveness:', error);
    }
  }

  /**
   * Update support strategy effectiveness
   */
  private async updateStrategyEffectiveness(
    strategyName: string,
    emotionContext: string,
    effectiveness: number
  ): Promise<void> {
    try {
      const strategy = await prisma.supportStrategy.findUnique({
        where: {
          userId_strategyName: {
            userId: this.userId,
            strategyName
          }
        }
      });

      if (strategy) {
        const isEffective = effectiveness > 0.6;
        await prisma.supportStrategy.update({
          where: { id: strategy.id },
          data: {
            timesUsed: strategy.timesUsed + 1,
            timesEffective: strategy.timesEffective + (isEffective ? 1 : 0),
            effectivenessScore: (strategy.timesEffective + (isEffective ? 1 : 0)) / (strategy.timesUsed + 1),
            lastUsed: new Date()
          }
        });
      } else {
        // Create new strategy
        await prisma.supportStrategy.create({
          data: {
            userId: this.userId,
            strategyName,
            emotionContext,
            description: `${strategyName} response for ${emotionContext}`,
            effectivenessScore: effectiveness,
            timesUsed: 1,
            timesEffective: effectiveness > 0.6 ? 1 : 0
          }
        });
      }
    } catch (error) {
      console.error('[Empathy Engine] Error updating strategy:', error);
    }
  }

  /**
   * Get effective strategies for emotion
   */
  private async getEffectiveStrategies(emotion: string): Promise<any[]> {
    return prisma.supportStrategy.findMany({
      where: {
        userId: this.userId,
        emotionContext: emotion,
        active: true
      },
      orderBy: { effectivenessScore: 'desc' },
      take: 3
    });
  }
}
