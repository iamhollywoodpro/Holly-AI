/**
 * FREE Image Generation API using Puter.js
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
    const { prompt, model, width, height, negative_prompt } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    // Return configuration for client-side generation
    // Actual generation happens in browser using Puter.js
    return NextResponse.json({
      success: true,
      message: 'Use Puter.js client-side for image generation',
      config: {
        prompt,
        model: model || 'black-forest-labs/FLUX.1-dev',
        width: width || 1024,
        height: height || 1024,
        negative_prompt: negative_prompt || ''
      },
      instructions: {
        library: 'puter.js',
        method: 'puter.ai.txt2img()',
        documentation: 'https://developer.puter.com/tutorials/free-unlimited-stable-diffusion-api/'
      }
    });
  } catch (error) {
    console.error('Image generation API error:', error);
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
          id: 'black-forest-labs/FLUX.1-dev',
          name: 'FLUX.1 Dev',
          description: 'Latest FLUX model, excellent quality',
          recommended: true
        },
        {
          id: 'black-forest-labs/FLUX.2',
          name: 'FLUX.2',
          description: 'Newest FLUX model, best quality'
        },
        {
          id: 'stabilityai/stable-diffusion-3-medium',
          name: 'Stable Diffusion 3',
          description: 'High-quality, balanced image generation'
        },
        {
          id: 'stabilityai/stable-diffusion-xl-base-1.0',
          name: 'Stable Diffusion XL',
          description: 'Extra large, detailed images'
        }
      ],
      info: {
        provider: 'Puter.js',
        cost: 'FREE',
        limits: 'Unlimited (user-pays model)',
        documentation: 'https://developer.puter.com/tutorials/free-unlimited-stable-diffusion-api/'
      }
    });
  } catch (error) {
    console.error('Image generation info error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
