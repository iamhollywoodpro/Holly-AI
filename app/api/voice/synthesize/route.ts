import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { maya1Service } from "@/lib/voice/maya1-service";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for voice synthesis

/**
 * POST /api/voice/synthesize
 * Synthesize speech from text using MAYA1
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, voiceDescription, addEmotions, emotionContext } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Add emotions if requested
    let processedText = text;
    if (addEmotions && emotionContext) {
      processedText = maya1Service.addEmotions(text, emotionContext);
    }

    logger.info("Voice synthesis requested", {
      userId,
      textLength: text.length,
      hasCustomVoice: !!voiceDescription,
      hasEmotions: addEmotions,
      category: "voice",
    });

    // Synthesize speech
    const audioBlob = await maya1Service.synthesize(processedText, {
      description: voiceDescription,
    });

    // Convert blob to buffer
    const buffer = Buffer.from(await audioBlob.arrayBuffer());

    logger.info("Voice synthesis completed", {
      userId,
      audioSize: buffer.length,
      category: "voice",
    });

    // Return audio file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error: any) {
    logger.error("Voice synthesis failed", {
      error: error.message,
      category: "voice",
    });

    return NextResponse.json(
      { error: `Voice synthesis failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/synthesize/emotions
 * Get available emotion tags
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emotions = maya1Service.getAvailableEmotions();

    return NextResponse.json({
      success: true,
      emotions,
    });
  } catch (error: any) {
    logger.error("Failed to get emotions", {
      error: error.message,
      category: "voice",
    });

    return NextResponse.json(
      { error: `Failed to get emotions: ${error.message}` },
      { status: 500 }
    );
  }
}
