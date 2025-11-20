import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ConversationSummary, ImportantMoment } from '@/types/summary';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { forceRegenerate } = await req.json().catch(() => ({ forceRegenerate: false }));

    // Check if summary already exists (unless forcing regeneration)
    if (!forceRegenerate) {
      const existingSummary = await prisma.conversationSummary.findUnique({
        where: { conversationId },
      });

      if (existingSummary) {
        return NextResponse.json({
          summary: {
            ...existingSummary,
            importantMoments: existingSummary.importantMoments as ImportantMoment[],
          },
          cached: true,
        });
      }
    }

    // Get conversation with messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.messages.length === 0) {
      return NextResponse.json(
        { error: 'Cannot summarize empty conversation' },
        { status: 400 }
      );
    }

    // Build conversation context
    const conversationText = conversation.messages
      .map((m, i) => `[Message ${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Generate summary using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are HOLLY, an AI assistant analyzing a conversation to create a comprehensive summary.

CONVERSATION TO SUMMARIZE:
${conversationText}

ANALYSIS INSTRUCTIONS:
Generate a structured summary with the following components:

1. MAIN SUMMARY (2-3 sentences)
   - What was the conversation about?
   - What was accomplished?
   
2. KEY POINTS (3-5 bullets)
   - Most important points discussed
   - Decisions made
   - Solutions found
   
3. TOPICS (3-7 short tags)
   - Main topics/themes
   - Technologies mentioned
   - Skills involved
   
4. IMPORTANT MOMENTS (identify 3-5)
   - Decisions: When important choices were made
   - Code: When code was generated or discussed
   - Solutions: When problems were solved
   - Files: When files were created/shared
   - Links: When resources were shared
   - Milestones: When significant progress was made
   
   For each moment, provide:
   - Message number (which message this refers to)
   - Type (decision/code/solution/file/link/milestone)
   - Brief description (1 sentence)
   
5. OUTCOME (1-2 sentences, optional)
   - What was the final result?
   - Was the user's need met?

6. PROJECT PROGRESS (optional)
   - If this is a project conversation, estimate completion: 0.0 to 1.0
   - Only include if it's clearly a project with measurable progress

Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence main summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "topics": ["tag1", "tag2", "tag3"],
  "importantMoments": [
    {
      "messageNumber": 5,
      "type": "decision",
      "description": "Decided to use React for the frontend"
    }
  ],
  "outcome": "Optional outcome description",
  "progress": 0.75
}

Generate the summary:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    let summaryData: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summaryData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse summary:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    // Map message numbers to actual message IDs
    const importantMoments: ImportantMoment[] = (summaryData.importantMoments || []).map((moment: any) => {
      const messageIndex = moment.messageNumber - 1;
      const message = conversation.messages[messageIndex];
      
      return {
        messageId: message?.id || '',
        type: moment.type || 'milestone',
        description: moment.description || '',
        timestamp: message?.createdAt.toISOString() || new Date().toISOString(),
      };
    }).filter((m: ImportantMoment) => m.messageId); // Remove invalid moments

    // Save summary to database
    const savedSummary = await prisma.conversationSummary.upsert({
      where: { conversationId },
      create: {
        conversationId,
        summary: summaryData.summary || 'No summary generated',
        keyPoints: summaryData.keyPoints || [],
        topics: summaryData.topics || [],
        outcome: summaryData.outcome,
        importantMoments: importantMoments as any,
        progress: summaryData.progress,
        messageCount: conversation.messages.length,
      },
      update: {
        summary: summaryData.summary || 'No summary generated',
        keyPoints: summaryData.keyPoints || [],
        topics: summaryData.topics || [],
        outcome: summaryData.outcome,
        importantMoments: importantMoments as any,
        progress: summaryData.progress,
        messageCount: conversation.messages.length,
        updatedAt: new Date(),
      },
    });

    const responseData: ConversationSummary = {
      ...savedSummary,
      importantMoments,
      generatedAt: savedSummary.generatedAt.toISOString(),
      updatedAt: savedSummary.updatedAt.toISOString(),
    };

    return NextResponse.json({
      summary: responseData,
      cached: false,
    });

  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve cached summary
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;

    const summary = await prisma.conversationSummary.findUnique({
      where: { conversationId },
    });

    if (!summary) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
    }

    const responseData: ConversationSummary = {
      ...summary,
      importantMoments: summary.importantMoments as ImportantMoment[],
      generatedAt: summary.generatedAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    };

    return NextResponse.json({
      summary: responseData,
      cached: true,
    });

  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: 'Failed to get summary' },
      { status: 500 }
    );
  }
}
