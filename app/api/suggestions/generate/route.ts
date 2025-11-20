import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Suggestion } from '@/types/suggestions';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, messageCount = 5 } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    // Get recent messages for context
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: messageCount,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Reverse to get chronological order
    messages.reverse();

    // Build context for AI
    const context = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Generate suggestions using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = `You are HOLLY, an AI assistant helping to generate contextual suggestions for the user's next actions.

Based on the conversation context below, generate 2-3 highly relevant suggestions that would help the user continue productively.

CONVERSATION CONTEXT:
${context}

SUGGESTION TYPES:
1. Follow-up Questions - Clarifying questions or deeper exploration
2. Quick Actions - Immediate tasks HOLLY can do (create timeline, search docs, generate code)
3. Tool Suggestions - Use specific features (Google Drive, Debugging, Timeline)
4. Navigation - Jump to related areas (projects, settings, history)

GUIDELINES:
- Be specific and actionable
- Match the conversation topic
- Prioritize high-value suggestions
- Keep text concise (max 6 words)
- Include relevant emoji icons

Return ONLY a JSON array with this exact structure:
[
  {
    "type": "question|action|tool|navigation",
    "text": "Suggestion text (max 6 words)",
    "icon": "emoji icon",
    "action": "send_message|execute_tool|navigate",
    "payload": "relevant data",
    "relevanceScore": 0.0-1.0
  }
]

Generate 2-3 suggestions:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    let suggestions: Suggestion[] = [];
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Add unique IDs and validate
        suggestions = parsed.map((s: any, i: number) => ({
          id: `${Date.now()}-${i}`,
          type: s.type || 'action',
          text: s.text || 'Continue conversation',
          icon: s.icon || '💡',
          action: s.action || 'send_message',
          payload: s.payload,
          relevanceScore: s.relevanceScore || 0.8,
        }));

        // Sort by relevance score
        suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Take top 3
        suggestions = suggestions.slice(0, 3);
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      
      // Fallback suggestions based on context
      suggestions = generateFallbackSuggestions(messages);
    }

    return NextResponse.json({ 
      suggestions,
      contextUsed: messages.length 
    });

  } catch (error) {
    console.error('Suggestion generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Fallback suggestions when AI generation fails
function generateFallbackSuggestions(messages: any[]): Suggestion[] {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage?.content?.toLowerCase() || '';

  const suggestions: Suggestion[] = [];

  // Code detection
  if (content.includes('code') || content.includes('function') || content.includes('error')) {
    suggestions.push({
      id: `fb-${Date.now()}-1`,
      type: 'question',
      text: 'Explain this code',
      icon: '💻',
      action: 'send_message',
      payload: 'Can you explain this code in detail?',
      relevanceScore: 0.9,
    });
  }

  // Project detection
  if (content.includes('project') || content.includes('build') || content.includes('create')) {
    suggestions.push({
      id: `fb-${Date.now()}-2`,
      type: 'tool',
      text: 'Add to project timeline',
      icon: '📊',
      action: 'navigate',
      payload: '/timeline',
      relevanceScore: 0.85,
    });
  }

  // Documentation/learning
  if (content.includes('how') || content.includes('what') || content.includes('explain')) {
    suggestions.push({
      id: `fb-${Date.now()}-3`,
      type: 'action',
      text: 'Show examples',
      icon: '📚',
      action: 'send_message',
      payload: 'Can you show me some examples?',
      relevanceScore: 0.8,
    });
  }

  // Default suggestions if none matched
  if (suggestions.length === 0) {
    suggestions.push(
      {
        id: `fb-${Date.now()}-4`,
        type: 'question',
        text: 'Tell me more',
        icon: '💭',
        action: 'send_message',
        payload: 'Can you tell me more about this?',
        relevanceScore: 0.7,
      },
      {
        id: `fb-${Date.now()}-5`,
        type: 'action',
        text: 'Break it down step-by-step',
        icon: '📋',
        action: 'send_message',
        payload: 'Can you break this down step-by-step?',
        relevanceScore: 0.75,
      }
    );
  }

  return suggestions.slice(0, 3);
}
