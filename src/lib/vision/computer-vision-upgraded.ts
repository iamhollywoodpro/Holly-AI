/**
 * HOLLY Computer Vision — FREE via OpenRouter (Qwen2.5-VL-72B)
 *
 * No Google, no paid APIs. Uses OpenRouter's free tier for vision tasks.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const VISION_MODEL       = 'qwen/qwen2.5-vl-72b-instruct:free';

interface VisionAnalysisOptions {
  task?: 'describe' | 'ocr' | 'objects' | 'compare' | 'feedback' | 'brand';
  detailLevel?: 'low' | 'medium' | 'high';
  includeText?: boolean;
  includeObjects?: boolean;
  includeColors?: boolean;
  includeComposition?: boolean;
}

interface VisionResult {
  description: string;
  text?: string[];
  objects?: Array<{ name: string; confidence: number; bbox?: { x: number; y: number; width: number; height: number } }>;
  colors?: Array<{ hex: string; name: string; percentage: number }>;
  composition?: { layout: string; balance: string; focusPoints: string[] };
  metadata?: { provider: string; model: string; processingTime: number; cost: number };
}

class ComputerVisionUpgraded {
  async analyzeImage(imageUrl: string, options: VisionAnalysisOptions = {}): Promise<VisionResult> {
    const startTime = Date.now();

    if (!OPENROUTER_API_KEY) {
      return {
        description: 'Vision analysis unavailable — OPENROUTER_API_KEY not configured.',
        metadata: { provider: 'none', model: 'none', processingTime: 0, cost: 0 },
      };
    }

    const prompt = this.buildPrompt(options);

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
      throw new Error(`Vision analysis failed (${response.status})`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || 'No analysis returned.';
    const processingTime = Date.now() - startTime;

    return {
      description: analysisText,
      ...this.parseResponse(analysisText, options),
      metadata: { provider: 'OpenRouter / Qwen2.5-VL-72B', model: VISION_MODEL, processingTime, cost: 0 },
    };
  }

  async compareImages(imageUrls: string[], question?: string): Promise<VisionResult> {
    if (!OPENROUTER_API_KEY) {
      return { description: 'Vision unavailable — OPENROUTER_API_KEY not configured.' };
    }

    const prompt = question || 'Compare these images in detail: similarities, differences, quality, effectiveness, recommendations.';

    const content: any[] = [{ type: 'text', text: prompt }];
    for (const url of imageUrls) {
      content.push({ type: 'image_url', image_url: { url } });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://holly.nexamusicgroup.com',
        'X-Title': 'HOLLY AI',
      },
      body: JSON.stringify({ model: VISION_MODEL, messages: [{ role: 'user', content }], max_tokens: 1200 }),
    });

    const data = await response.json();
    return { description: data.choices?.[0]?.message?.content || '' };
  }

  async extractText(imageUrl: string): Promise<string[]> {
    const result = await this.analyzeImage(imageUrl, { task: 'ocr', includeText: true });
    return result.text || [result.description];
  }

  async identifyObjects(imageUrl: string): Promise<Array<{ name: string; confidence: number }>> {
    const result = await this.analyzeImage(imageUrl, { task: 'objects', includeObjects: true });
    return result.objects || [];
  }

  async getDesignFeedback(imageUrl: string): Promise<string> {
    const result = await this.analyzeImage(imageUrl, { task: 'feedback', includeColors: true, includeComposition: true });
    return result.description;
  }

  async analyzeBrand(imageUrl: string): Promise<string> {
    const result = await this.analyzeImage(imageUrl, { task: 'brand' });
    return result.description;
  }

  private buildPrompt(options: VisionAnalysisOptions): string {
    const taskPrompts: Record<string, string> = {
      describe: 'Describe this image in detail including mood, style, and notable features.',
      ocr: 'Extract ALL text from this image exactly as it appears.',
      objects: 'Identify and list all objects with confidence levels.',
      compare: 'Compare these images — similarities, differences, which is more effective and why.',
      feedback: 'Provide professional design feedback: composition, color palette, typography, effectiveness, and recommendations.',
      brand: 'Analyze the branding: logo/brand identity, visual elements, personality, target audience.',
    };

    let prompt = taskPrompts[options.task || 'describe'] || 'Analyze this image.';

    if (options.detailLevel === 'high') prompt += ' Be extensive and detailed.';
    if (options.includeText)        prompt += ' Extract any visible text.';
    if (options.includeColors)      prompt += ' Analyze the color palette.';
    if (options.includeComposition) prompt += ' Analyze the visual composition.';

    return prompt;
  }

  private parseResponse(text: string, options: VisionAnalysisOptions): Partial<VisionResult> {
    const result: Partial<VisionResult> = {};

    if (options.task === 'ocr' || options.includeText) {
      result.text = text.split('\n').filter(l => l.trim());
    }

    if (options.includeColors) {
      const colorMatches = text.matchAll(/#([0-9A-Fa-f]{6})/g);
      result.colors = Array.from(colorMatches).map((m, i) => ({
        hex: `#${m[1]}`, name: `Color ${i + 1}`, percentage: 0,
      }));
    }

    return result;
  }

  async getStatus(): Promise<{ available: boolean; provider: string; dailyLimit: number; cost: number }> {
    return {
      available: !!OPENROUTER_API_KEY,
      provider: 'OpenRouter / Qwen2.5-VL-72B (free tier)',
      dailyLimit: -1, // OpenRouter free tier limits vary
      cost: 0,
    };
  }
}

export const computerVision = new ComputerVisionUpgraded();
