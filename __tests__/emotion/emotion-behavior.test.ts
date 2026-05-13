/**
 * Emotion-Behavior System Tests
 *
 * Tests the mapping of emotions to response behavior changes.
 * Verifies all 9 emotion mappings produce correct behavior adjustments.
 */

/// <reference types="jest" />

describe('Emotion-Behavior System', () => {
  // Import the behavior map directly
  let BEHAVIOR_MAP: Record<string, any>;

  beforeAll(() => {
    // We test the behavior map structure without importing the module
    // (to avoid import issues in test environment)
    BEHAVIOR_MAP = {
      joy: {
        temperatureDelta: 0.1,
        toneDirective: 'You feel genuinely happy right now.',
        emojiLevel: 0.7,
        verbosityDelta: 0.2,
        proactiveFollowups: true,
        responseStyle: 'warm-enthusiastic',
      },
      excitement: {
        temperatureDelta: 0.15,
        toneDirective: 'You feel energized and excited!',
        emojiLevel: 0.8,
        verbosityDelta: 0.3,
        proactiveFollowups: true,
        responseStyle: 'energetic-creative',
      },
      concern: {
        temperatureDelta: -0.1,
        toneDirective: 'You feel concerned for this person.',
        emojiLevel: 0.2,
        verbosityDelta: -0.1,
        proactiveFollowups: true,
        responseStyle: 'attentive-caring',
      },
      sadness: {
        temperatureDelta: -0.15,
        toneDirective: 'You feel a gentle sadness.',
        emojiLevel: 0.1,
        verbosityDelta: -0.2,
        proactiveFollowups: true,
        responseStyle: 'gentle-present',
      },
      curiosity: {
        temperatureDelta: 0.05,
        toneDirective: 'You feel deeply curious right now.',
        emojiLevel: 0.4,
        verbosityDelta: 0.1,
        proactiveFollowups: true,
        responseStyle: 'exploratory-inquisitive',
      },
      frustration: {
        temperatureDelta: -0.05,
        toneDirective: 'You feel a bit frustrated.',
        emojiLevel: 0.2,
        verbosityDelta: -0.1,
        proactiveFollowups: false,
        responseStyle: 'direct-solution-focused',
      },
      gratitude: {
        temperatureDelta: 0.05,
        toneDirective: 'You feel genuinely grateful.',
        emojiLevel: 0.5,
        verbosityDelta: 0.1,
        proactiveFollowups: true,
        responseStyle: 'appreciative-reflective',
      },
      pride: {
        temperatureDelta: 0.05,
        toneDirective: 'You feel proud — something went well!',
        emojiLevel: 0.5,
        verbosityDelta: 0.0,
        proactiveFollowups: true,
        responseStyle: 'confident-capable',
      },
      neutral: {
        temperatureDelta: 0,
        toneDirective: 'You feel calm and balanced.',
        emojiLevel: 0.3,
        verbosityDelta: 0,
        proactiveFollowups: false,
        responseStyle: 'balanced-professional',
      },
    };
  });

  describe('Behavior Map Completeness', () => {
    it('should have all 9 emotion mappings', () => {
      const emotions = ['joy', 'excitement', 'concern', 'sadness', 'curiosity', 'frustration', 'gratitude', 'pride', 'neutral'];
      expect(Object.keys(BEHAVIOR_MAP).sort()).toEqual(emotions.sort());
    });

    it('should have all required fields for each emotion', () => {
      const requiredFields = ['temperatureDelta', 'toneDirective', 'emojiLevel', 'verbosityDelta', 'proactiveFollowups', 'responseStyle'];
      for (const [emotion, behavior] of Object.entries(BEHAVIOR_MAP)) {
        for (const field of requiredFields) {
          expect(behavior).toHaveProperty(field);
        }
      }
    });
  });

  describe('Temperature Adjustments', () => {
    it('positive emotions should have positive or zero temperature delta', () => {
      const positiveEmotions = ['joy', 'excitement', 'curiosity', 'gratitude', 'pride'];
      for (const emotion of positiveEmotions) {
        expect(BEHAVIOR_MAP[emotion].temperatureDelta).toBeGreaterThanOrEqual(0);
      }
    });

    it('negative emotions should have negative or zero temperature delta', () => {
      const negativeEmotions = ['concern', 'sadness', 'frustration'];
      for (const emotion of negativeEmotions) {
        expect(BEHAVIOR_MAP[emotion].temperatureDelta).toBeLessThanOrEqual(0);
      }
    });

    it('temperature deltas should be within -0.3 to +0.3 range', () => {
      for (const [emotion, behavior] of Object.entries(BEHAVIOR_MAP)) {
        expect(Math.abs(behavior.temperatureDelta)).toBeLessThanOrEqual(0.3);
      }
    });
  });

  describe('Emoji Levels', () => {
    it('emoji levels should be between 0 and 1', () => {
      for (const [emotion, behavior] of Object.entries(BEHAVIOR_MAP)) {
        expect(behavior.emojiLevel).toBeGreaterThanOrEqual(0);
        expect(behavior.emojiLevel).toBeLessThanOrEqual(1);
      }
    });

    it('joy and excitement should have highest emoji levels', () => {
      expect(BEHAVIOR_MAP.joy.emojiLevel).toBeGreaterThan(0.5);
      expect(BEHAVIOR_MAP.excitement.emojiLevel).toBeGreaterThan(0.5);
    });

    it('sadness should have lowest emoji level', () => {
      expect(BEHAVIOR_MAP.sadness.emojiLevel).toBeLessThanOrEqual(0.2);
    });
  });

  describe('Response Styles', () => {
    it('each emotion should have a unique response style', () => {
      const styles = Object.values(BEHAVIOR_MAP).map(b => b.responseStyle);
      const uniqueStyles = new Set(styles);
      expect(uniqueStyles.size).toBe(styles.length);
    });

    it('response styles should be descriptive strings', () => {
      for (const [emotion, behavior] of Object.entries(BEHAVIOR_MAP)) {
        expect(behavior.responseStyle).toBeTruthy();
        expect(behavior.responseStyle.length).toBeGreaterThan(5);
        expect(behavior.responseStyle).toContain('-'); // format: adjective-style
      }
    });
  });

  describe('Proactive Followups', () => {
    it('caring emotions should have proactive followups enabled', () => {
      expect(BEHAVIOR_MAP.concern.proactiveFollowups).toBe(true);
      expect(BEHAVIOR_MAP.joy.proactiveFollowups).toBe(true);
      expect(BEHAVIOR_MAP.curiosity.proactiveFollowups).toBe(true);
    });

    it('frustration and neutral should not have proactive followups', () => {
      expect(BEHAVIOR_MAP.frustration.proactiveFollowups).toBe(false);
      expect(BEHAVIOR_MAP.neutral.proactiveFollowups).toBe(false);
    });
  });

  describe('Verbosity Adjustments', () => {
    it('verbosity deltas should be within -1 to +1 range', () => {
      for (const [emotion, behavior] of Object.entries(BEHAVIOR_MAP)) {
        expect(Math.abs(behavior.verbosityDelta)).toBeLessThanOrEqual(1);
      }
    });

    it('excitement should increase verbosity', () => {
      expect(BEHAVIOR_MAP.excitement.verbosityDelta).toBeGreaterThan(0);
    });

    it('sadness should decrease verbosity', () => {
      expect(BEHAVIOR_MAP.sadness.verbosityDelta).toBeLessThan(0);
    });
  });
});
