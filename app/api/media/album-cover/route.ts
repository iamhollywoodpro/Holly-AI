import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Album Cover Generation — canonical media-generator cascade
 * (Cloudflare free lane / Modal / Klein, content-aware routing).
 *
 * POLLINATIONS REMOVED (Steve, 2026-08-12): banned permanently.
 */

export async function POST(request: NextRequest) {
  try {
    const albumData = await request.json() as any;
    const prompt = buildAlbumCoverPrompt(albumData);
    const { generateImage } = await import('@/lib/ai/media-generator');
    const result = await generateImage({ prompt, width: 1024, height: 1024 });

    return NextResponse.json({
      success: true,
      imageUrl: result.url,
      prompt,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('Album cover generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate album cover', detail: (error as Error).message.slice(0, 200) },
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
