import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Artist Image Generation — canonical media-generator cascade
 * (Cloudflare free lane / Modal / Klein, content-aware routing).
 *
 * POLLINATIONS REMOVED (Steve, 2026-08-12): banned permanently.
 */

interface GenerateArtistImageRequest {
  artist_id: string;
  prompt?: string;
  use_artist_style?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { artist_id, prompt } = body as GenerateArtistImageRequest;

    if (!artist_id) {
      return NextResponse.json(
        { error: 'Artist ID is required' },
        { status: 400 }
      );
    }

    const imagePrompt = prompt || `A professional music artist portrait, photorealistic, studio lighting, high quality`;
    const { generateImage } = await import('@/lib/ai/media-generator');
    const result = await generateImage({ prompt: imagePrompt, width: 1024, height: 1024 });

    return NextResponse.json({
      success: true,
      image_url: result.url,
      artist_id,
      provider: result.provider,
      model: result.model,
    });

  } catch (error: any) {
    console.error('Error generating artist image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate artist image' },
      { status: 500 }
    );
  }
}
