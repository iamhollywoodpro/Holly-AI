/**
 * ACE-Step Provider — Holly's own music rendering engine (2026-08-21).
 *
 * Backed by our self-hosted Modal deployment (services/modal-media/music_acestep.py,
 * workspace: nexamusicgroup). Architecture: Holly's human songwriting system
 * (lyric-brain) authors the text; ACE-Step 1.5 is the RENDERER only — never
 * the writer. MIT-licensed weights, our GPUs, ~$0.0006/song.
 *
 * Modal endpoint contract (POST):
 *   { lyrics: string (required), style_prompt?: string, duration?: 30-240, seed?: number }
 *   → { audio: base64 mp3, format: 'mp3', seed: number, duration: number }
 *   → { error: string } on failure
 *
 * Env: ACESTEP_MUSIC_URL=https://<workspace>--music-generate.modal.run
 */

export interface AceStepRenderParams {
  /** Full song lyrics with [Verse]/[Chorus] section tags — required. */
  lyrics: string;
  /** Style tags, e.g. "pop, female vocals, emotional, 120 bpm". */
  stylePrompt?: string;
  /** Seconds, 30–240 (clamped server-side too). */
  duration?: number;
  /** Optional seed for reproducibility. */
  seed?: number;
  /** Output format: mp3 (default, compact) or wav (lossless, ~10MB/60s). */
  format?: 'mp3' | 'wav';
}

export interface AceStepRenderResult {
  /** Ready-to-play data URI: data:audio/mp3;base64,... */
  dataUri: string;
  format: string;
  seed: number;
  duration: number;
}

export class AceStepNotConfiguredError extends Error {
  constructor() {
    super('ACESTEP_MUSIC_URL not configured — Holly\'s music engine is not deployed');
    this.name = 'AceStepNotConfiguredError';
  }
}

export const acestepProvider = {
  get isConfigured(): boolean {
    return !!process.env.ACESTEP_MUSIC_URL;
  },

  /** Render lyrics + style into a finished song. ~30–60s round trip. */
  async renderSong(params: AceStepRenderParams): Promise<AceStepRenderResult> {
    const url = process.env.ACESTEP_MUSIC_URL;
    if (!url) throw new AceStepNotConfiguredError();

    if (!params.lyrics || !params.lyrics.trim()) {
      throw new Error('Lyrics are required — the writing engine authors the text, ACE-Step only renders');
    }

    const body: Record<string, unknown> = {
      lyrics: params.lyrics,
      duration: Math.min(240, Math.max(30, Math.round(params.duration ?? 60))),
      format: params.format ?? 'mp3',
    };
    if (params.stylePrompt) body.style_prompt = params.stylePrompt;
    if (params.seed != null) body.seed = params.seed;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000), // cold start + render headroom
    });

    const data = await res.json().catch(() => ({ error: `Non-JSON response (${res.status})` }));

    if (!res.ok || data.error) {
      throw new Error(`ACE-Step render failed: ${data.error ?? res.status}`);
    }
    if (!data.audio || data.format === 'json') {
      throw new Error('ACE-Step returned no audio');
    }

    return {
      dataUri: `data:audio/${data.format};base64,${data.audio}`,
      format: data.format,
      seed: data.seed,
      duration: data.duration,
    };
  },
};
