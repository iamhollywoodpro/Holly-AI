import { NextRequest, NextResponse } from 'next/server';
import { VideoGenerator } from '@/lib/video/video-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { prompt, type = 'text-to-video', imageUrl, duration = 3, fps = 24 } = body as any;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (type === 'image-to-video' && !imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required for image-to-video generation' },
        { status: 400 }
      );
    }

    const generator = new VideoGenerator();
    let result;

    switch (type) {
      case 'image-to-video':
        result = await generator.generateImageToVideo(imageUrl!, prompt, 'medium');
        break;
      case 'music-video':
        result = await generator.createMusicVideo({ songTitle: prompt, artist: '', prompt });
        break;
      case 'social-reel':
        result = await generator.createSocialReel({ content: prompt, style: 'instagram', duration });
        break;
      case 'text-to-video':
      default:
        result = await generator.generateTextToVideo({ prompt, duration, fps });
        break;
    }

    return NextResponse.json({ success: true, video: result });
  } catch (error: any) {
    console.error('Video generation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
