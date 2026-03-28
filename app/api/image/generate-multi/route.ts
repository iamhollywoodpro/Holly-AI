/**
 * Multi-Provider Image Generation API
 * 100% FREE — no paid APIs, no OpenAI, no DALL-E
 *
 * Provider waterfall (best quality first):
 *   1. Fal.ai FLUX (requires FAL_KEY — free starter credits)
 *   2. Hugging Face FLUX.1-schnell (requires HUGGINGFACE_API_KEY — free)
 *   3. Pollinations AI (no key — always free, always available)
 *
 * Open-source models used: FLUX.1, SDXL, Playground v2.5
 * All are MIT/Apache 2.0 licensed and free to use.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';


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
  provider?: 'flux' | 'sdxl' | 'playground' | 'pollinations' | 'auto';
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
 * Free Multi-Provider Image Generator
 * Pollinations is always the guaranteed free fallback
 */
class ImageGenerator {
  private readonly REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
  private readonly HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  private readonly FAL_KEY = process.env.FAL_KEY;

  // Provider priority: FLUX (Fal/HF/Replicate) → SDXL → Playground → Pollinations
  private readonly QUALITY_PRIORITY = ['flux', 'sdxl', 'playground', 'pollinations'];

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
      
      // Final guaranteed fallback: Pollinations
      return await this.generateWithPollinations(options);
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
    
    // Default: FLUX (best overall quality) or Pollinations if no key
    if (this.FAL_KEY || this.HF_API_KEY || this.REPLICATE_API_KEY) return 'flux';
    return 'pollinations';
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
      case 'pollinations':
        return await this.generateWithPollinations(options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * FLUX.1 — BEST OVERALL (open-source, Apache 2.0)
   * Via Fal.ai (free credits), Hugging Face (free), or Replicate (free tier)
   */
  private async generateWithFlux(options: ImageGenerationOptions): Promise<ImageResult> {
    const startTime = Date.now();

    // Try Fal.ai first (best quality)
    if (this.FAL_KEY) {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          image_size: { width: options.width || 1024, height: options.height || 1024 },
          num_inference_steps: 4,
          num_images: 1,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { images?: Array<{ url: string }> };
        const url = data.images?.[0]?.url;
        if (url) {
          return {
            url,
            provider: 'flux-schnell-fal',
            width: options.width || 1024,
            height: options.height || 1024,
            cost: 0,
            inferenceTime: Date.now() - startTime,
          };
        }
      }
    }

    // Try Hugging Face (free)
    if (this.HF_API_KEY) {
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
            guidance_scale: 0
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
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
    }

    // Try Replicate (free tier)
    if (this.REPLICATE_API_KEY) {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-schnell',
          input: {
            prompt: options.prompt,
            num_outputs: options.numOutputs || 1,
            aspect_ratio: options.aspectRatio || '1:1',
            output_format: 'webp',
            output_quality: 90
          }
        })
      });

      if (response.ok) {
        const prediction = await response.json();
        const result = await this.pollReplicate(prediction.id);
        return {
          url: Array.isArray(result.output) ? result.output[0] : result.output,
          provider: 'flux-schnell-replicate',
          width: 1024,
          height: 1024,
          cost: 0,
          inferenceTime: Date.now() - startTime
        };
      }
    }

    // Final fallback: Pollinations (always free)
    return this.generateWithPollinations(options);
  }

  /**
   * SDXL — BEST FOR ARTISTIC (open-source, CreativeML OpenRAIL-M)
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

    throw new Error('No SDXL provider configured — falling back to Pollinations');
  }

  /**
   * Playground v2.5 — BEST FOR ILLUSTRATIONS (open-source, free via Replicate)
   */
  private async generateWithPlayground(options: ImageGenerationOptions): Promise<ImageResult> {
    if (!this.REPLICATE_API_KEY) {
      throw new Error('Replicate API key required for Playground — falling back to Pollinations');
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
   * Pollinations AI — 100% FREE, no key, no limits
   * Uses FLUX model under the hood
   */
  private async generateWithPollinations(options: ImageGenerationOptions): Promise<ImageResult> {
    const startTime = Date.now();
    const { width, height } = this.getAspectDimensions(options.aspectRatio, options.width, options.height);
    const encoded = encodeURIComponent(options.prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux`;

    // Verify reachability
    const check = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
    if (!check.ok) throw new Error(`Pollinations returned ${check.status}`);

    return {
      url,
      provider: 'pollinations-flux',
      width,
      height,
      cost: 0,
      inferenceTime: Date.now() - startTime,
    };
  }

  private getAspectDimensions(
    aspectRatio?: string,
    width?: number,
    height?: number
  ): { width: number; height: number } {
    if (width && height) return { width, height };
    const map: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1344, height: 768 },
      '9:16': { width: 768, height: 1344 },
      '1:1':  { width: 1024, height: 1024 },
      '4:3':  { width: 1152, height: 896 },
      '3:4':  { width: 896, height: 1152 },
    };
    return map[aspectRatio || '1:1'] || { width: 1024, height: 1024 };
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
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:${blob.type || 'image/png'};base64,${buffer.toString('base64')}`;
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
    message: 'Multi-Provider Image Generation API — 100% FREE',
    providers: [
      { name: 'FLUX.1 via Fal.ai', status: 'optional', free: true, quality: 'BEST', requiresKey: 'FAL_KEY (free credits)' },
      { name: 'FLUX.1 via Hugging Face', status: 'optional', free: true, quality: 'Best', requiresKey: 'HUGGINGFACE_API_KEY (free)' },
      { name: 'SDXL via Replicate', status: 'optional', free: true, quality: 'Excellent', requiresKey: 'REPLICATE_API_KEY (free tier)' },
      { name: 'Playground v2.5', status: 'optional', free: true, quality: 'Excellent', requiresKey: 'REPLICATE_API_KEY (free tier)' },
      { name: 'Pollinations FLUX', status: 'always available', free: true, quality: 'Good', requiresKey: 'none' },
    ],
    note: 'No paid APIs. No OpenAI. No DALL-E. 100% open-source MIT/Apache models.',
    endpoints: {
      POST: 'Generate image from text'
    }
  });
}
