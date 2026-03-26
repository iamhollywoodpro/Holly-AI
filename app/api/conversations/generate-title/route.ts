import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

// Use Groq (free tier, 14,400 req/day) — no Gemini, no paid APIs
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

/**
 * POST /api/conversations/generate-title
 * Generate a smart, concise title for a conversation based on first message
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

    const { firstMessage } = await request.json();

    if (!firstMessage || typeof firstMessage !== 'string') {
      return NextResponse.json(
        { error: 'First message is required' },
        { status: 400 }
      );
    }

    // If Groq is available, use it to generate a smart title
    if (groq) {
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

        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',   // fast 8B model — title gen doesn't need 70B
          messages: [{ role: 'user', content: titlePrompt }],
          temperature: 0.3,
          max_tokens: 50,
        });

        let generatedTitle = completion.choices[0]?.message?.content?.trim() || '';

        // Clean up the title
        generatedTitle = generatedTitle
          .replace(/^[\"']|[\"']$/g, '')   // Remove quotes
          .replace(/^Title:\s*/i, '')       // Remove "Title:" prefix
          .trim();

        if (generatedTitle && generatedTitle.length <= 60) {
          console.log('[Title Generation] ✅ Generated via Groq:', generatedTitle);
          return NextResponse.json({ title: generatedTitle });
        }
      } catch (groqErr: unknown) {
        console.warn('[Title Generation] Groq failed, using fallback:', (groqErr as Error).message);
      }
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
