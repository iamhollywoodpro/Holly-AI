/**
 * Web Speech API TTS Library
 * Uses browser's built-in speech synthesis (100% free, no API keys)
 * Supports 100+ languages including Malayalam
 */

export interface WebSpeechOptions {
  voice?: string;
  language?: string;
  rate?: number; // 0.1 to 10 (default 1)
  pitch?: number; // 0 to 2 (default 1)
  volume?: number; // 0 to 1 (default 1)
}

/**
 * Get available voices from browser
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

/**
 * Detect language from text (basic heuristic)
 */
function detectLanguage(text: string): string {
  // Malayalam detection (Unicode range: 0D00-0D7F)
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'ml-IN';
  }
  
  // Hindi detection (Devanagari: 0900-097F)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi-IN';
  }
  
  // Tamil detection (0B80-0BFF)
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta-IN';
  }
  
  // Telugu detection (0C00-0C7F)
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te-IN';
  }
  
  // Bengali detection (0980-09FF)
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn-IN';
  }
  
  // Kannada detection (0C80-0CFF)
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn-IN';
  }
  
  // Gujarati detection (0A80-0AFF)
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu-IN';
  }
  
  // Arabic detection (0600-06FF)
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar-SA';
  }
  
  // Chinese detection (4E00-9FFF)
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh-CN';
  }
  
  // Japanese detection (Hiragana: 3040-309F, Katakana: 30A0-30FF)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja-JP';
  }
  
  // Korean detection (Hangul: AC00-D7AF)
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko-KR';
  }
  
  // Russian detection (Cyrillic: 0400-04FF)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru-RU';
  }
  
  // Default to English
  return 'en-US';
}

/**
 * Find best voice for language
 */
function findVoiceForLanguage(language: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  
  // Try exact match first (e.g., "ml-IN")
  let voice = voices.find(v => v.lang === language);
  if (voice) return voice;
  
  // Try language code only (e.g., "ml")
  const langCode = language.split('-')[0];
  voice = voices.find(v => v.lang.startsWith(langCode));
  if (voice) return voice;
  
  // Fallback to English
  voice = voices.find(v => v.lang.startsWith('en'));
  return voice || voices[0] || null;
}

/**
 * Speak text using Web Speech API
 * @param text - Text to speak
 * @param options - Speech options
 * @returns Promise that resolves when speech ends
 */
export function speak(text: string, options: WebSpeechOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Web Speech API not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Detect language if not provided
    const language = options.language || detectLanguage(text);
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find best voice for language
    const voice = findVoiceForLanguage(language);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = language;
    }
    
    // Set speech parameters
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    
    // Event handlers
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));
    
    // Speak
    window.speechSynthesis.speak(utterance);
    
    console.log('[Web Speech TTS] Speaking:', {
      text: text.substring(0, 50) + '...',
      language,
      voice: voice?.name || 'default',
      rate: utterance.rate,
      pitch: utterance.pitch,
      volume: utterance.volume,
    });
  });
}

/**
 * Stop current speech
 */
export function stop(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Pause current speech
 */
export function pause(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech
 */
export function resume(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
}

/**
 * Check if speech is currently playing
 */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }
  return window.speechSynthesis.speaking;
}

/**
 * Check if Web Speech API is supported
 */
export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Wait for voices to load (some browsers load voices asynchronously)
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voiceschanged event
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
  });
}
