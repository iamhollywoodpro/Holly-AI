/**
 * PHASE 2C: Adaptive Response System
 * Uses learned patterns to personalize HOLLY's responses
 */

import prisma from '@/lib/prisma';

export interface AdaptationContext {
  userId: string;
  messageContent: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentTopic?: string;
}

export interface AdaptedResponse {
  systemPromptAdditions: string[];
  responseGuidelines: string[];
  activeStrategies: string[];
  confidence: number;
}

export class AdaptiveResponseSystem {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get adaptive context for personalizing HOLLY's response
   */
  async getAdaptiveContext(context: AdaptationContext): Promise<AdaptedResponse> {
    // Get learned patterns
    const patterns = await this.getRelevantPatterns();
    
    // Get user preferences
    const preferences = await this.getRelevantPreferences();
    
    // Get successful adaptation strategies
    const strategies = await this.getActiveStrategies();
    
    // Get recent feedback
    const recentFeedback = await this.getRecentFeedback();

    // Build adaptive response guidelines
    const guidelines: string[] = [];
    const promptAdditions: string[] = [];
    const activeStrategyNames: string[] = [];

    // Apply communication style adaptations
    const commStyle = patterns.find(p => p.patternType === 'communication_style');
    if (commStyle) {
      if (commStyle.pattern.includes('casual_friendly')) {
        guidelines.push('Use a warm, friendly tone with occasional emojis');
        promptAdditions.push('The user prefers casual, friendly communication');
      } else if (commStyle.pattern.includes('formal_detailed')) {
        guidelines.push('Maintain professional tone with detailed explanations');
        promptAdditions.push('The user prefers formal, detailed communication');
      }
    }

    // Apply technical depth adaptations
    const techDepth = patterns.find(p => p.patternType === 'response_style');
    if (techDepth) {
      if (techDepth.pattern.includes('deep_technical')) {
        guidelines.push('Provide in-depth technical explanations with code examples');
        promptAdditions.push('User prefers deep technical details and code examples');
      } else if (techDepth.pattern.includes('high_level')) {
        guidelines.push('Keep explanations high-level and accessible');
        promptAdditions.push('User prefers high-level overviews without too much technical jargon');
      }
    }

    // Apply question style adaptations
    const questionStyle = patterns.find(p => p.patternType === 'question_pattern');
    if (questionStyle) {
      if (questionStyle.pattern.includes('brief_and_direct')) {
        guidelines.push('Keep responses concise and to the point');
        promptAdditions.push('User asks brief questions and expects direct answers');
      } else if (questionStyle.pattern.includes('detailed_with_context')) {
        guidelines.push('Match the user\'s detailed approach with comprehensive responses');
        promptAdditions.push('User provides detailed context and appreciates thorough responses');
      }
    }

    // Apply successful strategies
    for (const strategy of strategies) {
      if (strategy.active && strategy.successRate > 0.6) {
        guidelines.push(strategy.description);
        activeStrategyNames.push(strategy.strategyName);
      }
    }

    // Apply preferences
    for (const pref of preferences) {
      if (pref.confidence > 0.7) {
        if (pref.category === 'coding_style') {
          promptAdditions.push(`User coding preference: ${pref.preferenceKey} = ${JSON.stringify(pref.value)}`);
        } else if (pref.category === 'communication') {
          promptAdditions.push(`Communication preference: ${pref.preferenceKey} = ${JSON.stringify(pref.value)}`);
        }
      }
    }

    // Learn from recent feedback
    const negativeFeedback = recentFeedback.filter(f => f.sentiment === 'negative');
    if (negativeFeedback.length > 0) {
      for (const fb of negativeFeedback.slice(0, 3)) {
        if (fb.lessonLearned && !fb.applied) {
          guidelines.push(fb.lessonLearned);
          
          // Mark as applied
          await prisma.responseFeedback.update({
            where: { id: fb.id },
            data: { applied: true }
          });
        }
      }
    }

    // Calculate overall confidence
    const totalPatterns = patterns.length + preferences.length + strategies.length;
    const confidence = totalPatterns > 0 
      ? Math.min(0.95, 0.5 + (totalPatterns * 0.05))
      : 0.5;

    return {
      systemPromptAdditions: promptAdditions,
      responseGuidelines: guidelines,
      activeStrategies: activeStrategyNames,
      confidence
    };
  }

  /**
   * Record feedback on HOLLY's response
   */
  async recordFeedback(
    messageId: string,
    conversationId: string,
    hollyResponse: string,
    userReaction: string,
    context: any
  ): Promise<void> {
    // Analyze sentiment of user reaction
    const sentiment = this.analyzeSentiment(userReaction);
    
    // Determine feedback type
    const feedbackType = this.determineFeedbackType(userReaction);
    
    // Generate lesson learned if negative
    let lessonLearned: string | undefined;
    if (sentiment.sentiment === 'negative') {
      lessonLearned = await this.generateLesson(hollyResponse, userReaction, context);
    }

    // Save feedback
    await prisma.responseFeedback.create({
      data: {
        userId: this.userId,
        conversationId,
        messageId,
        feedbackType,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score,
        context,
        hollyResponse,
        userReaction,
        lessonLearned
      }
    });

    // Update strategy success rates
    await this.updateStrategySuccessRates(sentiment.sentiment);
  }

  /**
   * Analyze sentiment of user's reaction
   */
  private analyzeSentiment(text: string): { sentiment: string; score: number } {
    const lowerText = text.toLowerCase();
    
    // Positive indicators
    const positive = ['thanks', 'thank you', 'perfect', 'great', 'awesome', 'love it', 'exactly', 'yes'];
    const positiveCount = positive.filter(word => lowerText.includes(word)).length;
    
    // Negative indicators
    const negative = ['no', 'wrong', 'not what', 'incorrect', 'error', 'mistake', 'confused', 'unclear'];
    const negativeCount = negative.filter(word => lowerText.includes(word)).length;
    
    // Correction indicators
    const corrections = ['actually', 'instead', 'should be', 'meant to', 'not'];
    const correctionCount = corrections.filter(word => lowerText.includes(word)).length;

    const score = (positiveCount - negativeCount - correctionCount * 0.5) / 3;
    
    let sentiment = 'neutral';
    if (score > 0.3) sentiment = 'positive';
    else if (score < -0.3) sentiment = 'negative';

    return { sentiment, score: Math.max(-1, Math.min(1, score)) };
  }

  /**
   * Determine type of feedback
   */
  private determineFeedbackType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('actually') || lowerText.includes('instead') || lowerText.includes('should be')) {
      return 'correction';
    }
    if (lowerText.includes('thanks') || lowerText.includes('perfect') || lowerText.includes('great')) {
      return 'appreciation';
    }
    if (lowerText.length > 50 && !lowerText.includes('?')) {
      return 'explicit';
    }
    
    return 'implicit';
  }

  /**
   * Generate lesson from negative feedback
   */
  private async generateLesson(hollyResponse: string, userReaction: string, context: any): Promise<string> {
    // Simple rule-based lesson generation
    const lowerReaction = userReaction.toLowerCase();
    
    if (lowerReaction.includes('too long') || lowerReaction.includes('too much')) {
      return 'Be more concise in responses';
    }
    if (lowerReaction.includes('too short') || lowerReaction.includes('more detail')) {
      return 'Provide more detailed explanations';
    }
    if (lowerReaction.includes('too technical')) {
      return 'Use simpler language, less technical jargon';
    }
    if (lowerReaction.includes('more technical') || lowerReaction.includes('show code')) {
      return 'Provide more technical depth and code examples';
    }
    
    return 'Adjust response style based on user feedback';
  }

  /**
   * Update strategy success rates based on feedback
   */
  private async updateStrategySuccessRates(sentiment: string): Promise<void> {
    const strategies = await prisma.adaptationStrategy.findMany({
      where: {
        userId: this.userId,
        active: true
      }
    });

    for (const strategy of strategies) {
      if (strategy.lastApplied && 
          new Date().getTime() - strategy.lastApplied.getTime() < 60000) { // Applied in last minute
        
        const isSuccess = sentiment === 'positive';
        
        await prisma.adaptationStrategy.update({
          where: { id: strategy.id },
          data: {
            timesApplied: strategy.timesApplied + 1,
            timesSuccessful: strategy.timesSuccessful + (isSuccess ? 1 : 0),
            successRate: (strategy.timesSuccessful + (isSuccess ? 1 : 0)) / (strategy.timesApplied + 1)
          }
        });
      }
    }
  }

  /**
   * Create or update adaptation strategy
   */
  async createStrategy(
    strategyName: string,
    description: string,
    context: string
  ): Promise<void> {
    await prisma.adaptationStrategy.upsert({
      where: {
        userId_strategyName: {
          userId: this.userId,
          strategyName
        }
      },
      create: {
        userId: this.userId,
        strategyName,
        description,
        context
      },
      update: {
        description,
        context,
        active: true
      }
    });
  }

  /**
   * Mark strategy as applied
   */
  async markStrategyApplied(strategyName: string): Promise<void> {
    const strategy = await prisma.adaptationStrategy.findUnique({
      where: {
        userId_strategyName: {
          userId: this.userId,
          strategyName
        }
      }
    });

    if (strategy) {
      await prisma.adaptationStrategy.update({
        where: { id: strategy.id },
        data: { lastApplied: new Date() }
      });
    }
  }

  // Helper methods to get data
  private async getRelevantPatterns() {
    return prisma.conversationPattern.findMany({
      where: { userId: this.userId },
      orderBy: [
        { frequency: 'desc' },
        { effectiveness: 'desc' }
      ],
      take: 10
    });
  }

  private async getRelevantPreferences() {
    return prisma.userPreference.findMany({
      where: { userId: this.userId },
      orderBy: { confidence: 'desc' },
      take: 10
    });
  }

  private async getActiveStrategies() {
    return prisma.adaptationStrategy.findMany({
      where: {
        userId: this.userId,
        active: true
      },
      orderBy: { successRate: 'desc' }
    });
  }

  private async getRecentFeedback() {
    return prisma.responseFeedback.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }
}
