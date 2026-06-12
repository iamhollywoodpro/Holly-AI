export interface VoiceOutputOptions {
  volume?: number;
  temperature?: number;
  voiceDescription?: string;
  voice?: string;
  speed?: number;
  /** Holly's current emotional state — activates Voice Character Engine (NVIDIA Magpie) */
  emotion?: string;
  useBrowserFallback?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onChunkStart?: (chunkIndex: number, total: number) => void;
}

const CHUNK_SIZE = 200;

function splitIntoChunks(text: string, maxChars = CHUNK_SIZE): string[] {
  if (!text.trim()) return [];

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

function cleanForSpeech(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, ". ");
  t = t.replace(/`[^`]+`/g, ". ");
  t = t.replace(/#{1,6}\s/g, "");
  t = t.replace(/[*_~]/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/!\[.*?\]\([^)]*\)/g, "");
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, ". ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

class EnhancedVoiceOutput {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private _isSpeaking = false;
  private _aborted = false;

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
      const audioBuffers: (ArrayBuffer | null)[] = new Array(chunks.length).fill(null);
      const fetchPromises: Promise<void>[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const p = this._fetchChunk(i, chunks[i], options, audioBuffers);
        fetchPromises.push(p);
      }

      for (let i = 0; i < chunks.length; i++) {
        if (this._aborted) break;

        const deadline = Date.now() + 10_000;
        while (!audioBuffers[i] && Date.now() < deadline) {
          if (this._aborted) break;
          await new Promise(r => setTimeout(r, 100));
        }

        if (this._aborted) break;

        options.onChunkStart?.(i, chunks.length);

        const buf = audioBuffers[i];
        if (buf) {
          await this._playBuffer(buf, options);
        }
      }

      await Promise.allSettled(fetchPromises);
    } catch (err: unknown) {
      if (!this._aborted) options.onError?.(err as Error);
    } finally {
      this._isSpeaking = false;
      if (!this._aborted) options.onEnd?.();
    }
  }

  private async _fetchChunk(
    index: number,
    text: string,
    options: VoiceOutputOptions,
    out: (ArrayBuffer | null)[]
  ): Promise<void> {
    try {
      const res = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: options.voice,
          speed: options.speed ?? 1.0,
          temperature: options.temperature ?? 1.0,
          emotion: options.emotion || undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        out[index] = null;
        return;
      }

      const buf = await res.arrayBuffer();
      out[index] = buf.byteLength > 0 ? buf : null;
    } catch {
      out[index] = null;
    }
  }

  private _playBuffer(
    buffer: ArrayBuffer,
    options: VoiceOutputOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this._aborted) { resolve(); return; }

      const blob = new Blob([buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, options.volume ?? 0.9));

      if (this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = url;
      this.currentAudio = audio;

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
        p.catch(() => resolve());
      }
    });
  }
}

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
