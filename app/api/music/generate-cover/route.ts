import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, style, lyrics } = body;

    if (!title && !style && !lyrics) {
      return NextResponse.json(
        { success: false, error: 'At least one parameter (title, style, or lyrics) is required' },
        { status: 400 }
      );
    }

    // Build a descriptive prompt for image generation
    let imagePrompt = 'Album cover art, professional music album design, ';
    
    if (style) {
      imagePrompt += `${style} music style, `;
    }
    
    if (title) {
      imagePrompt += `themed around "${title}", `;
    }
    
    if (lyrics) {
      // Extract key themes from lyrics (first 200 chars)
      const lyricsPreview = lyrics.substring(0, 200);
      imagePrompt += `capturing the mood and themes of: ${lyricsPreview}, `;
    }
    
    imagePrompt += 'vibrant colors, artistic, high quality, centered composition, no text';

    console.log('[Cover Art API] Generated prompt:', imagePrompt);

    // Call Manus image generation API (free, no credits needed)
    const imageResponse = await fetch('https://api.manus.im/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'flux-1.1-pro',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    const imageData = await imageResponse.json();

    if (!imageResponse.ok) {
      console.error('[Cover Art API] Image generation error:', imageData);
      return NextResponse.json(
        { success: false, error: imageData.error?.message || 'Failed to generate cover art' },
        { status: imageResponse.status }
      );
    }

    const imageUrl = imageData.data[0].url;

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        prompt: imagePrompt,
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
