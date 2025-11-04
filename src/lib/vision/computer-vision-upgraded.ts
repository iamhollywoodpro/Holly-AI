/**
 * HOLLY Computer Vision - UPGRADED TO GEMINI 2.0 FLASH
 * 
 * UPGRADED FROM: GPT-4 Vision (~$0.01/image)
 * UPGRADED TO: Gemini 2.0 Flash Vision (FREE, 1500 requests/day)
 * 
 * Benefits:
 * - 100% FREE (vs $0.01/image)
 * - Faster responses
 * - Better multilingual OCR
 * - Video understanding included
 * - 1,500 requests/day limit
 * 
 * Hollywood already has the key configured! ✅
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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
  text?: string[]; // OCR results
  objects?: Array<{
    name: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  colors?: Array<{
    hex: string;
    name: string;
    percentage: number;
  }>;
  composition?: {
    layout: string;
    balance: string;
    focusPoints: string[];
  };
  metadata?: {
    provider: string;
    model: string;
    processingTime: number;
    cost: number;
  };
}

class ComputerVision {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google AI API key not configured');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Use Gemini 2.0 Flash (best vision model, FREE)
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp' 
    });
  }

  /**
   * Analyze single image
   */
  async analyzeImage(
    imageUrl: string,
    options: VisionAnalysisOptions = {}
  ): Promise<VisionResult> {
    const startTime = Date.now();

    try {
      // Fetch image
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Build prompt based on task
      const prompt = this.buildPrompt(options);

      // Generate content with Gemini
      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
            data: base64Image,
          },
        },
        prompt,
      ]);

      const response = await result.response;
      const analysisText = response.text();

      // Parse response based on task
      const parsedResult = this.parseResponse(analysisText, options);

      const processingTime = Date.now() - startTime;

      return {
        ...parsedResult,
        metadata: {
          provider: 'Google Gemini 2.0 Flash',
          model: 'gemini-2.0-flash-exp',
          processingTime,
          cost: 0, // FREE! ✅
        },
      };
    } catch (error) {
      console.error('[Vision] Gemini analysis failed:', error);
      throw error;
    }
  }

  /**
   * Compare multiple images
   */
  async compareImages(
    imageUrls: string[],
    question?: string
  ): Promise<VisionResult> {
    const startTime = Date.now();

    try {
      // Fetch all images
      const images = await Promise.all(
        imageUrls.map(async (url) => {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          return {
            inlineData: {
              mimeType: response.headers.get('content-type') || 'image/jpeg',
              data: Buffer.from(buffer).toString('base64'),
            },
          };
        })
      );

      // Build comparison prompt
      const prompt = question || `Compare these images in detail. Analyze:
        1. Visual similarities and differences
        2. Style and composition
        3. Quality and technical aspects
        4. Which is more effective and why
        5. Specific recommendations for improvement`;

      // Generate comparison
      const result = await this.model.generateContent([...images, prompt]);
      const response = await result.response;
      const description = response.text();

      const processingTime = Date.now() - startTime;

      return {
        description,
        metadata: {
          provider: 'Google Gemini 2.0 Flash',
          model: 'gemini-2.0-flash-exp',
          processingTime,
          cost: 0, // FREE! ✅
        },
      };
    } catch (error) {
      console.error('[Vision] Image comparison failed:', error);
      throw error;
    }
  }

  /**
   * Extract text (OCR)
   */
  async extractText(imageUrl: string): Promise<string[]> {
    const result = await this.analyzeImage(imageUrl, {
      task: 'ocr',
      includeText: true,
    });

    return result.text || [];
  }

  /**
   * Identify objects
   */
  async identifyObjects(imageUrl: string): Promise<Array<{
    name: string;
    confidence: number;
  }>> {
    const result = await this.analyzeImage(imageUrl, {
      task: 'objects',
      includeObjects: true,
    });

    return result.objects || [];
  }

  /**
   * Get design feedback
   */
  async getDesignFeedback(imageUrl: string): Promise<string> {
    const result = await this.analyzeImage(imageUrl, {
      task: 'feedback',
      includeColors: true,
      includeComposition: true,
    });

    return result.description;
  }

  /**
   * Brand analysis (logo recognition, visual identity)
   */
  async analyzeBrand(imageUrl: string): Promise<string> {
    const result = await this.analyzeImage(imageUrl, {
      task: 'brand',
    });

    return result.description;
  }

  /**
   * Build prompt based on task
   */
  private buildPrompt(options: VisionAnalysisOptions): string {
    const { task, detailLevel, includeText, includeObjects, includeColors, includeComposition } = options;

    let prompt = '';

    // Task-specific prompts
    switch (task) {
      case 'describe':
        prompt = 'Describe this image in detail. Include what you see, the mood, style, and any notable features.';
        break;

      case 'ocr':
        prompt = 'Extract ALL text from this image. Return the text exactly as it appears, preserving formatting and structure. List each text element separately.';
        break;

      case 'objects':
        prompt = 'Identify and list all objects in this image. For each object, provide:\n1. Object name\n2. Confidence level (0-100%)\n3. Approximate location\nReturn as a structured list.';
        break;

      case 'compare':
        prompt = 'Compare these images and analyze their differences and similarities.';
        break;

      case 'feedback':
        prompt = 'Provide professional design feedback on this image. Analyze:\n1. Visual composition and balance\n2. Color palette and harmony\n3. Typography (if present)\n4. Overall effectiveness\n5. Specific recommendations for improvement\nBe constructive and specific.';
        break;

      case 'brand':
        prompt = 'Analyze the branding in this image. Identify:\n1. Brand/logo (if recognizable)\n2. Visual identity elements\n3. Brand personality/tone\n4. Design consistency\n5. Target audience signals';
        break;

      default:
        prompt = 'Analyze this image comprehensively.';
    }

    // Add detail level
    if (detailLevel === 'high') {
      prompt += '\n\nProvide extensive detail and analysis.';
    } else if (detailLevel === 'low') {
      prompt += '\n\nProvide a concise summary.';
    }

    // Add specific analysis requests
    if (includeText) {
      prompt += '\n\nExtract any text present in the image.';
    }

    if (includeObjects) {
      prompt += '\n\nList all identifiable objects.';
    }

    if (includeColors) {
      prompt += '\n\nAnalyze the color palette (dominant colors, hex codes if possible).';
    }

    if (includeComposition) {
      prompt += '\n\nAnalyze the visual composition, layout, and balance.';
    }

    return prompt;
  }

  /**
   * Parse Gemini response into structured format
   */
  private parseResponse(
    text: string,
    options: VisionAnalysisOptions
  ): Partial<VisionResult> {
    const result: Partial<VisionResult> = {
      description: text,
    };

    // Extract text (OCR)
    if (options.task === 'ocr' || options.includeText) {
      const textMatches = text.match(/"([^"]+)"/g);
      if (textMatches) {
        result.text = textMatches.map(t => t.replace(/"/g, ''));
      }
    }

    // Extract objects
    if (options.task === 'objects' || options.includeObjects) {
      const objectMatches = text.matchAll(/(\w+).*?(\d+)%/g);
      result.objects = Array.from(objectMatches).map(match => ({
        name: match[1],
        confidence: parseInt(match[2]) / 100,
      }));
    }

    // Extract colors
    if (options.includeColors) {
      const colorMatches = text.matchAll(/#([0-9A-Fa-f]{6})/g);
      if (colorMatches) {
        result.colors = Array.from(colorMatches).map((match, index) => ({
          hex: `#${match[1]}`,
          name: `Color ${index + 1}`,
          percentage: 0, // Would need more complex parsing
        }));
      }
    }

    return result;
  }

  /**
   * Check API status and limits
   */
  async getStatus(): Promise<{
    available: boolean;
    provider: string;
    dailyLimit: number;
    cost: number;
  }> {
    return {
      available: !!process.env.GOOGLE_AI_API_KEY,
      provider: 'Google Gemini 2.0 Flash',
      dailyLimit: 1500, // 1500 requests/day FREE
      cost: 0, // 100% FREE ✅
    };
  }
}

// Export singleton
export const computerVision = new ComputerVision();

// Export types
export type { VisionAnalysisOptions, VisionResult };