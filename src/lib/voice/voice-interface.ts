/**
 * Voice Interface - Transcription ONLY
 * For TTS, use enhanced-voice-output.ts
 */

'use client';

interface TranscriptionResult {
  text: string;
  language: string;
}

class VoiceInterface {
  /**
   * Transcribe audio buffer to text using OpenAI Whisper
   */
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      // Use OpenAI Whisper for transcription
      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Create form data with audio file
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Transcription failed: ${error}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || '',
        language: result.language || 'en',
      };
    } catch (error) {
      console.error('[Voice Interface] Transcription error:', error);
      throw error;
    }
  }

  /**
   * Check if transcription is available
   */
  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Get service status (for health checks)
   */
  async getStatus() {
    return {
      transcription: {
        available: this.isAvailable(),
        provider: 'OpenAI Whisper',
      },
    };
  }
}

// Singleton instance
let voiceInterfaceInstance: VoiceInterface | null = null;

export function getVoiceInterface(): VoiceInterface {
  if (!voiceInterfaceInstance) {
    voiceInterfaceInstance = new VoiceInterface();
  }
  return voiceInterfaceInstance;
}

export const voiceInterface = getVoiceInterface();
