import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

// Google Gemini via OpenAI-compatible endpoint
const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

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

    // Generate title using Gemini
    const titlePrompt = `Generate a concise, descriptive title (3-6 words) for a conversation that starts with:

"${firstMessage}"

Return ONLY the title, nothing else. Make it clear, professional, and capture the essence of the request.

Examples:
- "create a website for my band" → "Band Website Development"
- "help me debug this python code" → "Python Code Debugging"
- "what's the weather like?" → "Weather Information"
- "I need a logo design" → "Logo Design Project"

Title:`;

    const completion = await gemini.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'user', content: titlePrompt }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    let generatedTitle = completion.choices[0]?.message?.content?.trim() || '';
    
    // Clean up the title
    generatedTitle = generatedTitle
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
      .trim();

    // Fallback if generation failed or is too long
    if (!generatedTitle || generatedTitle.length > 60) {
      generatedTitle = generateFallbackTitle(firstMessage);
    }

    console.log('[Title Generation] ✅ Generated:', generatedTitle);
    return NextResponse.json({ title: generatedTitle });

  } catch (error: any) {
    console.error('[Title Generation] Error:', error);
    
    // Fallback to simple title generation on error
    const { firstMessage } = await request.json();
    const fallbackTitle = generateFallbackTitle(firstMessage || 'New Conversation');
    
    return NextResponse.json({ title: fallbackTitle });
  }
}

/**
 * Generate a simple fallback title from the first message
 */
function generateFallbackTitle(message: string): string {
  // Clean the message
  let cleaned = message.trim();
  
  // Remove markdown and special characters
  cleaned = cleaned.replace(/[*_`#]/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ');
  
  // Take first 6 words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const titleWords = words.slice(0, 6);
  
  let title = titleWords.join(' ');
  
  // Capitalize first letter of each word
  title = title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Add ellipsis if truncated
  if (words.length > 6) {
    title += '...';
  }
  
  return title || 'New Conversation';
}
