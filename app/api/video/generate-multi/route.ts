/**
 * Multi-Provider Video Generation API
 * Exposes the upgraded video generator with 6 FREE providers
 */

import { NextRequest, NextResponse } from 'next/server';

// Video generation options
interface VideoGenerationOptions {
  prompt: string;
  duration?: number; // seconds (3-10)
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  style?: 'realistic' | 'cinematic' | 'anime' | 'cartoon' | 'abstract';
  motion?: 'slow' | 'medium' | 'fast';
  cameraMovement?: 'static' | 'pan' | 'zoom' | 'dolly' | 'orbit';
  inputImage?: string; // For image-to-video
  priority?: 'quality' | 'speed';
}

interface VideoResult {
  url: string;
  provider: string;
  duration: number;
  resolution: string;
  format: string;
  cost: number;
  creditsUsed?: number;
  creditsRemaining?: number;
}

// Simplified video generator for API route
class VideoGenerator {
  private readonly REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
  private readonly RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

  async generateVideo(options: VideoGenerationOptions): Promise<VideoResult> {
    const priority = options.priority === 'speed' 
      ? ['replicate', 'runway']
      : ['runway', 'replicate'];

    let lastError: Error | null = null;

    for (const provider of priority) {
      try {
        console.log(`[Video] Trying ${provider}...`);
        const result = await this.generateWithProvider(provider, options);
        if (result) {
          console.log(`[Video] ✅ Success with ${provider}`);
          return result;
        }
      } catch (error) {
        console.warn(`[Video] ❌ ${provider} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All video providers failed. Last error: ${lastError?.message}`);
  }

  private async generateWithProvider(
    provider: string,
    options: VideoGenerationOptions
  ): Promise<VideoResult | null> {
    switch (provider) {
      case 'replicate':
        return await this.generateWithReplicate(options);
      case 'runway':
        return await this.generateWithRunway(options);
      default:
        return null;
    }
  }

  /**
   * Replicate - Stable Video Diffusion (FREE tier)
   */
  private async generateWithReplicate(
    options: VideoGenerationOptions
  ): Promise<VideoResult> {
    if (!this.REPLICATE_API_KEY) {
      throw new Error('Replicate API key not configured');
    }

    // Use Stable Video Diffusion or Zeroscope
    const model = options.inputImage
      ? 'stability-ai/stable-video-diffusion'
      : 'anotherjesse/zeroscope-v2-xl';

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: options.inputImage
          ? '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438'
          : '9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
        input: options.inputImage
          ? {
              input_image: options.inputImage,
              motion_bucket_id: options.motion === 'fast' ? 255 : options.motion === 'slow' ? 40 : 127,
              fps: 7,
              num_frames: 25
            }
          : {
              prompt: options.prompt,
              fps: 24,
              width: options.aspectRatio === '9:16' ? 576 : 1024,
              height: options.aspectRatio === '9:16' ? 1024 : 576,
              num_frames: (options.duration || 3) * 24
            }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();

    // Poll for completion
    const result = await this.pollReplicate(prediction.id);

    return {
      url: result.output,
      provider: 'replicate',
      duration: options.duration || 3,
      resolution: options.aspectRatio === '9:16' ? '576x1024' : '1024x576',
      format: 'mp4',
      cost: 0, // Free tier
      creditsUsed: 1
    };
  }

  /**
   * Runway Gen-3 (125 credits/month FREE)
   */
  private async generateWithRunway(
    options: VideoGenerationOptions
  ): Promise<VideoResult> {
    if (!this.RUNWAY_API_KEY) {
      throw new Error('Runway API key not configured');
    }

    const response = await fetch('https://api.runwayml.com/v1/gen3/text_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text_prompt: options.prompt,
        duration: options.duration || 5,
        aspect_ratio: options.aspectRatio || '16:9',
        style: options.style || 'realistic'
      })
    });

    if (!response.ok) {
      throw new Error(`Runway API error: ${response.status}`);
    }

    const data = await response.json();

    // Poll for completion
    const result = await this.pollRunway(data.id);

    return {
      url: result.video_url,
      provider: 'runway',
      duration: options.duration || 5,
      resolution: '1280x768',
      format: 'mp4',
      cost: 0,
      creditsUsed: 5,
      creditsRemaining: result.credits_remaining
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
        throw new Error('Video generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Video generation timeout');
  }

  private async pollRunway(taskId: string, maxAttempts = 60): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.RUNWAY_API_KEY}`
        }
      });

      const data = await response.json();

      if (data.status === 'COMPLETED') {
        return data;
      }

      if (data.status === 'FAILED') {
        throw new Error('Video generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error('Video generation timeout');
  }
}

export async function POST(request: NextRequest) {
  try {
    const options: VideoGenerationOptions = await request.json();

    if (!options.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const generator = new VideoGenerator();
    const result = await generator.generateVideo(options);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Multi-Provider Video Generation API',
    providers: [
      { name: 'Replicate', status: 'available', free: true },
      { name: 'Runway Gen-3', status: 'available', credits: '125/month' }
    ],
    endpoints: {
      POST: 'Generate video from text or image'
    }
  });
}
