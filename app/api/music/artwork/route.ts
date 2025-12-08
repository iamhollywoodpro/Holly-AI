import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      albumName,
      artistName, 
      genre = 'pop',
      mood = 'energetic',
      style = 'modern',
      additionalPrompt = ''
    } = await req.json();

    if (!albumName) {
      return NextResponse.json({ 
        error: 'Missing albumName' 
      }, { status: 400 });
    }

    // Use external image generation API from HOLLY ecosystem
    try {
      const imagePrompt = `Professional album artwork design for "${albumName}" by ${artistName || 'Artist'}.
Genre: ${genre}, Mood: ${mood}, Style: ${style}.
${additionalPrompt}

Requirements:
- Square format (1:1 aspect ratio)
- Professional music album design
- Bold typography for album title
- ${mood} mood and ${genre} genre aesthetics
- Modern, eye-catching design
- High contrast and visual impact`;

      // Call HOLLY's own image generation endpoint
      const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/image/generate-ultimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          userId,
          aspectRatio: '1:1',
          model: 'flux-schnell',
          highQuality: true
        })
      });

      if (!imageResponse.ok) {
        throw new Error('Image generation failed');
      }

      const imageResult = await imageResponse.json();

      // Save to database
      // No database model for artwork - return generated data directly
      return NextResponse.json({
        success: true,
        artwork: {
          id: `artwork_${Date.now()}`, // Generate temporary ID
          albumName,
          artistName,
          imageUrl: imageResult.imageUrl,
          style,
          mood,
          genre
        }
      });

    } catch (error) {
      console.error('Artwork generation error:', error);
      
      // Fallback response with design suggestions
      return NextResponse.json({
        success: false,
        message: 'Artwork generation temporarily unavailable',
        suggestions: {
          albumName,
          artistName,
          genre,
          mood,
          designGuidelines: [
            `Use ${mood} colors and ${genre} aesthetics`,
            'Bold, readable typography',
            'Square format (3000x3000px recommended)',
            'High contrast for thumbnail visibility',
            `Style: ${style}`
          ],
          recommendedTools: [
            'Canva (Free templates)',
            'Adobe Photoshop',
            'GIMP (Free)',
            'Figma'
          ]
        }
      });
    }

  } catch (error: any) {
    console.error('Artwork API error:', error);
    return NextResponse.json({
      error: 'Artwork creation failed',
      details: error.message
    }, { status: 500 });
  }
}
