/**
 * HOLLY Voice Output System — Phase 1 (Kokoro Edition)
 *
 * TTS Provider Stack (all FREE, no subscriptions, no GPU credits):
 *
 *  1. KOKORO-FASTAPI  — Primary. Docker-based, Apache 2.0.
 *                       ~300ms on CPU, ~50ms on GPU. Zero cold starts.
 *                       Self-host: docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
 *
 *  2. CHATTERBOX      — Fallback. MIT license. Emotion tags: [laugh] [sigh] etc.
 *                       Deploys free on HF Spaces (T4 GPU).
 *
 *  3. BROWSER TTS     — Instant bridge. Plays the first sentence while Kokoro
 *                       processes. ~200ms. No server needed.
 *
 * Playback strategy:
 *  - Text is split into ≤180-char chunks (sentences first, then commas)
 *  - Browser speechSynthesis starts instantly on chunk 1 (~200ms)
 *  - Kokoro/Chatterbox audio arrives ~300ms later — replaces browser audio
 *  - Remaining chunks play sequentially, seamlessly
 *  - NO keep-alive pings — Kokoro runs locally, always warm, zero idle cost
 *
 * Voice-mode rules:
 *  - voiceInput = true  → auto-play immediately after AI response
 *  - voiceInput = false → only play when user clicks the speaker button
 */

export interface VoiceOutputOptions {
  volume?: number;
  temperature?: number;         // unused by Kokoro, kept for API compatibility
  voiceDescription?: string;    // used by Chatterbox for voice style
  voice?: string;               // Kokoro voice ID override (e.g. "af_bella")
  speed?: number;               // speech speed multiplier (default 1.0)
  useBrowserFallback?: boolean; // default true — instant bridge while Kokoro loads
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onChunkStart?: (chunkIndex: number, total: number) => void;
}

// ─── Text utilities ───────────────────────────────────────────────────────────

/**
 * Split text into speakable sentences (≤maxChars each).
 * Preserves Kokoro/Chatterbox emotion tags across boundaries.
 */
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
        // Single long sentence — split on commas
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

/**
 * Strip markdown and emojis for speech.
 * Preserves emotion tags: [laugh] [sigh] [gasp] (Chatterbox style)
 */
function cleanForSpeech(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, " code block. ");
  t = t.replace(/`[^`]+`/g, " code. ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  // Remove emojis — keep square-bracket emotion tags like [laugh]
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

// ─── Browser TTS (instant bridge) ────────────────────────────────────────────

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

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = 1.0;
    utt.pitch  = 1.0;
    utt.volume = options.volume ?? 0.9;

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice =
      voices.find(v => /samantha|karen|victoria|moira|fiona|zira|susan|female/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0];
    if (femaleVoice) utt.voice = femaleVoice;

    utt.onstart = () => options.onStart?.();
    utt.onend   = () => { resolve(); options.onEnd?.(); };
    utt.onerror = () => resolve(); // never reject — just move on

    window.speechSynthesis.speak(utt);
  });
}

// ─── Main voice output class ──────────────────────────────────────────────────

class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private _isSpeaking = false;
  private _aborted = false;

  // No keep-alive timer needed — Kokoro runs locally, always warm.

  // ── Stop ─────────────────────────────────────────────────────────────────────
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

  // ── Main speak ────────────────────────────────────────────────────────────────

  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text?.trim()) return;

    this.stop();
    this._aborted = false;
    this._isSpeaking = true;

    const cleaned = cleanForSpeech(text);
    if (!cleaned) { this._isSpeaking = false; return; }

    const chunks = splitIntoChunks(cleaned, 180);
    if (chunks.length === 0) { this._isSpeaking = false; return; }

    const useFallback = options.useBrowserFallback !== false;

    options.onStart?.();

    try {
      // ── Chunk 0: fire Kokoro in background, play browser instantly as bridge ──
      options.onChunkStart?.(0, chunks.length);
      const firstChunkPromise = this._fetchTTS(chunks[0], options);

      if (useFallback && typeof window !== "undefined" && window.speechSynthesis) {
        // Browser TTS starts in ~200ms for instant audio
        const [ttsResult] = await Promise.allSettled([firstChunkPromise]);

        // Stop browser before playing Kokoro (avoid overlap)
        window.speechSynthesis.cancel();

        if (!this._aborted && ttsResult.status === "fulfilled" && ttsResult.value) {
          await this._playBuffer(ttsResult.value, options, false);
        }
        // else: browser already covered chunk 0 — move on
      } else {
        // No browser fallback — wait for Kokoro directly (~300ms on warm CPU)
        const audio = await firstChunkPromise.catch(() => null);
        if (!this._aborted && audio) {
          await this._playBuffer(audio, options, false);
        }
      }

      // ── Remaining chunks: sequential Kokoro, browser fallback on error ────────
      for (let i = 1; i < chunks.length; i++) {
        if (this._aborted) break;
        options.onChunkStart?.(i, chunks.length);

        const audio = await this._fetchTTS(chunks[i], options).catch(() => null);
        if (this._aborted) break;

        if (audio) {
          await this._playBuffer(audio, options, false);
        } else if (useFallback) {
          await speakWithBrowser(chunks[i], { volume: options.volume });
        }
      }
    } catch (err: any) {
      if (!this._aborted) options.onError?.(err);
    } finally {
      this._isSpeaking = false;
      if (!this._aborted) options.onEnd?.();
    }
  }

  // ── Fetch audio from /api/voice/synthesize (Kokoro → Chatterbox → error) ─────
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
        // 30s is generous for Kokoro CPU (~300ms typical).
        // If both providers fail the API returns a 503 quickly anyway.
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) return null;

      const buf = await res.arrayBuffer();
      return buf.byteLength > 0 ? buf : null;
    } catch {
      return null;
    }
  }

  // ── Play an ArrayBuffer as WAV audio ─────────────────────────────────────────
  private _playBuffer(
    buffer: ArrayBuffer,
    options: VoiceOutputOptions,
    fireOnStart: boolean
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this._aborted) { resolve(); return; }

      const blob   = new Blob([buffer], { type: "audio/wav" });
      const url    = URL.createObjectURL(blob);
      const audio  = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, options.volume ?? 0.9));

      this.currentBlobUrl = url;
      this.currentAudio   = audio;

      if (fireOnStart) audio.onplay = () => options.onStart?.();

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
        resolve(); // resolve not reject — don't break the chain
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch(err => {
          console.warn("[HOLLY Voice] Autoplay blocked:", err?.message ?? err);
          resolve();
        });
      }
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: EnhancedVoiceOutput | null = null;

function getVoiceOutput(): EnhancedVoiceOutput {
  if (typeof window === "undefined") {
    // Server-side stub — no-ops
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
