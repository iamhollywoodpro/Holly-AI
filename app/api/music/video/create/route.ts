import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      audioUrl,
      visualStyle = 'abstract',
      duration,
      additionalPrompt = ''
    } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ 
        error: 'Missing audioUrl' 
      }, { status: 400 });
    }

    // Use HOLLY's video generation + audio sync
    try {
      const videoPrompt = `Create a ${visualStyle} music video visualization.
${additionalPrompt}

Requirements:
- Sync with music rhythm and beat
- ${visualStyle} visual aesthetic
- Dynamic camera movements
- Color grading matching mood
- Professional music video quality`;

      const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/video/generate-ultimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          userId,
          audioUrl,
          duration: duration || 10,
          model: 'zeroscope-v2',
          fps: 24
        })
      });

      if (!videoResponse.ok) {
        throw new Error('Video generation failed');
      }

      const videoResult = await videoResponse.json();

      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {

        return NextResponse.json({
          success: true,
          musicVideo: {
            id: musicVideo.id,
            videoUrl: videoResult.videoUrl,
            audioUrl,
            visualStyle,
            duration
          }
        });

      } finally {
        await prisma.$disconnect();
      }

    } catch (error) {
      console.error('Music video error:', error);
      
      return NextResponse.json({
        success: false,
        message: 'Music video generation temporarily unavailable',
        instructions: {
          audioUrl,
          visualStyle,
          recommendedServices: [
            'Runway ML',
            'Pika Labs',
            'Kaiber AI',
            'NVIDIA Omniverse Audio2Face'
          ],
          process: [
            '1. Generate video clips matching music style',
            '2. Sync video to audio beats',
            '3. Apply visual effects',
            '4. Render final video'
          ]
        }
      });
    }

  } catch (error: any) {
    console.error('Music video API error:', error);
    return NextResponse.json({
      error: 'Music video creation failed',
      details: error.message
    }, { status: 500 });
  }
}
