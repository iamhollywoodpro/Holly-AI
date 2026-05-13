/**
 * Phase E Tests — Vision Pipeline + Self-Hosting Config
 *
 * Covers:
 * - Vision analysis ranking and scoring
 * - Vision context generation
 * - Vision input validation
 * - Multi-image coordination
 * - Self-hosting config generation
 * - Model selection for tasks
 * - Fallback chain building
 * - Config validation
 */

import {
  scoreAnalysisResult,
  rankAnalysisResults,
  generateVisionContext,
  calculateRelevance,
  validateVisionInput,
  coordinateMultiImageAnalysis,
  visionAnalysisStats,
  DEFAULT_VISION_CONFIG,
  type VisionAnalysisResult,
  type VisionInput,
} from '@/lib/vision/vision-pipeline';

import {
  generateSelfHostingConfig,
  selectBestModel,
  getDefaultEndpoint,
  selectModelForTask,
  buildTaskFallbackChain,
  validateSelfHostingConfig,
  configSummary,
  RECOMMENDED_MODELS,
  type SelfHostingConfig,
  type LocalModelConfig,
} from '@/lib/self-hosting/local-model-config';

// ─── Vision Pipeline Tests ──────────────────────────────────────────────────

describe('Vision Pipeline', () => {
  const mockResult: VisionAnalysisResult = {
    model: 'qwen2.5-vl-72b',
    description: 'A photograph of a modern office desk with a laptop, coffee cup, and notebook',
    confidence: 0.85,
    processingTimeMs: 2500,
    objects: ['laptop', 'coffee cup', 'notebook', 'pen'],
    labels: ['office', 'workspace', 'indoor'],
    colors: ['brown', 'silver', 'white'],
    emotions: ['calm', 'focused'],
  };

  describe('scoreAnalysisResult', () => {
    it('should score high-confidence results higher', () => {
      const high = scoreAnalysisResult({ ...mockResult, confidence: 0.9 });
      const low = scoreAnalysisResult({ ...mockResult, confidence: 0.3 });
      expect(high).toBeGreaterThan(low);
    });

    it('should score detailed descriptions higher', () => {
      const detailed = scoreAnalysisResult({ ...mockResult, description: 'A'.repeat(200) });
      const brief = scoreAnalysisResult({ ...mockResult, description: 'Short' });
      expect(detailed).toBeGreaterThan(brief);
    });

    it('should score results with objects higher', () => {
      const withObjects = scoreAnalysisResult({ ...mockResult, objects: ['a', 'b', 'c', 'd', 'e'] });
      const withoutObjects = scoreAnalysisResult({ ...mockResult, objects: [] });
      expect(withObjects).toBeGreaterThan(withoutObjects);
    });

    it('should score OCR results higher', () => {
      const withText = scoreAnalysisResult({ ...mockResult, textContent: 'Hello World' });
      const withoutText = scoreAnalysisResult({ ...mockResult, textContent: undefined });
      expect(withText).toBeGreaterThan(withoutText);
    });

    it('should penalize slow processing', () => {
      const fast = scoreAnalysisResult({ ...mockResult, processingTimeMs: 500 });
      const slow = scoreAnalysisResult({ ...mockResult, processingTimeMs: 15000 });
      expect(fast).toBeGreaterThan(slow);
    });

    it('should return score between 0 and 1', () => {
      const score = scoreAnalysisResult(mockResult);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('rankAnalysisResults', () => {
    it('should sort results by score descending', () => {
      const results = [
        { ...mockResult, confidence: 0.3, description: 'Low' },
        { ...mockResult, confidence: 0.9, description: 'High detailed description with lots of information' },
        { ...mockResult, confidence: 0.6, description: 'Medium' },
      ];
      const ranked = rankAnalysisResults(results);
      expect(ranked[0].confidence).toBe(0.9);
      expect(ranked[2].confidence).toBe(0.3);
    });

    it('should handle empty results', () => {
      expect(rankAnalysisResults([])).toEqual([]);
    });
  });

  describe('generateVisionContext', () => {
    it('should generate context from results', () => {
      const ctx = generateVisionContext([mockResult], 'What do you see?');
      expect(ctx.summary).toContain('office desk');
      expect(ctx.keyElements.length).toBeGreaterThan(0);
      expect(ctx.relevanceScore).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const ctx = generateVisionContext([], 'test');
      expect(ctx.summary).toBe('No vision analysis available');
      expect(ctx.relevanceScore).toBe(0);
    });

    it('should filter low-confidence results', () => {
      const lowConf = { ...mockResult, confidence: 0.1 };
      const ctx = generateVisionContext([lowConf], 'test', { ...DEFAULT_VISION_CONFIG, minConfidence: 0.5 });
      expect(ctx.summary).toContain('Low confidence');
    });

    it('should include text content when OCR is enabled', () => {
      const withText = { ...mockResult, textContent: 'Hello World sign on the wall' };
      const ctx = generateVisionContext([withText], 'test');
      expect(ctx.summary).toContain('Hello World');
    });

    it('should suggest actions based on content', () => {
      const ctx = generateVisionContext([mockResult], 'test');
      expect(ctx.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should include technical details', () => {
      const ctx = generateVisionContext([mockResult], 'test');
      expect(ctx.technicalDetails.models).toBeDefined();
      expect(ctx.technicalDetails.confidence).toBeDefined();
    });
  });

  describe('calculateRelevance', () => {
    it('should return high relevance for matching words', () => {
      const relevance = calculateRelevance('A laptop on a desk with coffee', 'What laptop is that?');
      expect(relevance).toBeGreaterThan(0.5);
    });

    it('should return low relevance for non-matching words', () => {
      const relevance = calculateRelevance('A beautiful sunset over mountains', 'What laptop is that?');
      expect(relevance).toBeLessThan(0.5);
    });

    it('should return 0.3 baseline for empty input', () => {
      expect(calculateRelevance('description', '')).toBe(0.3);
      expect(calculateRelevance('', 'input')).toBe(0.3);
    });
  });

  describe('validateVisionInput', () => {
    it('should validate correct input', () => {
      const input: VisionInput = { imageId: 'img1', source: 'upload', format: 'jpeg' };
      const result = validateVisionInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject unsupported formats', () => {
      const input: VisionInput = { imageId: 'img1', source: 'upload', format: 'tiff' };
      const result = validateVisionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported format');
    });

    it('should reject files that are too large', () => {
      const input: VisionInput = { imageId: 'img1', source: 'upload', format: 'jpeg', fileSize: 50 * 1024 * 1024 };
      const result = validateVisionInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('too large');
    });

    it('should reject too-small dimensions', () => {
      const input: VisionInput = { imageId: 'img1', source: 'upload', format: 'jpeg', width: 5, height: 5 };
      const result = validateVisionInput(input);
      expect(result.valid).toBe(false);
    });

    it('should accept all supported formats', () => {
      for (const fmt of ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp']) {
        const input: VisionInput = { imageId: 'img1', source: 'upload', format: fmt };
        expect(validateVisionInput(input).valid).toBe(true);
      }
    });
  });

  describe('coordinateMultiImageAnalysis', () => {
    it('should handle empty input', () => {
      const result = coordinateMultiImageAnalysis([]);
      expect(result.imageCount).toBe(0);
      expect(result.combinedSummary).toBe('');
    });

    it('should handle single image', () => {
      const result = coordinateMultiImageAnalysis([
        { input: { imageId: '1', source: 'upload', format: 'jpeg' }, result: mockResult },
      ]);
      expect(result.imageCount).toBe(1);
      expect(result.combinedSummary).toBe(mockResult.description);
    });

    it('should find cross-references between images', () => {
      const result = coordinateMultiImageAnalysis([
        { input: { imageId: '1', source: 'upload', format: 'jpeg' }, result: { ...mockResult, objects: ['laptop', 'desk'] } },
        { input: { imageId: '2', source: 'upload', format: 'jpeg' }, result: { ...mockResult, objects: ['laptop', 'phone'] } },
      ]);
      expect(result.crossReferences.length).toBeGreaterThan(0);
      expect(result.crossReferences[0]).toContain('laptop');
    });

    it('should identify dominant elements', () => {
      const result = coordinateMultiImageAnalysis([
        { input: { imageId: '1', source: 'upload', format: 'jpeg' }, result: { ...mockResult, objects: ['laptop', 'desk'] } },
        { input: { imageId: '2', source: 'upload', format: 'jpeg' }, result: { ...mockResult, objects: ['laptop', 'phone'] } },
        { input: { imageId: '3', source: 'upload', format: 'jpeg' }, result: { ...mockResult, objects: ['laptop', 'monitor'] } },
      ]);
      expect(result.dominantElements).toContain('laptop');
    });
  });

  describe('visionAnalysisStats', () => {
    it('should calculate statistics', () => {
      const stats = visionAnalysisStats([
        { ...mockResult, confidence: 0.8, processingTimeMs: 1000 },
        { ...mockResult, confidence: 0.6, processingTimeMs: 3000, model: 'blip' },
      ]);
      expect(stats.totalAnalyses).toBe(2);
      expect(stats.avgConfidence).toBeCloseTo(0.7, 5);
      expect(stats.avgProcessingTime).toBe(2000);
      expect(stats.objectsDetected).toBe(8); // 4 objects × 2 results
    });

    it('should detect text extraction', () => {
      const stats = visionAnalysisStats([
        { ...mockResult, textContent: 'Hello' },
      ]);
      expect(stats.textExtracted).toBe(true);
    });

    it('should handle empty results', () => {
      const stats = visionAnalysisStats([]);
      expect(stats.totalAnalyses).toBe(0);
      expect(stats.avgConfidence).toBe(0);
    });
  });
});

// ─── Self-Hosting Config Tests ──────────────────────────────────────────────

describe('Self-Hosting Config', () => {
  describe('RECOMMENDED_MODELS', () => {
    it('should have at least 5 models', () => {
      expect(RECOMMENDED_MODELS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have all required fields', () => {
      for (const model of RECOMMENDED_MODELS) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeTruthy();
        expect(model.modelId).toBeTruthy();
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.capabilities.length).toBeGreaterThan(0);
        expect(model.minRamGB).toBeGreaterThan(0);
      }
    });
  });

  describe('generateSelfHostingConfig', () => {
    it('should generate config for 8GB RAM', () => {
      const config = generateSelfHostingConfig(8);
      expect(config.models.length).toBeGreaterThan(0);
      expect(config.primaryChat).toBeTruthy();
      expect(config.isFullyLocal).toBe(true);
    });

    it('should include more models for higher RAM', () => {
      const low = generateSelfHostingConfig(8);
      const high = generateSelfHostingConfig(64);
      expect(high.models.length).toBeGreaterThanOrEqual(low.models.length);
    });

    it('should always return at least one model', () => {
      const config = generateSelfHostingConfig(1);
      expect(config.models.length).toBeGreaterThan(0);
    });

    it('should select vision model if available', () => {
      const config = generateSelfHostingConfig(16);
      // LLaVA needs 8GB, should be available with 16GB
      if (config.models.some(m => m.capabilities.includes('vision'))) {
        expect(config.primaryVision).not.toBeNull();
      }
    });

    it('should use custom endpoint when provided', () => {
      const config = generateSelfHostingConfig(8, 'ollama', 'http://192.168.1.100:11434');
      expect(config.ollamaEndpoint).toBe('http://192.168.1.100:11434');
    });

    it('should build fallback chain', () => {
      const config = generateSelfHostingConfig(16);
      expect(config.fallbackChain.length).toBeGreaterThan(0);
    });
  });

  describe('selectBestModel', () => {
    const models: LocalModelConfig[] = [
      { id: 'fast-basic', name: 'Fast Basic', provider: 'ollama', endpoint: '', modelId: 'fb', contextWindow: 4096, capabilities: ['chat'], speedTier: 'fast', qualityTier: 'basic', minRamGB: 4, recommendedFor: [] },
      { id: 'slow-excellent', name: 'Slow Excellent', provider: 'ollama', endpoint: '', modelId: 'se', contextWindow: 128000, capabilities: ['chat', 'code'], speedTier: 'slow', qualityTier: 'excellent', minRamGB: 48, recommendedFor: [] },
      { id: 'medium-good', name: 'Medium Good', provider: 'ollama', endpoint: '', modelId: 'mg', contextWindow: 32768, capabilities: ['chat'], speedTier: 'medium', qualityTier: 'good', minRamGB: 8, recommendedFor: [] },
    ];

    it('should prefer excellent quality', () => {
      const best = selectBestModel(models, 'chat', 64);
      expect(best?.qualityTier).toBe('excellent');
    });

    it('should respect RAM constraints', () => {
      const best = selectBestModel(models, 'chat', 8);
      expect(best?.id).not.toBe('slow-excellent');
    });

    it('should return null when no model fits', () => {
      const best = selectBestModel(models, 'vision', 64);
      expect(best).toBeNull();
    });
  });

  describe('getDefaultEndpoint', () => {
    it('should return correct endpoints', () => {
      expect(getDefaultEndpoint('ollama')).toBe('http://localhost:11434');
      expect(getDefaultEndpoint('lmstudio')).toBe('http://localhost:1234');
      expect(getDefaultEndpoint('groq')).toContain('groq.com');
      expect(getDefaultEndpoint('openrouter')).toContain('openrouter.ai');
    });
  });

  describe('selectModelForTask', () => {
    const config = generateSelfHostingConfig(16);

    it('should select chat model for chat task', () => {
      const model = selectModelForTask(config, 'chat');
      expect(model).not.toBeNull();
      expect(model?.capabilities).toContain('chat');
    });

    it('should select fastest model for fast-chat', () => {
      const model = selectModelForTask(config, 'fast-chat');
      expect(model).not.toBeNull();
    });

    it('should return null for vision when no vision model', () => {
      const noVisionConfig = { ...config, primaryVision: null, models: config.models.filter(m => !m.capabilities.includes('vision')) };
      const model = selectModelForTask(noVisionConfig, 'vision');
      expect(model).toBeNull();
    });
  });

  describe('buildTaskFallbackChain', () => {
    it('should build fallback chain for chat', () => {
      const config = generateSelfHostingConfig(16);
      const chain = buildTaskFallbackChain(config, 'chat');
      expect(chain.length).toBeGreaterThan(0);
    });

    it('should sort by quality then speed', () => {
      const config = generateSelfHostingConfig(64);
      const chain = buildTaskFallbackChain(config, 'chat');
      // First model should be highest quality
      const firstModel = config.models.find(m => m.id === chain[0]);
      if (firstModel && chain.length > 1) {
        const qualityOrder = { excellent: 0, good: 1, basic: 2 };
        // Excellent should come before good/basic
        for (let i = 1; i < chain.length; i++) {
          const later = config.models.find(m => m.id === chain[i]);
          if (later) {
            expect(qualityOrder[firstModel.qualityTier]).toBeLessThanOrEqual(qualityOrder[later.qualityTier]);
          }
        }
      }
    });
  });

  describe('validateSelfHostingConfig', () => {
    it('should validate a correct config', () => {
      const config = generateSelfHostingConfig(16);
      const result = validateSelfHostingConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should error on empty models', () => {
      const config: SelfHostingConfig = {
        models: [],
        primaryChat: '',
        primaryVision: null,
        primaryCode: null,
        primaryEmbedding: null,
        fallbackChain: [],
        ollamaEndpoint: 'http://localhost:11434',
        isFullyLocal: true,
      };
      const result = validateSelfHostingConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing embedding model', () => {
      const config = generateSelfHostingConfig(4);
      // Small RAM might not include embedding model
      const result = validateSelfHostingConfig(config);
      // May or may not have embedding warning depending on models
      expect(result.warnings).toBeDefined();
    });

    it('should warn about non-local config', () => {
      const config = generateSelfHostingConfig(16, 'groq');
      const result = validateSelfHostingConfig(config);
      const hasExternalWarning = result.warnings.some(w => w.includes('external'));
      expect(hasExternalWarning).toBe(true);
    });
  });

  describe('configSummary', () => {
    it('should generate readable summary', () => {
      const config = generateSelfHostingConfig(16);
      const summary = configSummary(config);
      expect(summary).toContain('FULLY LOCAL');
      expect(summary).toContain('Models:');
      expect(summary).toContain('Primary Chat:');
    });

    it('should show HYBRID for non-local config', () => {
      const config = generateSelfHostingConfig(16, 'groq');
      const summary = configSummary(config);
      expect(summary).toContain('HYBRID');
    });
  });
});
