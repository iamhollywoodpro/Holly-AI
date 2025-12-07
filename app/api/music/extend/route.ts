import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioUrl, duration = 30, continuationStyle = 'seamless' } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ 
        error: 'Missing audioUrl' 
      }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    
    if (replicateToken) {
      try {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            version: 'meta/musicgen:latest',
            input: {
              prompt: `Continue this music seamlessly for ${duration} seconds`,
              model_version: 'melody',
              duration,
              continuation_start: audioUrl,
              continuation: true
            }
          })
        });

        if (!response.ok) {
          throw new Error('Extension API failed');
        }

        const prediction = await response.json();

        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {

          return NextResponse.json({
            success: true,
            extension: {
              id: extendedTrack.id,
              predictionId: prediction.id,
              status: 'processing',
              estimatedDuration: duration,
              checkUrl: `/api/music/extend/${prediction.id}/status`
            }
          });

        } finally {
          await prisma.$disconnect();
        }

      } catch (error) {
        console.error('Extension error:', error);
      }
    }

    // Fallback response
    return NextResponse.json({
      success: false,
      message: 'Music extension API not configured. Please set REPLICATE_API_TOKEN.',
      instructions: {
        audioUrl,
        targetDuration: duration,
        method: 'Loop or AI-extend the audio file',
        suggestedServices: [
          'Replicate (MusicGen)',
          'AIVA',
          'Mubert API'
        ]
      }
    });

  } catch (error: any) {
    console.error('Extend error:', error);
    return NextResponse.json({
      error: 'Extension failed',
      details: error.message
    }, { status: 500 });
  }
}
