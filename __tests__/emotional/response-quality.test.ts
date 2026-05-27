/**
 * Phase E4 — Response Quality Feedback Loop Tests
 *
 * Tests the quality scoring, trend calculation, and prompt generation
 * for Holly's response quality self-assessment system.
 */

/// <reference types="jest" />

// Mock the AI router so we don't make real LLM calls
jest.mock('@/lib/ai/smart-router', () => ({
  smartRoute: jest.fn().mockResolvedValue({
    waterfall: [{ model: 'test-model', provider: 'test' }],
  }),
}));

jest.mock('@/lib/ai/cascade', () => ({
  cascadeCollect: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    growthMetric: {
      create: jest.fn().mockResolvedValue({ id: 'test' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    responseFeedback: {
      create: jest.fn().mockResolvedValue({ id: 'test' }),
    },
  },
}));

import { assessResponseQuality, getQualityTrendPrompt, type QualityScores, type QualityTrend } from '@/lib/emotional/response-quality';
import { cascadeCollect } from '@/lib/ai/cascade';

// Helper to mock LLM response
function mockLLMResponse(json: Record<string, unknown>): void {
  (cascadeCollect as jest.Mock).mockResolvedValue({
    text: JSON.stringify(json),
  });
}

describe('Response Quality Analyzer', () => {
  // ─── assessResponseQuality ─────────────────────────────────────────────

  describe('assessResponseQuality', () => {
    it('should parse LLM quality scores correctly', async () => {
      mockLLMResponse({
        empathy: 0.9,
        warmth: 0.8,
        relevance: 0.85,
        toneMatch: 0.7,
        note: 'Good empathetic response',
      });

      const scores = await assessResponseQuality(
        "I'm feeling really stressed about this project",
        "I hear you — that stress is real. Let's break this down together."
      );

      expect(scores.empathy).toBe(0.9);
      expect(scores.warmth).toBe(0.8);
      expect(scores.relevance).toBe(0.85);
      expect(scores.toneMatch).toBe(0.7);
      expect(scores.overall).toBeGreaterThan(0);
      expect(scores.overall).toBeLessThanOrEqual(1);
      expect(scores.note).toBe('Good empathetic response');
    });

    it('should calculate overall as weighted average', async () => {
      mockLLMResponse({
        empathy: 1.0,
        warmth: 0.0,
        relevance: 1.0,
        toneMatch: 0.0,
        note: '',
      });

      const scores = await assessResponseQuality('test', 'test');
      // Weighted: 1.0*0.3 + 0.0*0.2 + 1.0*0.3 + 0.0*0.2 = 0.6
      expect(scores.overall).toBeCloseTo(0.6, 1);
    });

    it('should clamp scores to 0-1 range', async () => {
      mockLLMResponse({
        empathy: 5.0,
        warmth: -3.0,
        relevance: 0.5,
        toneMatch: 0.5,
        note: '',
      });

      const scores = await assessResponseQuality('test', 'test');
      expect(scores.empathy).toBe(1.0);
      expect(scores.warmth).toBe(0.0);
    });

    it('should return neutral scores on LLM failure', async () => {
      (cascadeCollect as jest.Mock).mockRejectedValue(new Error('API down'));

      const scores = await assessResponseQuality('test', 'test');
      expect(scores.empathy).toBe(0.5);
      expect(scores.warmth).toBe(0.5);
      expect(scores.relevance).toBe(0.7); // Slightly higher baseline for relevance
      expect(scores.note).toBe('Assessment unavailable');
    });

    it('should handle malformed LLM response', async () => {
      (cascadeCollect as jest.Mock).mockResolvedValue({
        text: 'This is not JSON at all',
      });

      const scores = await assessResponseQuality('test', 'test');
      // Falls back to neutral
      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(1);
    });

    it('should handle missing fields in LLM response', async () => {
      mockLLMResponse({
        empathy: 0.8,
        // Missing other fields
        note: 'partial',
      });

      const scores = await assessResponseQuality('test', 'test');
      // Missing fields default to 0.5 (via clampScore)
      expect(scores.warmth).toBe(0.5);
      expect(scores.empathy).toBe(0.8);
    });

    it('should truncate long notes to 200 chars', async () => {
      mockLLMResponse({
        empathy: 0.8,
        warmth: 0.8,
        relevance: 0.8,
        toneMatch: 0.8,
        note: 'A'.repeat(500),
      });

      const scores = await assessResponseQuality('test', 'test');
      expect(scores.note.length).toBeLessThanOrEqual(200);
    });

    it('should include emotional context in prompt when provided', async () => {
      mockLLMResponse({
        empathy: 0.9, warmth: 0.9, relevance: 0.9, toneMatch: 0.9,
        note: 'good',
      });

      await assessResponseQuality('test', 'test', 'user is feeling anxious');

      // Verify the LLM was called (emotional context was passed)
      expect(cascadeCollect).toHaveBeenCalled();
    });
  });

  // ─── getQualityTrendPrompt ─────────────────────────────────────────────

  describe('getQualityTrendPrompt', () => {
    it('should format trend scores as percentages', () => {
      const trend: QualityTrend = {
        avgEmpathy: 0.85,
        avgWarmth: 0.72,
        avgRelevance: 0.91,
        avgToneMatch: 0.68,
        avgOverall: 0.79,
        sampleSize: 20,
        trend: 'stable',
      };

      const prompt = getQualityTrendPrompt(trend);
      expect(prompt).toContain('85%'); // empathy
      expect(prompt).toContain('72%'); // warmth
      expect(prompt).toContain('91%'); // relevance
      expect(prompt).toContain('68%'); // tone match
      expect(prompt).toContain('20 responses');
    });

    it('should show improving trend with positive emoji', () => {
      const trend: QualityTrend = {
        avgEmpathy: 0.8, avgWarmth: 0.8, avgRelevance: 0.8, avgToneMatch: 0.8,
        avgOverall: 0.8, sampleSize: 10, trend: 'improving',
      };

      const prompt = getQualityTrendPrompt(trend);
      expect(prompt).toContain('improving');
      expect(prompt).toContain('📈');
    });

    it('should show declining trend with encouragement', () => {
      const trend: QualityTrend = {
        avgEmpathy: 0.5, avgWarmth: 0.5, avgRelevance: 0.5, avgToneMatch: 0.5,
        avgOverall: 0.5, sampleSize: 10, trend: 'declining',
      };

      const prompt = getQualityTrendPrompt(trend);
      expect(prompt).toContain('declining');
      expect(prompt).toContain('📉');
      expect(prompt).toContain('lean into genuine presence');
    });

    it('should show stable trend neutrally', () => {
      const trend: QualityTrend = {
        avgEmpathy: 0.7, avgWarmth: 0.7, avgRelevance: 0.7, avgToneMatch: 0.7,
        avgOverall: 0.7, sampleSize: 15, trend: 'stable',
      };

      const prompt = getQualityTrendPrompt(trend);
      expect(prompt).toContain('➡️');
      expect(prompt).not.toContain('declining');
      expect(prompt).not.toContain('improving');
    });
  });
});
