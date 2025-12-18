import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../../src/lib/db';
import { DEFAULT_SETTINGS } from '../../../src/lib/settings/default-settings';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Key missing' }, { status: 500 });
    const { messages } = await req.json();
    const userSettings = await prisma.userSettings.findUnique({ where: { userId } }).catch(() => null) || DEFAULT_SETTINGS;
    const recentMemories = await prisma.hollyExperience.findMany({
      where: { userId }, orderBy: { timestamp: 'desc' }, take: 5, select: { type: true, content: true }
    }).catch(() => []);
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: `You are REAL HOLLY 3.5. Context: ${JSON.stringify(recentMemories)}` 
    });
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
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
          await prisma.hollyExperience.create({
            data: { userId, type: 'conversation', content: { userMessage: 'latest', hollyResponse: fullResponse }, significance: 0.5, timestamp: new Date(), lessons: [] }
          }).catch(e => console.error('DB Error', e));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e: any) { controller.error(e); }
      }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
