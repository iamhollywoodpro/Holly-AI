/**
 * Consciousness System Tests
 *
 * Tests the pure functions in the consciousness pipeline:
 * - extractTopics (topic extraction from text)
 * - getEmotionalBehavior (emotion → behavior mapping)
 * - getAdjustedTemperature (temperature clamping with emotion)
 * - getEmotionBehaviorPrompt (prompt injection generation)
 */

/// <reference types="jest" />

import { extractTopics } from '@/lib/consciousness/post-response-hook';
import {
  getEmotionalBehavior,
  getAdjustedTemperature,
  getEmotionBehaviorPrompt,
} from '@/lib/consciousness/emotion-behavior';

describe('Consciousness System', () => {
  // ─── extractTopics ────────────────────────────────────────────────────────

  describe('extractTopics', () => {
    it('should extract meaningful words longer than 4 chars', () => {
      const topics = extractTopics('I want to discuss artificial intelligence and machine learning');
      expect(topics).toContain('artificial');
      expect(topics).toContain('intelligence');
      expect(topics).toContain('machine');
      expect(topics).toContain('learning');
    });

    it('should filter out stop words', () => {
      const topics = extractTopics('please help me with this code');
      // All words are ≤4 chars or stop words
      expect(topics).not.toContain('please');
      expect(topics).not.toContain('help');
      expect(topics).toHaveLength(0);
    });

    it('should filter out words with 4 or fewer characters', () => {
      const topics = extractTopics('code test run npm fast');
      expect(topics).toHaveLength(0); // all ≤4 chars
    });

    it('should keep words with exactly 5 characters', () => {
      const topics = extractTopics('music tracks audio');
      expect(topics).toContain('music');
      expect(topics).toContain('tracks');
      expect(topics).toContain('audio');
    });

    it('should limit to 8 topics maximum', () => {
      const text = Array.from({ length: 15 }, (_, i) => `keyword${i}`).join(' ');
      const topics = extractTopics(text);
      expect(topics.length).toBeLessThanOrEqual(8);
    });

    it('should handle empty string', () => {
      const topics = extractTopics('');
      expect(topics).toEqual([]);
    });

    it('should handle text with only punctuation', () => {
      const topics = extractTopics('!@#$%^&*()_+-=[]{}|;:,.<>?');
      expect(topics).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const topics = extractTopics('JavaScript TYPESCRIPT Programming');
      expect(topics).toContain('javascript');
      expect(topics).toContain('typescript');
      expect(topics).toContain('programming');
    });

    it('should strip punctuation from words', () => {
      const topics = extractTopics("Holly's code-review: check!");
      // "Holly's" → "holly" (5 chars) + "s" (1 char, filtered)
      expect(topics).toContain('holly');
      // "code-review" → "code" (4 chars, filtered) + "review" (6 chars)
      expect(topics).toContain('review');
      expect(topics).toContain('check');
    });
  });

  // ─── getEmotionalBehavior ─────────────────────────────────────────────────

  describe('getEmotionalBehavior', () => {
    it('should return behavior for known emotions', () => {
      const behavior = getEmotionalBehavior('joy', 0.8);
      expect(behavior).toHaveProperty('temperatureDelta');
      expect(behavior).toHaveProperty('toneDirective');
      expect(behavior).toHaveProperty('emojiLevel');
      expect(behavior).toHaveProperty('verbosityDelta');
      expect(behavior).toHaveProperty('proactiveFollowups');
      expect(behavior).toHaveProperty('responseStyle');
    });

    it('should fall back to neutral for unknown emotions', () => {
      const behavior = getEmotionalBehavior('confusion', 0.5);
      // Falls back to neutral behavior map entry
      expect(behavior.proactiveFollowups).toBe(false);
      expect(behavior.temperatureDelta).toBe(0);
    });

    it('should scale temperature delta by intensity', () => {
      const low = getEmotionalBehavior('joy', 0.3);
      const high = getEmotionalBehavior('joy', 1.0);
      // Higher intensity should produce stronger effect
      expect(Math.abs(high.temperatureDelta)).toBeGreaterThanOrEqual(Math.abs(low.temperatureDelta));
    });

    it('should clamp intensity scale between 0.3 and 1.0', () => {
      const veryLow = getEmotionalBehavior('joy', 0.01);
      const veryHigh = getEmotionalBehavior('joy', 5.0);
      // Both should produce valid (non-NaN, finite) results
      expect(veryLow.temperatureDelta).not.toBeNaN();
      expect(veryHigh.temperatureDelta).not.toBeNaN();
      expect(isFinite(veryLow.temperatureDelta)).toBe(true);
      expect(isFinite(veryHigh.temperatureDelta)).toBe(true);
    });

    it('should be case-insensitive for emotion name', () => {
      const lower = getEmotionalBehavior('joy', 0.5);
      const upper = getEmotionalBehavior('JOY', 0.5);
      expect(lower.temperatureDelta).toBe(upper.temperatureDelta);
      expect(lower.responseStyle).toBe(upper.responseStyle);
    });

    it('should handle whitespace in emotion name', () => {
      const behavior = getEmotionalBehavior('  joy  ', 0.5);
      expect(behavior.responseStyle).toBe('warm-enthusiastic');
    });

    it('should preserve tone directive regardless of intensity', () => {
      const behavior = getEmotionalBehavior('sadness', 0.1);
      expect(behavior.toneDirective).toBeTruthy();
      expect(behavior.toneDirective.length).toBeGreaterThan(5);
    });
  });

  // ─── getAdjustedTemperature ───────────────────────────────────────────────

  describe('getAdjustedTemperature', () => {
    it('should clamp temperature to minimum 0.3', () => {
      // sadness has negative delta; with low base, should clamp to 0.3
      const temp = getAdjustedTemperature(0.3, 'sadness', 1.0);
      expect(temp).toBeGreaterThanOrEqual(0.3);
    });

    it('should clamp temperature to maximum 1.0', () => {
      // excitement has positive delta; with high base, should clamp to 1.0
      const temp = getAdjustedTemperature(0.95, 'excitement', 1.0);
      expect(temp).toBeLessThanOrEqual(1.0);
    });

    it('should return base temperature for neutral emotion', () => {
      const temp = getAdjustedTemperature(0.7, 'neutral', 0.5);
      // Neutral has 0 delta, so should be close to base
      expect(temp).toBeCloseTo(0.7, 1);
    });

    it('should increase temperature for positive emotions', () => {
      const base = 0.5;
      const temp = getAdjustedTemperature(base, 'excitement', 1.0);
      expect(temp).toBeGreaterThan(base);
    });

    it('should decrease temperature for negative emotions', () => {
      const base = 0.7;
      const temp = getAdjustedTemperature(base, 'sadness', 1.0);
      expect(temp).toBeLessThan(base);
    });

    it('should always return a value between 0.3 and 1.0', () => {
      const emotions = ['joy', 'excitement', 'concern', 'sadness', 'curiosity', 'frustration', 'gratitude', 'pride', 'neutral'];
      for (const emotion of emotions) {
        for (const base of [0.1, 0.3, 0.5, 0.7, 0.9, 1.0]) {
          const temp = getAdjustedTemperature(base, emotion, 0.8);
          expect(temp).toBeGreaterThanOrEqual(0.3);
          expect(temp).toBeLessThanOrEqual(1.0);
        }
      }
    });
  });

  // ─── getEmotionBehaviorPrompt ─────────────────────────────────────────────

  describe('getEmotionBehaviorPrompt', () => {
    it('should include the emotion name in uppercase', () => {
      const prompt = getEmotionBehaviorPrompt('joy', 0.8, 0.5);
      expect(prompt).toContain('JOY');
    });

    it('should include the tone directive', () => {
      const prompt = getEmotionBehaviorPrompt('joy', 0.8, 0.5);
      expect(prompt).toContain('happy');
    });

    it('should include emoji instruction for high emojiLevel emotions', () => {
      // joy has emojiLevel 0.7, with intensity 1.0 → 0.7 > 0.5
      const prompt = getEmotionBehaviorPrompt('joy', 1.0, 0.5);
      expect(prompt).toContain('emoji');
    });

    it('should include minimal emoji instruction for low emojiLevel emotions', () => {
      // sadness has emojiLevel 0.1, with intensity 1.0 → 0.1 < 0.2
      const prompt = getEmotionBehaviorPrompt('sadness', 1.0, -0.5);
      expect(prompt).toContain('minimal');
    });

    it('should include proactive followup for caring emotions', () => {
      const prompt = getEmotionBehaviorPrompt('concern', 0.8, -0.3);
      expect(prompt).toContain('follow-up');
    });

    it('should not include proactive followup for frustration', () => {
      const prompt = getEmotionBehaviorPrompt('frustration', 0.8, -0.3);
      expect(prompt).not.toContain('follow-up');
    });

    it('should return a non-empty string', () => {
      const prompt = getEmotionBehaviorPrompt('neutral', 0.5, 0);
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});
