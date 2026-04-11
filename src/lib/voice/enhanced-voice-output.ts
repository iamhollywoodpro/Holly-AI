/**
 * HOLLY Voice Output System — Phase 3 (Parallel-Batch Zero-Gap Edition)
 *
 * ── Why there were gaps ───────────────────────────────────────────────────────
 *
 * Kokoro is on a CPU-only remote VM.  Render times measured:
 *
 *   12 chars  →  ~1.0s render,  ~0.5s speech
 *   80 chars  →  ~3.0s render,  ~3.5s speech
 *  113 chars  →  ~4.0s render,  ~4.5s speech
 *  388 chars  → ~12.5s render, ~15.0s speech
 *
 * The old approach fetched large chunks sequentially:
 *
 *   fetch chunk0 (12s) → PLAY chunk0 (15s) → fetch chunk1 (12s) → ...
 *                                              ↑ 12s GAP every time
 *
 * ── The fix: batch + parallel server-side processing ─────────────────────────
 *
 * Key measurements:
 *   - 4 parallel ~80-char requests all finish in ~5s total (server is multi-threaded)
 *   - 80-char chunk: ~3s render, ~3-4s speech — almost equal
 *
 * New strategy:
 *   1. Split text into ~120-char chunks (1-2 short sentences each)
 *   2. Send ALL chunks to /api/voice/batch in ONE request
 *   3. Server fires ALL Kokoro requests in parallel
 *   4. Server returns all audio as base64 in one response (~4-5s total)
 *   5. Client plays them sequentially — instant transitions, zero gaps
 *
 *   t=0    POST /api/voice/batch  [chunk0, chunk1, chunk2, chunk3 ...]
 *   t=4s   Response arrives with ALL audio buffers pre-rendered
 *   t=4s   PLAY chunk[0] (3-4s of speech)
 *   t=7s   PLAY chunk[1] — INSTANT (already in memory)
 *   t=10s  PLAY chunk[2] — INSTANT
 *   …
 *
 * Zero gaps. One network round trip. No browser TTS double-play.
 *
 * ── Fallback chain ────────────────────────────────────────────────────────────
 *  Batch fails → fall back to individual /api/voice/synthesize calls (parallel)
 *  Those fail  → silent skip (no disruptive browser TTS bridge)
 */

export interface VoiceOutputOptions {
  volume?: number;
  temperature?: number;
  voiceDescription?: string;
  voice?: string;
  speed?: number;
  useBrowserFallback?: boolean;   // kept for API compat — no longer used
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onChunkStart?: (chunkIndex: number, total: number) => void;
}

// ─── Chunk sizing ─────────────────────────────────────────────────────────────
// 120 chars ≈ 1-2 sentences ≈ ~3-4s render time on CPU Kokoro ≈ ~4s speech
// With batch/parallel processing, all chunks finish rendering in ~4-5s total.
const CHUNK_SIZE = 120;

// ─── Text utilities ───────────────────────────────────────────────────────────

/**
 * Split text into ≤maxChars chunks at sentence boundaries.
 * Prefers complete sentences; falls back to comma splits, then hard wrap.
 */
function splitIntoChunks(text: string, maxChars = CHUNK_SIZE): string[] {
  if (!text.trim()) return [];

  // Split on sentence-ending punctuation, keeping the delimiter
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;

    const candidate = current ? `${current} ${s}` : s;

    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current);

      if (s.length > maxChars) {
        // Single long sentence — split on commas, then hard-wrap
        const commaParts = s.split(/,\s*/);
        let sub = "";
        for (const part of commaParts) {
          const joined = sub ? `${sub}, ${part}` : part;
          if (joined.length <= maxChars) {
            sub = joined;
          } else {
            if (sub) chunks.push(sub);
            for (let i = 0; i < part.length; i += maxChars) {
              chunks.push(part.slice(i, i + maxChars).trim());
            }
            sub = "";
          }
        }
        if (sub) chunks.push(sub);
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
 * Strip markdown and emojis for clean TTS speech.
 */
function cleanForSpeech(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, " code block. ");
  t = t.replace(/`[^`]+`/g, " code. ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

// ─── Convert base64 → ArrayBuffer ────────────────────────────────────────────

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── Main voice output class ──────────────────────────────────────────────────

class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private _isSpeaking = false;
  private _aborted = false;

  // ── Stop ─────────────────────────────────────────────────────────────────────
  stop(): void {
    this._aborted = true;
    this._isSpeaking = false;

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
    const audioPlaying =
      !!this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended;
    return audioPlaying || this._isSpeaking;
  }

  isAvailable(): boolean {
    return true;
  }

  // ── Main speak ────────────────────────────────────────────────────────────────
  //
  // Strategy:
  //   1. Split text into ~120-char chunks
  //   2. POST all chunks to /api/voice/batch (one round trip)
  //   3. Server renders them all in parallel (~4-5s total regardless of count)
  //   4. Play each chunk sequentially from the pre-buffered results
  //   → Zero gaps between chunks

  async speak(text: string, options: VoiceOutputOptions = {}): Promise<void> {
    if (!text?.trim()) return;

    this.stop();
    this._aborted = false;
    this._isSpeaking = true;

    const cleaned = cleanForSpeech(text);
    if (!cleaned) { this._isSpeaking = false; return; }

    const chunks = splitIntoChunks(cleaned, CHUNK_SIZE);
    if (chunks.length === 0) { this._isSpeaking = false; return; }

    options.onStart?.();

    try {
      // ── Fetch all chunks in one batch request ─────────────────────────────
      let audioBuffers: (ArrayBuffer | null)[] = new Array(chunks.length).fill(null);

      const batchSuccess = await this._fetchBatch(chunks, options, audioBuffers);

      if (!batchSuccess) {
        // Batch endpoint failed — fall back to individual parallel requests
        const results = await Promise.all(
          chunks.map(chunk => this._fetchOne(chunk, options))
        );
        audioBuffers = results;
      }

      if (this._aborted) return;

      // ── Play chunks sequentially (all audio already in memory → zero gaps) ─
      for (let i = 0; i < chunks.length; i++) {
        if (this._aborted) break;

        options.onChunkStart?.(i, chunks.length);

        const buf = audioBuffers[i];
        if (buf) {
          await this._playBuffer(buf, options);
        }
        // Skip failed chunks silently — no browser TTS to cause jarring gaps
      }
    } catch (err: unknown) {
      if (!this._aborted) options.onError?.(err as Error);
    } finally {
      this._isSpeaking = false;
      if (!this._aborted) options.onEnd?.();
    }
  }

  // ── Batch fetch: POST all chunks at once, server renders in parallel ──────
  private async _fetchBatch(
    chunks: string[],
    options: VoiceOutputOptions,
    out: (ArrayBuffer | null)[]
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/voice/batch", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunks,
          voice: options.voice,
          speed: options.speed ?? 1.0,
        }),
        signal: AbortSignal.timeout(90_000), // 90s — enough for 20 chunks in parallel
      });

      if (!res.ok) return false;

      const data = await res.json() as {
        results: Array<{ index: number; audio: string | null }>;
      };

      if (!data.results) return false;

      for (const r of data.results) {
        if (r.audio) {
          try {
            out[r.index] = base64ToArrayBuffer(r.audio);
          } catch {
            out[r.index] = null;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // ── Individual fetch fallback ─────────────────────────────────────────────
  private async _fetchOne(
    text: string,
    options: VoiceOutputOptions
  ): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch("/api/voice/synthesize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice:       options.voice,
          speed:       options.speed       ?? 1.0,
          temperature: options.temperature ?? 1.0,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return buf.byteLength > 0 ? buf : null;
    } catch {
      return null;
    }
  }

  // ── Play an ArrayBuffer as audio ──────────────────────────────────────────
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

      // Track for stop()
      if (this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = url;
      this.currentAudio   = audio;

      audio.onended = () => {
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
