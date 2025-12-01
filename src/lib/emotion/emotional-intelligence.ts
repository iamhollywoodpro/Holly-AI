/**
 * PHASE 2E: Enhanced Emotional Intelligence System
 * Detects subtle emotional cues and tracks emotional states
 */

import prisma from '@/lib/prisma';

export interface EmotionDetectionResult {
  primaryEmotion: string;
  intensity: number; // 0.0 to 1.0
  valence: number; // -1.0 (negative) to 1.0 (positive)
  arousal: number; // 0.0 (calm) to 1.0 (energized)
  secondaryEmotions: Array<{ emotion: string; intensity: number }>;
  detectedCues: string[];
  confidence: number;
}

export interface EmotionalContext {
  currentState: EmotionDetectionResult;
  recentStates: any[];
  triggers: any[];
  journey: any;
}

export class EmotionalIntelligence {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Detect emotions from user's message with enhanced sensitivity
   */
  async detectEmotion(
    messageContent: string,
    context: {
      conversationHistory?: Array<{ role: string; content: string }>;
      recentActivity?: string;
    } = {}
  ): Promise<EmotionDetectionResult> {
    const detectedCues: string[] = [];
    const secondaryEmotions: Array<{ emotion: string; intensity: number }> = [];

    // Analyze linguistic patterns
    const linguisticAnalysis = this.analyzeLinguisticPatterns(messageContent);
    detectedCues.push(...linguisticAnalysis.cues);

    // Detect primary emotion
    const primaryEmotion = this.detectPrimaryEmotion(messageContent, linguisticAnalysis);
    
    // Calculate intensity
    const intensity = this.calculateIntensity(messageContent, primaryEmotion);
    
    // Calculate valence (positive/negative)
    const valence = this.calculateValence(messageContent, primaryEmotion);
    
    // Calculate arousal (calm/energized)
    const arousal = this.calculateArousal(messageContent, linguisticAnalysis);

    // Detect secondary emotions
    const allEmotions = this.detectAllEmotions(messageContent);
    for (const [emotion, score] of Object.entries(allEmotions)) {
      if (emotion !== primaryEmotion.name && score > 0.3) {
        secondaryEmotions.push({ emotion, intensity: score });
      }
    }

    const confidence = this.calculateConfidence(linguisticAnalysis, allEmotions);

    return {
      primaryEmotion: primaryEmotion.name,
      intensity,
      valence,
      arousal,
      secondaryEmotions: secondaryEmotions.slice(0, 3),
      detectedCues,
      confidence
    };
  }

  /**
   * Analyze linguistic patterns for emotional cues
   */
  private analyzeLinguisticPatterns(text: string): {
    cues: string[];
    punctuationEmphasis: number;
    capsUsage: number;
    emojiCount: number;
    sentenceLength: number;
  } {
    const cues: string[] = [];
    const lowerText = text.toLowerCase();

    // Check punctuation emphasis
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const ellipsisCount = (text.match(/\.{2,}/g) || []).length;
    const punctuationEmphasis = (exclamationCount * 1.5 + questionCount + ellipsisCount * 0.8) / text.length;

    if (exclamationCount > 1) cues.push('multiple_exclamations');
    if (ellipsisCount > 0) cues.push('trailing_thought');
    if (questionCount > 2) cues.push('uncertain_questioning');

    // Check caps usage
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    const capsUsage = capsWords / (text.split(' ').length || 1);
    if (capsUsage > 0.3) cues.push('emphasis_caps');

    // Check emoji usage
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu) || []).length;
    if (emojiCount > 0) cues.push('emoji_expression');

    // Check sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / (sentences.length || 1);

    if (avgSentenceLength < 30) cues.push('brief_sentences');
    if (avgSentenceLength > 100) cues.push('complex_thoughts');

    // Check for emotional intensifiers
    if (/\b(very|extremely|really|super|so|incredibly|absolutely)\b/i.test(lowerText)) {
      cues.push('emotional_intensifiers');
    }

    // Check for hedging (uncertainty)
    if (/\b(maybe|perhaps|possibly|might|could|sort of|kind of)\b/i.test(lowerText)) {
      cues.push('hedging_language');
    }

    return {
      cues,
      punctuationEmphasis,
      capsUsage,
      emojiCount,
      sentenceLength: avgSentenceLength
    };
  }

  /**
   * Detect primary emotion using pattern matching
   */
  private detectPrimaryEmotion(text: string, linguistic: any): { name: string; score: number } {
    const allEmotions = this.detectAllEmotions(text);
    
    // Find emotion with highest score
    let maxEmotion = { name: 'neutral', score: 0 };
    for (const [emotion, score] of Object.entries(allEmotions)) {
      if (score > maxEmotion.score) {
        maxEmotion = { name: emotion, score };
      }
    }

    return maxEmotion;
  }

  /**
   * Detect all emotions present in text
   */
  private detectAllEmotions(text: string): Record<string, number> {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {
      joy: 0,
      excitement: 0,
      gratitude: 0,
      pride: 0,
      sadness: 0,
      frustration: 0,
      anxiety: 0,
      anger: 0,
      confusion: 0,
      curiosity: 0,
      determination: 0,
      neutral: 0.5
    };

    // Joy indicators
    const joyWords = ['happy', 'glad', 'great', 'awesome', 'wonderful', 'love', 'perfect', 'excellent', 'fantastic'];
    scores.joy = this.countMatches(lowerText, joyWords) / 10;

    // Excitement indicators
    const excitementWords = ['excited', 'amazing', 'can\'t wait', 'wow', 'omg', 'yes!', 'finally'];
    scores.excitement = this.countMatches(lowerText, excitementWords) / 10;

    // Gratitude indicators
    const gratitudeWords = ['thanks', 'thank you', 'appreciate', 'grateful', 'helped'];
    scores.gratitude = this.countMatches(lowerText, gratitudeWords) / 10;

    // Sadness indicators
    const sadnessWords = ['sad', 'disappointed', 'upset', 'down', 'unfortunate', 'miss', 'lost'];
    scores.sadness = this.countMatches(lowerText, sadnessWords) / 10;

    // Frustration indicators
    const frustrationWords = ['frustrated', 'stuck', 'can\'t', 'won\'t work', 'keeps failing', 'annoying', 'ugh'];
    scores.frustration = this.countMatches(lowerText, frustrationWords) / 10;

    // Anxiety indicators
    const anxietyWords = ['worried', 'nervous', 'anxious', 'concerned', 'scared', 'afraid', 'stress'];
    scores.anxiety = this.countMatches(lowerText, anxietyWords) / 10;

    // Anger indicators
    const angerWords = ['angry', 'mad', 'furious', 'hate', 'terrible', 'worst', 'stupid'];
    scores.anger = this.countMatches(lowerText, angerWords) / 10;

    // Confusion indicators
    const confusionWords = ['confused', 'don\'t understand', 'what', 'how', 'unclear', 'lost'];
    scores.confusion = this.countMatches(lowerText, confusionWords) / 10;

    // Curiosity indicators
    const curiosityWords = ['curious', 'wonder', 'interested', 'how does', 'why', 'what if', 'tell me more'];
    scores.curiosity = this.countMatches(lowerText, curiosityWords) / 10;

    // Determination indicators
    const determinationWords = ['will', 'going to', 'determined', 'must', 'need to', 'have to', 'let\'s'];
    scores.determination = this.countMatches(lowerText, determinationWords) / 10;

    return scores;
  }

  /**
   * Count word/phrase matches
   */
  private countMatches(text: string, patterns: string[]): number {
    let count = 0;
    for (const pattern of patterns) {
      if (text.includes(pattern)) count++;
    }
    return count;
  }

  /**
   * Calculate emotional intensity
   */
  private calculateIntensity(text: string, primaryEmotion: { name: string; score: number }): number {
    let intensity = primaryEmotion.score;

    // Boost intensity for caps and multiple punctuation
    const hasCaps = /[A-Z]{2,}/.test(text);
    const multiPunctuation = /[!?]{2,}/.test(text);
    
    if (hasCaps) intensity = Math.min(1.0, intensity + 0.2);
    if (multiPunctuation) intensity = Math.min(1.0, intensity + 0.2);

    return Math.max(0, Math.min(1.0, intensity));
  }

  /**
   * Calculate valence (positive/negative)
   */
  private calculateValence(text: string, primaryEmotion: { name: string }): number {
    const positiveEmotions = ['joy', 'excitement', 'gratitude', 'pride', 'curiosity', 'determination'];
    const negativeEmotions = ['sadness', 'frustration', 'anxiety', 'anger'];

    if (positiveEmotions.includes(primaryEmotion.name)) return 0.7;
    if (negativeEmotions.includes(primaryEmotion.name)) return -0.7;
    return 0;
  }

  /**
   * Calculate arousal level (calm/energized)
   */
  private calculateArousal(text: string, linguistic: any): number {
    let arousal = 0.5; // baseline

    // High arousal indicators
    if (linguistic.punctuationEmphasis > 0.02) arousal += 0.2;
    if (linguistic.capsUsage > 0.2) arousal += 0.2;
    if (linguistic.emojiCount > 2) arousal += 0.1;
    if (linguistic.sentenceLength < 40) arousal += 0.1; // quick, energetic

    // Low arousal indicators
    if (linguistic.sentenceLength > 100) arousal -= 0.2; // thoughtful, calm
    if (linguistic.cues.includes('trailing_thought')) arousal -= 0.1;

    return Math.max(0, Math.min(1.0, arousal));
  }

  /**
   * Calculate confidence in emotion detection
   */
  private calculateConfidence(linguistic: any, emotions: Record<string, number>): number {
    const cueCount = linguistic.cues.length;
    const emotionScores = Object.values(emotions);
    const maxScore = Math.max(...emotionScores);
    const avgScore = emotionScores.reduce((a, b) => a + b, 0) / emotionScores.length;
    
    // Higher confidence if: more cues, clear dominant emotion, not ambiguous
    const cueConfidence = Math.min(1.0, cueCount / 5);
    const clarityConfidence = maxScore / (avgScore + 0.1);
    
    return Math.min(1.0, (cueConfidence + clarityConfidence) / 2);
  }

  /**
   * Save emotional state to database
   */
  async saveEmotionalState(
    detection: EmotionDetectionResult,
    context: { conversationId?: string; triggers?: string[] } = {}
  ): Promise<void> {
    try {
      await prisma.emotionalState.create({
        data: {
          userId: this.userId,
          primaryEmotion: detection.primaryEmotion,
          intensity: detection.intensity,
          valence: detection.valence,
          arousal: detection.arousal,
          secondaryEmotions: detection.secondaryEmotions,
          context: context,
          triggers: context.triggers || [],
          cues: detection.detectedCues,
          conversationId: context.conversationId
        }
      });
    } catch (error) {
      console.error('[Emotional Intelligence] Error saving state:', error);
    }
  }

  /**
   * Get recent emotional states
   */
  async getRecentStates(limit: number = 10): Promise<any[]> {
    return prisma.emotionalState.findMany({
      where: { userId: this.userId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * Detect emotional triggers
   */
  async detectTriggers(
    currentEmotion: string,
    context: any
  ): Promise<string[]> {
    const triggers: string[] = [];

    // Check for success/achievement
    if (['joy', 'pride', 'excitement'].includes(currentEmotion)) {
      if (context.completedTask) triggers.push('achievement');
      if (context.receivedPraise) triggers.push('recognition');
    }

    // Check for setbacks
    if (['frustration', 'sadness', 'disappointment'].includes(currentEmotion)) {
      if (context.error || context.failure) triggers.push('setback');
      if (context.blocked) triggers.push('obstacle');
    }

    // Check for pressure
    if (['anxiety', 'stress'].includes(currentEmotion)) {
      if (context.deadline) triggers.push('time_pressure');
      if (context.complexity) triggers.push('overwhelm');
    }

    return triggers;
  }

  /**
   * Get emotional journey for conversation
   */
  async getEmotionalJourney(conversationId: string): Promise<any> {
    return prisma.emotionalJourney.findFirst({
      where: {
        userId: this.userId,
        conversationId
      },
      orderBy: { startTime: 'desc' }
    });
  }

  /**
   * Track emotional journey
   */
  async trackJourney(
    conversationId: string,
    currentEmotion: string,
    emotionalArc: any[]
  ): Promise<void> {
    try {
      const existing = await this.getEmotionalJourney(conversationId);

      if (existing) {
        // Update existing journey
        await prisma.emotionalJourney.update({
          where: { id: existing.id },
          data: {
            endEmotion: currentEmotion,
            emotionalArc: [...(existing.emotionalArc as any[]), ...emotionalArc],
            endTime: new Date()
          }
        });
      } else {
        // Create new journey
        await prisma.emotionalJourney.create({
          data: {
            userId: this.userId,
            conversationId,
            startEmotion: currentEmotion,
            endEmotion: currentEmotion,
            emotionalArc,
            keyMoments: [],
            supportProvided: []
          }
        });
      }
    } catch (error) {
      console.error('[Emotional Intelligence] Error tracking journey:', error);
    }
  }
}
