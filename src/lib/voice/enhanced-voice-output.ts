/**
 * HOLLY Voice Output System
 * Uses Google Gemini TTS (FREE) with Sulafat voice
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
  private audioContext: AudioContext | null = null;

  constructor() {
    // Gemini TTS only - no browser TTS
    // Initialize AudioContext for better browser compatibility
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Check if voice output is available
   */
  isAvailable(): boolean {
    return true; // Gemini TTS is always available
  }

  /**
   * Speak text using Google Gemini TTS (HOLLY voice - Sulafat)
   */
  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Clean text for better speech
    const cleanedText = this.preprocessText(text);

    try {
      // Call our Gemini TTS API
      const response = await fetch('/api/speech/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanedText,
          voice: 'Sulafat', // Holly's voice: warm, caring, professional female
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini TTS failed: ${response.status}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      console.log('[Gemini TTS] Received blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[Gemini TTS] Created blob URL:', audioUrl);

      // Resume AudioContext if suspended (browser autoplay policy)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('[Gemini TTS] Resuming AudioContext...');
        await this.audioContext.resume();
        console.log('[Gemini TTS] AudioContext resumed:', this.audioContext.state);
      }

      // Play audio
      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.volume = options.volume || 0.9;
        this.currentAudio = audio;
        
        console.log('[Gemini TTS] Audio object created:', {
          volume: audio.volume,
          src: audio.src,
          readyState: audio.readyState
        });
        
        audio.onloadeddata = () => {
          console.log('[Gemini TTS] Audio data loaded:', {
            duration: audio.duration,
            readyState: audio.readyState
          });
        };
        
        audio.onended = () => {
          console.log('[Gemini TTS] Audio playback ended');
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          if (options.onEnd) options.onEnd();
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('[Gemini TTS] Audio error:', error);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          if (options.onError) options.onError(error);
          reject(error);
        };
        
        audio.onplay = () => {
          console.log('[Gemini TTS] Audio started playing - you should hear sound now!');
        };
        
        audio.onpause = () => {
          console.log('[Gemini TTS] Audio paused');
        };

        console.log('[Gemini TTS] Attempting to play audio...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('[Gemini TTS] ✅ Play promise RESOLVED - Audio is playing!');
            console.log('[Gemini TTS] Volume:', audio.volume, 'Muted:', audio.muted, 'Duration:', audio.duration);
            if (options.onStart) options.onStart();
          }).catch((error) => {
            console.error('[Gemini TTS] ❌ Play promise REJECTED:', error);
            console.error('[Gemini TTS] Error details:', {
              name: error.name,
              message: error.message,
              audioState: {
                volume: audio.volume,
                muted: audio.muted,
                readyState: audio.readyState,
                paused: audio.paused
              },
              audioContextState: this.audioContext?.state
            });
            
            // Try to provide helpful error message
            if (error.name === 'NotAllowedError') {
              console.error('[Gemini TTS] 🚫 Browser blocked audio playback - user interaction required first!');
            }
            reject(error);
          });
        }
      });
    } catch (error) {
      console.error('Gemini TTS error:', error);
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
