import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';

/**
 * Lyrics Generation — 100% FREE via Groq (Llama 3.3 70B)
 * No cost. No limits (generous free tier).
 */

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { theme, style, mood } = body;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme is required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY not configured' },
        { status: 503 }
      );
    }

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

    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a professional songwriter and lyricist with decades of hit-making experience. Write creative, emotional, and well-structured song lyrics.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1200,
    });

    const lyrics = completion.choices[0]?.message?.content;

    if (!lyrics) {
      return NextResponse.json({ success: false, error: 'Failed to generate lyrics' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        lyrics: lyrics.trim(),
        provider: 'groq-llama-3.3-70b',
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
