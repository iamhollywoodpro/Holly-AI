// HOLLY TTS Service - Updated for Self-Hosted Kokoro
// No Hugging Face API dependency - Pure self-hosted solution
// Created for Steve "Hollywood" Dorego

export interface TTSConfig {
  provider: 'self-hosted';
  apiUrl: string;
  voice: string;
}

export interface TTSResponse {
  audioUrl: string;
  duration?: number;
  format: string;
}

export class TTSService {
  private config: TTSConfig;

  constructor() {
    // Load config from environment variables
    this.config = {
      provider: 'self-hosted',
      apiUrl: process.env.TTS_API_URL || process.env.NEXT_PUBLIC_TTS_API_URL || '',
      voice: process.env.TTS_VOICE || process.env.NEXT_PUBLIC_TTS_VOICE || 'af_heart'
    };

    console.log('[HOLLY TTS] Initialized with config:', {
      provider: this.config.provider,
      apiUrl: this.config.apiUrl ? '✅ Set' : '❌ Missing',
      voice: this.config.voice
    });
  }

  /**
   * Health check for TTS service
   */
  async healthCheck(): Promise<{ status: string; ready: boolean }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[HOLLY TTS] Health check:', data);
      
      return {
        status: data.status,
        ready: data.ready
      };
    } catch (error) {
      console.error('[HOLLY TTS] Health check failed:', error);
      throw new Error(`TTS service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate speech from text using self-hosted Kokoro service
   */
  async generateSpeech(text: string): Promise<TTSResponse> {
    try {
      // Validate config
      if (!this.config.apiUrl) {
        throw new Error('TTS_API_URL not configured. Please deploy the Kokoro TTS microservice first.');
      }

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      console.log('[HOLLY TTS] Generating speech:', {
        textLength: text.length,
        voice: this.config.voice,
        apiUrl: this.config.apiUrl
      });

      // Call self-hosted TTS service
      const response = await fetch(`${this.config.apiUrl}/tts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: this.config.voice
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[HOLLY TTS] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`TTS generation failed: ${response.status} ${response.statusText}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio response');
      }

      // Create object URL for audio playback
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('[HOLLY TTS] ✅ Generated audio:', {
        size: `${(audioBlob.size / 1024).toFixed(2)} KB`,
        type: audioBlob.type,
        url: audioUrl.substring(0, 50) + '...'
      });

      return {
        audioUrl,
        format: 'wav',
        duration: undefined // Duration not available from blob
      };

    } catch (error) {
      console.error('[HOLLY TTS] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Get available voices from service
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/voices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('[HOLLY TTS] Failed to fetch voices:', error);
      return [];
    }
  }
}

// Export singleton instance
export const ttsService = new TTSService();
