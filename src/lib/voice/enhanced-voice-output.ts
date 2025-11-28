/**
 * HOLLY Voice Output System
 * Uses Fish-Speech-1.5 TTS backend ONLY
 */

export interface VoiceOutputOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  // Callbacks
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    // Fish-Speech TTS only - no browser TTS
  }

  /**
   * Check if voice output is available
   */
  isAvailable(): boolean {
    return true; // Fish-Speech is always available
  }

  /**
   * Speak text using Fish-Speech (HOLLY voice)
   */
  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Clean text for better speech
    const cleanedText = this.preprocessText(text);

    try {
      // Call our Fish-Speech TTS API
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanedText,
          voice: 'holly',
        }),
      });

      if (!response.ok) {
        throw new Error(`Fish-Speech TTS failed: ${response.status}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      console.log('[Fish-Speech] Received blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[Fish-Speech] Created blob URL:', audioUrl);

      // Play audio
      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.volume = options.volume || 0.9;
        this.currentAudio = audio;
        
        console.log('[Fish-Speech] Audio object created:', {
          volume: audio.volume,
          src: audio.src,
          readyState: audio.readyState
        });
        
        audio.onloadeddata = () => {
          console.log('[Fish-Speech] Audio data loaded:', {
            duration: audio.duration,
            readyState: audio.readyState
          });
        };
        
        audio.onended = () => {
          console.log('[Fish-Speech] Audio playback ended');
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          if (options.onEnd) options.onEnd();
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('[Fish-Speech] Audio error:', error);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          if (options.onError) options.onError(error);
          reject(error);
        };
        
        audio.onplay = () => {
          console.log('[Fish-Speech] Audio started playing - you should hear sound now!');
        };
        
        audio.onpause = () => {
          console.log('[Fish-Speech] Audio paused');
        };

        console.log('[Fish-Speech] Attempting to play audio...');
        audio.play().then(() => {
          console.log('[Fish-Speech] Play promise resolved');
          if (options.onStart) options.onStart();
        }).catch((error) => {
          console.error('[Fish-Speech] Play promise rejected:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Fish-Speech error:', error);
      if (options.onError) options.onError(error);
      throw error;
    }
  }

  /**
   * Preprocess text for better speech quality
   */
  private preprocessText(text: string): string {
    let cleaned = text;

    // Remove markdown formatting
    cleaned = cleaned.replace(/[*_`]/g, '');
    cleaned = cleaned.replace(/#{1,6}\s/g, '');
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '[code block]');
    cleaned = cleaned.replace(/`[^`]+`/g, '[code]');

    // Handle emojis (remove or convert)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Symbols
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags

    // Add pauses for better pacing
    cleaned = cleaned.replace(/\. /g, '. ... ');
    cleaned = cleaned.replace(/! /g, '! ... ');
    cleaned = cleaned.replace(/\? /g, '? ... ');

    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.currentAudio && !this.currentAudio.paused;
  }
}

// Singleton instance
let voiceOutputInstance: EnhancedVoiceOutput | null = null;

export function getVoiceOutput(): EnhancedVoiceOutput {
  if (!voiceOutputInstance) {
    voiceOutputInstance = new EnhancedVoiceOutput();
  }
  return voiceOutputInstance;
}

// Convenience function
export async function speakText(text: string, options?: VoiceOutputOptions): Promise<void> {
  const vo = getVoiceOutput();
  return vo.speak(text, options);
}

export function stopSpeaking(): void {
  const vo = getVoiceOutput();
  vo.stop();
}

export function isSpeaking(): boolean {
  const vo = getVoiceOutput();
  return vo.isSpeaking();
}
