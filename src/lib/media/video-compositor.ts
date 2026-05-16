/**
 * Video Compositor — Combines audio + images/video into music videos
 *
 * Uses FFmpeg (installed in Docker) to:
 * - Combine multiple image frames into a video slideshow
 * - Overlay audio onto video
 * - Create music videos from generated images + audio
 *
 * Phase 3: Media Pipeline Upgrade
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface ComposeOptions {
  /** Image URLs or base64 data URIs to use as video frames */
  images: string[];
  /** Audio URL or base64 data URI */
  audio: string;
  /** Duration per image in seconds (default: 3) */
  durationPerImage?: number;
  /** Output format: 'mp4' or 'webm' (default: 'mp4') */
  format?: 'mp4' | 'webm';
  /** Output width (default: 1280) */
  width?: number;
  /** Output height (default: 720) */
  height?: number;
  /** FPS (default: 24) */
  fps?: number;
  /** Transition effect: 'none' | 'crossfade' (default: 'none') */
  transition?: string;
}

export interface ComposeResult {
  success: boolean;
  /** Base64-encoded video data */
  videoBase64?: string;
  /** Video duration in seconds */
  duration?: number;
  /** File size in bytes */
  size?: number;
  /** Output format */
  format: string;
  error?: string;
}

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a file from URL or decode base64 data URI
 */
async function resolveMedia(input: string, outputPath: string): Promise<string> {
  if (input.startsWith('data:')) {
    // Base64 data URI
    const matches = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid data URI');
    const buffer = Buffer.from(matches[2], 'base64');
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    // Download from URL
    const res = await fetch(input, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  // Assume it's a file path
  return input;
}

/**
 * Compose a music video from images and audio using FFmpeg
 */
export async function composeMusicVideo(opts: ComposeOptions): Promise<ComposeResult> {
  const format = opts.format || 'mp4';
  const width = opts.width || 1280;
  const height = opts.height || 720;
  const fps = opts.fps || 24;
  const durationPerImage = opts.durationPerImage || 3;

  // Check FFmpeg availability
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    return {
      success: false,
      format,
      error: 'FFmpeg not installed — add ffmpeg to Dockerfile',
    };
  }

  // Create temp directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'holly-video-'));

  try {
    // Download images
    const imagePaths: string[] = [];
    for (let i = 0; i < opts.images.length; i++) {
      const imgPath = path.join(tmpDir, `frame_${String(i).padStart(4, '0')}.jpg`);
      await resolveMedia(opts.images[i], imgPath);
      imagePaths.push(imgPath);
    }

    // Download audio
    const audioPath = path.join(tmpDir, 'audio.mp3');
    await resolveMedia(opts.audio, audioPath);

    // Get audio duration
    let audioDuration = opts.images.length * durationPerImage;
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ], { timeout: 10000 });
      audioDuration = parseFloat(stdout.trim()) || audioDuration;
    } catch {
      // Use calculated duration
    }

    // Create video from images (slideshow)
    const concatFile = path.join(tmpDir, 'concat.txt');
    const concatContent = imagePaths
      .map(p => `file '${p}'`)
      .join(`\n`);
    await fs.writeFile(concatFile, concatContent);

    const slideshowPath = path.join(tmpDir, `slideshow.${format}`);

    // Step 1: Create slideshow from images
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-t', String(audioDuration),
      slideshowPath,
    ], { timeout: 60000 });

    // Step 2: Overlay audio
    const outputPath = path.join(tmpDir, `output.${format}`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', slideshowPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputPath,
    ], { timeout: 60000 });

    // Read output
    const videoBuffer = await fs.readFile(outputPath);

    return {
      success: true,
      videoBase64: videoBuffer.toString('base64'),
      duration: audioDuration,
      size: videoBuffer.length,
      format,
    };
  } catch (err: any) {
    return {
      success: false,
      format,
      error: `FFmpeg composition failed: ${err.message}`,
    };
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  }
}

/**
 * Quick compose — creates a simple video from a single image + audio
 */
export async function quickCompose(
  imageUrl: string,
  audioUrl: string,
  duration: number = 30,
): Promise<ComposeResult> {
  return composeMusicVideo({
    images: [imageUrl],
    audio: audioUrl,
    durationPerImage: duration,
    format: 'mp4',
    width: 1280,
    height: 720,
  });
}
