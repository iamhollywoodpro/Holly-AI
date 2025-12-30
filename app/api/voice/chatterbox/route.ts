import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { chatterboxService } from "@/lib/voice/chatterbox-service";
import { logger } from "@/lib/monitoring/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/voice/chatterbox
 * Synthesize speech using Chatterbox-Turbo
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!chatterboxService.isAvailable()) {
      return NextResponse.json(
        { error: "Chatterbox TTS service is not available" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { 
      text, 
      expressive = false,
      audioPromptPath,
      temperature,
      exaggeration,
      cfgWeight,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const validation = chatterboxService.validateText(text);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid text: ${validation.issues.join(", ")}` },
        { status: 400 }
      );
    }

    logger.info("Chatterbox TTS synthesis requested", {
      userId,
      textLength: text.length,
      expressive,
      category: "voice",
    });

    const config = {
      audioPromptPath,
      temperature,
      exaggeration,
      cfgWeight,
    };

    const audioBlob = expressive
      ? await chatterboxService.synthesizeExpressive(text, config)
      : await chatterboxService.synthesize(text, config);

    const buffer = Buffer.from(await audioBlob.arrayBuffer());

    logger.info("Chatterbox TTS synthesis completed", {
      userId,
      audioSize: buffer.length,
      category: "voice",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
        "X-TTS-Provider": "Chatterbox-Turbo",
      },
    });
  } catch (error: any) {
    logger.error("Chatterbox TTS synthesis failed", {
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
 * GET /api/voice/chatterbox/info
 * Get service information
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceInfo = chatterboxService.getServiceInfo();
    const availableTags = chatterboxService.getAvailableTags();

    return NextResponse.json({
      success: true,
      service: serviceInfo,
      availableTags,
      voiceDescription: chatterboxService.getDefaultVoiceDescription(),
      referenceAudioPath: chatterboxService.getReferenceAudioPath(),
    });
  } catch (error: any) {
    logger.error("Failed to get Chatterbox info", {
      error: error.message,
      category: "voice",
    });

    return NextResponse.json(
      { error: `Failed to get service info: ${error.message}` },
      { status: 500 }
    );
  }
}
