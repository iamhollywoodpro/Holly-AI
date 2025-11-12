import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Image generation API - Stub (TODO: Implement with Prisma storage)
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const HF_API = 'https://api-inference.huggingface.co/models';

const MODELS = [
  { id: 'flux-schnell', name: 'FLUX.1-schnell', endpoint: 'black-forest-labs/FLUX.1-schnell', bestFor: ['general', 'fast'], quality: 'excellent' },
  { id: 'flux-dev', name: 'FLUX.1-dev', endpoint: 'black-forest-labs/FLUX.1-dev', bestFor: ['quality', 'detailed'], quality: 'excellent' },
  { id: 'sdxl', name: 'SDXL', endpoint: 'stabilityai/stable-diffusion-xl-base-1.0', bestFor: ['artistic'], quality: 'excellent' },
  { id: 'sdxl-turbo', name: 'SDXL Turbo', endpoint: 'stabilityai/sdxl-turbo', bestFor: ['fast'], quality: 'great' },
  { id: 'playground', name: 'Playground', endpoint: 'playgroundai/playground-v2.5-1024px-aesthetic', bestFor: ['anime'], quality: 'excellent' },
];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, model = 'flux-schnell' } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];

    // Generate image using Hugging Face
    const response = await fetch(`${HF_API}/${selectedModel.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      throw new Error(`HF API error: ${response.statusText}`);
    }

    const imageBlob = await response.blob();
    const buffer = Buffer.from(await imageBlob.arrayBuffer());

    // TODO: Save to Prisma database + file storage
    // For now, return the image directly
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Image generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
