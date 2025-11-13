/**
 * Multi-Provider Image Generation API
 * Best open-source models: FLUX, SDXL, Playground v2.5
 * BETTER than DALL-E 3 in many cases, and FREE!
 */

import { NextRequest, NextResponse } from 'next/server';

interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  numOutputs?: number;
  guidanceScale?: number; // 1-20, higher = more adherence to prompt
  numInferenceSteps?: number; // 20-50, higher = better quality
  style?: 'realistic' | 'artistic' | 'anime' | 'digital-art' | 'photographic';
  provider?: 'flux' | 'sdxl' | 'playground' | 'dalle3' | 'auto';
}

interface ImageResult {
  url: string;
  provider: string;
  width: number;
  height: number;
  cost: number;
  inferenceTime?: number;
}

/**
 * Multi-Provider Image Generator
 * Prioritizes best quality + speed with FREE tiers
 */
class ImageGenerator {
  private readonly REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

  // Provider priority: FLUX > SDXL > Playground > DALL-E 3
  private readonly QUALITY_PRIORITY = ['flux', 'sdxl', 'playground', 'dalle3'];

  async generateImage(options: ImageGenerationOptions): Promise<ImageResult> {
    const provider = options.provider === 'auto' || !options.provider
      ? this.selectBestProvider(options)
      : options.provider;

    console.log(`[Image] Using provider: ${provider}`);

    try {
      return await this.generateWithProvider(provider, options);
    } catch (error) {
      console.warn(`[Image] ${provider} failed, trying fallback...`);
      
      // Try next best provider
      for (const fallbackProvider of this.QUALITY_PRIORITY) {
        if (fallbackProvider === provider) continue;
        
        try {
          return await this.generateWithProvider(fallbackProvider, options);
        } catch (fallbackError) {
          continue;
        }
      }
      
      throw error;
    }
  }

  private selectBestProvider(options: ImageGenerationOptions): string {
    // FLUX: Best for photorealism and complex prompts
    if (options.style === 'realistic' || options.style === 'photographic') {
      return 'flux';
    }
    
    // SDXL: Best for artistic and creative styles
    if (options.style === 'artistic' || options.style === 'digital-art') {
      return 'sdxl';
    }
    
    // Playground: Best for illustrations and anime
    if (options.style === 'anime') {
      return 'playground';
    }
    
    // Default: FLUX (best overall quality)
    return 'flux';
  }

  private async generateWithProvider(
    provider: string,
    options: ImageGenerationOptions
  ): Promise<ImageResult> {
    switch (provider) {
      case 'flux':
        return await this.generateWithFlux(options);
      case 'sdxl':
        return await this.generateWithSDXL(options);
      case 'playground':
        return await this.generateWithPlayground(options);
      case 'dalle3':
        return await this.generateWithDALLE3(options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * FLUX.1 - BEST OVERALL (beats DALL-E 3)
   * Via Replicate (FREE tier) or Hugging Face (FREE)
   */
  private async generateWithFlux(options: ImageGenerationOptions): Promise<ImageResult> {
    const startTime = Date.now();

    if (this.REPLICATE_API_KEY) {
      // Replicate: Better quality, slower
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-schnell', // Fast version (4 steps)
          input: {
            prompt: options.prompt,
            num_outputs: options.numOutputs || 1,
            aspect_ratio: options.aspectRatio || '1:1',
            output_format: 'webp',
            output_quality: 90
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Replicate FLUX error: ${response.status}`);
      }

      const prediction = await response.json();
      const result = await this.pollReplicate(prediction.id);

      return {
        url: Array.isArray(result.output) ? result.output[0] : result.output,
        provider: 'flux-schnell',
        width: 1024,
        height: 1024,
        cost: 0,
        inferenceTime: Date.now() - startTime
      };
    } else if (this.HF_API_KEY) {
      // Hugging Face: Faster, free
      const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: options.prompt,
          parameters: {
            num_inference_steps: 4,
            guidance_scale: 0 // FLUX doesn't need guidance
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hugging Face FLUX error: ${response.status}`);
      }

      const blob = await response.blob();
      // For now, return base64
      const base64 = await this.blobToBase64(blob);

      return {
        url: base64,
        provider: 'flux-hf',
        width: 1024,
        height: 1024,
        cost: 0,
        inferenceTime: Date.now() - startTime
      };
    }

    throw new Error('No FLUX API key configured');
  }

  /**
   * SDXL - BEST FOR ARTISTIC (FREE on Replicate/HF)
   */
  private async generateWithSDXL(options: ImageGenerationOptions): Promise<ImageResult> {
    const startTime = Date.now();

    if (this.REPLICATE_API_KEY) {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: {
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'ugly, blurry, low quality',
            width: options.width || 1024,
            height: options.height || 1024,
            num_outputs: options.numOutputs || 1,
            guidance_scale: options.guidanceScale || 7.5,
            num_inference_steps: options.numInferenceSteps || 30
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Replicate SDXL error: ${response.status}`);
      }

      const prediction = await response.json();
      const result = await this.pollReplicate(prediction.id);

      return {
        url: Array.isArray(result.output) ? result.output[0] : result.output,
        provider: 'sdxl',
        width: options.width || 1024,
        height: options.height || 1024,
        cost: 0,
        inferenceTime: Date.now() - startTime
      };
    } else if (this.HF_API_KEY) {
      const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: options.prompt,
          parameters: {
            negative_prompt: options.negativePrompt,
            num_inference_steps: options.numInferenceSteps || 30,
            guidance_scale: options.guidanceScale || 7.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hugging Face SDXL error: ${response.status}`);
      }

      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);

      return {
        url: base64,
        provider: 'sdxl-hf',
        width: 1024,
        height: 1024,
        cost: 0,
        inferenceTime: Date.now() - startTime
      };
    }

    throw new Error('No SDXL API key configured');
  }

  /**
   * Playground v2.5 - BEST FOR ILLUSTRATIONS (FREE on Replicate)
   */
  private async generateWithPlayground(options: ImageGenerationOptions): Promise<ImageResult> {
    if (!this.REPLICATE_API_KEY) {
      throw new Error('Replicate API key required for Playground');
    }

    const startTime = Date.now();

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'playgroundai/playground-v2.5-1024px-aesthetic:a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24',
        input: {
          prompt: options.prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          num_outputs: options.numOutputs || 1,
          guidance_scale: options.guidanceScale || 3,
          num_inference_steps: options.numInferenceSteps || 25
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate Playground error: ${response.status}`);
    }

    const prediction = await response.json();
    const result = await this.pollReplicate(prediction.id);

    return {
      url: Array.isArray(result.output) ? result.output[0] : result.output,
      provider: 'playground-v2.5',
      width: options.width || 1024,
      height: options.height || 1024,
      cost: 0,
      inferenceTime: Date.now() - startTime
    };
  }

  /**
   * DALL-E 3 - Fallback (PAID but high quality)
   */
  private async generateWithDALLE3(options: ImageGenerationOptions): Promise<ImageResult> {
    if (!this.OPENAI_API_KEY) {
      throw new Error('OpenAI API key required for DALL-E 3');
    }

    const startTime = Date.now();

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: options.prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd'
      })
    });

    if (!response.ok) {
      throw new Error(`DALL-E 3 error: ${response.status}`);
    }

    const data = await response.json();

    return {
      url: data.data[0].url,
      provider: 'dalle3',
      width: 1024,
      height: 1024,
      cost: 0.04, // $0.04 per image
      inferenceTime: Date.now() - startTime
    };
  }

  private async pollReplicate(predictionId: string, maxAttempts = 60): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.REPLICATE_API_KEY}`
        }
      });

      const data = await response.json();

      if (data.status === 'succeeded') {
        return data;
      }

      if (data.status === 'failed') {
        throw new Error('Image generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Image generation timeout');
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const options: ImageGenerationOptions = await request.json();

    if (!options.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const generator = new ImageGenerator();
    const result = await generator.generateImage(options);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Multi-Provider Image Generation API',
    providers: [
      { name: 'FLUX.1', status: 'available', free: true, quality: 'BEST' },
      { name: 'SDXL', status: 'available', free: true, quality: 'Excellent' },
      { name: 'Playground v2.5', status: 'available', free: true, quality: 'Excellent' },
      { name: 'DALL-E 3', status: 'available', cost: '$0.04/image', quality: 'High' }
    ],
    endpoints: {
      POST: 'Generate image from text'
    }
  });
}
