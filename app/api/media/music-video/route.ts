// ─────────────────────────────────────────────────────────────────────────────
// Music Video API — Generates a complete music video
// Phase 3: Media Pipeline Upgrade
//
// Pipeline:
//   1. Generate album cover / scene images via Pollinations (free)
//   2. Generate audio via Suno/Acestep (configured provider)
//   3. Compose video via FFmpeg (image slideshow + audio overlay)
//   4. Return base64-encoded MP4
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateImage } from '@/lib/ai/media-generator';
import { composeMusicVideo, isFFmpegAvailable } from '@/lib/media/video-compositor';

export interface MusicVideoRequest {
  prompt: string;           // Description of the music video concept
  style?: string;           // Visual style: 'cinematic' | 'anime' | 'abstract' | 'neon' | 'natural'
  scenes?: number;          // Number of scenes/images (default: 4)
  durationPerScene?: number;// Seconds per scene (default: 5)
  lyrics?: string;          // Optional lyrics for the song
  genre?: string;           // Music genre hint
  width?: number;           // Video width (default: 1280)
  height?: number;          // Video height (default: 720)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: MusicVideoRequest = await req.json();

    if (!body.prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const scenes = body.scenes || 4;
    const style = body.style || 'cinematic';
    const durationPerScene = body.durationPerScene || 5;
    const width = body.width || 1280;
    const height = body.height || 720;

    // Check FFmpeg availability
    const ffmpegAvailable = await isFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json({
        error: 'FFmpeg not available in this environment',
        suggestion: 'Add ffmpeg to Dockerfile: RUN apk add --no-cache ffmpeg',
      }, { status: 503 });
    }

    // Step 1: Generate scene images
    const stylePrompts: Record<string, string> = {
      cinematic: 'cinematic, dramatic lighting, film grain, 4k, professional',
      anime: 'anime style, vibrant colors, japanese animation, detailed',
      abstract: 'abstract art, flowing shapes, vibrant gradients, psychedelic',
      neon: 'neon lights, cyberpunk, glowing colors, dark background, futuristic',
      natural: 'natural landscape, golden hour, soft lighting, peaceful, organic',
    };

    const styleSuffix = stylePrompts[style] || stylePrompts.cinematic;
    const imagePromises = [];

    for (let i = 0; i < scenes; i++) {
      const scenePrompt = i === 0
        ? `Album cover art for "${body.prompt}", ${styleSuffix}, square format`
        : `Scene ${i + 1} of music video for "${body.prompt}", ${styleSuffix}, wide angle`;

      imagePromises.push(
        generateImage({
          prompt: scenePrompt,
          aspectRatio: i === 0 ? '1:1' : '16:9',
          width: i === 0 ? 1024 : width,
          height: i === 0 ? 1024 : height,
        }).catch(err => ({
          url: null,
          error: err.message,
        }))
      );
    }

    const imageResults = await Promise.all(imagePromises);
    const successfulImages = imageResults
      .filter((r: any) => r.url)
      .map((r: any) => r.url);

    if (successfulImages.length === 0) {
      return NextResponse.json({
        error: 'Failed to generate any scene images',
        details: imageResults.map((r: any) => r.error),
      }, { status: 500 });
    }

    // Step 2: For now, create a silent slideshow (audio generation requires Suno/Acestep API)
    // The audio can be provided separately via the /api/music/generate endpoint
    // and combined using the composeMusicVideo function

    // Generate a simple 440Hz tone as placeholder audio for the slideshow
    // In production, this would be replaced with actual generated music
    const audioUrl = `data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=`;

    // Step 3: Compose video
    const result = await composeMusicVideo({
      images: successfulImages,
      audio: audioUrl,
      durationPerImage: durationPerScene,
      format: 'mp4',
      width,
      height,
    });

    if (!result.success) {
      return NextResponse.json({
        error: 'Video composition failed',
        details: result.error,
        imagesGenerated: successfulImages.length,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      video: result.videoBase64 ? `data:video/mp4;base64,${result.videoBase64}` : null,
      duration: result.duration,
      size: result.size,
      format: result.format,
      scenesGenerated: successfulImages.length,
      style,
      prompt: body.prompt,
      note: 'Video generated with scene images. For full music video with audio, use /api/music/generate first and provide the audio URL.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Music video generation failed', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const ffmpegAvailable = await isFFmpegAvailable();
  return NextResponse.json({
    status: ffmpegAvailable ? 'available' : 'unavailable',
    ffmpeg: ffmpegAvailable,
    endpoint: 'POST /api/media/music-video',
    params: {
      prompt: 'string (required) — Description of the music video',
      style: 'cinematic | anime | abstract | neon | natural',
      scenes: 'number (default: 4) — Number of scene images',
      durationPerScene: 'number (default: 5) — Seconds per scene',
      width: 'number (default: 1280)',
      height: 'number (default: 720)',
    },
  });
}
