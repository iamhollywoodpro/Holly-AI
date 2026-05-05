/**
 * HOLLY Computer Vision — FREE via OpenRouter
 *
 * Uses Qwen2.5-VL-72B via OpenRouter (free tier) for image understanding.
 * No OpenAI, no Google Vision, no paid APIs.
 */

export interface VisionAnalysisRequest {
  imageUrl: string;
  prompt: string;
  detail?: 'low' | 'high' | 'auto';
}

export interface VisionAnalysisResult {
  analysis: string;
  suggestions?: string[];
  detectedElements?: string[];
  timestamp: Date;
}

// OpenRouter free vision model
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const VISION_MODEL       = 'qwen/qwen2.5-vl-72b-instruct:free';

export class ComputerVision {
  /**
   * Analyze an image using a free vision model via OpenRouter
   */
  async analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    if (!OPENROUTER_API_KEY) {
      return {
        analysis: 'Vision analysis unavailable — OPENROUTER_API_KEY not configured.',
        timestamp: new Date(),
      };
    }

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
              { type: 'text', text: request.prompt },
              { type: 'image_url', image_url: { url: request.imageUrl } },
            ],
          },
        ],
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`Vision analysis failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'No analysis returned.';

    return { analysis, timestamp: new Date() };
  }

  /** Review design work (album covers, UI mockups, etc.) */
  async reviewDesign(imageUrl: string, designType: string): Promise<VisionAnalysisResult> {
    const prompt = `You are HOLLY, an expert creative AI. Review this ${designType} design critically.
Analyze: visual hierarchy, color theory, typography, brand consistency, emotional impact, and areas for improvement.
Provide honest, constructive feedback with specific suggestions.`;
    return this.analyzeImage({ imageUrl, prompt });
  }

  /** Analyze UI/UX designs */
  async analyzeUI(imageUrl: string): Promise<VisionAnalysisResult> {
    const prompt = `You are HOLLY, a UI/UX expert. Analyze this interface: UX flow, visual design, accessibility, information architecture, CTAs, and specific improvement recommendations.`;
    return this.analyzeImage({ imageUrl, prompt });
  }

  /** General image description */
  async describeImage(imageUrl: string): Promise<VisionAnalysisResult> {
    return this.analyzeImage({ imageUrl, prompt: 'Describe this image in detail. What do you see? Context? What stands out?' });
  }

  /** Compare two images */
  async compareImages(imageUrl1: string, imageUrl2: string, context: string): Promise<string> {
    const [a1, a2] = await Promise.all([
      this.analyzeImage({ imageUrl: imageUrl1, prompt: `Analyze in context of: ${context}. Key visual elements, style, composition.` }),
      this.analyzeImage({ imageUrl: imageUrl2, prompt: `Analyze in context of: ${context}. Key visual elements, style, composition.` }),
    ]);
    return `IMAGE 1:\n${a1.analysis}\n\nIMAGE 2:\n${a2.analysis}`;
  }

  /** Extract text (OCR) */
  async extractText(imageUrl: string): Promise<string> {
    const result = await this.analyzeImage({
      imageUrl,
      prompt: 'Extract and transcribe ALL visible text in this image: labels, captions, titles, body text, anything readable.',
    });
    return result.analysis;
  }

  /** Analyze artistic style */
  async analyzeArtStyle(imageUrl: string): Promise<VisionAnalysisResult> {
    const prompt = `You are HOLLY, an art expert. Analyze: art style/genre, color palette, composition, influences, technical execution, emotional impact, how to recreate this style.`;
    return this.analyzeImage({ imageUrl, prompt });
  }
}

export const computerVision = new ComputerVision();
