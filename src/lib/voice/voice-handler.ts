/**
 * Voice Handler - Web Speech API Integration
 * Handles both voice input (Speech Recognition) and voice output (Speech Synthesis)
 */

import { EnhancedVoiceOutput } from './enhanced-voice-output';

// Check if Web Speech API is available
export const isSpeechRecognitionAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

export const isSpeechSynthesisAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Voice Input - Speech Recognition
export class VoiceInput {
  private recognition: any;
  private isListening: boolean = false;
  private onTranscriptCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Stop after user finishes speaking
      this.recognition.interimResults = false; // Only final results
      this.recognition.lang = 'en-US'; // Language
      this.recognition.maxAlternatives = 1;

      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('🎤 Transcribed:', transcript);
      
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('🎤 Recognition error:', event.error);
      
      const errorMessage = this.getErrorMessage(event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
      
      this.isListening = false;
    };

    this.recognition.onend = () => {
      console.log('🎤 Recognition ended');
      this.isListening = false;
    };
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'no-speech':
        return "No speech detected. Please try again.";
      case 'audio-capture':
        return "Microphone not found. Please check your device.";
      case 'not-allowed':
        return "Microphone permission denied. Please enable it in your browser settings.";
      case 'network':
        return "Network error. Please check your connection.";
      default:
        return `Voice recognition error: ${error}`;
    }
  }

  start(
    onTranscript: (text: string) => void,
    onError?: (error: string) => void
  ) {
    if (!this.recognition) {
      onError?.('Speech recognition not supported in this browser.');
      return;
    }

    if (this.isListening) {
      console.log('Already listening...');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('🎤 Started listening...');
    } catch (error) {
      console.error('Failed to start recognition:', error);
      onError?.('Failed to start voice recognition');
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Stopped listening');
    } catch (error) {
      console.error('Failed to stop recognition:', error);
    }
  }

  isActive(): boolean {
    return this.isListening;
  }
}

// Voice Output - Speech Synthesis
export class VoiceOutput {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  // Get available voices
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  // Get HOLLY's preferred voice (female, English)
  getHollyVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    
    // Prefer female English voices
    const femaleEnglish = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('samantha') ||
       v.name.toLowerCase().includes('victoria') ||
       v.name.toLowerCase().includes('karen'))
    );
    
    if (femaleEnglish) return femaleEnglish;
    
    // Fallback to any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  // Speak text with HOLLY's voice
  speak(
    text: string,
    options?: {
      rate?: number; // 0.1 to 10 (default 1)
      pitch?: number; // 0 to 2 (default 1)
      volume?: number; // 0 to 1 (default 1)
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: string) => void;
    }
  ) {
    if (!this.synth) {
      options?.onError?.('Speech synthesis not supported in this browser.');
      return;
    }

    // Stop any current speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set HOLLY's voice
    const hollyVoice = this.getHollyVoice();
    if (hollyVoice) {
      utterance.voice = hollyVoice;
    }
    
    // Set parameters
    utterance.rate = options?.rate || 1.0; // Normal speed
    utterance.pitch = options?.pitch || 1.1; // Slightly higher pitch (feminine)
    utterance.volume = options?.volume || 0.8; // 80% volume

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      options?.onStart?.();
      console.log('🔊 HOLLY speaking:', text.substring(0, 50) + '...');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      options?.onEnd?.();
      console.log('🔊 HOLLY finished speaking');
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      console.error('🔊 Speech error:', event.error);
      options?.onError?.(event.error);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  // Stop current speech
  stop() {
    if (!this.synth) return;

    if (this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      console.log('🔊 Stopped speaking');
    }
  }

  // Pause speech
  pause() {
    if (!this.synth || !this.synth.speaking) return;
    this.synth.pause();
  }

  // Resume speech
  resume() {
    if (!this.synth || !this.synth.paused) return;
    this.synth.resume();
  }

  // Check if currently speaking
  isActive(): boolean {
    return this.isSpeaking;
  }
}

// Singleton instances
let voiceInputInstance: VoiceInput | null = null;
let voiceOutputInstance: EnhancedVoiceOutput | null = null;

export const getVoiceInput = (): VoiceInput => {
  if (!voiceInputInstance) {
    voiceInputInstance = new VoiceInput();
  }
  return voiceInputInstance;
};

export const getVoiceOutput = (): EnhancedVoiceOutput => {
  if (!voiceOutputInstance) {
    voiceOutputInstance = new EnhancedVoiceOutput();
  }
  return voiceOutputInstance;
};
