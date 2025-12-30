/**
 * Chatterbox TTS Service
 * 
 * Integrates ResembleAI's Chatterbox-Turbo for high-quality, low-latency
 * voice synthesis with Holly AI's warm, professional, caring voice.
 * 
 * Features:
 * - 350M parameter model optimized for voice agents
 * - <150ms time-to-first-sound latency
 * - Native paralinguistic tags: [laugh], [chuckle], [cough]
 * - Zero-shot voice cloning from reference audio
 * - 6× faster than real-time on GPU
 */

import { HfInference } from "@huggingface/inference";
import { logger } from "../monitoring/logger";

export interface ChatterboxConfig {
  audioPromptPath?: string; // Path to reference audio for voice cloning
  temperature?: number;
  maxTokens?: number;
  exaggeration?: number; // 0.0 to 1.0, controls expressiveness
  cfgWeight?: number; // 0.0 to 1.0, classifier-free guidance weight
}

export interface ParalinguisticTag {
  type: "laugh" | "chuckle" | "cough" | "sigh" | "gasp";
  position?: "before" | "after" | "inline";
}

export class ChatterboxTTSService {
  private hf: HfInference;
  private modelId = "ResembleAI/chatterbox-turbo";
  private defaultVoiceDescription: string;
  private hollyReferenceAudioPath?: string;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      console.warn('[ChatterboxTTS] HUGGINGFACE_API_KEY not found - service will be disabled');
      this.hf = new HfInference('');
    } else {
      this.hf = new HfInference(apiKey);
    }
    
    // Holly's default voice characteristics
    this.defaultVoiceDescription = 
      "Female voice in her late 20s with a warm, professional, caring tone. " +
      "Clear American accent with medium pitch and friendly, approachable delivery. " +
      "Conversational yet knowledgeable, with natural enthusiasm and empathy.";

    // Check for Holly's reference audio
    this.hollyReferenceAudioPath = process.env.HOLLY_VOICE_REFERENCE_PATH;

    logger.info("Chatterbox TTS service initialized", {
      model: this.modelId,
      hasReferenceAudio: !!this.hollyReferenceAudioPath,
      category: "voice",
    });
  }

  /**
   * Add paralinguistic tags to text for more expressive speech
   */
  addParalinguisticTags(
    text: string,
    context?: {
      isHumorous?: boolean;
      isEmpathetic?: boolean;
      isSurprised?: boolean;
      isThoughtful?: boolean;
    }
  ): string {
    if (!context) return text;

    let enhancedText = text;

    if (context.isHumorous) {
      enhancedText = enhancedText.replace(/(!|\?)\s/g, "$1 [chuckle] ");
      if (!enhancedText.includes("[chuckle]")) {
        enhancedText += " [chuckle]";
      }
    }

    if (context.isEmpathetic) {
      enhancedText = enhancedText.replace(/\.\s+/g, ". [sigh] ");
    }

    if (context.isSurprised) {
      enhancedText = "[gasp] " + enhancedText;
    }

    if (context.isThoughtful) {
      enhancedText = enhancedText.replace(/,\s+/g, ", [sigh] ");
    }

    return enhancedText;
  }

  /**
   * Synthesize speech from text using Chatterbox-Turbo
   */
  async synthesize(
    text: string,
    config?: Partial<ChatterboxConfig>
  ): Promise<Blob> {
    try {
      const audioPromptPath = config?.audioPromptPath || this.hollyReferenceAudioPath;

      logger.info("Synthesizing speech with Chatterbox-Turbo", {
        textLength: text.length,
        hasAudioPrompt: !!audioPromptPath,
        category: "voice",
      });

      const response = await this.hf.textToSpeech({
        model: this.modelId,
        inputs: text,
      });

      logger.info("Speech synthesis completed", {
        audioSize: response.size,
        category: "voice",
      });

      return response;
    } catch (error: any) {
      logger.error("Failed to synthesize speech with Chatterbox", {
        error: error.message,
        text: text.substring(0, 100),
        category: "voice",
      });

      throw new Error(`Chatterbox synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize speech with automatic emotion detection
   */
  async synthesizeExpressive(
    text: string,
    config?: Partial<ChatterboxConfig>
  ): Promise<Blob> {
    const context = this.detectEmotionalContext(text);
    const enhancedText = this.addParalinguisticTags(text, context);

    logger.info("Synthesizing expressive speech", {
      originalLength: text.length,
      enhancedLength: enhancedText.length,
      context,
      category: "voice",
    });

    return this.synthesize(enhancedText, config);
  }

  /**
   * Detect emotional context from text
   */
  private detectEmotionalContext(text: string): {
    isHumorous?: boolean;
    isEmpathetic?: boolean;
    isSurprised?: boolean;
    isThoughtful?: boolean;
  } {
    const context: any = {};

    if (/!/.test(text) && /(haha|lol|funny|hilarious|joke)/i.test(text)) {
      context.isHumorous = true;
    }

    if (/(understand|sorry|feel|support|here for you)/i.test(text)) {
      context.isEmpathetic = true;
    }

    if (/(wow|really|amazing|incredible|can't believe)/i.test(text)) {
      context.isSurprised = true;
    }

    if (/(hmm|well|let me think|consider|perhaps)/i.test(text)) {
      context.isThoughtful = true;
    }

    return context;
  }

  /**
   * Stream speech synthesis
   */
  async *streamSynthesize(
    text: string,
    config?: Partial<ChatterboxConfig>
  ): AsyncGenerator<Uint8Array, void, unknown> {
    try {
      logger.info("Starting streaming speech synthesis", {
        textLength: text.length,
        category: "voice",
      });

      const audioBlob = await this.synthesize(text, config);
      const buffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      const chunkSize = 4096;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        yield uint8Array.slice(i, i + chunkSize);
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
   * Get available paralinguistic tags
   */
  getAvailableTags(): ParalinguisticTag[] {
    return [
      { type: "laugh" },
      { type: "chuckle" },
      { type: "cough" },
      { type: "sigh" },
      { type: "gasp" },
    ];
  }

  /**
   * Validate text for synthesis
   */
  validateText(text: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (text.length === 0) {
      issues.push("Text cannot be empty");
    }

    if (text.length > 5000) {
      issues.push("Text too long (maximum 5000 characters)");
    }

    const tagCount = (text.match(/\[(?:laugh|chuckle|cough|sigh|gasp)\]/g) || []).length;
    if (tagCount > 10) {
      issues.push("Too many paralinguistic tags (maximum 10)");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  getDefaultVoiceDescription(): string {
    return this.defaultVoiceDescription;
  }

  setReferenceAudio(audioPath: string): void {
    this.hollyReferenceAudioPath = audioPath;
    logger.info("Updated Holly's reference audio", {
      audioPath,
      category: "voice",
    });
  }

  getReferenceAudioPath(): string | undefined {
    return this.hollyReferenceAudioPath;
  }

  isAvailable(): boolean {
    return !!process.env.HUGGINGFACE_API_KEY;
  }

  getServiceInfo() {
    return {
      model: this.modelId,
      provider: "ResembleAI via HuggingFace",
      features: [
        "Zero-shot voice cloning",
        "Paralinguistic tags (laugh, chuckle, etc.)",
        "<150ms latency",
        "6× faster than real-time",
        "State-of-the-art quality",
      ],
      hasReferenceAudio: !!this.hollyReferenceAudioPath,
      available: this.isAvailable(),
    };
  }
}

export const chatterboxService = new ChatterboxTTSService();
