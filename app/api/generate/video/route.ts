/**
 * FREE Video Generation API using Puter.js / Wan 2.2
 * No API keys, no costs, client-side generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, model, image_url, width, height, duration } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    // Determine model based on whether image_url is provided
    const selectedModel = model || (image_url ? 'Wan-AI/Wan2.2-I2V-A14B' : 'Wan-AI/Wan2.2-T2V-A14B');

    // Return configuration for client-side generation
    // Actual generation happens in browser using Puter.js
    return NextResponse.json({
      success: true,
      message: 'Use Puter.js client-side for video generation',
      config: {
        prompt,
        model: selectedModel,
        image_url: image_url || undefined,
        width: width || 1024,
        height: height || 576,
        duration: duration || 5
      },
      instructions: {
        library: 'puter.js',
        method: 'puter.ai.txt2vid()',
        documentation: 'https://developer.puter.com/tutorials/free-unlimited-wan-ai-api/'
      }
    });
  } catch (error) {
    console.error('Video generation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Return available models and info
    return NextResponse.json({
      success: true,
      models: [
        {
          id: 'Wan-AI/Wan2.2-T2V-A14B',
          name: 'Wan 2.2 Text-to-Video',
          description: 'Generate videos from text descriptions',
          type: 'text-to-video',
          recommended: true
        },
        {
          id: 'Wan-AI/Wan2.2-I2V-A14B',
          name: 'Wan 2.2 Image-to-Video',
          description: 'Animate static images into videos',
          type: 'image-to-video'
        }
      ],
      info: {
        provider: 'Puter.js / Wan AI',
        cost: 'FREE',
        limits: 'Unlimited (user-pays model)',
        documentation: 'https://developer.puter.com/tutorials/free-unlimited-wan-ai-api/'
      }
    });
  } catch (error) {
    console.error('Video generation info error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
