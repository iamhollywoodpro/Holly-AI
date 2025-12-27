/**
 * Voice Service
 * Handles text-to-speech using browser's Speech Synthesis API
 * Fallback for MAYA1 TTS until Railway deployment is ready
 */

export class VoiceService {
  private synthesis: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private isEnabled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  /**
   * Load available voices and select the best female voice
   */
  private loadVoices() {
    if (!this.synthesis) return;

    const loadVoicesHandler = () => {
      const voices = this.synthesis!.getVoices();
      
      // Prefer female voices with American accent
      const preferredVoices = [
        'Samantha', // macOS
        'Microsoft Zira', // Windows
        'Google US English Female', // Chrome
        'Karen', // macOS
        'Victoria', // macOS
      ];

      // Try to find preferred voice
      for (const preferred of preferredVoices) {
        const found = voices.find(v => v.name.includes(preferred));
        if (found) {
          this.voice = found;
          console.log('[VoiceService] Selected voice:', found.name);
          return;
        }
      }

      // Fallback to any female English voice
      const femaleVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('woman'))
      );

      if (femaleVoice) {
        this.voice = femaleVoice;
        console.log('[VoiceService] Selected fallback voice:', femaleVoice.name);
        return;
      }

      // Last resort: first English voice
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        this.voice = englishVoice;
        console.log('[VoiceService] Selected default voice:', englishVoice.name);
      }
    };

    // Load voices immediately if available
    if (this.synthesis.getVoices().length > 0) {
      loadVoicesHandler();
    }

    // Also listen for voiceschanged event
    this.synthesis.addEventListener('voiceschanged', loadVoicesHandler);
  }

  /**
   * Enable voice output
   */
  enable() {
    this.isEnabled = true;
    console.log('[VoiceService] Voice enabled');
  }

  /**
   * Disable voice output
   */
  disable() {
    this.isEnabled = false;
    this.stop();
    console.log('[VoiceService] Voice disabled');
  }

  /**
   * Toggle voice on/off
   */
  toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    console.log('[VoiceService] Voice toggled:', this.isEnabled);
    return this.isEnabled;
  }

  /**
   * Check if voice is enabled
   */
  isVoiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Speak text using browser's speech synthesis
   * Splits long text into chunks to avoid browser limitations
   */
  async speak(text: string): Promise<void> {
    if (!this.synthesis || !this.isEnabled) {
      return;
    }

    // Stop any ongoing speech
    this.stop();

    // Clean text (remove markdown, emojis, etc.)
    const cleanText = this.cleanText(text);

    if (!cleanText.trim()) {
      return;
    }

    // Split text into chunks (sentences or paragraphs)
    const chunks = this.splitIntoChunks(cleanText);
    
    console.log(`[VoiceService] Speaking ${chunks.length} chunks...`);

    // Speak each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.trim()) continue;

      await this.speakChunk(chunk);
      
      // Small pause between chunks for natural flow
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('[VoiceService] All chunks completed');
  }

  /**
   * Speak a single chunk of text
   */
  private speakChunk(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice
      if (this.voice) {
        utterance.voice = this.voice;
      }

      // Configure speech parameters
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume

      // Event handlers
      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('[VoiceService] Speech error:', event.error);
        // Don't reject, just resolve to continue with next chunk
        resolve();
      };

      // Speak
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Split text into manageable chunks for speech synthesis
   * Splits on sentence boundaries to maintain natural flow
   */
  private splitIntoChunks(text: string, maxChunkLength: number = 200): string[] {
    const chunks: string[] = [];
    
    // First split by paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxChunkLength) {
        chunks.push(paragraph);
        continue;
      }
      
      // Split long paragraphs by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChunkLength) {
          currentChunk += sentence;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Clean text for speech synthesis
   * Remove markdown, emojis, special characters
   */
  private cleanText(text: string): string {
    let cleaned = text;

    // Remove markdown formatting
    cleaned = cleaned.replace(/[*_`#]/g, '');
    
    // Remove emojis
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');

    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported(): boolean {
    return this.synthesis !== null;
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
