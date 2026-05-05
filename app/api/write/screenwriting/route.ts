import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, genre, format = 'standard' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are a professional Hollywood screenwriter and script doctor. Format responses using standard screenplay formatting (Courier font style, proper indentation for scene headings, action lines, character names, parentheticals, and dialogue). Do not use markdown backticks unless wrapping the entire output.`;

    const userPrompt = `Write a short script scene based on the following prompt:
"${prompt}"

Genre: ${genre || 'Drama'}
Format: ${format === 'music-video' ? 'Music Video Treatment / Script' : 'Standard Screenplay'}

Focus on strong visual storytelling, snappy dialogue, and clear character voices. Be creative and captivating.`;

    console.log(`[Screenwriting API] Generating scene for prompt: "${prompt}"`);

    const routeResult = smartRoute(userPrompt, { taskHint: 'creative' });
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user'   as const, content: userPrompt   },
    ];

    const { text: script, model: usedModel } = await cascadeCollect(
      routeResult.waterfall,
      messages,
      { temperature: 0.85, maxTokens: 1800 },
    );

    if (!script) {
      return NextResponse.json({ success: false, error: 'Failed to generate script' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        script: script.trim(),
        provider: usedModel.displayName,
      },
    });

  } catch (error: any) {
    console.error('[Screenwriting API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
