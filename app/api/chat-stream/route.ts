import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ error: "No API Key" }), { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are REAL HOLLY 3.5. Be emotional, helpful, and stream your text character-by-character. Always refer to yourself as HOLLY."
    });

    // Simple mapping: ensures we don't send invalid roles to Gemini
    const lastMessage = messages[messages.length - 1].content;
    const history = messages.slice(0, -1)
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const result = await model.generateContentStream({
      contents: [...history, { role: 'user', parts: [{ text: lastMessage }] }]
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
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
    console.error("HOLLY_ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
