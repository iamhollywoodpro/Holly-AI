/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: FEEDBACK SYSTEM
 * 
 * This system captures and analyzes user feedback to understand what's working
 * and what needs improvement. Both explicit (ratings, suggestions) and implicit
 * (regenerations, abandonment) feedback are tracked.
 * 
 * Purpose: Enable HOLLY to learn from user reactions and continuously improve
 * based on real user needs and frustrations.
 */

import { logger } from './logging-system';
import { prisma } from '@/lib/db';

// ============================================================================
// FEEDBACK TYPES & STRUCTURES
// ============================================================================

export type FeedbackType = 
  | 'thumbs_up'           // Explicit positive feedback
  | 'thumbs_down'         // Explicit negative feedback
  | 'rating'              // Numeric rating (1-5)
  | 'regenerate'          // User asked for regeneration
  | 'follow_up_question'  // User asked follow-up (implicit positive)
  | 'abandoned'           // User left conversation (implicit negative)
  | 'explicit_suggestion' // User provided improvement suggestion
  | 'error_report';       // User reported a problem

export type SentimentType = 
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'frustrated';

export interface UserFeedback {
  id: string;
  userId: string;
  conversationId?: string;
  messageId?: string;
  feedbackType: FeedbackType;
  sentiment: SentimentType;
  rating?: number; // 1-5 for rating type
  suggestion?: string; // For explicit suggestions
  context: {
    hollyResponse?: string;
    userMessage?: string;
    featureUsed?: string;
    operation?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface FeedbackInsight {
  category: string;
  insight: string;
  severity: 'info' | 'warning' | 'critical';
  evidence: {
    feedbackCount: number;
    examples: string[];
  };
  suggestedAction?: string;
}

// ============================================================================
// IN-MEMORY FEEDBACK STORAGE
// ============================================================================

class FeedbackStore {
  private feedbacks: UserFeedback[] = [];
  private maxSize = 1000; // Keep last 1000 feedbacks in memory

  add(feedback: UserFeedback): void {
    this.feedbacks.push(feedback);
    if (this.feedbacks.length > this.maxSize) {
      this.feedbacks.shift();
    }
  }

  getFeedbacks(filters?: {
    userId?: string;
    feedbackType?: FeedbackType;
    sentiment?: SentimentType;
    since?: Date;
    limit?: number;
  }): UserFeedback[] {
    let filtered = [...this.feedbacks];

    if (filters?.userId) {
      filtered = filtered.filter(f => f.userId === filters.userId);
    }

    if (filters?.feedbackType) {
      filtered = filtered.filter(f => f.feedbackType === filters.feedbackType);
    }

    if (filters?.sentiment) {
      filtered = filtered.filter(f => f.sentiment === filters.sentiment);
    }

    if (filters?.since) {
      filtered = filtered.filter(f => f.timestamp >= filters.since!);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  clear(): void {
    this.feedbacks = [];
  }
}

// Singleton feedback store
const feedbackStore = new FeedbackStore();

// ============================================================================
// FEEDBACK RECORDING FUNCTIONS
// ============================================================================

/**
 * Record user feedback
 */
export async function recordFeedback(
  userId: string,
  feedbackType: FeedbackType,
  context?: Partial<UserFeedback['context']>,
  options?: {
    conversationId?: string;
    messageId?: string;
    rating?: number;
    suggestion?: string;
  }
): Promise<UserFeedback> {
  // Determine sentiment from feedback type
  const sentiment = determineSentiment(feedbackType, options?.rating);

  const feedback: UserFeedback = {
    id: generateFeedbackId(),
    userId,
    conversationId: options?.conversationId,
    messageId: options?.messageId,
    feedbackType,
    sentiment,
    rating: options?.rating,
    suggestion: options?.suggestion,
    context: context || {},
    timestamp: new Date(),
  };

  // Store feedback
  feedbackStore.add(feedback);

  // Log feedback
  await logger.user.feedback(feedbackType, sentiment, {
    userId,
    conversationId: options?.conversationId,
  });

  // Persist to database
  await persistFeedback(feedback);

  // Trigger immediate analysis for critical feedback
  if (sentiment === 'frustrated' || feedbackType === 'error_report') {
    await analyzeCriticalFeedback(feedback);
  }

  return feedback;
}

/**
 * Determine sentiment from feedback type and rating
 */
function determineSentiment(feedbackType: FeedbackType, rating?: number): SentimentType {
  // Rating-based sentiment
  if (rating !== undefined) {
    if (rating === 5) return 'very_positive';
    if (rating === 4) return 'positive';
    if (rating === 3) return 'neutral';
    if (rating === 2) return 'negative';
    if (rating === 1) return 'frustrated';
  }

  // Type-based sentiment
  switch (feedbackType) {
    case 'thumbs_up':
    case 'follow_up_question':
      return 'positive';
    
    case 'thumbs_down':
    case 'error_report':
      return 'negative';
    
    case 'regenerate':
      return 'negative'; // User wasn't satisfied with response
    
    case 'abandoned':
      return 'frustrated'; // User gave up
    
    case 'explicit_suggestion':
      return 'neutral'; // Could be constructive
    
    default:
      return 'neutral';
  }
}

/**
 * Generate unique feedback ID
 */
function generateFeedbackId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const feedback = {
  /**
   * Record thumbs up
   */
  thumbsUp: async (
    userId: string,
    messageId: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'thumbs_up',
      context,
      { messageId, conversationId }
    );
  },

  /**
   * Record thumbs down
   */
  thumbsDown: async (
    userId: string,
    messageId: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'thumbs_down',
      context,
      { messageId, conversationId }
    );
  },

  /**
   * Record rating (1-5 stars)
   */
  rating: async (
    userId: string,
    rating: number,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'rating',
      context,
      { conversationId, rating }
    );
  },

  /**
   * Record regeneration request (implicit negative)
   */
  regenerate: async (
    userId: string,
    messageId: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'regenerate',
      context,
      { messageId, conversationId }
    );
  },

  /**
   * Record follow-up question (implicit positive)
   */
  followUp: async (
    userId: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'follow_up_question',
      context,
      { conversationId }
    );
  },

  /**
   * Record conversation abandonment
   */
  abandoned: async (
    userId: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'abandoned',
      context,
      { conversationId }
    );
  },

  /**
   * Record explicit suggestion
   */
  suggestion: async (
    userId: string,
    suggestion: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'explicit_suggestion',
      context,
      { conversationId, suggestion }
    );
  },

  /**
   * Record error report
   */
  error: async (
    userId: string,
    errorDescription: string,
    conversationId: string,
    context?: any
  ) => {
    return await recordFeedback(
      userId,
      'error_report',
      context,
      { conversationId, suggestion: errorDescription }
    );
  },
};

// ============================================================================
// FEEDBACK ANALYSIS
// ============================================================================

/**
 * Generate feedback insights for a time period
 */
export async function generateFeedbackInsights(
  timeWindowHours: number = 24
): Promise<FeedbackInsight[]> {
  const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
  const recentFeedback = feedbackStore.getFeedbacks({ since });

  const insights: FeedbackInsight[] = [];

  // Overall sentiment analysis
  const sentimentCounts = countBySentiment(recentFeedback);
  const totalFeedback = recentFeedback.length;

  if (totalFeedback > 0) {
    const negativeRate = ((sentimentCounts.negative + sentimentCounts.frustrated) / totalFeedback) * 100;
    
    if (negativeRate > 30) {
      insights.push({
        category: 'user_satisfaction',
        insight: `High negative feedback rate: ${negativeRate.toFixed(1)}% of recent feedback is negative`,
        severity: 'critical',
        evidence: {
          feedbackCount: sentimentCounts.negative + sentimentCounts.frustrated,
          examples: recentFeedback
            .filter(f => f.sentiment === 'negative' || f.sentiment === 'frustrated')
            .slice(0, 3)
            .map(f => f.context.hollyResponse || 'No context available'),
        },
        suggestedAction: 'Review recent negative feedback to identify common issues',
      });
    }
  }

  // Regeneration rate analysis
  const regenerations = recentFeedback.filter(f => f.feedbackType === 'regenerate');
  if (regenerations.length > totalFeedback * 0.2) {
    insights.push({
      category: 'response_quality',
      insight: `High regeneration rate: ${regenerations.length} regenerations in ${totalFeedback} interactions`,
      severity: 'warning',
      evidence: {
        feedbackCount: regenerations.length,
        examples: regenerations.slice(0, 3).map(f => f.context.featureUsed || 'Unknown feature'),
      },
      suggestedAction: 'Improve initial response quality to reduce regenerations',
    });
  }

  // Abandonment analysis
  const abandonments = recentFeedback.filter(f => f.feedbackType === 'abandoned');
  if (abandonments.length > 5) {
    insights.push({
      category: 'user_engagement',
      insight: `${abandonments.length} users abandoned conversations recently`,
      severity: 'warning',
      evidence: {
        feedbackCount: abandonments.length,
        examples: abandonments.slice(0, 3).map(f => f.context.operation || 'Unknown operation'),
      },
      suggestedAction: 'Investigate why users are leaving conversations',
    });
  }

  // Explicit suggestions
  const suggestions = recentFeedback.filter(f => f.feedbackType === 'explicit_suggestion' && f.suggestion);
  if (suggestions.length > 0) {
    insights.push({
      category: 'feature_requests',
      insight: `${suggestions.length} users provided explicit improvement suggestions`,
      severity: 'info',
      evidence: {
        feedbackCount: suggestions.length,
        examples: suggestions.slice(0, 3).map(f => f.suggestion!),
      },
      suggestedAction: 'Review suggestions for potential improvements',
    });
  }

  return insights;
}

/**
 * Count feedback by sentiment
 */
function countBySentiment(feedbacks: UserFeedback[]): Record<SentimentType, number> {
  return feedbacks.reduce((acc, f) => {
    acc[f.sentiment] = (acc[f.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<SentimentType, number>);
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(timeWindowHours: number = 24): {
  total: number;
  bySentiment: Record<SentimentType, number>;
  byType: Record<FeedbackType, number>;
  averageRating: number;
  satisfactionRate: number;
} {
  const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
  const feedbacks = feedbackStore.getFeedbacks({ since });

  const bySentiment = countBySentiment(feedbacks);
  
  const byType: Record<FeedbackType, number> = feedbacks.reduce((acc, f) => {
    acc[f.feedbackType] = (acc[f.feedbackType] || 0) + 1;
    return acc;
  }, {} as Record<FeedbackType, number>);

  const ratings = feedbacks.filter(f => f.rating !== undefined);
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, f) => sum + f.rating!, 0) / ratings.length
    : 0;

  const positiveCount = (bySentiment.positive || 0) + (bySentiment.very_positive || 0);
  const satisfactionRate = feedbacks.length > 0
    ? (positiveCount / feedbacks.length) * 100
    : 0;

  return {
    total: feedbacks.length,
    bySentiment,
    byType,
    averageRating: parseFloat(averageRating.toFixed(2)),
    satisfactionRate: parseFloat(satisfactionRate.toFixed(2)),
  };
}

/**
 * Analyze critical feedback immediately
 */
async function analyzeCriticalFeedback(feedback: UserFeedback): Promise<void> {
  await logger.metamorphosis.insight(
    `Critical feedback received: ${feedback.feedbackType} with ${feedback.sentiment} sentiment`,
    {
      userId: feedback.userId,
      context: feedback.context,
    }
  );

  // Future: Trigger automated response or investigation
  if (feedback.feedbackType === 'error_report') {
    await logger.critical('user_interaction', `User reported error: ${feedback.suggestion}`, {
      userId: feedback.userId,
      conversationId: feedback.conversationId,
    });
  }
}

/**
 * Persist feedback to database
 */
async function persistFeedback(feedback: UserFeedback): Promise<void> {
  try {
    // Note: Requires UserFeedback model in Prisma schema
    // TODO: Add UserFeedback model
    
    await logger.info('user_interaction', 'Feedback recorded', {
      feedbackType: feedback.feedbackType,
      sentiment: feedback.sentiment,
      userId: feedback.userId,
    });
  } catch (error) {
    await logger.error('user_interaction', 'Failed to persist feedback', {}, {
      errorCode: (error as any).code,
      stackTrace: (error as any).stack,
    });
  }
}

// ============================================================================
// SENTIMENT ANALYSIS (TEXT-BASED)
// ============================================================================

/**
 * Analyze sentiment from user text (for implicit feedback)
 */
export function analyzeSentimentFromText(text: string): SentimentType {
  const lowerText = text.toLowerCase();

  // Frustrated indicators
  const frustratedKeywords = [
    'not working', 'broken', 'terrible', 'awful', 'useless',
    'hate', 'worst', 'garbage', 'wtf', 'stupid',
  ];

  // Negative indicators
  const negativeKeywords = [
    'wrong', 'incorrect', 'bad', 'poor', 'disappointing',
    'confused', "doesn't work", 'failed', 'error',
  ];

  // Positive indicators
  const positiveKeywords = [
    'great', 'good', 'excellent', 'perfect', 'love',
    'amazing', 'awesome', 'helpful', 'thanks', 'thank you',
  ];

  // Very positive indicators
  const veryPositiveKeywords = [
    'brilliant', 'outstanding', 'fantastic', 'incredible',
    'best', 'perfect', 'exactly what', 'love it',
  ];

  // Check for patterns
  if (veryPositiveKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'very_positive';
  }

  if (positiveKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'positive';
  }

  if (frustratedKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'frustrated';
  }

  if (negativeKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'negative';
  }

  // Check for questions (often neutral or seeking help)
  if (lowerText.includes('?') || lowerText.startsWith('how') || lowerText.startsWith('what')) {
    return 'neutral';
  }

  return 'neutral';
}

/**
 * Detect if user is frustrated based on message patterns
 */
export function detectFrustration(
  messages: Array<{ content: string; timestamp: Date }>
): boolean {
  if (messages.length < 2) return false;

  // Check for rapid-fire messages (sign of frustration)
  const recentMessages = messages.slice(-5);
  const timeDiffs = recentMessages.slice(1).map((msg, i) => 
    msg.timestamp.getTime() - recentMessages[i].timestamp.getTime()
  );

  const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
  const rapidFire = avgTimeDiff < 10000; // Less than 10 seconds between messages

  // Check for frustrated language
  const frustratedTexts = recentMessages.filter(msg => 
    analyzeSentimentFromText(msg.content) === 'frustrated'
  );

  return rapidFire || frustratedTexts.length >= 2;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { feedbackStore };
export default feedback;
