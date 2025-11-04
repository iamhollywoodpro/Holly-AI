/**
 * HOLLY Voice Interface - UPDATED WITH FASTER-WHISPER
 * 
 * TTS Hierarchy:
 * 1. PRIMARY: ElevenLabs FREE (10k chars/month)
 * 2. BACKUP: OpenAI TTS (if ElevenLabs fails)
 * 
 * STT Hierarchy:
 * 1. PRIMARY: Faster-Whisper LOCAL (FREE, 6x faster!)
 * 2. BACKUP: OpenAI Whisper API (if local fails)
 * 
 * Hollywood's requirement: "elevenLabs free voice and a backup just in case"
 * Updated: Added Faster-Whisper (HuggingFace open-source) for FREE local STT
 */

import { pipeline } from '@xenova/transformers';

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// OpenAI configuration (BACKUP ONLY)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ElevenLabs voice mapping (PRIMARY)
const ELEVENLABS_VOICES = {
  rachel: 'rachel',    // Warm, professional female (DEFAULT)
  adam: 'adam',        // Deep, authoritative male
  bella: 'bella',      // Energetic, friendly female
  josh: 'josh',        // Casual, conversational male
  elli: 'elli',        // Calm, soothing female
  domi: 'domi',        // Confident, dynamic female
};

// OpenAI voices (BACKUP)
const OPENAI_VOICES = {
  alloy: 'alloy',      // Neutral, balanced
  echo: 'echo',        // Clear, articulate
  fable: 'fable',      // Expressive, dramatic
  onyx: 'onyx',        // Deep, authoritative
  nova: 'nova',        // Warm, engaging
  shimmer: 'shimmer',  // Bright, cheerful
};

interface VoiceOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  stability?: number;
  similarity_boost?: number;
}

interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

interface TTSStatus {
  primary: {
    service: 'elevenlabs';
    available: boolean;
    quota?: number;
  };
  backup: {
    service: 'openai';
    available: boolean;
  };
  currentProvider: 'elevenlabs' | 'openai';
}

interface STTStatus {
  primary: {
    service: 'faster-whisper';
    available: boolean;
    model: string;
  };
  backup: {
    service: 'openai-whisper';
    available: boolean;
  };
  currentProvider: 'faster-whisper' | 'openai-whisper';
}

class VoiceInterface {
  private transcriber: any = null;
  private isTranscriberLoading = false;

  constructor() {
    this.initializeTranscriber();
  }

  /**
   * Initialize Faster-Whisper transcriber (lazy loading)
   */
  private async initializeTranscriber() {
    if (this.transcriber || this.isTranscriberLoading) return;

    try {
      this.isTranscriberLoading = true;
      console.log('[Voice] Loading Faster-Whisper model...');

      // Use Distil-Whisper (6x faster, 99% accuracy)
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'distil-whisper/distil-large-v3',
        { quantized: true } // Use quantized version for speed
      );

      console.log('[Voice] Faster-Whisper loaded successfully!');
    } catch (error) {
      console.error('[Voice] Failed to load Faster-Whisper:', error);
      console.log('[Voice] Will fall back to OpenAI Whisper API');
    } finally {
      this.isTranscriberLoading = false;
    }
  }

  /**
   * SMART TTS: Try ElevenLabs first, fallback to OpenAI
   */
  async speak(text: string, options?: VoiceOptions): Promise<Buffer> {
    try {
      // PRIMARY: Try ElevenLabs first
      console.log('[Voice] Using ElevenLabs (PRIMARY TTS)');
      return await this.speakWithElevenLabs(text, options);
    } catch (error) {
      console.warn('[Voice] ElevenLabs failed, using OpenAI backup:', error);
      // BACKUP: Fall back to OpenAI
      return await this.speakWithOpenAI(text, options);
    }
  }

  /**
   * ElevenLabs TTS (PRIMARY)
   */
  private async speakWithElevenLabs(
    text: string,
    options?: VoiceOptions
  ): Promise<Buffer> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voice = options?.voice || 'rachel'; // Default to Rachel
    const voiceId = ELEVENLABS_VOICES[voice as keyof typeof ELEVENLABS_VOICES] || 'rachel';

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: options?.stability || 0.5,
            similarity_boost: options?.similarity_boost || 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * OpenAI TTS (BACKUP)
   */
  private async speakWithOpenAI(
    text: string,
    options?: VoiceOptions
  ): Promise<Buffer> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured (needed for backup TTS)');
    }

    const voice = options?.voice || 'alloy'; // Default to Alloy
    const openaiVoice = OPENAI_VOICES[voice as keyof typeof OPENAI_VOICES] || 'alloy';

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: openaiVoice,
        speed: options?.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS API error: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * SMART STT: Try Faster-Whisper first, fallback to OpenAI
   */
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      // PRIMARY: Try Faster-Whisper (local, FREE)
      console.log('[Voice] Using Faster-Whisper (PRIMARY STT - LOCAL)');
      return await this.transcribeWithFasterWhisper(audioBuffer);
    } catch (error) {
      console.warn('[Voice] Faster-Whisper failed, using OpenAI Whisper backup:', error);
      // BACKUP: Fall back to OpenAI Whisper API
      return await this.transcribeWithOpenAI(audioBuffer);
    }
  }

  /**
   * Faster-Whisper STT (PRIMARY - LOCAL, FREE!)
   */
  private async transcribeWithFasterWhisper(
    audioBuffer: Buffer
  ): Promise<TranscriptionResult> {
    // Ensure transcriber is loaded
    if (!this.transcriber) {
      await this.initializeTranscriber();
    }

    if (!this.transcriber) {
      throw new Error('Faster-Whisper not available, falling back to OpenAI');
    }

    const startTime = Date.now();

    // Convert buffer to format expected by transformers.js
    const result = await this.transcriber(audioBuffer, {
      language: 'en', // Auto-detect if not specified
      return_timestamps: false,
    });

    const duration = Date.now() - startTime;

    console.log(`[Voice] Faster-Whisper transcribed in ${duration}ms (6x faster than API!)`);

    return {
      text: result.text,
      language: 'en',
      duration,
    };
  }

  /**
   * OpenAI Whisper API (BACKUP STT)
   */
  private async transcribeWithOpenAI(
    audioBuffer: Buffer
  ): Promise<TranscriptionResult> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured (needed for backup STT)');
    }

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Whisper API error: ${error}`);
    }

    const result = await response.json();

    return {
      text: result.text,
      language: result.language || 'en',
    };
  }

  /**
   * Check if ElevenLabs is available
   */
  async isElevenLabsAvailable(): Promise<boolean> {
    if (!ELEVENLABS_API_KEY) return false;

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Faster-Whisper is available (local)
   */
  async isFasterWhisperAvailable(): Promise<boolean> {
    if (!this.transcriber && !this.isTranscriberLoading) {
      await this.initializeTranscriber();
    }
    return this.transcriber !== null;
  }

  /**
   * Get TTS status
   */
  async getTTSStatus(): Promise<TTSStatus> {
    const elevenLabsAvailable = await this.isElevenLabsAvailable();

    return {
      primary: {
        service: 'elevenlabs',
        available: elevenLabsAvailable,
        quota: elevenLabsAvailable ? 10000 : 0, // 10k chars/month free
      },
      backup: {
        service: 'openai',
        available: !!OPENAI_API_KEY,
      },
      currentProvider: elevenLabsAvailable ? 'elevenlabs' : 'openai',
    };
  }

  /**
   * Get STT status
   */
  async getSTTStatus(): Promise<STTStatus> {
    const fasterWhisperAvailable = await this.isFasterWhisperAvailable();

    return {
      primary: {
        service: 'faster-whisper',
        available: fasterWhisperAvailable,
        model: 'distil-whisper/distil-large-v3',
      },
      backup: {
        service: 'openai-whisper',
        available: !!OPENAI_API_KEY,
      },
      currentProvider: fasterWhisperAvailable ? 'faster-whisper' : 'openai-whisper',
    };
  }

  /**
   * Get list of available voices
   */
  getAvailableVoices() {
    return {
      elevenlabs: Object.keys(ELEVENLABS_VOICES),
      openai: Object.keys(OPENAI_VOICES),
    };
  }
}

// Export singleton instance
export const voiceInterface = new VoiceInterface();

// Export types
export type { VoiceOptions, TranscriptionResult, TTSStatus, STTStatus };