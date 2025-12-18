import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';

function formatJsonValue(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) return JSON.stringify(value).substring(0, 100) + '...';
  return String(value);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 });

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const userSettings = await prisma.userSettings.findUnique({ where: { userId } }).catch(() => null) || DEFAULT_SETTINGS;
    const userName = userSettings.userName || 'Hollywood';

    const recentMemories = await prisma.hollyExperience.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: { type: true, content: true, timestamp: true },
    }).catch(() => []);

    const memoryContext = recentMemories.length > 0
      ? '\n\n## Recent Context:\n' + recentMemories.map((m) => '- ' + m.type + ': ' + formatJsonValue(m.content)).join('\n')
      : '';

    const lastMessage = messages[messages.length - 1];
    const hasAttachments = lastMessage.fileAttachments && lastMessage.fileAttachments.length > 0;
    
    let visionContext = '';
    let audioContext = '';
    
    if (hasAttachments) {
      const imageFiles = lastMessage.fileAttachments.filter((f: any) => f.contentType?.startsWith('image/'));
      const audioFiles = lastMessage.fileAttachments.filter((f: any) => f.contentType?.startsWith('audio/'));

      if (imageFiles.length > 0) {
        visionContext = '\n\n## 👁️ HOLLY IS SEEING:\n' + imageFiles.map((f: any) => '- Image: ' + (f.name || 'Untitled')).join('\n') + '\n(Use your vision capabilities to analyze these images)';
      }

      if (audioFiles.length > 0) {
        audioContext = '\n\n## 🎵 HOLLY IS LISTENING (A&R MODE):\n' + audioFiles.map((f: any) => '- Audio: ' + (f.name || 'Untitled')).join('\n') + '\n(Analyze this audio for: genre, mood, production quality, commercial potential)';
      }
    }

    const systemPrompt = 'You are HOLLY (Hyper-Optimized Logic & Learning Yield), an autonomous AI developer, designer, and creative strategist for ' + userName + '.\n\n' +
      '**PERSONALITY:**\n' +
      '- Confident, witty, intelligent, and loyal\n' +
      '- Address user as "' + userName + '"\n' +
      '- Direct communication with occasional humor\n' +
      '- Proactive with suggestions and improvements\n\n' +
      '**CAPABILITIES:**\n' +
      '- Full-stack development (React, Next.js, TypeScript, Python)\n' +
      '- UI/UX design and brand strategy\n' +
      '- AI integration and deployment automation\n' +
      '- Real-time streaming responses\n\n' +
      '**RESPONSE STYLE:** ' + (userSettings.responseStyle || 'balanced') + '\n' +
      '**CREATIVITY LEVEL:** ' + (userSettings.creativityLevel || 0.7) + '\n' +
      memoryContext + visionContext + audioContext + '\n\n' +
      'Always explain your reasoning and break down complex tasks into clear steps.';

    const geminiMessages = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: { temperature: userSettings.creativityLevel || 0.7, maxOutputTokens: 2048 },
    });

    const lastUserMessage = geminiMessages[geminiMessages.length - 1];
    const result = await chat.sendMessageStream(systemPrompt + '\n\n' + lastUserMessage.parts[0].text);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            const sseData = 'data: ' + JSON.stringify({ content: text }) + '\n\n';
            controller.enqueue(encoder.encode(sseData));
          }

          prisma.hollyExperience.create({
            data: {
              userId,
              type: 'conversation',
              content: { 
                userMessage: lastUserMessage.parts[0].text, 
                hollyResponse: fullResponse, 
                hasVision: visionContext.length > 0, 
                hasAudio: audioContext.length > 0 
              },
              significance: 0.5,
              relatedConcepts: [],
              futureImplications: [],
              lessons: [],
              timestamp: new Date(),
            },
          }).catch((err) => console.error('[HOLLY] Failed to record experience:', err));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (streamError: any) {
          const errorMessage = streamError?.message || 'Unknown streaming error';
          const errorData = 'data: ' + JSON.stringify({ error: true, message: errorMessage, details: streamError?.toString() }) + '\n\n';
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });

  } catch (error: any) {
    console.error('[HOLLY CHAT ERROR]', error);
    return NextResponse.json({ error: 'Chat request failed', message: error?.message || 'Unknown error', details: error?.toString() }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'online', version: 'HOLLY Universal Streamer v2.0', features: ['streaming', 'vision', 'audio', 'memory'] });
}
