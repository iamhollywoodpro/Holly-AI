// HOLLY Voice Service - Centralized voice input/output management
// Uses ElevenLabs for output, Web Speech API for input

export type VoiceModel = 'rachel' | 'bella' | 'elli' | 'grace';
export type InputMethod = 'typing' | 'voice';

export interface VoiceSettings {
  outputEnabled: boolean;
  autoPlay: boolean; // Auto-play responses when user uses voice input
  voiceModel: VoiceModel;
  volume: number; // 0-1
}

export interface VoiceServiceState {
  isListening: boolean;
  isSpeaking: boolean;
  lastInputMethod: InputMethod;
  settings: VoiceSettings;
}

// Default settings
const DEFAULT_SETTINGS: VoiceSettings = {
  outputEnabled: true,
  autoPlay: true, // Only speak when user speaks
  voiceModel: 'rachel',
  volume: 1.0
};

// Local storage key
const SETTINGS_KEY = 'holly_voice_settings';

class VoiceService {
  private recognition: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private state: VoiceServiceState = {
    isListening: false,
    isSpeaking: false,
    lastInputMethod: 'typing',
    settings: DEFAULT_SETTINGS
  };
  private listeners: Set<(state: VoiceServiceState) => void> = new Set();

  constructor() {
    // Load saved settings
    this.loadSettings();

    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  // Load settings from localStorage
  private loadSettings() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        this.state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('[VoiceService] Failed to load settings:', error);
    }
  }

  // Save settings to localStorage
  private saveSettings() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.state.settings));
    } catch (error) {
      console.error('[VoiceService] Failed to save settings:', error);
    }
  }

  // Subscribe to state changes
  subscribe(callback: (state: VoiceServiceState) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify listeners of state change
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.state));
  }

  // Get current state
  getState(): VoiceServiceState {
    return { ...this.state };
  }

  // Update settings
  updateSettings(updates: Partial<VoiceSettings>) {
    this.state.settings = { ...this.state.settings, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  // Start voice input
  async startListening(onTranscript: (text: string, isFinal: boolean) => void): Promise<boolean> {
    if (!this.recognition) {
      console.error('[VoiceService] Speech recognition not available');
      return false;
    }

    if (this.state.isListening) {
      console.warn('[VoiceService] Already listening');
      return true;
    }

    try {
      // Set input method to voice
      this.state.lastInputMethod = 'voice';

      // Setup recognition handlers
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          onTranscript(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('[VoiceService] Recognition error:', event.error);
        this.stopListening();
      };

      this.recognition.onend = () => {
        if (this.state.isListening) {
          // Restart if still supposed to be listening
          try {
            this.recognition.start();
          } catch (error) {
            console.error('[VoiceService] Failed to restart recognition:', error);
            this.stopListening();
          }
        }
      };

      // Start recognition
      this.recognition.start();
      this.state.isListening = true;
      this.notifyListeners();

      console.log('[VoiceService] Started listening');
      return true;

    } catch (error) {
      console.error('[VoiceService] Failed to start listening:', error);
      return false;
    }
  }

  // Stop voice input
  stopListening() {
    if (!this.recognition || !this.state.isListening) return;

    try {
      this.recognition.stop();
      this.state.isListening = false;
      this.notifyListeners();
      console.log('[VoiceService] Stopped listening');
    } catch (error) {
      console.error('[VoiceService] Failed to stop listening:', error);
    }
  }

  // Speak text using ElevenLabs
  async speak(text: string, force: boolean = false): Promise<boolean> {
    // Check if we should speak
    if (!force && !this.state.settings.outputEnabled) {
      console.log('[VoiceService] Voice output disabled');
      return false;
    }

    // Check auto-play setting
    if (!force && !this.state.settings.autoPlay && this.state.lastInputMethod === 'typing') {
      console.log('[VoiceService] Auto-play disabled for typed input');
      return false;
    }

    // Stop any current speech
    this.stopSpeaking();

    try {
      this.state.isSpeaking = true;
      this.notifyListeners();

      // Call ElevenLabs API
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          voice: this.state.settings.voiceModel 
        })
      });

      if (!response.ok) {
        throw new Error(`Voice API failed: ${response.statusText}`);
      }

      // Create audio element
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = this.state.settings.volume;

      // Setup event handlers
      audio.onended = () => {
        this.state.isSpeaking = false;
        this.currentAudio = null;
        this.notifyListeners();
        URL.revokeObjectURL(url);
      };

      audio.onerror = (error) => {
        console.error('[VoiceService] Audio playback error:', error);
        this.state.isSpeaking = false;
        this.currentAudio = null;
        this.notifyListeners();
        URL.revokeObjectURL(url);
      };

      // Play audio
      this.currentAudio = audio;
      await audio.play();

      console.log('[VoiceService] Speaking with ElevenLabs:', this.state.settings.voiceModel);
      return true;

    } catch (error) {
      console.error('[VoiceService] Failed to speak:', error);
      this.state.isSpeaking = false;
      this.currentAudio = null;
      this.notifyListeners();
      return false;
    }
  }

  // Stop speaking
  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.state.isSpeaking = false;
      this.notifyListeners();
      console.log('[VoiceService] Stopped speaking');
    }
  }

  // Set input method (for manual tracking)
  setInputMethod(method: InputMethod) {
    this.state.lastInputMethod = method;
    this.notifyListeners();
  }

  // Check if speech recognition is available
  isRecognitionAvailable(): boolean {
    return this.recognition !== null;
  }

  // Cleanup
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.listeners.clear();
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

// Export convenience functions
export const startVoiceInput = (onTranscript: (text: string, isFinal: boolean) => void) => 
  voiceService.startListening(onTranscript);

export const stopVoiceInput = () => 
  voiceService.stopListening();

export const speakText = (text: string, force?: boolean) => 
  voiceService.speak(text, force);

export const stopSpeaking = () => 
  voiceService.stopSpeaking();

export const updateVoiceSettings = (settings: Partial<VoiceSettings>) => 
  voiceService.updateSettings(settings);

export const getVoiceState = () => 
  voiceService.getState();

export const subscribeToVoiceState = (callback: (state: VoiceServiceState) => void) => 
  voiceService.subscribe(callback);
