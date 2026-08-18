/**
 * B2 — LIVE NVIDIA Magpie TTS test (Roadmap Phase B2).
 *
 * Unlike every other test in this suite, this one hits the real NVIDIA NIM
 * API. It runs only when NVIDIA_API_KEY is present in the environment; the
 * key is loaded from .env via the dotenv import below (Jest doesn't load it).
 * Skips honestly when the key is absent — it never fakes a pass.
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import os from 'os';
import path from 'path';

describe('B2: live NVIDIA Magpie TTS', () => {
  const hasKey = !!process.env.NVIDIA_API_KEY;

  (hasKey ? it : it.skip)('synthesizes real audio through synthesizeWithNvidia', async () => {
    const { synthesizeWithNvidia } = await import('../../src/lib/voice/nvidia-tts-client');

    const t0 = Date.now();
    const result = await synthesizeWithNvidia({
      text: "Hey Steve, it's Holly. My voice is live and real.",
      voice: 'Sofia',
      style: 'Happy',
    });
    const ms = Date.now() - t0;

    // eslint-disable-next-line no-console
    console.log(`[B2] latency=${ms}ms`);

    expect(result).not.toBeNull();
    expect(result!.provider).toBe('nvidia-magpie');

    const buf = result!.audioBuffer;
    // eslint-disable-next-line no-console
    console.log(`[B2] audioBytes=${buf.length} header=${buf.slice(0, 4).toString('ascii')}`);
    expect(buf.length).toBeGreaterThan(1000); // real speech, not an empty container
    expect(['RIFF', 'OggS', 'fLaC', 'ID3']).toContain(buf.slice(0, 4).toString('ascii'));

    // Drop the real audio file for Steve to listen to
    const outPath = path.join(os.tmpdir(), 'holly-b2-live-test.wav');
    fs.writeFileSync(outPath, buf);
    // eslint-disable-next-line no-console
    console.log(`[B2] written: ${outPath}`);
  }, 60_000);
});
