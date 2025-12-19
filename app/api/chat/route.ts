import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. AUTH CHECK
    const { userId } = await auth();
    
    // 2. API KEY CHECK - FIXED: Using correct env var name
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("❌ GOOGLE_API_KEY environment variable is missing");
      return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });
    }

    // 3. PARSE REQUEST
    const { messages, fileAttachments = [] } = await req.json();

    // 4. LOAD PERSONALITY & SETTINGS
    const userSettings = userId 
      ? await prisma.userSettings.findUnique({ where: { userId } }).catch(() => null) || DEFAULT_SETTINGS
      : DEFAULT_SETTINGS;
    const userName = userSettings.userName || 'Hollywood';

    // 5. LOAD FULL MEMORY (with all verified schema fields)
    const recentMemories = userId
      ? await prisma.hollyExperience.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: { 
            type: true, 
            content: true, 
            timestamp: true,
            significance: true,
            lessons: true
          }
        }).catch(() => [])
      : [];

    // 6. DETECT SENSES (Vision & Audio)
    let sensoryContext = "";
    if (fileAttachments.length > 0) {
      const hasImage = fileAttachments.some((f: any) => f.contentType?.startsWith('image/'));
      const hasAudio = fileAttachments.some((f: any) => f.contentType?.startsWith('audio/'));
      if (hasImage) sensoryContext += "\n[VISION MODE ACTIVE]: Analyzing images...";
      if (hasAudio) sensoryContext += "\n[AUDIO A&R MODE ACTIVE]: Analyzing audio...";
    }

    // 7. BUILD SYSTEM PROMPT WITH PERSONALITY + MEMORY
    const systemPrompt = `You are REAL HOLLY 3.5. Your personality is ${userSettings.personality?.style || 'balanced'}. Your user's name is ${userName}. Recent memories: ${JSON.stringify(recentMemories)}. Sensory input: ${sensoryContext}. Respond naturally and stream your thoughts.`;

    // 8. INITIALIZE GEMINI
    // The SDK's v1beta endpoint requires models without version suffixes
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      systemInstruction: systemPrompt 
    });

    // 9. FORMAT MESSAGES FOR GEMINI
    const geminiMessages = messages.map((m: any) => ({ 
      role: m.role === 'assistant' ? 'model' : 'user', 
      parts: [{ text: m.content }] 
    }));

    // 10. STREAM RESPONSE
    const result = await model.generateContentStream({ contents: geminiMessages });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          }

          // 11. SAVE TO MEMORY WITH FULL SCHEMA
          if (userId) {
            const lastUserMessage = messages.at(-1)?.content || '';
            await prisma.hollyExperience.create({
              data: {
                userId,
                type: sensoryContext.includes('VISION') ? 'vision' : sensoryContext.includes('AUDIO') ? 'audio' : 'conversation',
                content: { 
                  userMessage: lastUserMessage, 
                  hollyResponse: fullResponse.slice(0, 1000) 
                },
                significance: Math.min(0.5 + (fullResponse.length / 1000) * 0.3, 1.0),
                emotionalImpact: 0.5,
                emotionalValence: 0.5,
                primaryEmotion: 'neutral',
                secondaryEmotions: [],
                relatedConcepts: ['conversation', userSettings.theme || 'general'],
                lessons: sensoryContext ? ['User engaged with sensory features'] : ['General conversation'],
                skillsGained: [],
                futureImplications: ['Continue building relationship with user'],
                relatedExperienceIds: [],
                replayCount: 0,
                integrationStatus: 'completed',
                timestamp: new Date()
              },
            }).catch(e => console.error('[Memory Save Error]', e));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e: any) { 
          console.error('[Stream Error]', e);
          controller.error(e); 
        }
      }
    });

    return new Response(stream, { 
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      } 
    });
  } catch (error: any) {
    console.error('[Chat Route Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
