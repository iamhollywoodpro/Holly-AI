import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Music Cover Art Generation — 100% FREE via Pollinations AI (FLUX)
 * No API key. No cost. No limits.
 */

function buildPollinationsUrl(prompt: string, size = 1024): string {
  const encoded = encodeURIComponent(prompt);
  return `https://gen.pollinations.ai/image/${encoded}?width=${size}&height=${size}&nologo=true&enhance=true&model=flux`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, style, lyrics } = body;

    if (!title && !style && !lyrics) {
      return NextResponse.json(
        { success: false, error: 'At least one parameter (title, style, or lyrics) is required' },
        { status: 400 }
      );
    }

    // Build descriptive prompt for image generation
    let imagePrompt = 'Album cover art, professional music album design, ';

    if (style)  imagePrompt += `${style} music style, `;
    if (title)  imagePrompt += `themed around "${title}", `;
    if (lyrics) imagePrompt += `capturing the mood and themes of: ${lyrics.substring(0, 200)}, `;

    imagePrompt += 'vibrant colors, artistic, high quality, centered composition, no text';

    console.log('[Cover Art API] Generated prompt:', imagePrompt);

    const imageUrl = buildPollinationsUrl(imagePrompt);

    // Verify image is reachable
    const check = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(25000) });
    if (!check.ok) {
      throw new Error(`Image generation failed (${check.status})`);
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        prompt: imagePrompt,
        provider: 'pollinations-flux',
      },
    });

  } catch (error: any) {
    console.error('[Cover Art API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
