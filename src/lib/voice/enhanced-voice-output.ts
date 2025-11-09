/**
 * Enhanced Voice Output System
 * Supports both browser TTS and premium ElevenLabs
 */

export interface VoiceOutputOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  provider?: 'browser' | 'elevenlabs';
  elevenLabsVoiceId?: string;
}

export class EnhancedVoiceOutput {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private elevenLabsApiKey: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      // Try to get ElevenLabs key from environment (only in browser)
      this.elevenLabsApiKey = null; // Will be set via API route
    }
  }

  /**
   * Check if voice output is available
   */
  isAvailable(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get available voices (browser TTS only)
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Find best female voice for browser TTS
   */
  private getBestFemaleVoice(): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    
    // Priority order for female voices
    const femaleVoicePatterns = [
      // High quality voices
      /Samantha/i,
      /Victoria/i,
      /Fiona/i,
      /Karen/i,
      /Moira/i,
      // Generic female patterns
      /Female/i,
      /Woman/i,
      /Lady/i,
      // Language-specific
      /en.*female/i,
      /us.*female/i,
      /uk.*female/i,
    ];

    for (const pattern of femaleVoicePatterns) {
      const voice = voices.find(v => pattern.test(v.name));
      if (voice) return voice;
    }

    // Fallback: any voice with "female" in name
    return voices.find(v => v.name.toLowerCase().includes('female')) || null;
  }

  /**
   * Speak text using browser TTS
   */
  private speakWithBrowser(
    text: string,
    options: VoiceOutputOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      utterance.rate = options.rate || 0.95; // Slightly slower for clarity
      utterance.pitch = options.pitch || 1.15; // Higher pitch for feminine voice
      utterance.volume = options.volume || 0.9;

      // Use best available female voice
      const femaleVoice = this.getBestFemaleVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        console.log(`🎤 Using voice: ${femaleVoice.name}`);
      }

      // Enhanced settings for more natural speech
      utterance.lang = 'en-US';

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        console.error('Speech synthesis error:', event);
        reject(event);
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Speak text using ElevenLabs (premium quality)
   */
  private async speakWithElevenLabs(
    text: string,
    options: VoiceOutputOptions = {}
  ): Promise<void> {
    try {
      // Call our API route which handles ElevenLabs
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: options.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL', // Default: Bella (feminine, warm)
          stability: 0.5,
          similarityBoost: 0.75,
        }),
      });

      if (!response.ok) {
        throw new Error('ElevenLabs API failed');
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.volume = options.volume || 0.9;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('ElevenLabs error, falling back to browser TTS:', error);
      // Fallback to browser TTS
      return this.speakWithBrowser(text, options);
    }
  }

  /**
   * Main speak method - routes to appropriate provider
   */
  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Clean text for better speech
    const cleanedText = this.preprocessText(text);

    const provider = options.provider || 'browser';

    if (provider === 'elevenlabs') {
      return this.speakWithElevenLabs(cleanedText, options);
    } else {
      return this.speakWithBrowser(cleanedText, options);
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
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis?.speaking || false;
  }

  /**
   * Pause speech (browser TTS only)
   */
  pause(): void {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech (browser TTS only)
   */
  resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
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
