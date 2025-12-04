import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { uploadGeneratedMedia } from '@/lib/storage/media-storage';

// Image generation API with storage
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
    const { prompt, model = 'flux-schnell', conversationId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];

    console.log(`🎨 [HOLLY] Generating image: "${prompt.substring(0, 50)}..." with ${selectedModel.name}`);

    // Generate image using Hugging Face
    const hfResponse = await fetch(`${HF_API}/${selectedModel.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!hfResponse.ok) {
      throw new Error(`HF API error: ${hfResponse.statusText}`);
    }

    // Get image blob
    const imageBlob = await hfResponse.blob();
    const contentType = hfResponse.headers.get('content-type') || 'image/png';

    // Upload to Vercel Blob Storage
    const filename = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    const uploadResult = await uploadGeneratedMedia(imageBlob, filename, contentType);

    console.log(`✅ [HOLLY] Image uploaded: ${uploadResult.url}`);

    // Save to database
    const mediaRecord = await prisma.generatedMedia.create({
      data: {
        userId,
        conversationId,
        type: 'image',
        url: uploadResult.url,
        prompt,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
        pathname: uploadResult.pathname,
        model: selectedModel.id,
        parameters: { model: selectedModel.id },
      },
    });

    // Return structured response for HOLLY
    return NextResponse.json({
      success: true,
      type: 'image',
      url: uploadResult.url,
      prompt,
      model: selectedModel.name,
      mediaId: mediaRecord.id,
      message: `Image generated successfully with ${selectedModel.name}`,
    });

  } catch (error) {
    console.error('❌ [HOLLY] Image generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Image generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
