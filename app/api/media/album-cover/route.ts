import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';


/**
 * Album Cover Generation API
 * Convenience endpoint specifically for album covers
 */
export async function POST(request: NextRequest) {
  try {
    const albumData = await request.json() as any;
    
    // Build prompt for album cover
    const prompt = buildAlbumCoverPrompt(albumData);
    
    // Call DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });
    
    if (!response.ok) {
      throw new Error('DALL-E API failed');
    }
    
    const data = await response.json() as any;
    
    return NextResponse.json({
      success: true,
      imageUrl: data.data[0].url,
      prompt
    });
  } catch (error) {
    console.error('Album cover generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate album cover' },
      { status: 500 }
    );
  }
}

function buildAlbumCoverPrompt(data: any): string {
  let prompt = `Professional album cover for "${data.trackTitle}" by ${data.artist}. `;
  
  if (data.genre) prompt += `${data.genre} music. `;
  if (data.mood) prompt += `Mood: ${data.mood}. `;
  
  const styleDescriptions: Record<string, string> = {
    minimalist: 'Minimalist design, clean lines, simple composition.',
    bold: 'Bold, striking, high contrast, dramatic.',
    artistic: 'Artistic, creative, unique, expressive.',
    photographic: 'Photographic, realistic, cinematic.',
    abstract: 'Abstract, surreal, conceptual.',
    retro: 'Retro, vintage, nostalgic.',
    modern: 'Modern, contemporary, sleek.'
  };
  
  if (data.style && styleDescriptions[data.style]) {
    prompt += styleDescriptions[data.style] + ' ';
  }
  
  prompt += 'High quality, 3000x3000px. NO text, NO artist name (pure visual design only).';
  
  return prompt;
}
