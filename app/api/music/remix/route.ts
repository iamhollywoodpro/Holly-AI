import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioUrl, style = 'electronic', intensity = 0.7 } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ 
        error: 'Missing audioUrl' 
      }, { status: 400 });
    }

    // Use Replicate API if available
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
            version: 'riffusion/riffusion:latest', // Music remixing model
            input: {
              audio: audioUrl,
              prompt_a: style,
              alpha: intensity
            }
          })
        });

        if (!response.ok) {
          throw new Error('Replicate API failed');
        }

        const prediction = await response.json();

        // Save to database
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {

          return NextResponse.json({
            success: true,
            remix: {
              id: remixTrack.id,
              predictionId: prediction.id,
              status: 'processing',
              checkUrl: `/api/music/remix/${prediction.id}/status`
            }
          });

        } finally {
          await prisma.$disconnect();
        }

      } catch (error) {
        console.error('Replicate remix error:', error);
        // Fall through to fallback
      }
    }

    // Fallback: Return instructions for manual remixing
    return NextResponse.json({
      success: false,
      message: 'Music remixing API not configured. Please set REPLICATE_API_TOKEN.',
      instructions: {
        audioUrl,
        style,
        intensity,
        suggestedTools: [
          'Audacity (Free)',
          'FL Studio',
          'Ableton Live'
        ],
        process: [
          '1. Import audio file',
          '2. Apply effects matching style',
          '3. Adjust tempo/pitch',
          '4. Add new elements',
          '5. Export remix'
        ]
      }
    });

  } catch (error: any) {
    console.error('Remix error:', error);
    return NextResponse.json({
      error: 'Remix failed',
      details: error.message
    }, { status: 500 });
  }
}
