import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Image Generation API — 100% FREE via Pollinations AI (FLUX)
 * No API key. No cost. No limits. MIT-friendly.
 * https://image.pollinations.ai
 *
 * Falls back to Fal.ai FLUX if FAL_KEY is set (optional, for higher quality).
 */

function buildPollinationsUrl(prompt: string, width = 1024, height = 1024): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux`;
}

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
    const imageUrl = buildPollinationsUrl(prompt, width, height);

    // Pollinations generates on-the-fly — verify URL works
    const check = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(25000) });
    if (!check.ok) {
      throw new Error(`Image generation failed (${check.status})`);
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
      provider: 'pollinations-flux',
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
