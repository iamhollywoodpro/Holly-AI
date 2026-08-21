import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Image Generation API — canonical media-generator cascade.
 * Routes content-aware: Holly-identity → Klein (Modal), non-Holly SFW →
 * Cloudflare Workers AI (FREE, 10k neurons/day), non-Holly explicit → refused.
 *
 * POLLINATIONS REMOVED (Steve, 2026-08-12): banned permanently.
 */

function getAspectDimensions(aspectRatio?: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    '1:1':  { width: 1024, height: 1024 },
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '4:3':  { width: 1024, height: 768  },
    '3:4':  { width: 768,  height: 1024 },
  };
  return map[aspectRatio || '1:1'] || { width: 1024, height: 1024 };
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio } = await request.json() as any;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { width, height } = getAspectDimensions(aspectRatio);
    const { generateImage } = await import('@/lib/ai/media-generator');
    const result = await generateImage({ prompt, width, height });

    return NextResponse.json({
      success: true,
      imageUrl: result.url,
      prompt,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = (error as Error).message || 'Failed to generate image';
    // Refusals are policy outcomes, not server errors
    if (message.startsWith('REFUSED_NONHOLLY_EXPLICIT')) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    return NextResponse.json({ error: 'Failed to generate image', detail: message.slice(0, 200) }, { status: 502 });
  }
}
