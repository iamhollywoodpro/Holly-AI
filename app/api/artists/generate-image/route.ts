import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

interface GenerateArtistImageRequest {
  artist_id: string;
  prompt?: string;
  use_artist_style?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Lazy-load OpenAI client to avoid build-time initialization
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const body = await request.json() as any;
    const { artist_id, prompt, use_artist_style = true } = body as GenerateArtistImageRequest;

    if (!artist_id) {
      return NextResponse.json(
        { error: 'Artist ID is required' },
        { status: 400 }
      );
    }

    // Generate artist image using DALL-E 3
    const imagePrompt = prompt || `A professional music artist portrait in high quality, photorealistic style`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
    });

    const imageUrl = response.data[0]?.url;

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      artist_id,
    });

  } catch (error: any) {
    console.error('Error generating artist image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate artist image' },
      { status: 500 }
    );
  }
}
