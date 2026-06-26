import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Artist Image Generation — 100% FREE via Pollinations AI
 * No API key needed. No limits. MIT-friendly.
 * https://gen.pollinations.ai/image/{prompt}
 */

interface GenerateArtistImageRequest {
  artist_id: string;
  prompt?: string;
  use_artist_style?: boolean;
}

function buildPollinationsUrl(prompt: string, width = 1024, height = 1024): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux`;
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
    const imageUrl = buildPollinationsUrl(imagePrompt);

    // Verify the URL is reachable (Pollinations generates synchronously)
    const check = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    if (!check.ok) {
      throw new Error(`Pollinations returned ${check.status}`);
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      artist_id,
      provider: 'pollinations-flux',
    });

  } catch (error: any) {
    console.error('Error generating artist image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate artist image' },
      { status: 500 }
    );
  }
}
