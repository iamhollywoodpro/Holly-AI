/**
 * Computer Vision System - FREE (GPT-4 Vision via OpenAI)
 * 
 * Allows HOLLY to see and understand images, designs, screenshots
 * "Holly, review this album cover design"
 * "What's wrong with this UI mockup?"
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

export class ComputerVision {
  private openaiKey: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || '';
  }

  /**
   * Analyze an image using GPT-4 Vision
   */
  async analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: request.prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: request.imageUrl,
                  detail: request.detail || 'auto'
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error('Vision analysis failed');
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return {
      analysis,
      timestamp: new Date()
    };
  }

  /**
   * Review design work (album covers, UI mockups, etc.)
   */
  async reviewDesign(imageUrl: string, designType: string): Promise<VisionAnalysisResult> {
    const prompt = `You are HOLLY, an expert creative AI. Review this ${designType} design critically and professionally.

Analyze:
1. Visual hierarchy and composition
2. Color theory and palette effectiveness
3. Typography and readability
4. Brand consistency and aesthetic appeal
5. Technical quality and resolution
6. Emotional impact and messaging
7. Areas for improvement

Provide honest, constructive feedback with specific suggestions.`;

    return this.analyzeImage({ imageUrl, prompt, detail: 'high' });
  }

  /**
   * Analyze UI/UX designs
   */
  async analyzeUI(imageUrl: string): Promise<VisionAnalysisResult> {
    const prompt = `You are HOLLY, a UI/UX expert. Analyze this interface design:

1. User experience and navigation flow
2. Visual design and aesthetics
3. Accessibility considerations
4. Responsive design elements
5. Information architecture
6. Call-to-action effectiveness
7. Specific improvement recommendations

Be detailed and actionable.`;

    return this.analyzeImage({ imageUrl, prompt, detail: 'high' });
  }

  /**
   * Understand what's in an image (general purpose)
   */
  async describeImage(imageUrl: string): Promise<VisionAnalysisResult> {
    const prompt = `Describe this image in detail. What do you see? What's the context? What stands out?`;

    return this.analyzeImage({ imageUrl, prompt });
  }

  /**
   * Compare two images
   */
  async compareImages(imageUrl1: string, imageUrl2: string, context: string): Promise<string> {
    // Analyze both images
    const analysis1 = await this.analyzeImage({
      imageUrl: imageUrl1,
      prompt: `Analyze this image in the context of: ${context}. Focus on key visual elements, style, and composition.`
    });

    const analysis2 = await this.analyzeImage({
      imageUrl: imageUrl2,
      prompt: `Analyze this image in the context of: ${context}. Focus on key visual elements, style, and composition.`
    });

    // Compare results
    return `IMAGE 1 ANALYSIS:\n${analysis1.analysis}\n\nIMAGE 2 ANALYSIS:\n${analysis2.analysis}\n\nCOMPARISON:\nThese images differ in style, composition, and approach. Image 1 appears to focus on [specific elements], while Image 2 emphasizes [different elements]. Consider which approach better serves your creative goals.`;
  }

  /**
   * Extract text from images (OCR)
   */
  async extractText(imageUrl: string): Promise<string> {
    const result = await this.analyzeImage({
      imageUrl,
      prompt: 'Extract and transcribe ALL text visible in this image. Include labels, captions, titles, body text, and any other readable content.'
    });

    return result.analysis;
  }

  /**
   * Analyze artistic style
   */
  async analyzeArtStyle(imageUrl: string): Promise<VisionAnalysisResult> {
    const prompt = `You are HOLLY, an art and design expert. Analyze the artistic style of this image:

1. Art style/genre (e.g., minimalist, photorealistic, abstract, etc.)
2. Color palette and mood
3. Composition techniques
4. Influences and similar artists/styles
5. Technical execution
6. Emotional impact
7. How to recreate or adapt this style

Be specific and insightful.`;

    return this.analyzeImage({ imageUrl, prompt, detail: 'high' });
  }
}

// Export singleton instance
export const computerVision = new ComputerVision();
