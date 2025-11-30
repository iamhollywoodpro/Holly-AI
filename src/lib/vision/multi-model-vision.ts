/**
 * Multi-Model Vision System - HOLLY's Eyes
 * 
 * Integrates multiple vision models for comprehensive image understanding:
 * - GPT-4 Vision (OpenAI) - Best for general analysis, design critique
 * - BLIP (Salesforce) - Best for detailed captioning
 * - ViT-GPT2 - Fast, efficient image-to-text
 * - Google Cloud Vision - Best for OCR, label detection
 * 
 * Automatically selects the best model based on task type.
 */

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
  combined: string; // Synthesized description from all models
  structured: {
    summary: string;
    keyElements: string[];
    suggestedActions?: string[];
    technicalDetails?: Record<string, any>;
  };
}

export class MultiModelVision {
  private openaiKey: string;
  private huggingfaceKey: string;
  private googleVisionKey: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || '';
    this.huggingfaceKey = process.env.HUGGINGFACE_API_KEY || '';
    this.googleVisionKey = process.env.GOOGLE_VISION_API_KEY || '';
  }

  /**
   * Main entry point - intelligently analyzes image with best model(s)
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
    const startTime = Date.now();
    const { taskType = 'general', prompt, useMultipleModels = false, detail = 'auto' } = options;

    let primary: VisionResult;
    let secondary: VisionResult | undefined;

    // Select best model based on task
    switch (taskType) {
      case 'design-critique':
        primary = await this.analyzeWithGPT4Vision(imageUrl, prompt || 'Analyze this design professionally', detail);
        if (useMultipleModels) {
          secondary = await this.analyzeWithBLIP(imageUrl);
        }
        break;

      case 'ocr':
        // Google Vision is best for OCR, fallback to GPT-4
        if (this.googleVisionKey) {
          primary = await this.analyzeWithGoogleVision(imageUrl, ['TEXT_DETECTION']);
        } else {
          primary = await this.analyzeWithGPT4Vision(imageUrl, 'Extract all text from this image', 'high');
        }
        break;

      case 'art-style':
        primary = await this.analyzeWithGPT4Vision(imageUrl, 'Analyze the artistic style, techniques, and aesthetic elements of this image', 'high');
        if (useMultipleModels) {
          secondary = await this.analyzeWithBLIP(imageUrl);
        }
        break;

      case 'general':
      default:
        // Use BLIP for fast captioning, GPT-4 for detailed analysis
        primary = await this.analyzeWithBLIP(imageUrl);
        if (useMultipleModels) {
          secondary = await this.analyzeWithGPT4Vision(imageUrl, prompt || 'Describe this image in detail', detail);
        }
        break;
    }

    // Combine results
    const combined = this.synthesizeResults(primary, secondary);
    const structured = this.extractStructuredData(primary, secondary);

    return {
      primary,
      secondary,
      combined,
      structured
    };
  }

  /**
   * GPT-4 Vision (OpenAI) - Best for complex analysis
   */
  private async analyzeWithGPT4Vision(
    imageUrl: string,
    prompt: string,
    detail: 'low' | 'high' | 'auto' = 'auto'
  ): Promise<VisionResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Updated to latest model
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail
                  }
                }
              ]
            }
          ],
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GPT-4 Vision failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const description = data.choices[0].message.content;

      return {
        model: 'gpt-4o-vision',
        description,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('GPT-4 Vision error:', error);
      throw error;
    }
  }

  /**
   * BLIP (Salesforce) via Hugging Face - Best for detailed captioning
   */
  private async analyzeWithBLIP(imageUrl: string): Promise<VisionResult> {
    const startTime = Date.now();

    try {
      // Fetch image as blob
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();

      const response = await fetch(
        'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.huggingfaceKey}`,
            'Content-Type': 'application/json'
          },
          body: imageBlob
        }
      );

      if (!response.ok) {
        throw new Error(`BLIP failed: ${response.statusText}`);
      }

      const data = await response.json();
      const description = data[0]?.generated_text || 'No caption generated';

      return {
        model: 'blip-large',
        description,
        confidence: data[0]?.score,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('BLIP error:', error);
      // Fallback to GPT-4 if BLIP fails
      return this.analyzeWithGPT4Vision(imageUrl, 'Describe this image concisely', 'low');
    }
  }

  /**
   * Google Cloud Vision - Best for OCR and label detection
   */
  private async analyzeWithGoogleVision(
    imageUrl: string,
    features: string[] = ['LABEL_DETECTION', 'TEXT_DETECTION', 'IMAGE_PROPERTIES']
  ): Promise<VisionResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                image: { source: { imageUri: imageUrl } },
                features: features.map(type => ({ type, maxResults: 10 }))
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Google Vision failed: ${response.statusText}`);
      }

      const data = await response.json();
      const annotations = data.responses[0];

      // Extract labels
      const labels = annotations.labelAnnotations?.map((l: any) => l.description) || [];
      
      // Extract text (OCR)
      const text = annotations.textAnnotations?.[0]?.description || '';
      
      // Extract dominant colors
      const colors = annotations.imagePropertiesAnnotation?.dominantColors?.colors
        ?.slice(0, 5)
        .map((c: any) => {
          const { red, green, blue } = c.color;
          return `rgb(${red}, ${green}, ${blue})`;
        }) || [];

      // Build description
      const description = this.buildGoogleVisionDescription(labels, text, colors);

      return {
        model: 'google-vision',
        description,
        details: {
          labels,
          text,
          colors
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('Google Vision error:', error);
      // Fallback to GPT-4
      return this.analyzeWithGPT4Vision(imageUrl, 'Analyze this image', 'auto');
    }
  }

  /**
   * Synthesize results from multiple models into a comprehensive description
   */
  private synthesizeResults(primary: VisionResult, secondary?: VisionResult): string {
    let combined = `**${primary.model.toUpperCase()} ANALYSIS:**\n${primary.description}`;

    if (secondary) {
      combined += `\n\n**${secondary.model.toUpperCase()} ANALYSIS:**\n${secondary.description}`;
    }

    // Add technical details if available
    if (primary.details) {
      combined += '\n\n**TECHNICAL DETAILS:**';
      if (primary.details.labels?.length) {
        combined += `\n- Detected Elements: ${primary.details.labels.join(', ')}`;
      }
      if (primary.details.text) {
        combined += `\n- Extracted Text: "${primary.details.text}"`;
      }
      if (primary.details.colors?.length) {
        combined += `\n- Dominant Colors: ${primary.details.colors.join(', ')}`;
      }
    }

    return combined;
  }

  /**
   * Extract structured data from vision results
   */
  private extractStructuredData(
    primary: VisionResult,
    secondary?: VisionResult
  ): MultiVisionAnalysis['structured'] {
    const keyElements: string[] = [];
    const technicalDetails: Record<string, any> = {};

    // Extract from primary
    if (primary.details?.labels) {
      keyElements.push(...primary.details.labels);
    }
    if (primary.details?.text) {
      technicalDetails.extractedText = primary.details.text;
    }
    if (primary.details?.colors) {
      technicalDetails.dominantColors = primary.details.colors;
    }

    // Create summary
    const summary = secondary?.description || primary.description;

    return {
      summary: summary.slice(0, 300) + (summary.length > 300 ? '...' : ''),
      keyElements: [...new Set(keyElements)].slice(0, 10),
      technicalDetails: Object.keys(technicalDetails).length > 0 ? technicalDetails : undefined
    };
  }

  /**
   * Build human-readable description from Google Vision data
   */
  private buildGoogleVisionDescription(labels: string[], text: string, colors: string[]): string {
    let desc = '';

    if (labels.length > 0) {
      desc += `This image contains: ${labels.slice(0, 5).join(', ')}. `;
    }

    if (text) {
      desc += `Visible text reads: "${text.slice(0, 200)}${text.length > 200 ? '...' : ''}". `;
    }

    if (colors.length > 0) {
      desc += `Dominant colors include ${colors.slice(0, 3).join(', ')}.`;
    }

    return desc || 'Image analyzed successfully.';
  }

  /**
   * Compare two images
   */
  async compareImages(
    imageUrl1: string,
    imageUrl2: string,
    context?: string
  ): Promise<{ comparison: string; differences: string[]; similarities: string[] }> {
    const [analysis1, analysis2] = await Promise.all([
      this.analyzeImage(imageUrl1, { useMultipleModels: false }),
      this.analyzeImage(imageUrl2, { useMultipleModels: false })
    ]);

    // Use GPT-4 to compare
    const comparisonPrompt = `Compare these two images:

IMAGE 1: ${analysis1.combined}

IMAGE 2: ${analysis2.combined}

${context ? `Context: ${context}` : ''}

Provide:
1. Key differences
2. Similarities
3. Overall comparison`;

    const comparisonResult = await this.analyzeWithGPT4Vision(
      imageUrl1,
      comparisonPrompt,
      'low'
    );

    return {
      comparison: comparisonResult.description,
      differences: ['Detailed comparison available in main analysis'],
      similarities: ['Detailed comparison available in main analysis']
    };
  }
}
