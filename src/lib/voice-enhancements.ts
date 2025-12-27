/**
 * HOLLY AI - Voice Enhancements
 * Wake word detection, voice commands, and activity indicators
 */

export interface VoiceCommand {
  phrase: string;
  action: () => void;
  description: string;
}

export class VoiceEnhancementsService {
  private recognition: any = null;
  private isListening = false;
  private wakeWordEnabled = false;
  private commands: VoiceCommand[] = [];
  private activityCallback?: (isActive: boolean) => void;

  constructor() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = this.handleResult.bind(this);
      this.recognition.onstart = () => this.setActivity(true);
      this.recognition.onend = () => this.setActivity(false);
    }
  }

  /**
   * Register a voice command
   */
  registerCommand(command: VoiceCommand) {
    this.commands.push(command);
  }

  /**
   * Enable wake word detection ("Hey HOLLY")
   */
  enableWakeWord() {
    this.wakeWordEnabled = true;
    if (!this.isListening && this.recognition) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  /**
   * Disable wake word detection
   */
  disableWakeWord() {
    this.wakeWordEnabled = false;
    if (this.isListening && this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Set activity callback for visual indicators
   */
  onActivity(callback: (isActive: boolean) => void) {
    this.activityCallback = callback;
  }

  /**
   * Handle speech recognition results
   */
  private handleResult(event: any) {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0].transcript)
      .join('')
      .toLowerCase();

    // Check for wake word
    if (this.wakeWordEnabled && transcript.includes('hey holly')) {
      this.setActivity(true);
      // Trigger wake word detected event
      window.dispatchEvent(new CustomEvent('holly:wakeword'));
    }

    // Check for voice commands
    for (const command of this.commands) {
      if (transcript.includes(command.phrase.toLowerCase())) {
        command.action();
        break;
      }
    }
  }

  /**
   * Set activity state and trigger callback
   */
  private setActivity(isActive: boolean) {
    if (this.activityCallback) {
      this.activityCallback(isActive);
    }
  }

  /**
   * Get all registered commands
   */
  getCommands(): VoiceCommand[] {
    return this.commands;
  }

  /**
   * Check if wake word is enabled
   */
  isWakeWordEnabled(): boolean {
    return this.wakeWordEnabled;
  }
}

// Singleton instance
let voiceEnhancementsService: VoiceEnhancementsService | null = null;

export function getVoiceEnhancementsService(): VoiceEnhancementsService {
  if (!voiceEnhancementsService) {
    voiceEnhancementsService = new VoiceEnhancementsService();
    
    // Register default commands
    voiceEnhancementsService.registerCommand({
      phrase: 'new chat',
      action: () => window.location.href = '/',
      description: 'Start a new conversation',
    });

    voiceEnhancementsService.registerCommand({
      phrase: 'music studio',
      action: () => window.location.href = '/music-studio',
      description: 'Open Music Studio',
    });

    voiceEnhancementsService.registerCommand({
      phrase: 'aura lab',
      action: () => window.location.href = '/aura-lab',
      description: 'Open AURA A&R Lab',
    });

    voiceEnhancementsService.registerCommand({
      phrase: 'code workshop',
      action: () => window.location.href = '/code-workshop',
      description: 'Open Code Workshop',
    });

    voiceEnhancementsService.registerCommand({
      phrase: 'show settings',
      action: () => window.location.href = '/settings',
      description: 'Open Settings',
    });
  }

  return voiceEnhancementsService;
}
