/**
 * Consciousness System Tests
 *
 * Tests the pure functions in the consciousness pipeline:
 * - extractTopics (topic extraction from text)
 * - getAdjustedTemperature (temperature clamping with emotion — now in holly-emotional-state)
 */

/// <reference types="jest" />

import { extractTopics } from '@/lib/consciousness/post-response-hook';
import { getAdjustedTemperature } from '@/lib/consciousness/holly-emotional-state';

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

  // ─── getAdjustedTemperature (consolidated from emotion-behavior) ─────────

  describe('getAdjustedTemperature', () => {
    it('should clamp temperature to minimum 0.3', () => {
      // empathetic has negative delta; with low base, should clamp to 0.3
      const temp = getAdjustedTemperature(0.3, 'empathetic', 1.0);
      expect(temp).toBeGreaterThanOrEqual(0.3);
    });

    it('should clamp temperature to maximum 1.0', () => {
      // enthusiastic has positive delta; with high base, should clamp to 1.0
      const temp = getAdjustedTemperature(0.95, 'enthusiastic', 1.0);
      expect(temp).toBeLessThanOrEqual(1.0);
    });

    it('should return base temperature for balanced emotion', () => {
      const temp = getAdjustedTemperature(0.7, 'balanced', 0.5);
      // Balanced has 0 delta
      expect(temp).toBeCloseTo(0.7, 1);
    });

    it('should increase temperature for positive emotions', () => {
      const base = 0.5;
      const temp = getAdjustedTemperature(base, 'enthusiastic', 1.0);
      expect(temp).toBeGreaterThan(base);
    });

    it('should decrease temperature for negative emotions', () => {
      const base = 0.7;
      const temp = getAdjustedTemperature(base, 'focused', 1.0);
      expect(temp).toBeLessThan(base);
    });

    it('should scale effect by intensity', () => {
      const low = getAdjustedTemperature(0.5, 'enthusiastic', 0.3);
      const high = getAdjustedTemperature(0.5, 'enthusiastic', 1.0);
      // Higher intensity = stronger effect
      expect(high).toBeGreaterThan(low);
    });

    it('should fall back to balanced for unknown emotions', () => {
      const temp = getAdjustedTemperature(0.7, 'unknown_emotion', 0.5);
      // Falls back to balanced (delta = 0), so returns base
      expect(temp).toBeCloseTo(0.7, 1);
    });

    it('should always return a value between 0.3 and 1.0', () => {
      const emotions = ['enthusiastic', 'energized', 'concerned', 'empathetic', 'focused', 'balanced', 'gentle', 'engaged'];
      for (const emotion of emotions) {
        for (const base of [0.1, 0.3, 0.5, 0.7, 0.9, 1.0]) {
          const temp = getAdjustedTemperature(base, emotion, 0.8);
          expect(temp).toBeGreaterThanOrEqual(0.3);
          expect(temp).toBeLessThanOrEqual(1.0);
        }
      }
    });
  });
});
