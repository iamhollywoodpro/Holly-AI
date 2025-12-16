import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  // Initialize Google Generative AI
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // Generate the stream
  const streamingResponse = await model.generateContentStream(messages);

  // Convert the Gemini stream to a Vercel AI-compatible stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamingResponse.stream) {
          if (chunk.text) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk.text })}\n\n`));
          }
        }
        // Send done signal
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
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
}
