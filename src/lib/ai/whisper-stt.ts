/**
 * HOLLY Whisper STT Service — Phase 4C
 *
 * Speech-to-text with a free-first provider chain:
 *
 *  1. Groq Whisper  (groq-sdk — free tier, ~250 req/day, extremely fast)
 *  2. OpenAI Whisper (openai — free tier with $5 credit, accurate)
 *  3. Browser Web Speech API signal (returned as { useBrowserSTT: true })
 *
 * The service auto-selects the best available provider on each call and
 * degrades gracefully if a provider is missing or rate-limited.
 *
 * Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
 * Max file size: 25 MB (Groq) / 25 MB (OpenAI)
 *
 * Usage:
 *   import { transcribeAudio } from '@/lib/ai/whisper-stt';
 *   const result = await transcribeAudio(audioBuffer, 'audio.webm');
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';

export interface TranscriptionResult {
  text: string;
  language: string;
  provider: 'groq-whisper' | 'openai-whisper' | 'browser';
  durationMs?: number;
  confidence?: number;
  useBrowserSTT?: boolean; // signals frontend to use Web Speech API
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscribeOptions {
  language?: string;       // ISO-639-1 code e.g. 'en', 'es', 'fr'
  prompt?: string;         // Optional context hint to improve accuracy
  responseFormat?: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt';
  temperature?: number;    // 0-1
  includeSegments?: boolean;
}

// ─── Provider detection ────────────────────────────────────────────────────────

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function getAvailableProviders(): Array<'groq-whisper' | 'openai-whisper'> {
  const providers: Array<'groq-whisper' | 'openai-whisper'> = [];
  if (process.env.GROQ_API_KEY) providers.push('groq-whisper');
  if (process.env.OPENAI_API_KEY) providers.push('openai-whisper');
  return providers;
}

// ─── Core transcription ───────────────────────────────────────────────────────

/**
 * Transcribe audio from a Buffer.
 * Tries Groq Whisper first, then OpenAI Whisper, then signals browser fallback.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.webm',
  opts: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const t0 = Date.now();

  // Validate size (25 MB limit)
  const MAX_BYTES = 25 * 1024 * 1024;
  if (audioBuffer.length > MAX_BYTES) {
    throw new Error(`Audio file too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB). Maximum is 25MB.`);
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
      console.warn(`[Whisper STT] Groq failed (${isRateLimit ? 'rate-limited' : err.message}), trying OpenAI...`);
    }
  }

  // ── Try OpenAI Whisper ────────────────────────────────────────────────────
  const openaiClient = getOpenAIClient();
  if (openaiClient) {
    try {
      const result = await transcribeWithOpenAI(openaiClient, audioBuffer, filename, opts);
      return { ...result, durationMs: Date.now() - t0 };
    } catch (err: any) {
      console.warn(`[Whisper STT] OpenAI failed (${err.message}), signaling browser STT...`);
    }
  }

  // ── Signal browser Web Speech API ─────────────────────────────────────────
  console.log('[Whisper STT] No cloud providers available — signaling browser STT');
  return {
    text: '',
    language: opts.language || 'en',
    provider: 'browser',
    useBrowserSTT: true,
    durationMs: Date.now() - t0,
  };
}

/**
 * Transcribe from a URL (downloads the file first).
 */
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
    model: 'whisper-large-v3-turbo',  // Fast + accurate, free on Groq
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

// ─── OpenAI Whisper ───────────────────────────────────────────────────────────

async function transcribeWithOpenAI(
  client: OpenAI,
  buffer: Buffer,
  filename: string,
  opts: TranscribeOptions
): Promise<Omit<TranscriptionResult, 'durationMs'>> {
  const mimeType = getMimeType(filename);
  const file = new File([buffer as unknown as BlobPart], filename, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: opts.language || undefined,
    prompt: opts.prompt || undefined,
    response_format: opts.includeSegments ? 'verbose_json' : 'json',
    temperature: opts.temperature ?? 0,
  });

  const segments: TranscriptionSegment[] = [];
  if (opts.includeSegments && (transcription as any).segments) {
    for (const seg of (transcription as any).segments) {
      segments.push({ start: seg.start, end: seg.end, text: seg.text });
    }
  }

  return {
    text: transcription.text.trim(),
    language: (transcription as any).language || opts.language || 'en',
    provider: 'openai-whisper',
    ...(segments.length > 0 ? { segments } : {}),
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Get STT service status (for health checks and dashboards).
 */
export function getSTTStatus() {
  const providers = getAvailableProviders();
  return {
    available: providers.length > 0,
    providers,
    primaryProvider: providers[0] || 'browser',
    browserFallback: true,
    models: {
      groq: 'whisper-large-v3-turbo (free, ~250 req/day)',
      openai: 'whisper-1 (free tier / pay-as-you-go $0.006/min)',
    },
    supportedFormats: ['mp3', 'mp4', 'm4a', 'mpeg', 'mpga', 'wav', 'webm', 'ogg', 'flac'],
    maxFileSizeMB: 25,
  };
}
