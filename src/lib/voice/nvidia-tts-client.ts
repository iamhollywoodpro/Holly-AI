/**
 * NVIDIA Magpie TTS Client (Riva gRPC)
 *
 * API client for NVIDIA's Magpie TTS Multilingual model via the hosted
 * NVIDIA Cloud Functions gRPC endpoint (Riva SpeechSynthesis service).
 *
 * IMPORTANT (B2 fix, 2026-08-18): the hosted Magpie API is gRPC-only —
 * there is no REST /v1/audio/speech endpoint. The previous REST client
 * 404'd on every call. This client speaks real Riva gRPC:
 *   endpoint:   grpc.nvcf.nvidia.com:443
 *   function-id metadata routes to magpie-tts-multilingual
 *   voices:     Magpie-Multilingual.EN-US.<Voice>[.<Style>]
 *
 * Docs: https://docs.nvidia.com/nim/speech/latest/tts/voices.html
 * Protos vendored in ./protos/ (reconstructed from nvidia-riva-client 2.27.0)
 *
 * Voices: Sofia (primary), Aria, Jason, Leo, John
 * Styles: Happy, Calm, Sad, Angry, Neutral
 */

import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { logger } from "@/lib/monitoring/logger";
import type { MagpieVoiceStyle, MagpieVoice } from "./emotion-voice-map";

// ─── Configuration ─────────────────────────────────────────────────────────────────

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const RIVA_ENDPOINT = process.env.NVIDIA_TTS_GRPC_ENDPOINT || "grpc.nvcf.nvidia.com:443";
// NVCF function-id for the hosted magpie-tts-multilingual deployment
// (per https://huggingface.co/nvidia/magpie_tts_multilingual_357m quickstart)
const RIVA_FUNCTION_ID =
  process.env.NVIDIA_TTS_FUNCTION_ID || "877104f7-e885-42b9-8de8-f6e4c6303969";

const REQUEST_TIMEOUT_MS = 30_000;

// ─── Types ─────────────────────────────────────────────────────────────────────────

export interface NvidiaTTSOptions {
  /** Text to synthesize */
  text: string;
  /** Voice to use (default: Sofia) */
  voice?: MagpieVoice;
  /** Emotional style (default: Calm) */
  style?: MagpieVoiceStyle;
  /** Speed multiplier (unused by Riva API — kept for interface compat) */
  speed?: number;
  /** Sample rate (default: 22050) */
  sampleRate?: number;
  /** BCP-47 language code (default: en-US) */
  languageCode?: string;
}

export interface NvidiaTTSResult {
  /** Synthesized audio buffer (WAV container, mono 16-bit PCM) */
  audioBuffer: Buffer;
  /** Content-Type of the audio */
  contentType: string;
  /** Duration of the audio in seconds (estimated) */
  estimatedDurationSec: number;
  /** Provider that generated the audio */
  provider: "nvidia-magpie";
}

// ─── gRPC client setup (lazy singleton) ────────────────────────────────────────────

interface RivaTtsClient {
  synthesize: (
    req: unknown,
    metadata: grpc.Metadata,
    options: { deadline: number | Date },
    callback: (err: grpc.ServiceError | null, response?: { audio: Buffer }) => void
  ) => void;
  close: () => void;
}

let cachedClient: RivaTtsClient | null = null;

function getRivaClient(): RivaTtsClient {
  if (cachedClient) return cachedClient;

  const packageDef = protoLoader.loadSync(
    [path.join(__dirname, "protos", "riva_tts.proto")],
    {
      includeDirs: [path.join(__dirname, "protos")],
      keepCase: true,
      longs: Number,
      enums: String,
      defaults: true,
      oneofs: true,
    }
  );
  const grpcPackage = grpc.loadPackageDefinition(packageDef) as Record<string, any>;
  const ttsPackage = grpcPackage["nvidia"]?.["riva"]?.["tts"];
  if (!ttsPackage?.RivaSpeechSynthesis) {
    throw new Error("Failed to load RivaSpeechSynthesis from vendored protos");
  }

  const client = new ttsPackage.RivaSpeechSynthesis(
    RIVA_ENDPOINT,
    grpc.credentials.createSsl(),
    { "grpc.keepalive_time_ms": 30_000 }
  ) as RivaTtsClient;

  cachedClient = client;
  return client;
}

// ─── WAV container helpers ─────────────────────────────────────────────────────────

/**
 * Wrap raw mono 16-bit PCM in a WAV (RIFF) header so browsers can play it.
 */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  // 15ms fade-out — insurance against the server's abrupt tail
  // (full-amplitude stop sounds like mid-word cut-off even when complete)
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.015), pcm.length / 2);
  for (let i = 0; i < fadeSamples; i++) {
    const gain = 1 - i / fadeSamples;
    const off = pcm.length - 2 * (i + 1);
    pcm.writeInt16LE(Math.round(pcm.readInt16LE(off) * gain), off);
  }
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2; // mono, 16-bit

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);        // fmt chunk size
  header.writeUInt16LE(1, 20);         // PCM
  header.writeUInt16LE(1, 22);         // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);         // block align
  header.writeUInt16LE(16, 34);        // bits per sample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

// ─── Client ────────────────────────────────────────────────────────────────────────

/**
 * Synthesize speech using NVIDIA Magpie TTS (Riva gRPC).
 *
 * Falls back gracefully if:
 * - NVIDIA_API_KEY is not configured → returns null
 * - gRPC call fails → throws with details
 */
export async function synthesizeWithNvidia(
  options: NvidiaTTSOptions
): Promise<NvidiaTTSResult | null> {
  if (!NVIDIA_API_KEY) {
    logger.info("NVIDIA TTS skipped — no API key configured", {
      category: "voice",
    });
    return null;
  }

  const {
    text,
    voice = "Sofia",
    style = "Calm", // UNUSED — see style note below (kept for interface compat)
    sampleRate = 48000,
    languageCode = "en-US",
  } = options;

  if (!text || text.trim().length === 0) {
    return null;
  }

  // Truncate very long text (Magpie has limits)
  const truncatedText = text.length > 5000 ? text.substring(0, 5000) : text;

  // TAIL-CLIP WORKAROUND (verified 2026-08-12): the hosted Magpie NIM ends
  // synthesis at FULL speech amplitude — the final word gets chopped mid-
  // voicing ("I like those t…"). Measured: last 50ms window RMS ~3000 with
  // zero decay. Appending ".." after final punctuation makes the model
  // finish the prosodic contour; envelope then decays naturally (937→955
  // declining). The dots are not spoken (Whisper-verified full text).
  const tailSafeText = /[.!?…]$/.test(truncatedText.trim())
    ? truncatedText.trimEnd() + ".."
    : truncatedText;

  // STYLE SUBVOICES DISABLED (Steve verdict 2026-08-12): the hosted
  // deployment's styled variants (.Calm/.Sad/…) are artificially slowed
  // with audible artifacts — "sound like a caring 40-year-old mother",
  // not Holly's fun/flirty early-20s energy. Plain Sofia is the natural,
  // quick read. Emotion comes from Holly's WORDS, not the voice variant.
  // Also note: many style combos don't exist server-side (Sofia has no
  // Happy/Sad; John is gone entirely) — plain voices are the stable set.
  //
  // VOICE PINNED TO SOFIA: Holly is ONE person — the emotion map's Aria
  // switches for "analyzing/researching" moods made her change voice
  // mid-relationship. Plain Sofia for everything until Steve says else.
  // (locale segment is uppercase in the official voice catalogue)
  const locale = languageCode.toUpperCase(); // en-US → EN-US
  void voice; void style;
  const voiceName = `Magpie-Multilingual.${locale}.Sofia`;

  logger.info("NVIDIA Magpie TTS synthesis starting (Riva gRPC)", {
    voice: voiceName,
    textLength: truncatedText.length,
    category: "voice",
  });

  const metadata = new grpc.Metadata();
  metadata.set("function-id", RIVA_FUNCTION_ID);
  metadata.set("authorization", `Bearer ${NVIDIA_API_KEY}`);

  const request = {
    text: tailSafeText,
    language_code: languageCode,
    encoding: 1, // LINEAR_PCM
    sample_rate_hz: sampleRate,
    voice_name: voiceName,
  };

  try {
    const client = getRivaClient();

    const call = (voice: string) =>
      new Promise<{ audio: Buffer }>((resolve, reject) => {
        client.synthesize(
          { ...request, voice_name: voice },
          metadata,
          { deadline: Date.now() + REQUEST_TIMEOUT_MS },
          (err, res) => {
            if (err) reject(err);
            else if (!res || !res.audio || res.audio.length === 0) {
              reject(new Error("NVIDIA TTS returned empty audio buffer"));
            } else resolve(res);
          }
        );
      });

    let response: { audio: Buffer };
    try {
      response = await call(voiceName);
    } catch (err: any) {
      // This hosted deployment serves base voices only (no style subvoices).
      // If the styled subvoice isn't found, fall back to the plain voice.
      if (err.code === grpc.status.INVALID_ARGUMENT && /subvoice/i.test(err.message ?? "")) {
        const baseVoice = `Magpie-Multilingual.${locale}.${voice}`;
        logger.info("NVIDIA TTS styled subvoice unavailable — using base voice", {
          requested: voiceName,
          fallback: baseVoice,
          category: "voice",
        });
        response = await call(baseVoice);
      } else {
        throw err;
      }
    }

    const wav = pcmToWav(Buffer.from(response.audio), sampleRate);
    const estimatedDurationSec = Math.round(
      (response.audio.length / (sampleRate * 2)) * 10
    ) / 10;

    logger.info("NVIDIA Magpie TTS synthesis complete", {
      audioSize: wav.length,
      estimatedDurationSec,
      provider: "nvidia-magpie",
      category: "voice",
    });

    return {
      audioBuffer: wav,
      contentType: "audio/wav",
      estimatedDurationSec,
      provider: "nvidia-magpie",
    };
  } catch (error: any) {
    logger.error("NVIDIA TTS synthesis error (Riva gRPC)", {
      error: error.message,
      code: error.code,
      category: "voice",
    });
    // Transient gRPC states map to a clearer message
    if (error.code === grpc.status.DEADLINE_EXCEEDED) {
      throw new Error("NVIDIA TTS request timed out");
    }
    if (error.code === grpc.status.UNAVAILABLE) {
      throw new Error(`NVIDIA TTS endpoint unavailable: ${RIVA_ENDPOINT}`);
    }
    if (error.code === grpc.status.UNAUTHENTICATED || error.code === grpc.status.PERMISSION_DENIED) {
      throw new Error(`NVIDIA TTS auth failed (${error.code}). Check NVIDIA_API_KEY.`);
    }
    throw new Error(`NVIDIA TTS gRPC error ${error.code ?? "?"}: ${error.message}`);
  }
}

/**
 * Check if NVIDIA TTS is available and configured.
 */
export function isNvidiaTTSAvailable(): boolean {
  return !!NVIDIA_API_KEY;
}
