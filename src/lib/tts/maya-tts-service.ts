/**
 * HOLLY TTS Service - Maya1 Integration
 * Self-hosted Maya1 TTS microservice client with contextual emotion support
 */

import { addNaturalEmotions } from './emotion-context-analyzer';

export interface MayaTTSConfig {
  apiUrl: string;
  voiceDescription?: string;
  temperature?: number;
  topP?: number;
}

export interface TTSGenerateRequest {
  text: string;
  description?: string;
  temperature?: number;
  top_p?: number;
  autoEmotions?: boolean; // Enable automatic contextual emotions
  context?: {
    isSuccess?: boolean;
    isError?: boolean;
    userMessage?: string;
  };
}

export interface VoiceInfo {
  voice_name: string;
  description: string;
  model: string;
  sample_rate: number;
  supported_emotions: string[];
  usage_example: {
    text: string;
    description: string;
  };
}

/**
 * HOLLY's signature voice description
 */
export const HOLLY_VOICE_DESCRIPTION = 
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing.";

/**
 * Maya1 TTS Service Client
 */
export class MayaTTSService {
  private config: Required<MayaTTSConfig>;
  private audioContext: AudioContext | null = null;

  constructor(config: MayaTTSConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      voiceDescription: config.voiceDescription || HOLLY_VOICE_DESCRIPTION,
      temperature: config.temperature ?? 0.4,
      topP: config.topP ?? 0.9,
    };
  }

  /**
   * Initialize audio context (call on user interaction)
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Generate speech from text with optional contextual emotions
   */
  async generateSpeech(
    text: string,
    options?: {
      autoEmotions?: boolean;
      context?: {
        isSuccess?: boolean;
        isError?: boolean;
        userMessage?: string;
      };
    }
  ): Promise<AudioBuffer> {
    try {
      // Apply automatic contextual emotions if enabled (default: true)
      const autoEmotions = options?.autoEmotions ?? true;
      const processedText = autoEmotions 
        ? addNaturalEmotions(text, options?.context)
        : text;
      
      console.log('[Maya TTS] Generating speech:', {
        original: text.substring(0, 100),
        processed: processedText.substring(0, 100),
        autoEmotions,
      });

      const response = await fetch(`${this.config.apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: processedText, // Use processed text with emotions
          description: this.config.voiceDescription,
          temperature: this.config.temperature,
          top_p: this.config.topP,
        } as TTSGenerateRequest),
      });

      if (!response.ok) {
        throw new Error(`Maya TTS API error: ${response.status} ${response.statusText}`);
      }

      // Get audio data
      const audioData = await response.arrayBuffer();
      
      // Decode to AudioBuffer
      const audioContext = this.getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData);

      console.log('[Maya TTS] Audio generated:', {
        duration: audioBuffer.duration.toFixed(2) + 's',
        sampleRate: audioBuffer.sampleRate + 'Hz',
        channels: audioBuffer.numberOfChannels,
      });

      return audioBuffer;
    } catch (error) {
      console.error('[Maya TTS] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Play audio buffer
   */
  async playSpeech(audioBuffer: AudioBuffer): Promise<void> {
    const audioContext = this.getAudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => resolve();
      // AudioBufferSourceNode doesn't have onerror - handle via try/catch
      try {
        source.start(0);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate and play speech in one call with contextual emotions
   */
  async speak(
    text: string,
    options?: {
      autoEmotions?: boolean;
      context?: {
        isSuccess?: boolean;
        isError?: boolean;
        userMessage?: string;
      };
    }
  ): Promise<void> {
    const audioBuffer = await this.generateSpeech(text, options);
    await this.playSpeech(audioBuffer);
  }
  
  /**
   * Convenience method: Speak with success context
   */
  async speakSuccess(text: string, userMessage?: string): Promise<void> {
    return this.speak(text, {
      autoEmotions: true,
      context: { isSuccess: true, userMessage },
    });
  }
  
  /**
   * Convenience method: Speak with error context (calm, no negative emotions)
   */
  async speakError(text: string, userMessage?: string): Promise<void> {
    return this.speak(text, {
      autoEmotions: true,
      context: { isError: true, userMessage },
    });
  }
  
  /**
   * Convenience method: Speak with greeting context
   */
  async speakGreeting(text: string): Promise<void> {
    return this.speak(text, {
      autoEmotions: true,
      context: {},
    });
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('[Maya TTS] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get voice profile information
   */
  async getVoiceInfo(): Promise<VoiceInfo> {
    const response = await fetch(`${this.config.apiUrl}/voice/info`);
    if (!response.ok) {
      throw new Error(`Failed to get voice info: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Stop all audio playback
   */
  stopAllAudio(): void {
    if (this.audioContext) {
      // Close and recreate context to stop all audio
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Create Maya TTS service instance from environment variables
 */
export function createMayaTTSService(): MayaTTSService {
  const apiUrl = process.env.NEXT_PUBLIC_TTS_API_URL || process.env.TTS_API_URL;
  
  if (!apiUrl) {
    throw new Error('TTS_API_URL environment variable is not set');
  }

  return new MayaTTSService({
    apiUrl,
    voiceDescription: process.env.NEXT_PUBLIC_TTS_VOICE_DESCRIPTION || HOLLY_VOICE_DESCRIPTION,
    temperature: parseFloat(process.env.NEXT_PUBLIC_TTS_TEMPERATURE || '0.4'),
    topP: parseFloat(process.env.NEXT_PUBLIC_TTS_TOP_P || '0.9'),
  });
}

/**
 * Singleton instance
 */
let ttsServiceInstance: MayaTTSService | null = null;

/**
 * Get or create Maya TTS service singleton
 */
export function getTTSService(): MayaTTSService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = createMayaTTSService();
  }
  return ttsServiceInstance;
}
