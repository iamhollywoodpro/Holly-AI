/**
 * Voice Handler — Phase 4C (updated: Browser Web Speech API removed)
 *
 * Voice INPUT:  MediaRecorder → POST /api/voice/transcribe (Groq Whisper)
 * Voice OUTPUT: EnhancedVoiceOutput → Kokoro → Chatterbox (no browser speechSynthesis)
 *
 * The Web Speech API (webkitSpeechRecognition, speechSynthesis) has been
 * intentionally removed. HOLLY uses server-side STT/TTS exclusively.
 */

import { EnhancedVoiceOutput } from './enhanced-voice-output';

// ─── Availability checks ──────────────────────────────────────────────────────

/** Returns true if the browser supports MediaRecorder (required for server STT). */
export const isSpeechRecognitionAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';

// NOTE: isSpeechSynthesisAvailable removed — HOLLY uses Kokoro/Chatterbox TTS,
// never the browser speechSynthesis API.

// ─── Voice Input ──────────────────────────────────────────────────────────────

/**
 * VoiceInput — records microphone audio via MediaRecorder and sends it to
 * the server for Whisper transcription. No browser speech recognition used.
 */
export class VoiceInput {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isListening: boolean = false;
  private stream: MediaStream | null = null;
  private onTranscriptCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    // Nothing to initialise synchronously — microphone access is async.
  }

  start(
    onTranscript: (text: string) => void,
    onError?: (error: string) => void
  ): void {
    if (typeof window === 'undefined') {
      onError?.('Voice input is only available in the browser.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      onError?.('MediaRecorder is not supported in this browser. Please use Chrome or Firefox.');
      return;
    }
    if (this.isListening) {
      console.warn('[VoiceInput] Already listening.');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.stream = stream;
        this.audioChunks = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
          void this._sendForTranscription();
        };

        this.mediaRecorder.start(500);
        this.isListening = true;
        console.log('[VoiceInput] Recording started');
      })
      .catch((err: Error) => {
        const msg = err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser.'
          : `Failed to access microphone: ${err.message}`;
        this.onErrorCallback?.(msg);
      });
  }

  stop(): void {
    if (!this.isListening) return;
    this.isListening = false;
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    console.log('[VoiceInput] Recording stopped');
  }

  isActive(): boolean {
    return this.isListening;
  }

  private async _sendForTranscription(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    const blob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
    this.audioChunks = [];

    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error(`Transcription server returned ${res.status}`);
      }

      const data = await res.json();
      const text: string = data.text || data.transcription || '';

      if (text) {
        console.log('[VoiceInput] Transcribed:', text.substring(0, 80));
        this.onTranscriptCallback?.(text);
      } else {
        this.onErrorCallback?.('No speech detected. Please try again.');
      }
    } catch (err: unknown) {
      const message = (err as Error).message || 'Transcription failed';
      console.error('[VoiceInput] Transcription error:', message);
      this.onErrorCallback?.(message);
    }
  }
}

// ─── Voice Output ─────────────────────────────────────────────────────────────

// VoiceOutput (browser speechSynthesis) has been removed.
// Use EnhancedVoiceOutput directly — it routes to Kokoro → Chatterbox.

// ─── Singletons ───────────────────────────────────────────────────────────────

let voiceInputInstance: VoiceInput | null = null;
let voiceOutputInstance: EnhancedVoiceOutput | null = null;

export const getVoiceInput = (): VoiceInput => {
  if (!voiceInputInstance) voiceInputInstance = new VoiceInput();
  return voiceInputInstance;
};

export const getVoiceOutput = (): EnhancedVoiceOutput => {
  if (!voiceOutputInstance) voiceOutputInstance = new EnhancedVoiceOutput();
  return voiceOutputInstance;
};
