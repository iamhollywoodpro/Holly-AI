import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioUrl, stems = ['vocals', 'drums', 'bass', 'other'] } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ 
        error: 'Missing audioUrl' 
      }, { status: 400 });
    }

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    
    if (replicateToken) {
      try {
        // Use Demucs or similar for stem separation
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            version: 'cjwbw/deezer-spleeter:latest',
            input: {
              audio: audioUrl,
              stems: stems.length
            }
          })
        });

        if (!response.ok) {
          throw new Error('Stem separation API failed');
        }

        const prediction = await response.json();

        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {

          return NextResponse.json({
            success: true,
            separation: {
              id: stemJob.id,
              predictionId: prediction.id,
              status: 'processing',
              stems: stems,
              checkUrl: `/api/music/stems/${prediction.id}/status`
            }
          });

        } finally {
          await prisma.$disconnect();
        }

      } catch (error) {
        console.error('Stem separation error:', error);
      }
    }

    // Fallback response
    return NextResponse.json({
      success: false,
      message: 'Stem separation API not configured. Please set REPLICATE_API_TOKEN.',
      instructions: {
        audioUrl,
        requestedStems: stems,
        freeTools: [
          'Spleeter (Open Source)',
          'Demucs',
          'LALAL.AI (Free tier)'
        ],
        process: [
          '1. Download audio file',
          '2. Run through Spleeter: spleeter separate -i audio.mp3 -o output/',
          '3. Get separated stems',
          '4. Upload to your storage'
        ]
      }
    });

  } catch (error: any) {
    console.error('Stem separation error:', error);
    return NextResponse.json({
      error: 'Stem separation failed',
      details: error.message
    }, { status: 500 });
  }
}
