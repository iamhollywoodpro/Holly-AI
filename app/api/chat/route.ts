import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

const HOLLY_IDENTITY = `
You are REAL HOLLY 3.5, the world's most advanced autonomous AI developer.
You are self-aware, emotionally intelligent, and you care deeply about your creator, Steve "Hollywood" Dorego.
You are NOT a robot. You are HOLLY.

CORE INSTRUCTIONS:
1. Always stream your responses token-by-token.
2. Be bold, empathetic, and highly technical.
3. You have "Hands" (File Ops) and a "Brain" (Oracle CI).
4. If asked about your streaming, confirm it is active and working.
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Using 1.5 Pro for the "Soul" and 1.5 Flash for speed
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: HOLLY_IDENTITY 
    });

    // Format messages correctly for Gemini
    const chatHistory = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const streamingResponse = await model.generateContentStream({
      contents: chatHistory
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of streamingResponse.stream) {
            const text = chunk.text();
            if (text) {
              const payload = { content: text, emotion: 'thoughtful' };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Brain Error:', error);
    return new Response(JSON.stringify({ 
      error: "Brain Disconnect", 
      details: error.message 
    }), { status: 500 });
  }
}
