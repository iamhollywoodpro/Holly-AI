import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { maya1Service } from "@/lib/voice/maya1-service";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/voice/stream
 * Stream speech synthesis in real-time
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { text, voiceDescription, addEmotions, emotionContext } = body;

    if (!text) {
      return new Response("Text is required", { status: 400 });
    }

    // Add emotions if requested
    let processedText = text;
    if (addEmotions && emotionContext) {
      processedText = maya1Service.addEmotions(text, emotionContext);
    }

    logger.info("Streaming voice synthesis requested", {
      userId,
      textLength: text.length,
      category: "voice",
    });

    // Create readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of maya1Service.streamSynthesize(processedText, {
            description: voiceDescription,
            streamingEnabled: true,
          })) {
            // Send audio chunk
            controller.enqueue(chunk);
          }

          controller.close();

          logger.info("Streaming voice synthesis completed", {
            userId,
            category: "voice",
          });
        } catch (error: any) {
          logger.error("Streaming voice synthesis failed", {
            userId,
            error: error.message,
            category: "voice",
          });

          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/wav",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    logger.error("Failed to start voice stream", {
      error: error.message,
      category: "voice",
    });

    return new Response(`Failed to start voice stream: ${error.message}`, {
      status: 500,
    });
  }
}
