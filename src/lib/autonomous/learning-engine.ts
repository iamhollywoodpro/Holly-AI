/**
 * HOLLY AI - Learning Engine
 * 
 * This module enables HOLLY to learn from every interaction,
 * improving her responses and capabilities over time.
 * 
 * Part of the Autonomous Self-Improvement Architecture.
 */

import { hollyLogger } from '@/lib/logger';
import { prisma } from '@/lib/db';

// ============================================================================
// Required Prisma Schema Addition
// ============================================================================
/*
 * Add the following model to prisma/schema.prisma:
 * 
 * model LearningEvent {
 *   id             String   @id @default(cuid())
 *   type           String   // conversation, feedback, error, success, correction
 *   userId         String
 *   conversationId String?
 *   data           Json     @default("{}")
 *   timestamp      DateTime @default(now())
 *   processed      Boolean  @default(false)
 *   createdAt      DateTime @default(now())
 * 
 *   @@index([userId])
 *   @@index([type])
 *   @@index([processed])
 *   @@index([timestamp])
 *   @@map("learning_events")
 * }
 * 
 * model LearningPattern {
 *   id         String   @id @default(cuid())
 *   pattern    String   @db.Text
 *   category   String   // user_preference, common_query, error_pattern, success_pattern
 *   frequency  Int      @default(1)
 *   lastSeen   DateTime @default(now())
 *   confidence Float    @default(0)
 *   action     String?
 *   createdAt  DateTime @default(now())
 *   updatedAt  DateTime @updatedAt
 * 
 *   @@index([category])
 *   @@index([frequency])
 *   @@map("learning_patterns")
 * }
 * 
 * model UserLearningProfile {
 *   id                      String   @id @default(cuid())
 *   userId                  String   @unique
 *   preferences             Json     @default("{}")
 *   commonTopics            String[] @default([])
 *   communicationStyle      String   @default("casual")
 *   preferredResponseLength String   @default("medium")
 *   interests               String[] @default([])
 *   expertise               Json     @default("{}")
 *   lastUpdated             DateTime @default(now())
 *   createdAt               DateTime @default(now())
 *   updatedAt               DateTime @updatedAt
 * 
 *   @@index([userId])
 *   @@map("user_learning_profiles")
 * }
 */

// ============================================================================
// Types
// ============================================================================

export interface LearningEvent {
  id: string;
  type: 'conversation' | 'feedback' | 'error' | 'success' | 'correction';
  userId: string;
  conversationId?: string;
  data: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export interface LearningPattern {
  id: string;
  pattern: string;
  category: 'user_preference' | 'common_query' | 'error_pattern' | 'success_pattern';
  frequency: number;
  lastSeen: Date;
  confidence: number;
  action?: string;
}

export interface UserLearningProfile {
  userId: string;
  preferences: Record<string, any>;
  commonTopics: string[];
  communicationStyle: 'formal' | 'casual' | 'technical' | 'creative';
  preferredResponseLength: 'short' | 'medium' | 'detailed';
  interests: string[];
  expertise: Record<string, number>; // topic -> expertise level (0-100)
  lastUpdated: Date;
}

export interface LearningInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'warning';
  title: string;
  description: string;
  data: Record<string, any>;
  actionable: boolean;
  suggestedAction?: string;
  createdAt: Date;
}

// ============================================================================
// Learning Engine Class
// ============================================================================

export class LearningEngine {
  private readonly logger = hollyLogger.ai;
  private readonly maxBatchSize = 1000;

  /**
   * Record a learning event - persists immediately to database
   */
  async recordEvent(
    type: LearningEvent['type'],
    userId: string,
    data: Record<string, any>,
    conversationId?: string
  ): Promise<void> {
    try {
      const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Persist event directly to database
      // Note: Requires LearningEvent model in Prisma schema (see comments at top of file)
      await prisma.$executeRaw`
        INSERT INTO learning_events (id, type, "userId", "conversationId", data, timestamp, processed, "createdAt")
        VALUES (${eventId}, ${type}, ${userId}, ${conversationId || null}, ${JSON.stringify(data)}::jsonb, NOW(), false, NOW())
      `;

      this.logger.debug('Learning event persisted to database', { type, userId, eventId });

      // Process unprocessed events if batch size threshold is reached
      const unprocessedCount = await this.getUnprocessedEventCount();
      if (unprocessedCount >= this.maxBatchSize) {
        await this.processEventQueue();
      }
    } catch (error) {
      this.logger.error('Failed to persist learning event', { error, type, userId });
      // Don't throw - learning events should not break the main flow
    }
  }

  /**
   * Get count of unprocessed events
   */
  private async getUnprocessedEventCount(): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM learning_events WHERE processed = false
      `;
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  /**
   * Process all queued learning events from database
   */
  async processEventQueue(): Promise<{ processed: number; patterns: number }> {
    try {
      // Fetch unprocessed events from database
      const events = await this.fetchUnprocessedEvents();
      
      if (events.length === 0) {
        return { processed: 0, patterns: 0 };
      }

      this.logger.info('Processing learning events from database', { 
        queueSize: events.length 
      });

      let patternsFound = 0;

      // Group events by user
      const eventsByUser = this.groupEventsByUser(events);

      for (const [userId, userEvents] of Object.entries(eventsByUser)) {
        // Update user learning profile
        await this.updateUserLearningProfile(userId, userEvents);

        // Extract patterns
        const patterns = this.extractPatterns(userEvents);
        patternsFound += patterns.length;

        // Store patterns
        for (const pattern of patterns) {
          await this.storePattern(pattern);
        }
      }

      // Mark processed events in database
      const eventIds = events.map(e => e.id);
      await this.markEventsProcessed(eventIds);

      this.logger.info('Learning events processed', { processed: events.length, patternsFound });

      return { processed: events.length, patterns: patternsFound };
    } catch (error) {
      this.logger.error('Failed to process event queue', { error });
      return { processed: 0, patterns: 0 };
    }
  }

  /**
   * Fetch unprocessed events from database
   */
  private async fetchUnprocessedEvents(): Promise<LearningEvent[]> {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, type, "userId", "conversationId", data, timestamp, processed
        FROM learning_events
        WHERE processed = false
        ORDER BY timestamp ASC
        LIMIT 1000
      `;
      
      return rows.map(row => ({
        id: row.id,
        type: row.type as LearningEvent['type'],
        userId: row.userId,
        conversationId: row.conversationId || undefined,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        timestamp: row.timestamp,
        processed: row.processed,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch unprocessed events', { error });
      return [];
    }
  }

  /**
   * Mark events as processed in database
   */
  private async markEventsProcessed(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    
    try {
      await prisma.$executeRaw`
        UPDATE learning_events 
        SET processed = true 
        WHERE id = ANY(${eventIds}::text[])
      `;
    } catch (error) {
      this.logger.error('Failed to mark events as processed', { error });
    }
  }

  /**
   * Get or create user learning profile
   */
  async getUserLearningProfile(userId: string): Promise<UserLearningProfile> {
    try {
      // Try to get from database
      const stored = await this.getStoredProfile(userId);
      if (stored) return stored;

      // Create new profile
      return {
        userId,
        preferences: {},
        commonTopics: [],
        communicationStyle: 'casual',
        preferredResponseLength: 'medium',
        interests: [],
        expertise: {},
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get user learning profile', { error, userId });
      // Return default profile instead of throwing to prevent unhandled rejections
      return {
        userId,
        preferences: {},
        commonTopics: [],
        communicationStyle: 'casual',
        preferredResponseLength: 'medium',
        interests: [],
        expertise: {},
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Update user learning profile based on events
   */
  private async updateUserLearningProfile(
    userId: string,
    events: LearningEvent[]
  ): Promise<void> {
    const profile = await this.getUserLearningProfile(userId);

    for (const event of events) {
      switch (event.type) {
        case 'conversation':
          this.updateFromConversation(profile, event);
          break;
        case 'feedback':
          this.updateFromFeedback(profile, event);
          break;
        case 'correction':
          this.updateFromCorrection(profile, event);
          break;
      }
    }

    profile.lastUpdated = new Date();

    // Store updated profile
    await this.storeProfile(profile);
  }

  /**
   * Update profile from conversation
   */
  private updateFromConversation(profile: UserLearningProfile, event: LearningEvent): void {
    const { messages, topics } = event.data;

    // Update common topics
    if (topics && Array.isArray(topics)) {
      for (const topic of topics) {
        if (!profile.commonTopics.includes(topic)) {
          profile.commonTopics.push(topic);
        }
      }
    }

    // Analyze communication style
    if (messages && Array.isArray(messages)) {
      const userMessages = messages.filter((m: any) => m.role === 'user');
      const avgLength = userMessages.reduce((sum: number, m: any) => 
        sum + (m.content?.length || 0), 0) / (userMessages.length || 1);

      if (avgLength < 50) {
        profile.communicationStyle = 'casual';
      } else if (avgLength > 200) {
        profile.communicationStyle = 'technical';
      }

      // Update expertise based on topics discussed
      if (topics) {
        for (const topic of topics) {
          profile.expertise[topic] = (profile.expertise[topic] || 0) + 1;
        }
      }
    }
  }

  /**
   * Update profile from feedback
   */
  private updateFromFeedback(profile: UserLearningProfile, event: LearningEvent): void {
    const { rating, feedback, category } = event.data;

    if (rating !== undefined) {
      // Adjust preferences based on positive/negative feedback
      if (rating >= 4) {
        // Positive - reinforce current behavior
        if (category) {
          profile.preferences[`${category}_positive`] = 
            (profile.preferences[`${category}_positive`] || 0) + 1;
        }
      } else if (rating <= 2) {
        // Negative - note for improvement
        if (category) {
          profile.preferences[`${category}_negative`] = 
            (profile.preferences[`${category}_negative`] || 0) + 1;
        }
      }
    }

    if (feedback && typeof feedback === 'string') {
      // Extract interests from feedback
      const words = feedback.toLowerCase().split(/\s+/);
      const interestWords = words.filter(w => w.length > 4);
      profile.interests = [...new Set([...profile.interests, ...interestWords])].slice(0, 50);
    }
  }

  /**
   * Update profile from correction
   */
  private updateFromCorrection(profile: UserLearningProfile, event: LearningEvent): void {
    const { original, corrected, category } = event.data;

    // Store correction pattern for future reference
    if (original && corrected) {
      const correctionKey = `correction_${category || 'general'}`;
      if (!profile.preferences[correctionKey]) {
        profile.preferences[correctionKey] = [];
      }
      profile.preferences[correctionKey].push({
        original,
        corrected,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Extract patterns from events
   */
  private extractPatterns(events: LearningEvent[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // Group events by type
    const byType = events.reduce((acc, event) => {
      acc[event.type] = acc[event.type] || [];
      acc[event.type].push(event);
      return acc;
    }, {} as Record<string, LearningEvent[]>);

    // Extract common query patterns
    if (byType.conversation) {
      const queryPatterns = this.extractQueryPatterns(byType.conversation);
      patterns.push(...queryPatterns);
    }

    // Extract error patterns
    if (byType.error) {
      const errorPatterns = this.extractErrorPatterns(byType.error);
      patterns.push(...errorPatterns);
    }

    // Extract success patterns
    if (byType.success) {
      const successPatterns = this.extractSuccessPatterns(byType.success);
      patterns.push(...successPatterns);
    }

    return patterns;
  }

  /**
   * Extract common query patterns
   */
  private extractQueryPatterns(events: LearningEvent[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    const queryCounts: Record<string, number> = {};

    for (const event of events) {
      const query = event.data.query || event.data.message;
      if (query && typeof query === 'string') {
        // Normalize query
        const normalized = query.toLowerCase().trim();
        queryCounts[normalized] = (queryCounts[normalized] || 0) + 1;
      }
    }

    // Find frequent queries
    for (const [query, count] of Object.entries(queryCounts)) {
      if (count >= 2) {
        patterns.push({
          id: `pattern-query-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          pattern: query,
          category: 'common_query',
          frequency: count,
          lastSeen: new Date(),
          confidence: Math.min(count / 10, 1),
        });
      }
    }

    return patterns;
  }

  /**
   * Extract error patterns
   */
  private extractErrorPatterns(events: LearningEvent[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    const errorCounts: Record<string, number> = {};

    for (const event of events) {
      const error = event.data.error || event.data.message;
      if (error && typeof error === 'string') {
        // Normalize error message
        const normalized = error.toLowerCase().replace(/\d+/g, 'X');
        errorCounts[normalized] = (errorCounts[normalized] || 0) + 1;
      }
    }

    // Find frequent errors
    for (const [error, count] of Object.entries(errorCounts)) {
      if (count >= 2) {
        patterns.push({
          id: `pattern-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          pattern: error,
          category: 'error_pattern',
          frequency: count,
          lastSeen: new Date(),
          confidence: Math.min(count / 5, 1),
          action: 'investigate_error_pattern',
        });
      }
    }

    return patterns;
  }

  /**
   * Extract success patterns
   */
  private extractSuccessPatterns(events: LearningEvent[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    const successActions: Record<string, number> = {};

    for (const event of events) {
      const action = event.data.action || event.data.tool;
      if (action && typeof action === 'string') {
        successActions[action] = (successActions[action] || 0) + 1;
      }
    }

    // Find successful actions
    for (const [action, count] of Object.entries(successActions)) {
      if (count >= 3) {
        patterns.push({
          id: `pattern-success-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          pattern: action,
          category: 'success_pattern',
          frequency: count,
          lastSeen: new Date(),
          confidence: Math.min(count / 10, 1),
          action: 'reinforce_pattern',
        });
      }
    }

    return patterns;
  }

  /**
   * Generate learning insights
   */
  async generateInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Analyze patterns for insights
    const patterns = await this.getRecentPatterns();

    // Trend detection
    const trends = this.detectTrends(patterns);
    insights.push(...trends);

    // Anomaly detection
    const anomalies = this.detectAnomalies(patterns);
    insights.push(...anomalies);

    // Opportunity detection
    const opportunities = this.detectOpportunities(patterns);
    insights.push(...opportunities);

    return insights;
  }

  /**
   * Detect trends from patterns
   */
  private detectTrends(patterns: LearningPattern[]): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Group by category
    const byCategory = patterns.reduce((acc, p) => {
      acc[p.category] = acc[p.category] || [];
      acc[p.category].push(p);
      return acc;
    }, {} as Record<string, LearningPattern[]>);

    // Check for trending topics
    if (byCategory.common_query) {
      const topQueries = byCategory.common_query
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      if (topQueries.length > 0) {
        insights.push({
          id: `insight-trend-${Date.now()}`,
          type: 'trend',
          title: 'Popular Query Topics',
          description: `Top ${topQueries.length} most frequent queries detected`,
          data: { queries: topQueries.map(q => ({ pattern: q.pattern, frequency: q.frequency })) },
          actionable: true,
          suggestedAction: 'Consider creating quick responses for frequent queries',
          createdAt: new Date(),
        });
      }
    }

    return insights;
  }

  /**
   * Detect anomalies from patterns
   */
  private detectAnomalies(patterns: LearningPattern[]): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Check for unusual error spikes
    const errorPatterns = patterns.filter(p => p.category === 'error_pattern');
    const highFrequencyErrors = errorPatterns.filter(p => p.frequency > 5);

    if (highFrequencyErrors.length > 0) {
      insights.push({
        id: `insight-anomaly-${Date.now()}`,
        type: 'anomaly',
        title: 'Error Pattern Detected',
        description: `${highFrequencyErrors.length} error patterns with high frequency detected`,
        data: { errors: highFrequencyErrors.map(e => ({ pattern: e.pattern, frequency: e.frequency })) },
        actionable: true,
        suggestedAction: 'Investigate and fix recurring errors',
        createdAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect opportunities from patterns
   */
  private detectOpportunities(patterns: LearningPattern[]): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Check for successful patterns that could be automated
    const successPatterns = patterns.filter(p => p.category === 'success_pattern');
    const automatablePatterns = successPatterns.filter(p => p.confidence > 0.8);

    if (automatablePatterns.length > 0) {
      insights.push({
        id: `insight-opportunity-${Date.now()}`,
        type: 'opportunity',
        title: 'Automation Opportunity',
        description: `${automatablePatterns.length} patterns could be automated`,
        data: { patterns: automatablePatterns.map(p => p.pattern) },
        actionable: true,
        suggestedAction: 'Consider automating high-confidence success patterns',
        createdAt: new Date(),
      });
    }

    return insights;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private groupEventsByUser(events: LearningEvent[]): Record<string, LearningEvent[]> {
    return events.reduce((acc, event) => {
      acc[event.userId] = acc[event.userId] || [];
      acc[event.userId].push(event);
      return acc;
    }, {} as Record<string, LearningEvent[]>);
  }

  private async getStoredProfile(userId: string): Promise<UserLearningProfile | null> {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT "userId", preferences, "commonTopics", "communicationStyle", 
               "preferredResponseLength", interests, expertise, "lastUpdated"
        FROM user_learning_profiles
        WHERE "userId" = ${userId}
        LIMIT 1
      `;
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        userId: row.userId,
        preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
        commonTopics: row.commonTopics || [],
        communicationStyle: row.communicationStyle || 'casual',
        preferredResponseLength: row.preferredResponseLength || 'medium',
        interests: row.interests || [],
        expertise: typeof row.expertise === 'string' ? JSON.parse(row.expertise) : row.expertise,
        lastUpdated: row.lastUpdated,
      };
    } catch (error) {
      this.logger.error('Failed to get stored profile', { error, userId });
      return null;
    }
  }

  private async storeProfile(profile: UserLearningProfile): Promise<void> {
    try {
      // Upsert the profile
      await prisma.$executeRaw`
        INSERT INTO user_learning_profiles 
          ("userId", preferences, "commonTopics", "communicationStyle", 
           "preferredResponseLength", interests, expertise, "lastUpdated", "createdAt", "updatedAt")
        VALUES 
          (${profile.userId}, ${JSON.stringify(profile.preferences)}::jsonb, 
           ${profile.commonTopics}, ${profile.communicationStyle},
           ${profile.preferredResponseLength}, ${profile.interests}, 
           ${JSON.stringify(profile.expertise)}::jsonb, NOW(), NOW(), NOW())
        ON CONFLICT ("userId") 
        DO UPDATE SET
          preferences = EXCLUDED.preferences,
          "commonTopics" = EXCLUDED."commonTopics",
          "communicationStyle" = EXCLUDED."communicationStyle",
          "preferredResponseLength" = EXCLUDED."preferredResponseLength",
          interests = EXCLUDED.interests,
          expertise = EXCLUDED.expertise,
          "lastUpdated" = NOW(),
          "updatedAt" = NOW()
      `;
      
      this.logger.debug('Profile stored to database', { userId: profile.userId });
    } catch (error) {
      this.logger.error('Failed to store profile', { error, userId: profile.userId });
    }
  }

  private async storePattern(pattern: LearningPattern): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO learning_patterns 
          (id, pattern, category, frequency, "lastSeen", confidence, action, "createdAt", "updatedAt")
        VALUES 
          (${pattern.id}, ${pattern.pattern}, ${pattern.category}, ${pattern.frequency},
           NOW(), ${pattern.confidence}, ${pattern.action || null}, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET
          frequency = EXCLUDED.frequency,
          "lastSeen" = EXCLUDED."lastSeen",
          confidence = EXCLUDED.confidence,
          action = EXCLUDED.action,
          "updatedAt" = NOW()
      `;
      
      this.logger.debug('Pattern stored to database', { 
        category: pattern.category, 
        frequency: pattern.frequency 
      });
    } catch (error) {
      this.logger.error('Failed to store pattern', { error });
    }
  }

  private async getRecentPatterns(): Promise<LearningPattern[]> {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, pattern, category, frequency, "lastSeen", confidence, action
        FROM learning_patterns
        ORDER BY "lastSeen" DESC
        LIMIT 100
      `;
      
      return rows.map(row => ({
        id: row.id,
        pattern: row.pattern,
        category: row.category as LearningPattern['category'],
        frequency: row.frequency,
        lastSeen: row.lastSeen,
        confidence: row.confidence,
        action: row.action || undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to get recent patterns', { error });
      return [];
    }
  }

  /**
   * Apply learned knowledge to improve response
   */
  async enhanceResponse(
    userId: string,
    query: string,
    baseResponse: string
  ): Promise<{ response: string; enhancements: string[] }> {
    const profile = await this.getUserLearningProfile(userId);
    const enhancements: string[] = [];

    let response = baseResponse;

    // Adjust response length based on preference
    if (profile.preferredResponseLength === 'short') {
      // Truncate to first paragraph or summary
      const sentences = response.split(/[.!?]+/);
      if (sentences.length > 3) {
        response = sentences.slice(0, 3).join('. ') + '.';
        enhancements.push('Shortened response based on preference');
      }
    } else if (profile.preferredResponseLength === 'detailed') {
      // Add more detail if available
      enhancements.push('Detailed mode active');
    }

    // Adjust tone based on communication style
    if (profile.communicationStyle === 'formal') {
      enhancements.push('Formal tone applied');
    } else if (profile.communicationStyle === 'casual') {
      enhancements.push('Casual tone applied');
    }

    // Apply learned corrections
    const corrections = profile.preferences.correction_general || [];
    for (const correction of corrections.slice(-5)) {
      if (response.includes(correction.original)) {
        response = response.replace(correction.original, correction.corrected);
        enhancements.push('Applied learned correction');
      }
    }

    return { response, enhancements };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const learningEngine = new LearningEngine();
