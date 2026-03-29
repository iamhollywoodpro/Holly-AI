/**
 * HOLLY Whisper STT Service
 *
 * Speech-to-text — free-only provider chain:
 *
 *  1. Groq Whisper (whisper-large-v3-turbo — free tier, extremely fast)
 *  2. Browser Web Speech API (signal returned as { useBrowserSTT: true })
 *
 * No OpenAI. No paid APIs. No limits beyond Groq's generous free tier.
 *
 * Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac
 * Max file size: 25 MB
 */

import Groq from 'groq-sdk';

export interface TranscriptionResult {
  text: string;
  language: string;
  provider: 'groq-whisper' | 'browser';
  durationMs?: number;
  confidence?: number;
  useBrowserSTT?: boolean;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscribeOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt';
  temperature?: number;
  includeSegments?: boolean;
}

// ─── Provider detection ────────────────────────────────────────────────────────

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

export function getAvailableProviders(): Array<'groq-whisper'> {
  const providers: Array<'groq-whisper'> = [];
  if (process.env.GROQ_API_KEY) providers.push('groq-whisper');
  return providers;
}

// ─── Core transcription ───────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.webm',
  opts: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const t0 = Date.now();

  const MAX_BYTES = 25 * 1024 * 1024;
  if (audioBuffer.length > MAX_BYTES) {
    throw new Error(`Audio file too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB). Max 25MB.`);
  }
  if (audioBuffer.length === 0) {
    throw new Error('Audio buffer is empty.');
  }

  // ── Try Groq Whisper ──────────────────────────────────────────────────────
  const groqClient = getGroqClient();
  if (groqClient) {
    try {
      const result = await transcribeWithGroq(groqClient, audioBuffer, filename, opts);
      return { ...result, durationMs: Date.now() - t0 };
    } catch (err: any) {
      const isRateLimit = err.status === 429 || err.message?.includes('rate') || err.message?.includes('quota');
      console.warn(`[Whisper STT] Groq failed (${isRateLimit ? 'rate-limited' : err.message}), falling back to browser STT`);
    }
  }

  // ── Signal browser Web Speech API ─────────────────────────────────────────
  console.log('[Whisper STT] No cloud provider available — signaling browser STT');
  return {
    text: '',
    language: opts.language || 'en',
    provider: 'browser',
    useBrowserSTT: true,
    durationMs: Date.now() - t0,
  };
}

export async function transcribeFromUrl(
  url: string,
  filename?: string,
  opts: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from URL (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const inferredFilename = filename || url.split('/').pop() || 'audio.mp3';
  return transcribeAudio(buffer, inferredFilename, opts);
}

// ─── Groq Whisper ─────────────────────────────────────────────────────────────

async function transcribeWithGroq(
  client: Groq,
  buffer: Buffer,
  filename: string,
  opts: TranscribeOptions
): Promise<Omit<TranscriptionResult, 'durationMs'>> {
  const mimeType = getMimeType(filename);
  const file = new File([buffer as unknown as BlobPart], filename, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: opts.language || undefined,
    prompt: opts.prompt || undefined,
    response_format: (opts.includeSegments ? 'verbose_json' : 'json') as any,
    temperature: opts.temperature ?? 0,
  });

  const text = typeof transcription === 'string'
    ? transcription
    : (transcription as any).text || '';

  const segments: TranscriptionSegment[] = [];
  if (opts.includeSegments && (transcription as any).segments) {
    for (const seg of (transcription as any).segments) {
      segments.push({ start: seg.start, end: seg.end, text: seg.text });
    }
  }

  return {
    text: text.trim(),
    language: (transcription as any).language || opts.language || 'en',
    provider: 'groq-whisper',
    ...(segments.length > 0 ? { segments } : {}),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimes: Record<string, string> = {
    mp3:  'audio/mpeg',
    mp4:  'audio/mp4',
    m4a:  'audio/mp4',
    mpeg: 'audio/mpeg',
    mpga: 'audio/mpeg',
    wav:  'audio/wav',
    webm: 'audio/webm',
    ogg:  'audio/ogg',
    flac: 'audio/flac',
  };
  return mimes[ext] || 'audio/webm';
}

export function getSTTStatus() {
  const providers = getAvailableProviders();
  return {
    available: providers.length > 0 || true, // browser STT always available
    providers,
    primaryProvider: providers[0] || 'browser',
    browserFallback: true,
    models: {
      groq: 'whisper-large-v3-turbo (free, ~250 req/day)',
    },
    supportedFormats: ['mp3', 'mp4', 'm4a', 'mpeg', 'mpga', 'wav', 'webm', 'ogg', 'flac'],
    maxFileSizeMB: 25,
  };
}
