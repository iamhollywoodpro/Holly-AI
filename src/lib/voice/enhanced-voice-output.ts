/**
 * HOLLY Voice Output System
 *
 * TTS Provider Stack (all FREE, zero servers required):
 *
 *  1. BROWSER TTS  — Primary when no server configured.
 *                    Uses the Web Speech API built into every browser.
 *                    Instant (<200ms), works offline, zero cost forever.
 *                    Picks the best available female English voice automatically.
 *
 *  2. KOKORO TTS   — Optional upgrade. Self-hosted Docker (~300ms CPU).
 *                    Activated only when NEXT_PUBLIC_KOKORO_TTS_URL is set.
 *                    docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
 *
 * Strategy:
 *  - If Kokoro URL is set → fetch server audio, fall back to browser on error.
 *  - If no Kokoro URL     → use browser TTS directly. No server, no config needed.
 *  - Text is cleaned (markdown stripped) and split into sentences for smooth playback.
 */

export interface VoiceOutputOptions {
  volume?: number;
  temperature?: number;
  voiceDescription?: string;
  voice?: string;
  speed?: number;
  useBrowserFallback?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onChunkStart?: (chunkIndex: number, total: number) => void;
}

// ─── Text utilities ───────────────────────────────────────────────────────────

function splitIntoChunks(text: string, maxChars = 180): string[] {
  if (!text.trim()) return [];

  const raw = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of raw) {
    const s = sentence.trim();
    if (!s) continue;

    if ((current + " " + s).trim().length <= maxChars) {
      current = (current + " " + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length > maxChars) {
        const parts = s.match(new RegExp(`.{1,${maxChars}}(?:,|$)`, "g")) || [s];
        for (const p of parts) {
          if (p.trim()) chunks.push(p.trim());
        }
        current = "";
      } else {
        current = s;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(c => c.length > 0);
}

function cleanForSpeech(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, " code block. ");
  t = t.replace(/`[^`]+`/g, " code. ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  t = t.replace(/\[[^\]]{1,20}\]/g, ""); // strip emotion tags like [laugh]
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

// ─── Browser TTS ──────────────────────────────────────────────────────────────

function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => /samantha|karen|victoria|moira|fiona/i.test(v.name) && v.lang.startsWith("en")) ||
    voices.find(v => /zira|susan|hazel|female/i.test(v.name) && v.lang.startsWith("en")) ||
    voices.find(v => v.lang === "en-US") ||
    voices.find(v => v.lang.startsWith("en")) ||
    voices[0] ||
    null
  );
}

function speakWithBrowser(
  text: string,
  options: VoiceOutputOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utt    = new SpeechSynthesisUtterance(text);
    utt.rate     = Math.max(0.5, Math.min(2, options.speed ?? 1.0));
    utt.pitch    = 1.05;
    utt.volume   = options.volume ?? 0.9;

    const voice = getBestVoice();
    if (voice) utt.voice = voice;

    utt.onstart = () => options.onStart?.();
    utt.onend   = () => { resolve(); options.onEnd?.(); };
    utt.onerror = () => resolve();

    window.speechSynthesis.speak(utt);
  });
}

// ─── Main voice output class ──────────────────────────────────────────────────

class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private _isSpeaking = false;
  private _aborted = false;

  stop(): void {
    this._aborted = true;
    this._isSpeaking = false;

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  isSpeaking(): boolean {
    const browserSpeaking =
      typeof window !== "undefined" && !!window.speechSynthesis?.speaking;
    const audioPlaying =
      !!this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended;
    return browserSpeaking || audioPlaying || this._isSpeaking;
  }

  isAvailable(): boolean {
    return true;
  }

  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text?.trim()) return;

    this.stop();
    this._aborted = false;
    this._isSpeaking = true;

    const cleaned = cleanForSpeech(text);
    if (!cleaned) { this._isSpeaking = false; return; }

    const chunks = splitIntoChunks(cleaned, 180);
    if (chunks.length === 0) { this._isSpeaking = false; return; }

    // Check if a Kokoro server is configured
    const kokoroUrl = typeof window !== "undefined"
      ? (window as any).__KOKORO_TTS_URL__ || process.env.NEXT_PUBLIC_KOKORO_TTS_URL
      : undefined;

    options.onStart?.();

    try {
      if (kokoroUrl) {
        // ── Kokoro path: fetch server audio, fall back to browser on error ──────
        for (let i = 0; i < chunks.length; i++) {
          if (this._aborted) break;
          options.onChunkStart?.(i, chunks.length);

          const audio = await this._fetchTTS(chunks[i], options).catch(() => null);
          if (this._aborted) break;

          if (audio) {
            await this._playBuffer(audio, options);
          } else {
            await speakWithBrowser(chunks[i], { volume: options.volume, speed: options.speed });
          }
        }
      } else {
        // ── Browser TTS path: no server needed, works instantly everywhere ───────
        for (let i = 0; i < chunks.length; i++) {
          if (this._aborted) break;
          options.onChunkStart?.(i, chunks.length);
          await speakWithBrowser(chunks[i], {
            volume: options.volume,
            speed:  options.speed,
            onStart: i === 0 ? undefined : undefined,
          });
        }
      }
    } catch (err: any) {
      if (!this._aborted) options.onError?.(err);
    } finally {
      this._isSpeaking = false;
      if (!this._aborted) options.onEnd?.();
    }
  }

  private async _fetchTTS(
    text: string,
    options: VoiceOutputOptions
  ): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceDescription: options.voiceDescription,
          voice:            options.voice,
          speed:            options.speed ?? 1.0,
          temperature:      options.temperature ?? 1.0,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return buf.byteLength > 0 ? buf : null;
    } catch {
      return null;
    }
  }

  private _playBuffer(
    buffer: ArrayBuffer,
    options: VoiceOutputOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this._aborted) { resolve(); return; }

      const blob  = new Blob([buffer], { type: "audio/wav" });
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, options.volume ?? 0.9));

      this.currentBlobUrl = url;
      this.currentAudio   = audio;

      audio.onended = () => {
        this._isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(url);
        this.currentBlobUrl = null;
        resolve();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        URL.revokeObjectURL(url);
        this.currentBlobUrl = null;
        resolve();
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => resolve());
      }
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: EnhancedVoiceOutput | null = null;

function getVoiceOutput(): EnhancedVoiceOutput {
  if (typeof window === "undefined") {
    return {
      speak:       async () => {},
      stop:        () => {},
      isSpeaking:  () => false,
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
  return getVoiceOutput().speak(text, options ?? {});
}

export function stopSpeaking(): void {
  getVoiceOutput().stop();
}

export function isSpeaking(): boolean {
  return getVoiceOutput().isSpeaking();
}

export { EnhancedVoiceOutput, getVoiceOutput };
