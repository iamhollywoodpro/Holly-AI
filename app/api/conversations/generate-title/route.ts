import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';

/**
 * POST /api/conversations/generate-title
 * Generate a smart, concise title for a conversation based on first message.
 * Uses the smart router (speed task: Groq Llama 3.3 → Groq 8B → OpenRouter → CF Kimi).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const firstMessage = body.firstMessage || body.userMessage;

    if (!firstMessage || typeof firstMessage !== 'string') {
      return NextResponse.json(
        { error: 'First message is required' },
        { status: 400 }
      );
    }

    // Smart router — 'speed' task: Groq Llama 3.3 70B → Groq 8B → OpenRouter → CF Kimi
    try {
      const titlePrompt = `Generate a concise, descriptive title (3-6 words) for a conversation that starts with:

"${firstMessage}"

Return ONLY the title, nothing else. Make it clear, professional, and capture the essence of the request.

Examples:
- "create a website for my band" → "Band Website Development"
- "help me debug this python code" → "Python Code Debugging"
- "what's the weather like?" → "Weather Information"
- "I need a logo design" → "Logo Design Project"

Title:`;

      const routeResult = await smartRoute(titlePrompt, { taskHint: 'speed' });
      const { text: raw, model: usedModel } = await cascadeCollect(
        routeResult.waterfall,
        [{ role: 'user', content: titlePrompt }],
        { temperature: 0.3, maxTokens: 50 },
      );

      let generatedTitle = (raw || '').trim();
      generatedTitle = generatedTitle
        .replace(/^["']|["']$/g, '')   // Remove surrounding quotes
        .replace(/^Title:\s*/i, '')    // Remove "Title:" prefix
        .trim();

      if (generatedTitle && generatedTitle.length <= 60) {
        console.log(`[Title Generation] ✅ Generated via ${usedModel.displayName}:`, generatedTitle);
        return NextResponse.json({ title: generatedTitle });
      }
    } catch (err: unknown) {
      console.warn('[Title Generation] Smart router failed, using fallback:', (err as Error).message);
    }

    // Fallback: generate title from message text directly
    const fallbackTitle = generateFallbackTitle(firstMessage);
    console.log('[Title Generation] ✅ Fallback title:', fallbackTitle);
    return NextResponse.json({ title: fallbackTitle });

  } catch (error: unknown) {
    console.error('[Title Generation] Error:', error);
    return NextResponse.json({
      title: 'New Conversation',
      error: 'Failed to generate title',
      details: (error as Error).message,
    });
  }
}

/**
 * Generate a simple fallback title from the first message
 */
function generateFallbackTitle(message: string): string {
  let cleaned = message.trim();
  cleaned = cleaned.replace(/[*_`#]/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ');

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const titleWords = words.slice(0, 6);

  let title = titleWords
    .join(' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  if (words.length > 6) title += '...';

  return title || 'New Conversation';
}
