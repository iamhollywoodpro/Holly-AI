/**
 * HOLLY Maya1 Voice Service
 * 
 * Calls the Maya1 TTS microservice deployed on Modal.com (FREE GPU).
 * No paid fallback — if Modal is down, voice is unavailable (clear error returned).
 * 
 * Modal endpoint: https://iamhollywoodpro--generate.modal.run
 * Health check:   https://iamhollywoodpro--health.modal.run
 * Deploy guide:   services/maya1-tts/MODAL_SETUP.md
 */

import { logger } from "../monitoring/logger";

// HOLLY's voice profile — used as the default voice description for Maya1
export const HOLLY_VOICE_DESCRIPTION =
  process.env.MAYA1_VOICE_DESCRIPTION ||
  "Female voice in her 30s with an American accent. " +
  "Confident, intelligent, warm tone with clear diction. " +
  "Professional yet friendly, conversational pacing with emotional depth.";

// All 20+ Maya1 emotion tags
export const MAYA1_EMOTIONS = [
  "<laugh>",
  "<laugh_harder>",
  "<chuckle>",
  "<giggle>",
  "<whisper>",
  "<sigh>",
  "<gasp>",
  "<cry>",
  "<angry>",
  "<excited>",
  "<snort>",
  "<scream>",
] as const;

export type Maya1Emotion = typeof MAYA1_EMOTIONS[number];

export interface VoiceConfig {
  description?: string;
  temperature?: number;
  topP?: number;
}

export interface EmotionContext {
  isJoke?: boolean;
  isExcited?: boolean;
  isWhisper?: boolean;
  isSad?: boolean;
  isAngry?: boolean;
}

/**
 * Smart emotion injector — adds Maya1 emotion tags based on message context
 */
export function addEmotionsToText(text: string, context?: EmotionContext): string {
  if (!context) return text;

  let emotionalText = text;

  if (context.isJoke) {
    // Add chuckle before punchlines
    emotionalText = emotionalText.replace(/\.\s+/g, ". <chuckle> ");
  }

  if (context.isExcited) {
    emotionalText = emotionalText.replace(/!/g, " <excited>!");
  }

  if (context.isWhisper && !text.includes("<whisper>")) {
    emotionalText = `<whisper>${emotionalText}</whisper>`;
  }

  if (context.isSad) {
    emotionalText = emotionalText.replace(/\.\s+/g, ". <sigh> ");
  }

  if (context.isAngry) {
    emotionalText = emotionalText.replace(/!/g, " <angry>!");
  }

  return emotionalText;
}

/**
 * Maya1Service — thin wrapper around the Modal endpoint
 * The heavy lifting (model loading, SNAC decoding) happens on Modal's GPU
 */
export class Maya1Service {
  private modalUrl: string;
  private apiKey: string;
  readonly defaultVoiceDescription: string;

  constructor() {
    this.modalUrl = process.env.HOLLY_MAYA1_TTS_URL || "";
    this.apiKey   = process.env.HOLLY_TTS_API_KEY || "";
    this.defaultVoiceDescription = HOLLY_VOICE_DESCRIPTION;

    if (this.modalUrl) {
      logger.info("Maya1 service initialized (Modal endpoint)", {
        url: this.modalUrl.substring(0, 60) + "...",
        category: "voice",
      });
    } else {
      logger.warn("Maya1 service: HOLLY_MAYA1_TTS_URL not set — run modal deploy first", {
        category: "voice",
        guide: "services/maya1-tts/MODAL_SETUP.md",
      });
    }
  }

  isAvailable(): boolean {
    return !!this.modalUrl;
  }

  /**
   * Add emotion tags to text based on context
   * Convenience wrapper for addEmotionsToText
   */
  addEmotions(text: string, context?: EmotionContext): string {
    return addEmotionsToText(text, context);
  }

  /**
   * Synthesize speech via Modal GPU endpoint
   * Returns WAV audio as a Blob
   */
  async synthesize(text: string, config?: VoiceConfig): Promise<Blob> {
    if (!this.modalUrl) {
      throw new Error(
        "Maya1 Modal endpoint not configured. " +
        "Deploy with: cd services/maya1-tts && modal deploy modal_deploy.py\n" +
        "Then add HOLLY_MAYA1_TTS_URL to Vercel env vars."
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    logger.info("Synthesizing with Maya1 (Modal)", {
      textLength: text.length,
      category: "voice",
    });

    const response = await fetch(this.modalUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        description: config?.description || this.defaultVoiceDescription,
        temperature: config?.temperature ?? 0.4,
        top_p: config?.topP ?? 0.9,
      }),
      signal: AbortSignal.timeout(80000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Maya1 Modal error ${response.status}: ${errText}`);
    }

    const blob = await response.blob();

    logger.info("Maya1 synthesis complete", {
      audioSize: blob.size,
      category: "voice",
    });

    return blob;
  }

  /**
   * Stream synthesis is not yet available via Modal web endpoint
   * Falls back to regular synthesis
   */
  async *streamSynthesize(
    text: string,
    config?: VoiceConfig
  ): AsyncGenerator<Uint8Array, void, unknown> {
    const blob   = await this.synthesize(text, config);
    const buffer = await blob.arrayBuffer();
    yield new Uint8Array(buffer);
  }

  getAvailableEmotions() {
    return MAYA1_EMOTIONS.map(tag => ({
      tag,
      description: tag.replace(/[<>]/g, ""),
    }));
  }

  getDefaultVoiceDescription(): string {
    return this.defaultVoiceDescription;
  }

  getServiceInfo() {
    return {
      model: "maya-research/maya1",
      provider: "Modal.com (Serverless GPU)",
      license: "Apache 2.0",
      features: [
        "20+ emotion tags",
        "Natural language voice control",
        "Real-time capable (sub-100ms on warm GPU)",
        "24kHz audio output",
        "Zero per-second fees",
      ],
      available: this.isAvailable(),
      modalUrl: this.modalUrl ? this.modalUrl.substring(0, 50) + "..." : "not configured",
      deployGuide: "services/maya1-tts/MODAL_SETUP.md",
    };
  }
}

export const maya1Service = new Maya1Service();
