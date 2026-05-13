/**
 * Vision Pipeline Orchestrator — Pure-logic vision analysis coordination
 *
 * Coordinates multi-model vision analysis results, ranks descriptions,
 * generates context blocks for chat, and manages vision analysis state.
 * No API calls — operates on results from multi-model-vision.ts.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VisionInput {
  imageId: string;
  source: 'upload' | 'camera' | 'url';
  format: string;     // 'jpeg', 'png', 'webp', 'gif'
  width?: number;
  height?: number;
  fileSize?: number;  // bytes
}

export interface VisionAnalysisResult {
  model: string;
  description: string;
  confidence: number; // 0-1
  processingTimeMs: number;
  objects?: string[];
  textContent?: string;
  labels?: string[];
  colors?: string[];
  emotions?: string[];
  categories?: string[];
}

export interface VisionContextBlock {
  summary: string;
  keyElements: string[];
  suggestedActions: string[];
  technicalDetails: Record<string, string>;
  emotionalTone?: string;
  relevanceScore: number; // 0-1, how relevant to current conversation
}

export interface VisionPipelineConfig {
  maxResults: number;
  minConfidence: number;
  preferSpeed: boolean;
  enableOCR: boolean;
  enableEmotion: boolean;
}

export const DEFAULT_VISION_CONFIG: VisionPipelineConfig = {
  maxResults: 3,
  minConfidence: 0.3,
  preferSpeed: false,
  enableOCR: true,
  enableEmotion: true,
};

// ─── Analysis Ranking ───────────────────────────────────────────────────────

/**
 * Score a vision analysis result based on quality signals.
 */
export function scoreAnalysisResult(result: VisionAnalysisResult): number {
  let score = 0;

  // Confidence is the primary signal
  score += result.confidence * 0.4;

  // Description length — longer descriptions tend to be more detailed
  const descLen = result.description.length;
  if (descLen > 50) score += 0.15;
  if (descLen > 150) score += 0.1;

  // Objects detected
  if (result.objects && result.objects.length > 0) {
    score += Math.min(0.15, result.objects.length * 0.03);
  }

  // Labels
  if (result.labels && result.labels.length > 0) {
    score += Math.min(0.1, result.labels.length * 0.02);
  }

  // Text content (OCR)
  if (result.textContent && result.textContent.length > 0) {
    score += 0.1;
  }

  // Processing time penalty for slow results
  if (result.processingTimeMs > 10000) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Rank multiple analysis results by quality score.
 */
export function rankAnalysisResults(results: VisionAnalysisResult[]): VisionAnalysisResult[] {
  return [...results]
    .map(r => ({ result: r, score: scoreAnalysisResult(r) }))
    .sort((a, b) => b.score - a.score)
    .map(r => r.result);
}

// ─── Context Generation ─────────────────────────────────────────────────────

/**
 * Generate a context block from vision analysis results for injection into chat.
 */
export function generateVisionContext(
  results: VisionAnalysisResult[],
  userInput: string,
  config: VisionPipelineConfig = DEFAULT_VISION_CONFIG,
): VisionContextBlock {
  if (results.length === 0) {
    return {
      summary: 'No vision analysis available',
      keyElements: [],
      suggestedActions: [],
      technicalDetails: {},
      relevanceScore: 0,
    };
  }

  // Filter by minimum confidence
  const filtered = results.filter(r => r.confidence >= config.minConfidence);
  if (filtered.length === 0) {
    return {
      summary: 'Low confidence analysis — results uncertain',
      keyElements: [],
      suggestedActions: ['Try uploading a clearer image'],
      technicalDetails: {},
      relevanceScore: 0.1,
    };
  }

  // Use the best result for summary
  const ranked = rankAnalysisResults(filtered);
  const best = ranked[0];

  // Collect all unique elements
  const allObjects = [...new Set(ranked.flatMap(r => r.objects || []))];
  const allLabels = [...new Set(ranked.flatMap(r => r.labels || []))];
  const allColors = [...new Set(ranked.flatMap(r => r.colors || []))];
  const allEmotions = [...new Set(ranked.flatMap(r => r.emotions || []))];

  // Build summary
  let summary = best.description;
  if (allObjects.length > 0) {
    summary += ` Objects: ${allObjects.slice(0, 5).join(', ')}.`;
  }
  if (best.textContent && config.enableOCR) {
    summary += ` Text detected: "${best.textContent.substring(0, 200)}"`;
  }

  // Key elements
  const keyElements = [...allObjects.slice(0, 5), ...allLabels.slice(0, 3)];

  // Suggested actions based on content
  const suggestedActions: string[] = [];
  if (allObjects.length > 3) suggestedActions.push('Ask about specific objects in the image');
  if (best.textContent) suggestedActions.push('Discuss the text content');
  if (allEmotions.includes('happy') || allEmotions.includes('joyful')) {
    suggestedActions.push('Acknowledge the positive mood');
  }
  if (allColors.length > 0) suggestedActions.push('Discuss the color palette');

  // Technical details
  const technicalDetails: Record<string, string> = {
    models: ranked.map(r => r.model).join(', '),
    confidence: best.confidence.toFixed(2),
    processingTime: `${ranked.reduce((sum, r) => sum + r.processingTimeMs, 0)}ms`,
  };

  // Emotional tone
  const emotionalTone = allEmotions.length > 0 ? allEmotions[0] : undefined;

  // Relevance to user input
  const relevanceScore = calculateRelevance(best.description, userInput);

  return {
    summary,
    keyElements,
    suggestedActions,
    technicalDetails,
    emotionalTone,
    relevanceScore,
  };
}

/**
 * Calculate how relevant a vision description is to the user's message.
 */
export function calculateRelevance(description: string, userInput: string): number {
  if (!userInput || !description) return 0.3;

  const descWords = new Set(description.toLowerCase().split(/\s+/));
  const userWords = userInput.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let matches = 0;
  for (const word of userWords) {
    if (descWords.has(word)) matches++;
  }

  const overlap = userWords.length > 0 ? matches / userWords.length : 0;
  return Math.min(1, 0.3 + overlap * 0.7);
}

// ─── Vision Input Validation ────────────────────────────────────────────────

const SUPPORTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp']);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Validate a vision input before processing.
 */
export function validateVisionInput(input: VisionInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.imageId) errors.push('Missing image ID');
  if (!input.format) {
    errors.push('Missing image format');
  } else if (!SUPPORTED_FORMATS.has(input.format.toLowerCase())) {
    errors.push(`Unsupported format: ${input.format}. Supported: ${Array.from(SUPPORTED_FORMATS).join(', ')}`);
  }

  if (input.fileSize && input.fileSize > MAX_FILE_SIZE) {
    errors.push(`File too large: ${(input.fileSize / 1024 / 1024).toFixed(1)}MB. Max: 20MB`);
  }

  if (input.width && input.height) {
    if (input.width < 10 || input.height < 10) {
      errors.push('Image dimensions too small (minimum 10x10)');
    }
    if (input.width > 10000 || input.height > 10000) {
      errors.push('Image dimensions too large (maximum 10000x10000)');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Multi-Image Coordination ───────────────────────────────────────────────

/**
 * Coordinate analysis across multiple images.
 * Generates a combined summary and identifies relationships.
 */
export function coordinateMultiImageAnalysis(
  analyses: Array<{ input: VisionInput; result: VisionAnalysisResult }>,
): {
  combinedSummary: string;
  crossReferences: string[];
  dominantElements: string[];
  imageCount: number;
} {
  if (analyses.length === 0) {
    return { combinedSummary: '', crossReferences: [], dominantElements: [], imageCount: 0 };
  }

  if (analyses.length === 1) {
    return {
      combinedSummary: analyses[0].result.description,
      crossReferences: [],
      dominantElements: analyses[0].result.objects || [],
      imageCount: 1,
    };
  }

  // Collect all objects across images
  const objectFreq = new Map<string, number>();
  for (const { result } of analyses) {
    for (const obj of (result.objects || [])) {
      objectFreq.set(obj, (objectFreq.get(obj) || 0) + 1);
    }
  }

  // Dominant elements appear in multiple images
  const dominantElements = Array.from(objectFreq.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([obj]) => obj);

  // Cross-references between images
  const crossReferences: string[] = [];
  for (let i = 0; i < analyses.length; i++) {
    for (let j = i + 1; j < analyses.length; j++) {
      const shared = (analyses[i].result.objects || []).filter(
        o => (analyses[j].result.objects || []).includes(o),
      );
      if (shared.length > 0) {
        crossReferences.push(`Image ${i + 1} and ${j + 1} share: ${shared.join(', ')}`);
      }
    }
  }

  // Combined summary
  const descriptions = analyses.map((a, i) => `Image ${i + 1}: ${a.result.description}`);
  const combinedSummary = descriptions.join('\n');

  return {
    combinedSummary,
    crossReferences,
    dominantElements,
    imageCount: analyses.length,
  };
}

// ─── Vision Analysis Statistics ─────────────────────────────────────────────

/**
 * Generate statistics about vision analysis performance.
 */
export function visionAnalysisStats(results: VisionAnalysisResult[]): {
  totalAnalyses: number;
  avgConfidence: number;
  avgProcessingTime: number;
  topModel: string | null;
  objectsDetected: number;
  textExtracted: boolean;
} {
  if (results.length === 0) {
    return {
      totalAnalyses: 0,
      avgConfidence: 0,
      avgProcessingTime: 0,
      topModel: null,
      objectsDetected: 0,
      textExtracted: false,
    };
  }

  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length;

  // Find most frequent model
  const modelFreq = new Map<string, number>();
  for (const r of results) {
    modelFreq.set(r.model, (modelFreq.get(r.model) || 0) + 1);
  }
  const topModel = Array.from(modelFreq.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const objectsDetected = results.reduce((sum, r) => sum + (r.objects?.length || 0), 0);
  const textExtracted = results.some(r => r.textContent && r.textContent.length > 0);

  return {
    totalAnalyses: results.length,
    avgConfidence,
    avgProcessingTime,
    topModel,
    objectsDetected,
    textExtracted,
  };
}
