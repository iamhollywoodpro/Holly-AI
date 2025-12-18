import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';

export const runtime = 'nodejs';

function formatJsonValue(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value).substring(0, 100) + '...';
}

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 Chat Route Started");

    // 1. AUTH CHECK
    const { userId } = await auth();
    if (!userId) {
      console.log("❌ Unauthorized: No user ID");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`✅ Authenticated as: ${userId}`);

    // 2. API KEY CHECK
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.log("❌ Missing GOOGLE_AI_API_KEY");
      return NextResponse.json({ error: 'GOOGLE_AI_API_KEY missing' }, { status: 500 });
    }
    console.log("✅ API Key found");

    // 3. PARSE REQUEST
    const body = await req.text();
    console.log("📥 Raw request body:", body);

    let messages;
    try {
      messages = JSON.parse(body);
    } catch (e) {
      console.log("❌ Invalid JSON in request", e.message);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.log("✅ Parsed messages:", messages);

    // 4. FETCH SETTINGS & MEMORY
    const userSettings = await prisma.userSettings.findUnique({ where: { userId } }).catch(() => null) || DEFAULT_SETTINGS;
    console.log("✅ User Settings:", userSettings);

    const recentMemories = await prisma.hollyExperience.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: { type: true, content: true }
    }).catch(() => []);
    console.log("✅ Recent Memories:", recentMemories);

    // 5. SENSES DETECTION
    const lastMessage = messages[messages.length - 1];
    let sensoryContext = "";
    if (lastMessage.fileAttachments?.length > 0) {
       const hasImage = lastMessage.fileAttachments.some((f: any) => f.contentType?.startsWith('image/'));
       const hasAudio = lastMessage.fileAttachments.some((f: any) => f.contentType?.startsWith('audio/'));
       if (hasImage) sensoryContext += "\n[VISION MODE ACTIVE]: Analyze images.";
       if (hasAudio) sensoryContext += "\n[AUDIO A&R MODE ACTIVE]: Analyze music sonics.";
    }
    console.log("✅ Sensory Context:", sensoryContext);

    // 6. GENERATE PROMPT
    const systemPrompt = `You are REAL HOLLY 3.5 for ${userSettings.userName || 'Hollywood'}. Context: ${JSON.stringify(recentMemories)} ${sensoryContext}`;
    console.log("✅ System Prompt:", systemPrompt);

    // 7. INIT GEMINI
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log("✅ Gemini Model Initialized");

    // 8. CREATE MESSAGES FOR GEMINI
    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    console.log("✅ Gemini Messages:", geminiMessages);

    // 9. STREAM RESPONSE
    const result = await model.generateContentStream({ contents: geminiMessages, systemInstruction: systemPrompt });
    console.log("✅ Streaming started");

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

          // 10. SAVE TO DATABASE
          console.log("✅ Saving to database...");
          await prisma.hollyExperience.create({
            data: {
              userId,
              type: 'conversation',
              content: { userMessage: 'latest', hollyResponse: fullResponse },
              significance: 0.5,
              timestamp: new Date(),
              lessons: []
            },
          }).catch(e => {
            console.error("❌ Database Save Failed:", e);
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          console.log("✅ Stream completed");
        } catch (e: any) {
          console.error("❌ Stream Error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });

  } catch (error: any) {
    console.error("🚨 CRITICAL ERROR IN CHAT ROUTE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
