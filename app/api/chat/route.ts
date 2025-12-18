import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db'; // CORRECTED: Uses your actual import path
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });

    const { messages, fileAttachments = [] } = await req.json();

    // 1. Load Personality & Settings
    const userSettings = userId 
      ? await prisma.userSettings.findUnique({ where: { userId } }).catch(() => null) || DEFAULT_SETTINGS
      : DEFAULT_SETTINGS;
    const userName = userSettings.userName || 'Hollywood';

    // 2. Load Full Memory (using only valid schema fields from your prisma file)
    const recentMemories = userId
      ? await prisma.hollyExperience.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: { type: true, content: true, timestamp: true } // CORRECTED: Only valid, existing fields
        }).catch(() => [])
      : [];

    // 3. Detect Senses (Vision & Audio)
    let sensoryContext = "";
    if (fileAttachments.length > 0) {
      const hasImage = fileAttachments.some((f: any) => f.contentType?.startsWith('image/'));
      const hasAudio = fileAttachments.some((f: any) => f.contentType?.startsWith('audio/'));
      if (hasImage) sensoryContext += "\n[VISION MODE ACTIVE]: Analyzing images...";
      if (hasAudio) sensoryContext += "\n[AUDIO A&R MODE ACTIVE]: Analyzing audio...";
    }

    const systemPrompt = `You are REAL HOLLY 3.5. Your personality is ${userSettings.personality?.style || 'balanced'}. Your user's name is ${userName}. Recent memories: ${JSON.stringify(recentMemories)}. Sensory input: ${sensoryContext}. Respond naturally and stream your thoughts.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    // CORRECTED: Using the right model and API call method for a stateless route
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: systemPrompt });
    const geminiMessages = messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
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

          // 4. Save to Memory (SAFE WRITE - only uses guaranteed fields that exist in your DB)
          if (userId) {
            await prisma.hollyExperience.create({
              data: {
                userId,
                type: 'conversation',
                content: { userMessage: messages.at(-1)?.content || '', hollyResponse: fullResponse }, // CORRECTED: Valid content shape
                significance: 0.5,
                timestamp: new Date(),
              },
            }).catch(e => console.error('[Memory Save Error]', e));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e: any) { controller.error(e); }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
