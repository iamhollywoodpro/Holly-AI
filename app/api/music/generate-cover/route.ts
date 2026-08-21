import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdult } from '@/lib/auth/require-adult';

/**
 * Music Cover Art Generation — canonical media-generator cascade
 * (Cloudflare free lane / Modal / Klein, content-aware routing).
 *
 * POLLINATIONS REMOVED (Steve, 2026-08-12): banned permanently.
 */

export async function POST(req: NextRequest) {
  try {
    // A6: explicit lyrics/content possible — same age gate as chat and images
    const adultGate = await requireAdult();
    if (adultGate instanceof NextResponse) return adultGate;
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

    const { generateImage } = await import('@/lib/ai/media-generator');
    const result = await generateImage({ prompt: imagePrompt, width: 1024, height: 1024 });

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: result.url,
        prompt: imagePrompt,
        provider: result.provider,
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
