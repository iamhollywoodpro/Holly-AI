/**
 * Multi-Model Vision System — HOLLY's Eyes
 *
 * FREE models only — no OpenAI, no Google Vision.
 *
 * Primary:  Qwen2.5-VL-72B via OpenRouter (free tier)
 * Fallback: HuggingFace BLIP / free vision models
 */

import { FreeVisionModels } from './free-vision-models';

export interface VisionResult {
  model: string;
  description: string;
  details?: {
    objects?: string[];
    text?: string;
    labels?: string[];
    colors?: string[];
    emotions?: string[];
  };
  confidence?: number;
  processingTime: number;
  timestamp: Date;
}

export interface MultiVisionAnalysis {
  primary: VisionResult;
  secondary?: VisionResult;
  combined: string;
  structured: {
    summary: string;
    keyElements: string[];
    suggestedActions?: string[];
    technicalDetails?: Record<string, any>;
  };
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const VISION_MODEL       = 'qwen/qwen2.5-vl-72b-instruct:free';

export class MultiModelVision {
  private huggingfaceKey: string;
  private freeModels: FreeVisionModels;

  constructor() {
    this.huggingfaceKey = process.env.HUGGINGFACE_API_KEY || '';
    this.freeModels     = new FreeVisionModels();
  }

  /**
   * Analyze image — uses OpenRouter vision model by default, falls back to HF
   */
  async analyzeImage(
    imageUrl: string,
    options: {
      taskType?: 'general' | 'design-critique' | 'ocr' | 'comparison' | 'art-style';
      prompt?: string;
      useMultipleModels?: boolean;
      detail?: 'low' | 'high' | 'auto';
    } = {}
  ): Promise<MultiVisionAnalysis> {
    const { taskType = 'general', prompt } = options;

    const promptText = prompt || this.buildPromptForTask(taskType);

    let primary: VisionResult;

    if (OPENROUTER_API_KEY) {
      primary = await this.analyzeWithOpenRouter(imageUrl, promptText);
    } else {
      // Fall back to free HuggingFace models
      const freeResult = await this.freeModels.analyzeImageAuto(imageUrl, promptText);
      primary = {
        model: freeResult.model,
        description: freeResult.description,
        confidence: freeResult.confidence,
        processingTime: freeResult.processingTime,
        timestamp: freeResult.timestamp,
        details: freeResult.details,
      };
    }

    const combined   = this.synthesizeResults(primary, undefined);
    const structured = this.extractStructuredData(primary, undefined);

    return { primary, combined, structured };
  }

  /**
   * OpenRouter vision (free Qwen2.5-VL-72B)
   */
  private async analyzeWithOpenRouter(imageUrl: string, prompt: string): Promise<VisionResult> {
    const startTime = Date.now();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://holly.nexamusicgroup.com',
        'X-Title': 'HOLLY AI',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter vision failed (${response.status})`);
    }

    const data        = await response.json();
    const description = data.choices?.[0]?.message?.content || 'No analysis returned.';

    return {
      model: 'qwen2.5-vl-72b (OpenRouter free)',
      description,
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Compare two images
   */
  async compareImages(
    imageUrl1: string,
    imageUrl2: string,
    context?: string
  ): Promise<{ comparison: string; differences: string[]; similarities: string[] }> {
    if (!OPENROUTER_API_KEY) {
      return {
        comparison: 'Vision comparison unavailable — OPENROUTER_API_KEY not configured.',
        differences: [],
        similarities: [],
      };
    }

    const prompt = `Compare these two images.${context ? ` Context: ${context}.` : ''} Provide key differences, similarities, and an overall comparison.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://holly.nexamusicgroup.com',
        'X-Title': 'HOLLY AI',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl1 } },
              { type: 'image_url', image_url: { url: imageUrl2 } },
            ],
          },
        ],
        max_tokens: 1200,
      }),
    });

    const data = await response.json();
    const comparison = data.choices?.[0]?.message?.content || '';

    return {
      comparison,
      differences: ['See comparison above'],
      similarities: ['See comparison above'],
    };
  }

  private buildPromptForTask(taskType: string): string {
    const prompts: Record<string, string> = {
      'general':         'Describe this image in detail including content, mood, and notable features.',
      'design-critique': 'Provide professional design critique: composition, color palette, typography, effectiveness, and improvement suggestions.',
      'ocr':             'Extract ALL visible text from this image exactly as it appears.',
      'comparison':      'Compare the key visual elements, style, and composition of these images.',
      'art-style':       'Analyze the artistic style: genre, techniques, influences, color palette, and how to recreate this style.',
    };
    return prompts[taskType] || prompts['general'];
  }

  private synthesizeResults(primary: VisionResult, secondary?: VisionResult): string {
    let combined = `**${primary.model.toUpperCase()}:**\n${primary.description}`;
    if (secondary) combined += `\n\n**${secondary.model.toUpperCase()}:**\n${secondary.description}`;
    return combined;
  }

  private extractStructuredData(
    primary: VisionResult,
    secondary?: VisionResult
  ): MultiVisionAnalysis['structured'] {
    const keyElements: string[] = primary.details?.labels || [];
    const technicalDetails: Record<string, any> = {};

    if (primary.details?.text) technicalDetails.extractedText = primary.details.text;
    if (primary.details?.colors) technicalDetails.dominantColors = primary.details.colors;

    const summary = secondary?.description || primary.description;

    return {
      summary: summary.slice(0, 300) + (summary.length > 300 ? '...' : ''),
      keyElements: [...new Set(keyElements)].slice(0, 10),
      technicalDetails: Object.keys(technicalDetails).length > 0 ? technicalDetails : undefined,
    };
  }
}
