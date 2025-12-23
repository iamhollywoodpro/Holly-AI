/**
 * MAYA1 Voice Synthesis Service
 * 
 * Integrates maya-research/maya1 for expressive voice generation
 * with real-time streaming and emotion support.
 */

import { HfInference } from "@huggingface/inference";
import { logger } from "../monitoring/logger";

// MAYA1 Special Token IDs
const CODE_START_TOKEN_ID = 128257;
const CODE_END_TOKEN_ID = 128258;
const CODE_TOKEN_OFFSET = 128266;
const SNAC_MIN_ID = 128266;
const SNAC_MAX_ID = 156937;
const SNAC_TOKENS_PER_FRAME = 7;

const SOH_ID = 128259;
const EOH_ID = 128260;
const SOA_ID = 128261;
const BOS_ID = 128000;
const TEXT_EOT_ID = 128009;

export interface VoiceConfig {
  description: string;
  temperature?: number;
  maxTokens?: number;
  streamingEnabled?: boolean;
}

export interface EmotionConfig {
  type: "laugh" | "sigh" | "whisper" | "angry" | "giggle" | "chuckle" | "gasp" | "cry" | "excited" | "scream";
  intensity?: "low" | "medium" | "high";
}

export class Maya1Service {
  private hf: HfInference;
  private modelId = "maya-research/maya1";
  private defaultVoiceDescription: string;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY environment variable is required");
    }

    this.hf = new HfInference(apiKey);
    
    // HOLLY's default voice
    this.defaultVoiceDescription = process.env.MAYA1_VOICE_DESCRIPTION || 
      "Female voice in her late 20s with a warm, professional American accent. Medium pitch, clear diction, conversational yet knowledgeable tone. Friendly and approachable with a hint of enthusiasm when discussing creative topics.";

    logger.info("MAYA1 service initialized", {
      model: this.modelId,
      category: "voice",
    });
  }

  /**
   * Build formatted prompt for MAYA1
   */
  private buildPrompt(description: string, text: string): string {
    // Note: In actual implementation, these would be decoded from token IDs
    // For API usage, we use the text format
    const formattedText = `<description="${description}"> ${text}`;
    return formattedText;
  }

  /**
   * Add emotion tags to text based on context
   */
  addEmotions(text: string, context?: {
    isJoke?: boolean;
    isExcited?: boolean;
    isWhisper?: boolean;
    isSad?: boolean;
    isAngry?: boolean;
  }): string {
    if (!context) return text;

    let emotionalText = text;

    // Add laugh/chuckle for jokes
    if (context.isJoke) {
      emotionalText = emotionalText.replace(/\./g, " <chuckle>.");
    }

    // Add excitement
    if (context.isExcited) {
      emotionalText = emotionalText.replace(/!/g, " <excited>!");
    }

    // Wrap in whisper
    if (context.isWhisper) {
      emotionalText = `<whisper>${emotionalText}</whisper>`;
    }

    // Add sigh for sadness
    if (context.isSad) {
      emotionalText = emotionalText.replace(/\./g, " <sigh>.");
    }

    // Add angry tone
    if (context.isAngry) {
      emotionalText = emotionalText.replace(/!/g, " <angry>!");
    }

    return emotionalText;
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(
    text: string,
    config?: Partial<VoiceConfig>
  ): Promise<Blob> {
    try {
      const voiceDescription = config?.description || this.defaultVoiceDescription;
      const prompt = this.buildPrompt(voiceDescription, text);

      logger.info("Synthesizing speech with MAYA1", {
        textLength: text.length,
        voiceDescription: voiceDescription.substring(0, 50),
        category: "voice",
      });

      // Use Hugging Face Inference API for text-to-speech
      const response = await this.hf.textToSpeech({
        model: this.modelId,
        inputs: prompt,
      });

      logger.info("Speech synthesis completed", {
        audioSize: response.size,
        category: "voice",
      });

      return response;
    } catch (error: any) {
      logger.error("Failed to synthesize speech", {
        error: error.message,
        text: text.substring(0, 100),
        category: "voice",
      });

      throw new Error(`Speech synthesis failed: ${error.message}`);
    }
  }

  /**
   * Stream speech synthesis in real-time
   */
  async *streamSynthesize(
    text: string,
    config?: Partial<VoiceConfig>
  ): AsyncGenerator<Uint8Array, void, unknown> {
    try {
      const voiceDescription = config?.description || this.defaultVoiceDescription;
      const prompt = this.buildPrompt(voiceDescription, text);

      logger.info("Starting streaming speech synthesis", {
        textLength: text.length,
        category: "voice",
      });

      // For streaming, we'll need to use the Inference API with streaming enabled
      // This is a simplified version - actual implementation would use vLLM
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.modelId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              temperature: config?.temperature || 0.7,
              max_new_tokens: config?.maxTokens || 2048,
              return_full_text: false,
            },
            options: {
              use_cache: true,
              wait_for_model: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      // Stream the audio chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }

      logger.info("Streaming speech synthesis completed", {
        category: "voice",
      });
    } catch (error: any) {
      logger.error("Failed to stream speech synthesis", {
        error: error.message,
        category: "voice",
      });

      throw new Error(`Streaming synthesis failed: ${error.message}`);
    }
  }

  /**
   * Get available emotion tags
   */
  getAvailableEmotions(): EmotionConfig[] {
    return [
      { type: "laugh", intensity: "medium" },
      { type: "sigh", intensity: "medium" },
      { type: "whisper", intensity: "low" },
      { type: "angry", intensity: "high" },
      { type: "giggle", intensity: "low" },
      { type: "chuckle", intensity: "medium" },
      { type: "gasp", intensity: "medium" },
      { type: "cry", intensity: "high" },
      { type: "excited", intensity: "high" },
      { type: "scream", intensity: "high" },
    ];
  }

  /**
   * Validate voice description
   */
  validateVoiceDescription(description: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (description.length < 20) {
      issues.push("Description too short (minimum 20 characters)");
    }

    if (description.length > 500) {
      issues.push("Description too long (maximum 500 characters)");
    }

    // Check for key elements
    const hasAge = /\d+\s*(year|yr)s?\s*old/i.test(description) || /age\s*\d+/i.test(description);
    const hasGender = /\b(male|female|man|woman|boy|girl)\b/i.test(description);
    const hasAccent = /\b(american|british|australian|accent)\b/i.test(description);

    if (!hasAge) {
      issues.push("Consider adding age information (e.g., 'in their 30s')");
    }

    if (!hasGender) {
      issues.push("Consider specifying gender (e.g., 'male voice', 'female voice')");
    }

    if (!hasAccent) {
      issues.push("Consider specifying accent (e.g., 'American accent', 'British accent')");
    }

    return {
      valid: issues.length === 0 || issues.every(i => i.startsWith("Consider")),
      issues,
    };
  }

  /**
   * Get HOLLY's default voice description
   */
  getDefaultVoiceDescription(): string {
    return this.defaultVoiceDescription;
  }

  /**
   * Update HOLLY's default voice description
   */
  setDefaultVoiceDescription(description: string): void {
    const validation = this.validateVoiceDescription(description);
    if (!validation.valid) {
      throw new Error(`Invalid voice description: ${validation.issues.join(", ")}`);
    }

    this.defaultVoiceDescription = description;
    logger.info("Updated default voice description", {
      description: description.substring(0, 50),
      category: "voice",
    });
  }
}

export const maya1Service = new Maya1Service();
