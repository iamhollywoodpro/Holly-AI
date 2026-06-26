import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Album Cover Generation — 100% FREE via Pollinations AI (FLUX model)
 * No API key. No cost. No limits.
 * https://image.pollinations.ai
 */

function buildPollinationsUrl(prompt: string, width = 1024, height = 1024): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux`;
}

export async function POST(request: NextRequest) {
  try {
    const albumData = await request.json() as any;
    const prompt = buildAlbumCoverPrompt(albumData);
    const imageUrl = buildPollinationsUrl(prompt);

    // Pollinations generates synchronously — verify it's reachable
    const check = await fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
    if (!check.ok) {
      throw new Error(`Image generation failed (${check.status})`);
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
      provider: 'pollinations-flux',
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
  let prompt = `Professional album cover art`;
  
  if (data.trackTitle && data.artist) {
    prompt += ` for "${data.trackTitle}" by ${data.artist}`;
  }
  prompt += '. ';

  if (data.genre) prompt += `${data.genre} music. `;
  if (data.mood)  prompt += `Mood: ${data.mood}. `;

  const styleDescriptions: Record<string, string> = {
    minimalist:   'Minimalist design, clean lines, simple composition.',
    bold:         'Bold, striking, high contrast, dramatic.',
    artistic:     'Artistic, creative, unique, expressive.',
    photographic: 'Photographic, realistic, cinematic.',
    abstract:     'Abstract, surreal, conceptual.',
    retro:        'Retro, vintage, nostalgic.',
    modern:       'Modern, contemporary, sleek.',
  };

  if (data.style && styleDescriptions[data.style]) {
    prompt += styleDescriptions[data.style] + ' ';
  }

  prompt += 'High quality, 3000x3000px. NO text, NO artist name (pure visual design only).';
  return prompt;
}
