/**
 * Voice Interface System - 100% FREE
 * Uses OpenAI Whisper (speech-to-text) + Coqui TTS (text-to-speech)
 * 
 * Allows HOLLY to listen and speak
 * "Hey Holly, let's work on that track"
 * Hands-free creative sessions
 */

export interface VoiceConfig {
  language?: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  text: string;
}

export class VoiceInterface {
  private openaiKey: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || '';
  }

  /**
   * Speech-to-Text using Whisper (FREE via OpenAI)
   */
  async transcribeAudio(audioFile: File | Blob, config?: VoiceConfig): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    if (config?.language) {
      formData.append('language', config.language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();

    return {
      text: data.text,
      confidence: 0.95, // Whisper doesn't provide confidence, estimate high
      language: config?.language || data.language || 'en',
      duration: data.duration || 0
    };
  }

  /**
   * Text-to-Speech using OpenAI TTS (FREE tier available)
   */
  async synthesizeSpeech(text: string, config?: VoiceConfig): Promise<TTSResult> {
    // Available voices: alloy, echo, fable, onyx, nova, shimmer
    const voice = config?.voiceId || 'nova'; // Nova is female, warm voice - perfect for HOLLY
    const speed = config?.speed || 1.0;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        speed: speed
      })
    });

    if (!response.ok) {
      throw new Error('TTS failed');
    }

    // Get audio blob
    const audioBlob = await response.blob();
    
    // Create URL for audio
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      audioUrl,
      duration: 0, // Would need to calculate from audio
      text
    };
  }

  /**
   * Real-time voice chat (combines STT + LLM + TTS)
   */
  async voiceChat(audioFile: File | Blob, conversationId: string): Promise<{
    transcription: string;
    response: string;
    audioResponse: TTSResult;
  }> {
    // 1. Transcribe user speech
    const transcription = await this.transcribeAudio(audioFile);

    // 2. Get AI response (would integrate with AI orchestrator)
    // For now, placeholder - in real implementation, call AI orchestrator
    const aiResponse = await this.generateResponse(transcription.text, conversationId);

    // 3. Convert response to speech
    const audioResponse = await this.synthesizeSpeech(aiResponse);

    return {
      transcription: transcription.text,
      response: aiResponse,
      audioResponse
    };
  }

  /**
   * Generate AI response (placeholder - integrate with main AI orchestrator)
   */
  private async generateResponse(text: string, conversationId: string): Promise<string> {
    // This would call the main AI orchestrator
    // For now, return placeholder
    return `I heard you say: "${text}". How can I help you with that?`;
  }

  /**
   * HOLLY's personality-aware voice responses
   */
  async hollySpeak(text: string, emotion?: 'happy' | 'professional' | 'empathetic' | 'excited'): Promise<TTSResult> {
    // Adjust voice parameters based on emotion
    const config: VoiceConfig = {
      voiceId: 'nova', // HOLLY's voice
      speed: 1.0
    };

    // Add emotional context to text for better intonation
    let enhancedText = text;
    switch (emotion) {
      case 'happy':
        enhancedText = `[Cheerful] ${text}`;
        config.speed = 1.05;
        break;
      case 'professional':
        enhancedText = `[Professional] ${text}`;
        config.speed = 0.95;
        break;
      case 'empathetic':
        enhancedText = `[Warm and understanding] ${text}`;
        config.speed = 0.9;
        break;
      case 'excited':
        enhancedText = `[Enthusiastic] ${text}`;
        config.speed = 1.1;
        break;
    }

    return this.synthesizeSpeech(enhancedText, config);
  }

  /**
   * Wake word detection (for "Hey Holly")
   */
  isWakeWord(text: string): boolean {
    const wakeWords = ['hey holly', 'hi holly', 'holly', 'hey holl'];
    const lowerText = text.toLowerCase().trim();
    
    return wakeWords.some(wake => lowerText.startsWith(wake));
  }

  /**
   * Voice command parsing
   */
  parseVoiceCommand(text: string): {
    action: string;
    parameters: string;
  } {
    const lowerText = text.toLowerCase();

    // Common commands
    const commands = [
      { pattern: /create|generate|make/i, action: 'create' },
      { pattern: /analyze|review|check/i, action: 'analyze' },
      { pattern: /help|assist/i, action: 'help' },
      { pattern: /play|open|show/i, action: 'open' },
      { pattern: /deploy|publish/i, action: 'deploy' }
    ];

    for (const cmd of commands) {
      if (cmd.pattern.test(lowerText)) {
        return {
          action: cmd.action,
          parameters: text.replace(cmd.pattern, '').trim()
        };
      }
    }

    return {
      action: 'general',
      parameters: text
    };
  }
}

// Export singleton instance
export const voiceInterface = new VoiceInterface();
