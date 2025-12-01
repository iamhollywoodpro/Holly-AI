/**
 * PHASE 2C: Pattern Recognition System
 * Detects and learns patterns from user conversations and behavior
 */

import prisma from '@/lib/prisma';

export interface DetectedPattern {
  type: 'question_pattern' | 'work_pattern' | 'time_preference' | 'response_style' | 'communication_style';
  pattern: string;
  context: any;
  confidence: number;
  examples: string[];
}

export interface UserPreferenceData {
  category: string;
  key: string;
  value: any;
  confidence: number;
  source: string;
}

export class PatternRecognition {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Analyze a conversation and detect patterns
   */
  async analyzeConversation(messages: Array<{ role: string; content: string }>): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Pattern 1: Question style detection
    const userMessages = messages.filter(m => m.role === 'user');
    const questionPattern = this.detectQuestionStyle(userMessages);
    if (questionPattern) patterns.push(questionPattern);

    // Pattern 2: Work time preference
    const timePattern = this.detectTimePreference();
    if (timePattern) patterns.push(timePattern);

    // Pattern 3: Communication style
    const commStyle = this.detectCommunicationStyle(userMessages);
    if (commStyle) patterns.push(commStyle);

    // Pattern 4: Technical depth preference
    const techDepth = this.detectTechnicalDepth(messages);
    if (techDepth) patterns.push(techDepth);

    return patterns;
  }

  /**
   * Detect how user prefers to ask questions
   */
  private detectQuestionStyle(messages: Array<{ content: string }>): DetectedPattern | null {
    if (messages.length < 3) return null;

    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const hasMultipleSentences = messages.some(m => m.content.split(/[.!?]+/).length > 2);
    const usesContext = messages.some(m => 
      m.content.toLowerCase().includes('because') || 
      m.content.toLowerCase().includes('since') ||
      m.content.toLowerCase().includes('as')
    );

    let style = '';
    if (avgLength > 200 && hasMultipleSentences) {
      style = 'detailed_with_context';
    } else if (avgLength < 50) {
      style = 'brief_and_direct';
    } else if (usesContext) {
      style = 'contextual_questions';
    }

    if (!style) return null;

    return {
      type: 'question_pattern',
      pattern: `User prefers ${style.replace(/_/g, ' ')} questions`,
      context: { avgLength, hasMultipleSentences, usesContext },
      confidence: 0.7,
      examples: messages.slice(0, 3).map(m => m.content)
    };
  }

  /**
   * Detect user's active time preferences
   */
  private detectTimePreference(): DetectedPattern | null {
    const hour = new Date().getHours();
    
    let timeOfDay = '';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      type: 'time_preference',
      pattern: `User often works during ${timeOfDay}`,
      context: { hour, timeOfDay },
      confidence: 0.5, // Increase over time
      examples: [`Active at ${hour}:00`]
    };
  }

  /**
   * Detect communication style (formal, casual, emoji usage, etc.)
   */
  private detectCommunicationStyle(messages: Array<{ content: string }>): DetectedPattern | null {
    if (messages.length === 0) return null;

    const allText = messages.map(m => m.content).join(' ');
    const emojiCount = (allText.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
    const hasSlang = /\b(gonna|wanna|gotta|kinda|yeah|nah)\b/i.test(allText);
    const avgSentenceLength = allText.split(/[.!?]+/).reduce((sum, s) => sum + s.length, 0) / allText.split(/[.!?]+/).length;

    let style = '';
    if (emojiCount > 3 || hasSlang) {
      style = 'casual_friendly';
    } else if (avgSentenceLength > 100) {
      style = 'formal_detailed';
    } else {
      style = 'balanced_professional';
    }

    return {
      type: 'communication_style',
      pattern: `User communication style: ${style.replace(/_/g, ' ')}`,
      context: { emojiCount, hasSlang, avgSentenceLength },
      confidence: 0.6,
      examples: messages.slice(0, 2).map(m => m.content)
    };
  }

  /**
   * Detect preferred technical depth
   */
  private detectTechnicalDepth(messages: Array<{ role: string; content: string }>): DetectedPattern | null {
    const userMessages = messages.filter(m => m.role === 'user');
    const hollyMessages = messages.filter(m => m.role === 'assistant');

    if (userMessages.length === 0 || hollyMessages.length === 0) return null;

    const hasTechnicalTerms = (text: string) => {
      const techTerms = ['api', 'database', 'function', 'component', 'array', 'async', 'await', 'typescript', 'react', 'prisma'];
      return techTerms.some(term => text.toLowerCase().includes(term));
    };

    const userTechScore = userMessages.filter(m => hasTechnicalTerms(m.content)).length / userMessages.length;
    const asksForDetails = userMessages.some(m => 
      m.content.toLowerCase().includes('how does') ||
      m.content.toLowerCase().includes('explain') ||
      m.content.toLowerCase().includes('why')
    );

    let depth = '';
    if (userTechScore > 0.6 && asksForDetails) {
      depth = 'deep_technical';
    } else if (userTechScore > 0.3) {
      depth = 'moderate_technical';
    } else {
      depth = 'high_level_overview';
    }

    return {
      type: 'response_style',
      pattern: `User prefers ${depth.replace(/_/g, ' ')} explanations`,
      context: { userTechScore, asksForDetails },
      confidence: 0.65,
      examples: userMessages.slice(0, 2).map(m => m.content)
    };
  }

  /**
   * Save detected patterns to database
   */
  async savePatterns(patterns: DetectedPattern[]): Promise<void> {
    for (const pattern of patterns) {
      await this.saveOrUpdatePattern(pattern);
    }
  }

  /**
   * Save or update a single pattern
   */
  private async saveOrUpdatePattern(pattern: DetectedPattern): Promise<void> {
    try {
      // Check if pattern already exists
      const existing = await prisma.conversationPattern.findFirst({
        where: {
          userId: this.userId,
          patternType: pattern.type,
          pattern: pattern.pattern
        }
      });

      if (existing) {
        // Update frequency and effectiveness
        await prisma.conversationPattern.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + 1,
            lastSeen: new Date(),
            examples: [...existing.examples, ...pattern.examples].slice(-5) // Keep last 5
          }
        });
      } else {
        // Create new pattern
        await prisma.conversationPattern.create({
          data: {
            userId: this.userId,
            patternType: pattern.type,
            pattern: pattern.pattern,
            context: pattern.context,
            frequency: 1,
            effectiveness: 0.5,
            examples: pattern.examples
          }
        });
      }
    } catch (error) {
      console.error('[Pattern Recognition] Error saving pattern:', error);
    }
  }

  /**
   * Learn user preferences from conversation
   */
  async learnPreferences(
    category: string,
    observations: Record<string, any>,
    source: string = 'conversation'
  ): Promise<void> {
    for (const [key, value] of Object.entries(observations)) {
      await this.savePreference({
        category,
        key,
        value,
        confidence: 0.6,
        source
      });
    }
  }

  /**
   * Save or update user preference
   */
  private async savePreference(pref: UserPreferenceData): Promise<void> {
    try {
      const existing = await prisma.userPreference.findUnique({
        where: {
          userId_category_preferenceKey: {
            userId: this.userId,
            category: pref.category,
            preferenceKey: pref.key
          }
        }
      });

      if (existing) {
        // Increase confidence and update value
        const newConfidence = Math.min(1.0, existing.confidence + 0.1);
        await prisma.userPreference.update({
          where: { id: existing.id },
          data: {
            value: pref.value,
            confidence: newConfidence,
            timesObserved: existing.timesObserved + 1,
            lastObserved: new Date()
          }
        });
      } else {
        // Create new preference
        await prisma.userPreference.create({
          data: {
            userId: this.userId,
            category: pref.category,
            preferenceKey: pref.key,
            value: pref.value,
            confidence: pref.confidence,
            source: pref.source
          }
        });
      }
    } catch (error) {
      console.error('[Pattern Recognition] Error saving preference:', error);
    }
  }

  /**
   * Get all learned preferences for user
   */
  async getLearnedPreferences(category?: string): Promise<any[]> {
    const where: any = { userId: this.userId };
    if (category) where.category = category;

    return prisma.userPreference.findMany({
      where,
      orderBy: { confidence: 'desc' }
    });
  }

  /**
   * Get detected patterns
   */
  async getPatterns(type?: string): Promise<any[]> {
    const where: any = { userId: this.userId };
    if (type) where.patternType = type;

    return prisma.conversationPattern.findMany({
      where,
      orderBy: [
        { frequency: 'desc' },
        { effectiveness: 'desc' }
      ],
      take: 10
    });
  }
}
