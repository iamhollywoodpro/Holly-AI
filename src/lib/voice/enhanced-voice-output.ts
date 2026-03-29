/**
 * HOLLY Voice Output System
 * 
 * Single voice pipeline — ONE model speaks at a time.
 * Provider: Maya1 via Modal.com (FREE GPU, emotional, alive-sounding)
 * 
 * No Google, no Gemini, no paid TTS — Maya1 only.
 * No browser speechSynthesis, no duplicate audio, no two models playing at once.
 */

export interface VoiceOutputOptions {
  volume?: number;
  temperature?: number;      // Maya1: 0.2 (consistent) to 0.7 (expressive)
  voiceDescription?: string; // Override HOLLY's default voice profile
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private _isSpeaking = false;

  // ── Stop any current playback ──────────────────────────────────────────────

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this._isSpeaking = false;
    }
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  isSpeaking(): boolean {
    if (!this.currentAudio) return false;
    return !this.currentAudio.paused && !this.currentAudio.ended;
  }

  isAvailable(): boolean {
    return true; // Always available — Maya1 via /api/voice/synthesize
  }

  // ── Core speak ────────────────────────────────────────────────────────────

  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text?.trim()) return;

    // Stop any current audio FIRST — single voice at a time
    this.stop();

    const cleanedText = this.preprocessText(text);
    if (!cleanedText) return;

    try {
      // Call /api/voice/synthesize → Maya1 via Modal.com
      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanedText,
          voiceDescription: options.voiceDescription,
          temperature: options.temperature ?? 0.4,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`TTS API error ${response.status}: ${errText}`);
      }

      const audioBlob  = await response.blob();
      const blobUrl    = URL.createObjectURL(audioBlob);

      // Store refs for cleanup
      this.currentBlobUrl = blobUrl;

      await this.playAudio(blobUrl, options);

    } catch (error: any) {
      console.error("[HOLLY Voice] Synthesis error:", error.message);
      this._isSpeaking = false;
      options.onError?.(error);
      throw error;
    }
  }

  // ── Play audio blob ───────────────────────────────────────────────────────

  private playAudio(blobUrl: string, options: VoiceOutputOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio     = new Audio(blobUrl);
      audio.volume    = Math.max(0, Math.min(1, options.volume ?? 0.9));
      this.currentAudio = audio;
      this._isSpeaking  = true;

      audio.onplay = () => {
        this._isSpeaking = true;
        options.onStart?.();
      };

      audio.onended = () => {
        this._isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(blobUrl);
        this.currentBlobUrl = null;
        options.onEnd?.();
        resolve();
      };

      audio.onerror = (e) => {
        this._isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(blobUrl);
        this.currentBlobUrl = null;
        const err = new Error(`Audio playback error: ${e}`);
        options.onError?.(err);
        reject(err);
      };

      // Play — handle autoplay policy gracefully
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === "NotAllowedError") {
            // Browser blocked autoplay — need user gesture
            console.warn("[HOLLY Voice] Autoplay blocked. User must interact first.");
            options.onError?.(new Error("Autoplay blocked — click the page first"));
          }
          reject(err);
        });
      }
    });
  }

  // ── Text preprocessing ────────────────────────────────────────────────────
  // Preserves Maya1 emotion tags (e.g. <laugh>, <sigh>, <whisper>)

  private preprocessText(text: string): string {
    let cleaned = text;

    // Remove code blocks (not useful for speech)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, " [code block] ");
    cleaned = cleaned.replace(/`[^`]+`/g, " [code] ");

    // Remove markdown formatting but keep text
    cleaned = cleaned.replace(/#{1,6}\s/g, "");
    cleaned = cleaned.replace(/[*_~]/g, "");
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Remove emojis (Maya1 doesn't need them — it uses emotion tags instead)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2600}-\u{27BF}]/gu, "");

    // Collapse whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Max length for a single TTS call
    if (cleaned.length > 4000) {
      cleaned = cleaned.substring(0, 4000) + "...";
    }

    return cleaned;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: EnhancedVoiceOutput | null = null;

function getVoiceOutput(): EnhancedVoiceOutput {
  if (typeof window === "undefined") {
    // SSR — return a dummy that does nothing
    return {
      speak: async () => {},
      stop: () => {},
      isSpeaking: () => false,
      isAvailable: () => false,
    } as unknown as EnhancedVoiceOutput;
  }
  if (!_instance) _instance = new EnhancedVoiceOutput();
  return _instance;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function speakText(
  text: string,
  options?: VoiceOutputOptions
): Promise<void> {
  return getVoiceOutput().speak(text, options);
}

export function stopSpeaking(): void {
  getVoiceOutput().stop();
}

export function isSpeaking(): boolean {
  return getVoiceOutput().isSpeaking();
}

export { EnhancedVoiceOutput, getVoiceOutput };
