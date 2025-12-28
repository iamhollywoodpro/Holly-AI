import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { theme, style, mood } = body;

    if (!theme) {
      return NextResponse.json(
        { success: false, error: 'Theme is required' },
        { status: 400 }
      );
    }

    // Build prompt for lyrics generation
    const prompt = `Write song lyrics for a ${style || 'pop'} song with a ${mood || 'upbeat'} mood about: ${theme}

Structure the lyrics with:
[Verse 1]
...

[Chorus]
...

[Verse 2]
...

[Chorus]
...

[Bridge]
...

[Chorus]
...

Make the lyrics creative, emotional, and well-structured. Use vivid imagery and metaphors.`;

    console.log('[Lyrics API] Generating lyrics for theme:', theme);

    // Call OpenAI to generate lyrics
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional songwriter and lyricist. Write creative, emotional, and well-structured song lyrics.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    });

    const lyrics = completion.choices[0].message.content;

    if (!lyrics) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate lyrics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        lyrics: lyrics.trim(),
      },
    });

  } catch (error: any) {
    console.error('[Lyrics API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
