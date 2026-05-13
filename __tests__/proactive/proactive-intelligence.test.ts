/**
 * Proactive Intelligence System — Tests
 *
 * Tests pattern detection, insight generation, cooldown management,
 * engagement scoring, and morning briefing generation.
 */

import {
  detectTopicPatterns,
  detectEmotionalPatterns,
  detectSchedulePatterns,
  calculateEngagementScore,
  determinePreferredTime,
  generateInsightFromPattern,
  generateMorningBriefing,
  canDeliverProactive,
  recordDelivery,
  prioritizeInsights,
  filterViableInsights,
  DEFAULT_PROACTIVE_CONFIG,
  type CooldownState,
  type UserPattern,
} from '@/lib/proactive/proactive-engine';

// ─── Pattern Detection ──────────────────────────────────────────────────────

describe('Proactive Intelligence System', () => {
  // ── Topic Pattern Detection ──────────────────────────────────────────────

  describe('detectTopicPatterns', () => {
    it('should detect recurring topics', () => {
      const topics = ['music', 'coding', 'music', 'philosophy', 'music', 'coding'];
      const patterns = detectTopicPatterns(topics);

      expect(patterns.length).toBeGreaterThanOrEqual(2);
      expect(patterns[0].pattern).toBe('music'); // most frequent
      expect(patterns[0].frequency).toBe(3);
      expect(patterns[0].type).toBe('topic');
    });

    it('should not detect patterns for topics appearing only once', () => {
      const topics = ['music', 'coding', 'philosophy', 'art'];
      const patterns = detectTopicPatterns(topics);
      expect(patterns).toHaveLength(0);
    });

    it('should normalize topic case', () => {
      const topics = ['Music', 'music', 'MUSIC'];
      const patterns = detectTopicPatterns(topics);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe(3);
    });

    it('should sort by frequency descending', () => {
      const topics = ['a', 'b', 'a', 'b', 'a', 'c', 'c'];
      const patterns = detectTopicPatterns(topics);
      expect(patterns[0].pattern).toBe('a');
      expect(patterns[1].pattern).toBe('b');
    });

    it('should return empty for empty input', () => {
      expect(detectTopicPatterns([])).toHaveLength(0);
    });
  });

  // ── Emotional Pattern Detection ──────────────────────────────────────────

  describe('detectEmotionalPatterns', () => {
    it('should detect dominant emotions', () => {
      const emotions = ['joy', 'joy', 'joy', 'sadness', 'joy', 'joy', 'sadness', 'joy'];
      const patterns = detectEmotionalPatterns(emotions);
      const joyPattern = patterns.find(p => p.pattern === 'frequent_joy');
      expect(joyPattern).toBeDefined();
      expect(joyPattern!.confidence).toBeGreaterThan(0);
    });

    it('should detect sustained negative mood', () => {
      const emotions = ['frustration', 'sadness', 'anxiety', 'anger', 'fear'];
      const patterns = detectEmotionalPatterns(emotions);
      const stressPattern = patterns.find(p => p.pattern === 'sustained_negative_mood');
      expect(stressPattern).toBeDefined();
      expect(stressPattern!.frequency).toBe(5);
    });

    it('should not detect negative mood for mixed emotions', () => {
      const emotions = ['joy', 'sadness', 'joy', 'frustration', 'joy'];
      const patterns = detectEmotionalPatterns(emotions);
      const stressPattern = patterns.find(p => p.pattern === 'sustained_negative_mood');
      expect(stressPattern).toBeUndefined();
    });

    it('should not detect patterns for too few emotions', () => {
      const emotions = ['joy', 'joy', 'sadness'];
      const patterns = detectEmotionalPatterns(emotions);
      // 3 emotions with 2 joy = 0.67 ratio > 0.3, but total < 5
      const joyPattern = patterns.find(p => p.pattern === 'frequent_joy');
      expect(joyPattern).toBeUndefined();
    });

    it('should return empty for empty input', () => {
      expect(detectEmotionalPatterns([])).toHaveLength(0);
    });
  });

  // ── Schedule Pattern Detection ───────────────────────────────────────────

  describe('detectSchedulePatterns', () => {
    it('should detect morning preference', () => {
      const hours = [8, 9, 10, 7, 9, 11, 8]; // all morning
      const patterns = detectSchedulePatterns(hours);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('active_morning');
    });

    it('should detect night preference', () => {
      const hours = [22, 23, 0, 1, 23, 22, 3];
      const patterns = detectSchedulePatterns(hours);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('active_night');
    });

    it('should not detect pattern for varied schedule', () => {
      const hours = [8, 14, 20, 2, 10, 16]; // spread across all periods
      const patterns = detectSchedulePatterns(hours);
      expect(patterns).toHaveLength(0);
    });

    it('should require minimum 3 sessions', () => {
      const hours = [9, 9];
      const patterns = detectSchedulePatterns(hours);
      expect(patterns).toHaveLength(0);
    });
  });

  // ── Engagement Scoring ───────────────────────────────────────────────────

  describe('calculateEngagementScore', () => {
    it('should return high score for daily active user', () => {
      const score = calculateEngagementScore(7, 25, 14);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return low score for infrequent user', () => {
      const score = calculateEngagementScore(1, 3, 0);
      expect(score).toBeLessThan(0.3);
    });

    it('should cap individual components at 1.0', () => {
      const score = calculateEngagementScore(14, 50, 30);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should weight sessions most heavily', () => {
      const sessionHeavy = calculateEngagementScore(7, 5, 0);
      const messageHeavy = calculateEngagementScore(2, 20, 0);
      expect(sessionHeavy).toBeGreaterThan(messageHeavy);
    });
  });

  // ── Preferred Time Detection ─────────────────────────────────────────────

  describe('determinePreferredTime', () => {
    it('should detect morning preference', () => {
      expect(determinePreferredTime([8, 9, 10, 7])).toBe('morning');
    });

    it('should detect evening preference', () => {
      expect(determinePreferredTime([18, 19, 20])).toBe('evening');
    });

    it('should return varied for no dominant period', () => {
      expect(determinePreferredTime([9, 14, 20, 2])).toBe('varied');
    });

    it('should return varied for empty input', () => {
      expect(determinePreferredTime([])).toBe('varied');
    });
  });

  // ── Insight Generation ───────────────────────────────────────────────────

  describe('generateInsightFromPattern', () => {
    it('should generate emotional support for sustained negative mood', () => {
      const pattern: UserPattern = {
        type: 'emotion',
        pattern: 'sustained_negative_mood',
        frequency: 4,
        lastSeen: Date.now(),
        confidence: 0.8,
        metadata: {},
      };
      const insight = generateInsightFromPattern(pattern, 'Steve');
      expect(insight).not.toBeNull();
      expect(insight!.type).toBe('emotional_support');
      expect(insight!.priority).toBe('high');
      expect(insight!.message).toContain('Steve');
    });

    it('should generate wellness check for frequent emotion', () => {
      const pattern: UserPattern = {
        type: 'emotion',
        pattern: 'frequent_sadness',
        frequency: 6,
        lastSeen: Date.now(),
        confidence: 0.7,
        metadata: {},
      };
      const insight = generateInsightFromPattern(pattern, 'Alex');
      expect(insight).not.toBeNull();
      expect(insight!.type).toBe('wellness_check');
      expect(insight!.message).toContain('sadness');
    });

    it('should generate learning suggestion for topic patterns', () => {
      const pattern: UserPattern = {
        type: 'topic',
        pattern: 'machine learning',
        frequency: 5,
        lastSeen: Date.now(),
        confidence: 0.6,
        metadata: {},
      };
      const insight = generateInsightFromPattern(pattern);
      expect(insight).not.toBeNull();
      expect(insight!.type).toBe('learning_suggestion');
      expect(insight!.message).toContain('machine learning');
    });

    it('should generate efficiency tip for schedule patterns', () => {
      const pattern: UserPattern = {
        type: 'schedule',
        pattern: 'active_evening',
        frequency: 8,
        lastSeen: Date.now(),
        confidence: 0.75,
        metadata: {},
      };
      const insight = generateInsightFromPattern(pattern);
      expect(insight).not.toBeNull();
      expect(insight!.type).toBe('efficiency_tip');
      expect(insight!.message).toContain('evening');
    });

    it('should return null for unrecognized pattern', () => {
      const pattern: UserPattern = {
        type: 'behavior',
        pattern: 'unknown_pattern',
        frequency: 1,
        lastSeen: Date.now(),
        confidence: 0.5,
        metadata: {},
      };
      expect(generateInsightFromPattern(pattern)).toBeNull();
    });
  });

  // ── Morning Briefing ─────────────────────────────────────────────────────

  describe('generateMorningBriefing', () => {
    it('should include topics when available', () => {
      const briefing = generateMorningBriefing('Steve', ['music', 'coding', 'AI'], 2, 5);
      expect(briefing.type).toBe('morning_briefing');
      expect(briefing.message).toContain('Steve');
      expect(briefing.message).toContain('music');
      expect(briefing.message).toContain('2 active goals');
      expect(briefing.message).toContain('5-day streak');
    });

    it('should work with no topics or goals', () => {
      const briefing = generateMorningBriefing('Alex', [], 0, 0);
      expect(briefing.message).toContain('Alex');
      expect(briefing.message).toContain('Ready for a new day');
    });

    it('should have correct expiration', () => {
      const briefing = generateMorningBriefing('Test', [], 0, 0);
      expect(briefing.expiresAt - briefing.createdAt).toBe(6 * 60 * 60 * 1000);
    });

    it('should have high confidence', () => {
      const briefing = generateMorningBriefing('Test', ['ai'], 1, 1);
      expect(briefing.confidence).toBe(0.9);
    });
  });

  // ── Cooldown Management ──────────────────────────────────────────────────

  describe('canDeliverProactive', () => {
    it('should allow delivery when no previous messages', () => {
      const state: CooldownState = { lastDeliveredAt: 0, deliveredToday: 0, dayStart: Date.now() };
      const result = canDeliverProactive(state);
      expect(result.allowed).toBe(true);
    });

    it('should block delivery during cooldown', () => {
      const state: CooldownState = {
        lastDeliveredAt: Date.now() - 1000, // 1 second ago
        deliveredToday: 0,
        dayStart: Date.now(),
      };
      const result = canDeliverProactive(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cooldown');
    });

    it('should allow delivery after cooldown expires', () => {
      const state: CooldownState = {
        lastDeliveredAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
        deliveredToday: 0,
        dayStart: Date.now(),
      };
      const result = canDeliverProactive(state);
      expect(result.allowed).toBe(true);
    });

    it('should block delivery when daily limit reached', () => {
      const state: CooldownState = {
        lastDeliveredAt: Date.now() - 5 * 60 * 60 * 1000,
        deliveredToday: 3,
        dayStart: Date.now(),
      };
      const result = canDeliverProactive(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily limit');
    });

    it('should reset daily counter on new day', () => {
      const yesterday = Date.now() - 25 * 60 * 60 * 1000;
      const state: CooldownState = {
        lastDeliveredAt: yesterday,
        deliveredToday: 3,
        dayStart: yesterday,
      };
      const result = canDeliverProactive(state);
      // Day resets, but lastDeliveredAt is still yesterday so cooldown passed
      expect(result.allowed).toBe(true);
      expect(state.deliveredToday).toBe(0);
    });
  });

  describe('recordDelivery', () => {
    it('should update lastDeliveredAt and increment counter', () => {
      const state: CooldownState = { lastDeliveredAt: 0, deliveredToday: 0, dayStart: Date.now() };
      recordDelivery(state);
      expect(state.lastDeliveredAt).toBeGreaterThan(0);
      expect(state.deliveredToday).toBe(1);
    });
  });

  // ── Insight Prioritization ───────────────────────────────────────────────

  describe('prioritizeInsights', () => {
    const baseInsight = {
      id: 'test',
      title: 'Test',
      message: 'Test message',
      triggerReason: 'test',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      delivered: false,
    };

    it('should sort by priority (high > medium > low)', () => {
      const insights = [
        { ...baseInsight, id: '1', priority: 'low' as const, confidence: 0.9, type: 'curiosity_share' as const },
        { ...baseInsight, id: '2', priority: 'high' as const, confidence: 0.5, type: 'emotional_support' as const },
        { ...baseInsight, id: '3', priority: 'medium' as const, confidence: 0.8, type: 'wellness_check' as const },
      ];
      const sorted = prioritizeInsights(insights);
      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });

    it('should sort by confidence when priority is equal', () => {
      const insights = [
        { ...baseInsight, id: '1', priority: 'medium' as const, confidence: 0.5, type: 'wellness_check' as const },
        { ...baseInsight, id: '2', priority: 'medium' as const, confidence: 0.9, type: 'learning_suggestion' as const },
      ];
      const sorted = prioritizeInsights(insights);
      expect(sorted[0].confidence).toBe(0.9);
    });

    it('should filter out delivered insights', () => {
      const insights = [
        { ...baseInsight, id: '1', priority: 'high' as const, confidence: 0.9, type: 'emotional_support' as const, delivered: true },
        { ...baseInsight, id: '2', priority: 'low' as const, confidence: 0.5, type: 'curiosity_share' as const, delivered: false },
      ];
      const sorted = prioritizeInsights(insights);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('2');
    });

    it('should filter out expired insights', () => {
      const insights = [
        { ...baseInsight, id: '1', priority: 'high' as const, confidence: 0.9, type: 'emotional_support' as const, expiresAt: Date.now() - 1000 },
      ];
      const sorted = prioritizeInsights(insights);
      expect(sorted).toHaveLength(0);
    });
  });

  // ── Viable Insight Filtering ─────────────────────────────────────────────

  describe('filterViableInsights', () => {
    const baseInsight = {
      id: 'test',
      title: 'Test',
      message: 'Test message',
      triggerReason: 'test',
      priority: 'medium' as const,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      delivered: false,
    };

    it('should filter insights below confidence threshold', () => {
      const insights = [
        { ...baseInsight, id: '1', confidence: 0.3, type: 'curiosity_share' as const },
        { ...baseInsight, id: '2', confidence: 0.8, type: 'learning_suggestion' as const },
      ];
      const viable = filterViableInsights(insights);
      expect(viable).toHaveLength(1);
      expect(viable[0].confidence).toBe(0.8);
    });

    it('should respect custom config threshold', () => {
      const insights = [
        { ...baseInsight, id: '1', confidence: 0.5, type: 'curiosity_share' as const },
      ];
      const viable = filterViableInsights(insights, { ...DEFAULT_PROACTIVE_CONFIG, minConfidence: 0.4 });
      expect(viable).toHaveLength(1);
    });
  });

  // ── Integration: Full Pipeline ───────────────────────────────────────────

  describe('Full Proactive Pipeline', () => {
    it('should detect patterns, generate insights, and respect cooldowns', () => {
      // Step 1: Detect emotional patterns (high confidence)
      const emotionalPatterns = detectEmotionalPatterns(
        ['frustration', 'sadness', 'anxiety', 'anger', 'fear', 'frustration', 'sadness'],
      );
      const stressPattern = emotionalPatterns.find(p => p.pattern === 'sustained_negative_mood');
      expect(stressPattern).toBeDefined();

      // Step 2: Generate insight
      const insight = generateInsightFromPattern(stressPattern!, 'Steve');
      expect(insight).not.toBeNull();
      expect(insight!.confidence).toBeGreaterThan(0);

      // Step 3: Check cooldown
      const state: CooldownState = { lastDeliveredAt: 0, deliveredToday: 0, dayStart: Date.now() };
      const canDeliver = canDeliverProactive(state);
      expect(canDeliver.allowed).toBe(true);

      // Step 4: Filter viable (use lower threshold for emotional insights)
      const viable = filterViableInsights([insight!], { ...DEFAULT_PROACTIVE_CONFIG, minConfidence: 0.3 });
      expect(viable.length).toBeGreaterThan(0);

      // Step 5: Prioritize
      const prioritized = prioritizeInsights(viable);
      expect(prioritized[0]).toBeDefined();
    });
  });
});
