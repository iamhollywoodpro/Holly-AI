/**
 * Voice Input Service
 * Handles voice transcription (speech-to-text) ONLY via server-side API.
 *
 * STT provider chain (server-side, no browser API):
 *   1. Groq Whisper large-v3-turbo (POST /api/voice/transcribe)
 *
 * The Browser Web Speech API (webkitSpeechRecognition / speechSynthesis)
 * has been intentionally removed. HOLLY uses MediaRecorder to capture audio
 * and sends the blob to the server for Whisper transcription.
 *
 * For TTS output use enhanced-voice-output.ts → VoxCPM2 (primary) → Kokoro (fallback).
 */

'use client';

export interface VoiceServiceState {
  isListening: boolean;
  inputMethod: 'keyboard' | 'voice' | null;
  settings: {
    outputEnabled: boolean;
  };
}

export interface VoiceSettings {
  outputEnabled: boolean;
}

export interface VoiceModel {
  id: string;
  name: string;
}

class VoiceService {
  private state: VoiceServiceState = {
    isListening: false,
    inputMethod: null,
    settings: {
      outputEnabled: true,
    },
  };

  private listeners: Set<(state: VoiceServiceState) => void> = new Set();
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private stream: MediaStream | null = null;

  /** Returns true if MediaRecorder is available (it always is in modern browsers). */
  isRecognitionAvailable(): boolean {
    return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
  }

  /**
   * Start recording microphone audio.
   * When the user stops (or after a silence threshold), the audio is sent to
   * POST /api/voice/transcribe (Groq Whisper) and the transcript is returned.
   */
  async startListening(onTranscript: (text: string, isFinal: boolean) => void): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];
      this.onTranscriptCallback = onTranscript;

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length === 0) return;
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        await this._transcribe(blob);
      };

      this.mediaRecorder.start(1000); // Collect in 1-second chunks
      this.updateState({ isListening: true });
      return true;
    } catch (error) {
      console.error('[VoiceService] Failed to start microphone:', error);
      return false;
    }
  }

  stopListening(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.onTranscriptCallback = null;
    this.updateState({ isListening: false });
  }

  private async _transcribe(blob: Blob): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.error('[VoiceService] Transcription HTTP error:', res.status);
        return;
      }

      const data = await res.json();
      const text = data.text || data.transcription || '';
      if (text && this.onTranscriptCallback) {
        this.onTranscriptCallback(text, true);
      }
    } catch (err) {
      console.error('[VoiceService] Transcription error:', err);
    }
  }

  setInputMethod(method: 'keyboard' | 'voice' | null): void {
    this.updateState({ inputMethod: method });
  }

  updateSettings(settings: Partial<VoiceSettings>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    this.notifyListeners();
  }

  getState(): VoiceServiceState {
    return { ...this.state };
  }

  subscribe(listener: (state: VoiceServiceState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(update: Partial<VoiceServiceState>): void {
    this.state = { ...this.state, ...update };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

// Singleton instance
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService();
  }
  return voiceServiceInstance;
}

export const voiceService = getVoiceService();

/**
 * TTS helper — delegates to VoxCPM2 (primary) / Kokoro (fallback) via enhanced-voice-output.
 * NEVER uses browser speechSynthesis.
 */
export async function speakText(text: string): Promise<void> {
  const { speakText: speak } = await import('./enhanced-voice-output');
  return speak(text, { volume: 0.9 });
}
