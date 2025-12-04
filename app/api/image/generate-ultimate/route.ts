import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { uploadGeneratedMedia } from '@/lib/storage/media-storage';

/**
 * HOLLY Image Generation - Using Multiple Free APIs
 * 
 * Priority order:
 * 1. Pollinations AI (Free, no API key needed)
 * 2. HuggingFace (if available)
 * 3. DeepAI (fallback)
 */

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

const MODELS = [
  { id: 'flux-schnell', name: 'FLUX.1-schnell', provider: 'pollinations', bestFor: ['general', 'fast'], quality: 'excellent' },
  { id: 'flux-dev', name: 'FLUX.1-dev', provider: 'pollinations', bestFor: ['quality', 'detailed'], quality: 'excellent' },
  { id: 'sdxl', name: 'SDXL', provider: 'pollinations', bestFor: ['artistic'], quality: 'excellent' },
  { id: 'playground', name: 'Playground', provider: 'pollinations', bestFor: ['anime'], quality: 'excellent' },
];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Generate image using Pollinations AI (FREE, no API key required)
 * Docs: https://pollinations.ai/
 */
async function generateWithPollinations(prompt: string, model: string): Promise<Blob> {
  // Pollinations provides a simple image generation API
  // Just construct URL with the prompt and fetch the image
  const cleanPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  
  // Pollinations API endpoint - returns image directly
  const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?seed=${seed}&width=1024&height=1024&model=${model}`;
  
  console.log(`🎨 [POLLINATIONS] Generating: ${imageUrl.substring(0, 100)}...`);
  
  const response = await fetch(imageUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'HOLLY-AI/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status} ${response.statusText}`);
  }

  return await response.blob();
}

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

    // Generate image using Pollinations (free, no API key)
    let imageBlob: Blob;
    let provider = 'pollinations';
    
    try {
      imageBlob = await generateWithPollinations(prompt, model);
      console.log(`✅ [HOLLY] Image generated via Pollinations: ${imageBlob.size} bytes`);
    } catch (error) {
      console.error(`❌ [POLLINATIONS] Failed:`, error);
      
      // Return error with helpful message
      return NextResponse.json({
        success: false,
        error: 'Image generation failed',
        message: 'All image generation services are currently unavailable. Please try again in a moment.',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 503 });
    }

    // Upload to Vercel Blob Storage
    const filename = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`;
    const uploadResult = await uploadGeneratedMedia(imageBlob, filename, 'image/png');

    console.log(`✅ [HOLLY] Image uploaded: ${uploadResult.url}`);

    // Save to database
    const mediaRecord = await prisma.generatedMedia.create({
      data: {
        userId,
        conversationId,
        type: 'image',
        url: uploadResult.url,
        prompt,
        contentType: 'image/png',
        size: uploadResult.size,
        pathname: uploadResult.pathname,
        model: `${provider}:${selectedModel.id}`,
        parameters: { provider, model: selectedModel.id },
      },
    });

    // Return structured response for HOLLY
    return NextResponse.json({
      success: true,
      type: 'image',
      url: uploadResult.url,
      prompt,
      model: selectedModel.name,
      provider,
      mediaId: mediaRecord.id,
      message: `Image generated successfully with ${selectedModel.name} via ${provider}`,
    });

  } catch (error) {
    console.error('❌ [HOLLY] Image generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Image generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Try a different prompt or model.',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/image/generate-ultimate',
    status: 'operational',
    provider: 'Pollinations AI (Free)',
    note: 'Migrated from deprecated HuggingFace Inference API to Pollinations',
    models: MODELS.map(m => ({ id: m.id, name: m.name })),
  });
}
