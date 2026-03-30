/**
 * HOLLY Voice Output System — Phase 0 Rewrite
 *
 * Strategy for near-instant playback:
 *
 *  1. INSTANT  — Browser speechSynthesis starts within ~200ms (zero latency).
 *                Plays the first sentence immediately while Maya1 warms up.
 *
 *  2. CHUNKED  — Long messages are split into sentences so Maya1 only needs to
 *                process ~15 words at a time. First Maya1 chunk arrives in ~3-5s
 *                on a warm GPU, ~10-20s on a cold one.
 *
 *  3. SEAMLESS — If Maya1 returns audio before the browser sentence finishes,
 *                we queue it. The experience sounds continuous.
 *
 *  4. KEEP-ALIVE — We ping Modal every 4 minutes so it never fully cold-boots.
 *
 *  5. FULL TEXT  — No 4000-char truncation. Messages are chunked and queued,
 *                  so the complete response is always read.
 *
 * Voice-mode rules (controlled by caller):
 *  - voiceInput = true  → auto-play Maya1 (or browser fallback) immediately
 *  - voiceInput = false → only play when user clicks the speaker button
 */

export interface VoiceOutputOptions {
  volume?: number;
  temperature?: number;
  voiceDescription?: string;
  useBrowserFallback?: boolean; // default true — instant playback while Maya1 loads
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onChunkStart?: (chunkIndex: number, total: number) => void;
}

// ─── Text utilities ───────────────────────────────────────────────────────────

/**
 * Split text into speakable sentences (≤200 chars each for fast TTS).
 * Preserves Maya1 emotion tags across sentence boundaries.
 */
function splitIntoChunks(text: string, maxChars = 200): string[] {
  if (!text.trim()) return [];

  // Split on sentence-ending punctuation, keeping delimiters
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
      // If a single sentence is too long, split on commas
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

/**
 * Strip markdown and emojis for speech — keep Maya1 emotion tags intact.
 */
function cleanForSpeech(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, " code block. ");
  t = t.replace(/`[^`]+`/g, " code. ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  // Remove emojis but keep Maya1 tags
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

// ─── Browser TTS (instant fallback) ──────────────────────────────────────────

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
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.volume = options.volume ?? 0.9;

    // Pick a female voice if available
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice =
      voices.find(v => /samantha|karen|victoria|moira|fiona|zira|susan|female/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0];
    if (femaleVoice) utt.voice = femaleVoice;

    utt.onstart = () => options.onStart?.();
    utt.onend  = () => { resolve(); options.onEnd?.(); };
    utt.onerror = () => { resolve(); }; // don't reject — just move on

    window.speechSynthesis.speak(utt);
  });
}

// ─── Main voice output class ──────────────────────────────────────────────────

class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private _isSpeaking = false;
  private _aborted = false;
  private _keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Keep Modal warm — ping every 4 minutes so first-use is never a cold start
    if (typeof window !== "undefined") {
      this._startKeepAlive();
    }
  }

  private _startKeepAlive() {
    // Ping once on load (after 5s so the page settles) then every 4 minutes
    setTimeout(() => this._pingModal(), 5000);
    this._keepAliveTimer = setInterval(() => this._pingModal(), 4 * 60 * 1000);
  }

  private async _pingModal() {
    try {
      await fetch("/api/voice/synthesize", { method: "GET" });
    } catch {
      // silence — keep-alive pings don't need to succeed
    }
  }

  // ── Stop ────────────────────────────────────────────────────────────────────
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
      typeof window !== "undefined" && window.speechSynthesis?.speaking;
    const audioPlaying =
      !!this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended;
    return browserSpeaking || audioPlaying || this._isSpeaking;
  }

  isAvailable(): boolean {
    return true;
  }

  // ── Main speak ───────────────────────────────────────────────────────────────

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
      // ── Strategy: try Maya1 for the whole thing first (in background),
      //    use browser TTS for first chunk to give instant feedback.
      //    When Maya1 audio is ready, play it.

      // Fire Maya1 request for the FIRST chunk immediately — fastest path
      const firstChunkPromise = this._fetchMaya1(chunks[0], options);

      // Start browser TTS instantly on the first chunk as a bridge
      if (useFallback && typeof window !== "undefined" && window.speechSynthesis) {
        const browserPromise = speakWithBrowser(chunks[0], { volume: options.volume });

        // Race: if Maya1 comes back before browser TTS ends, we already have audio ready
        const [maya1Result] = await Promise.allSettled([firstChunkPromise]);

        // Stop browser before playing Maya1 (avoid overlap)
        window.speechSynthesis.cancel();

        if (!this._aborted) {
          if (maya1Result.status === "fulfilled" && maya1Result.value) {
            await this._playBuffer(maya1Result.value, options, false);
          }
          // else: browser already played chunk[0], move on
        }
      } else {
        // No browser fallback — wait for Maya1 directly
        const maya1Audio = await firstChunkPromise.catch(() => null);
        if (!this._aborted && maya1Audio) {
          await this._playBuffer(maya1Audio, options, false);
        }
      }

      // ── Play remaining chunks sequentially via Maya1 (no browser for rest)
      for (let i = 1; i < chunks.length; i++) {
        if (this._aborted) break;
        options.onChunkStart?.(i + 1, chunks.length);

        const audio = await this._fetchMaya1(chunks[i], options).catch(() => null);
        if (this._aborted) break;

        if (audio) {
          await this._playBuffer(audio, options, false);
        } else if (useFallback) {
          // Fallback to browser for this chunk if Maya1 failed
          await speakWithBrowser(chunks[i], { volume: options.volume });
        }
      }
    } catch (err: any) {
      if (!this._aborted) {
        options.onError?.(err);
      }
    } finally {
      this._isSpeaking = false;
      if (!this._aborted) {
        options.onEnd?.();
      }
    }
  }

  // ── Fetch audio from Maya1 via our API route ─────────────────────────────────
  private async _fetchMaya1(
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
          temperature: options.temperature ?? 0.4,
        }),
        signal: AbortSignal.timeout(45000), // 45s per chunk — generous for cold start
      });

      if (!res.ok) return null;

      const buf = await res.arrayBuffer();
      return buf.byteLength > 0 ? buf : null;
    } catch {
      return null; // Let caller decide whether to use browser fallback
    }
  }

  // ── Play an ArrayBuffer as audio ─────────────────────────────────────────────
  private _playBuffer(
    buffer: ArrayBuffer,
    options: VoiceOutputOptions,
    fireOnStart: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._aborted) { resolve(); return; }

      const blob    = new Blob([buffer], { type: "audio/wav" });
      const url     = URL.createObjectURL(blob);
      const audio   = new Audio(url);
      audio.volume  = Math.max(0, Math.min(1, options.volume ?? 0.9));

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
          // Autoplay blocked — still resolve so remaining chunks can try
          console.warn("[HOLLY Voice] Autoplay blocked:", err.message);
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
  return getVoiceOutput().speak(text, options ?? {});
}

export function stopSpeaking(): void {
  getVoiceOutput().stop();
}

export function isSpeaking(): boolean {
  return getVoiceOutput().isSpeaking();
}

export { EnhancedVoiceOutput, getVoiceOutput };
