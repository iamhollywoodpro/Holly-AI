/**
 * Voice Interface — Phase 4C
 *
 * Thin wrapper around whisper-stt.ts for backward compatibility.
 * Previous callers using voiceInterface.transcribe(buffer) continue to work.
 *
 * Provider chain (automatic):
 *   1. Groq Whisper (whisper-large-v3-turbo) — free, fast, no limits
 * Browser Web Speech API removed.
 */

import { transcribeAudio, getSTTStatus, type TranscriptionResult } from '@/lib/ai/whisper-stt';

interface LegacyTranscriptionResult {
  text: string;
  language: string;
  provider?: string;
}

class VoiceInterface {
  /**
   * Transcribe audio buffer to text.
   * Automatically selects the best available provider.
   */
  async transcribe(
    audioBuffer: Buffer,
    filename = 'audio.webm',
    language?: string
  ): Promise<LegacyTranscriptionResult> {
    const result: TranscriptionResult = await transcribeAudio(audioBuffer, filename, {
      language,
    });

    return {
      text: result.text,
      language: result.language,
      provider: result.provider,
    };
  }

  /** Check if any cloud STT provider is configured. */
  isAvailable(): boolean {
    return getSTTStatus().available;
  }

  /** Return full status including all providers and supported formats. */
  async getStatus() {
    return getSTTStatus();
  }
}

// Singleton instance
let _instance: VoiceInterface | null = null;

export function getVoiceInterface(): VoiceInterface {
  if (!_instance) _instance = new VoiceInterface();
  return _instance;
}

export const voiceInterface = getVoiceInterface();
