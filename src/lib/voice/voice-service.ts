/**
 * Voice Input Service
 * Handles voice transcription (speech-to-text) ONLY
 * For TTS, use enhanced-voice-output.ts
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
  private recognition: any = null;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          const last = event.results.length - 1;
          const transcript = event.results[last][0].transcript;
          const isFinal = event.results[last].isFinal;

          if (this.onTranscriptCallback) {
            this.onTranscriptCallback(transcript, isFinal);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          this.stopListening();
        };

        this.recognition.onend = () => {
          if (this.state.isListening) {
            // Restart if still supposed to be listening
            try {
              this.recognition.start();
            } catch (e) {
              this.stopListening();
            }
          }
        };
      }
    }
  }

  isRecognitionAvailable(): boolean {
    return this.recognition !== null;
  }

  async startListening(onTranscript: (text: string, isFinal: boolean) => void): Promise<boolean> {
    if (!this.recognition) {
      console.warn('Speech recognition not available');
      return false;
    }

    try {
      this.onTranscriptCallback = onTranscript;
      this.recognition.start();
      this.updateState({ isListening: true });
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.onTranscriptCallback = null;
    this.updateState({ isListening: false });
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

// For TTS, use this instead
export async function speakText(text: string): Promise<void> {
  // Import dynamically to avoid circular dependencies
  const { speakText: speak } = await import('./enhanced-voice-output');
  return speak(text, { volume: 0.9 });
}
