/**
 * Bidirectional Voice Chat Controller
 *
 * Manages voice input/output with automatic mode detection:
 * - If user speaks → HOLLY speaks back automatically
 * - If user types → HOLLY types back (user can click speaker to hear)
 *
 * TTS provider: Kokoro-FastAPI (primary) → VoxCPM2 (fallback)
 * Both are FREE, self-hosted, zero cold starts. No Modal GPU credits.
 */

import { logger } from "../monitoring/logger";

export type InputMode = "voice" | "text";
export type OutputMode = "voice" | "text" | "both";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  inputMode: InputMode;
  outputMode: OutputMode;
  audioUrl?: string;
  timestamp: Date;
}

export interface VoiceChatConfig {
  autoReplyInVoice: boolean; // Auto-reply in voice if user spoke
  alwaysGenerateAudio: boolean; // Generate audio even for text input
  voiceDescription?: string;
}

export class BidirectionalController {
  private config: VoiceChatConfig;
  private currentInputMode: InputMode = "text";
  private audioCache: Map<string, string> = new Map();

  constructor(config?: Partial<VoiceChatConfig>) {
    this.config = {
      autoReplyInVoice: true,
      alwaysGenerateAudio: true,
      ...config,
    };

    logger.info("Bidirectional voice controller initialized", {
      config: this.config,
      category: "voice",
    });
  }

  /**
   * Process user input and determine response mode
   */
  async processUserInput(
    content: string,
    inputMode: InputMode
  ): Promise<{
    inputMode: InputMode;
    shouldGenerateVoice: boolean;
    shouldAutoPlay: boolean;
  }> {
    this.currentInputMode = inputMode;

    const shouldGenerateVoice =
      this.config.alwaysGenerateAudio ||
      (inputMode === "voice" && this.config.autoReplyInVoice);

    const shouldAutoPlay = inputMode === "voice" && this.config.autoReplyInVoice;

    logger.info("Processing user input", {
      inputMode,
      shouldGenerateVoice,
      shouldAutoPlay,
      contentLength: content.length,
      category: "voice",
    });

    return {
      inputMode,
      shouldGenerateVoice,
      shouldAutoPlay,
    };
  }

  /**
   * Generate voice response for HOLLY's message
   */
  async generateVoiceResponse(
    messageId: string,
    content: string,
    options?: {
      voiceDescription?: string;
      addEmotions?: boolean;
      emotionContext?: any;
      emotion?: string;
    }
  ): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `${messageId}-${content.substring(0, 100)}`;
      if (this.audioCache.has(cacheKey)) {
        logger.info("Using cached audio", {
          messageId,
          category: "voice",
        });
        return this.audioCache.get(cacheKey)!;
      }

      // Build emotion-enhanced text if requested
      let processedContent = content;
      if (options?.addEmotions && options?.emotionContext) {
        processedContent = this._addEmotionTags(content, options.emotionContext);
      }

      logger.info("Generating voice response", {
        messageId,
        contentLength: content.length,
        hasEmotions: options?.addEmotions,
        category: "voice",
      });

      // Call the unified TTS endpoint (Voice Character Engine → Kokoro fallback)
      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: processedContent,
          voiceDescription: options?.voiceDescription,
          emotion: options?.emotion || undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`TTS synthesis failed: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: "audio/wav" });

      // Convert blob to URL
      const audioUrl = URL.createObjectURL(audioBlob);

      // Cache the URL
      this.audioCache.set(cacheKey, audioUrl);

      // Clean up old cache entries (keep last 50)
      if (this.audioCache.size > 50) {
        const firstKey = this.audioCache.keys().next().value as string | undefined;
        if (firstKey !== undefined) {
          const oldUrl = this.audioCache.get(firstKey);
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
          this.audioCache.delete(firstKey);
        }
      }

      logger.info("Voice response generated", {
        messageId,
        audioUrl: audioUrl.substring(0, 50),
        category: "voice",
      });

      return audioUrl;
    } catch (error: any) {
      logger.error("Failed to generate voice response", {
        messageId,
        error: error.message,
        category: "voice",
      });

      throw error;
    }
  }

  /**
   * Stream voice response in real-time
   */
  async *streamVoiceResponse(
    messageId: string,
    content: string,
    options?: {
      voiceDescription?: string;
      addEmotions?: boolean;
      emotionContext?: any;
      emotion?: string;
    }
  ): AsyncGenerator<Uint8Array, void, unknown> {
    try {
      // Build emotion-enhanced text for streaming
      let processedContent = content;
      if (options?.addEmotions && options?.emotionContext) {
        processedContent = this._addEmotionTags(content, options.emotionContext);
      }

      logger.info("Starting voice response stream", {
        messageId,
        contentLength: content.length,
        category: "voice",
      });

      // Fetch audio from unified TTS endpoint (Voice Character Engine → Kokoro)
      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: processedContent,
          voiceDescription: options?.voiceDescription,
          emotion: options?.emotion || undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`TTS synthesis failed: HTTP ${response.status}`);
      }

      // Stream the response body in chunks
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) yield value;
        }
      }

      logger.info("Voice response stream completed", {
        messageId,
        category: "voice",
      });
    } catch (error: any) {
      logger.error("Failed to stream voice response", {
        messageId,
        error: error.message,
        category: "voice",
      });

      throw error;
    }
  }

  /**
   * Add simple VoxCPM2-compatible emotion tags to text based on context.
   * Tags: (cheerful tone) (warm and gentle) (soft tone) (excited) (pause) (warm and gentle)
   */
  private _addEmotionTags(
    content: string,
    context: { isJoke?: boolean; isExcited?: boolean; isSad?: boolean }
  ): string {
    if (context.isJoke) return `[chuckle] ${content}`;
    if (context.isExcited) return `${content}`;
    if (context.isSad) return `[sigh] ${content}`;
    return content;
  }

  /**
   * Detect emotion context from message content
   */
  detectEmotionContext(content: string): {
    isJoke?: boolean;
    isExcited?: boolean;
    isWhisper?: boolean;
    isSad?: boolean;
    isAngry?: boolean;
  } {
    const context: any = {};

    // Detect jokes
    if (/\b(haha|lol|funny|joke|hilarious)\b/i.test(content)) {
      context.isJoke = true;
    }

    // Detect excitement
    if (/!{2,}|amazing|awesome|incredible|fantastic/i.test(content)) {
      context.isExcited = true;
    }

    // Detect whisper/confidential
    if (/\b(confidential|secret|private|whisper)\b/i.test(content)) {
      context.isWhisper = true;
    }

    // Detect sadness
    if (/\b(sorry|sad|unfortunately|regret)\b/i.test(content)) {
      context.isSad = true;
    }

    // Detect anger (rare for HOLLY, but possible)
    if (/\b(angry|frustrated|annoyed)\b/i.test(content)) {
      context.isAngry = true;
    }

    return context;
  }

  /**
   * Create a chat message with voice support
   */
  async createMessage(
    content: string,
    role: "user" | "assistant",
    inputMode: InputMode,
    options?: {
      generateVoice?: boolean;
      autoPlay?: boolean;
      voiceDescription?: string;
    }
  ): Promise<ChatMessage> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let audioUrl: string | undefined;
    let outputMode: OutputMode = "text";

    // Generate voice for assistant messages if requested
    if (role === "assistant" && options?.generateVoice) {
      const emotionContext = this.detectEmotionContext(content);
      audioUrl = await this.generateVoiceResponse(messageId, content, {
        voiceDescription: options.voiceDescription,
        addEmotions: true,
        emotionContext,
      });
      outputMode = options.autoPlay ? "voice" : "both";
    }

    const message: ChatMessage = {
      id: messageId,
      role,
      content,
      inputMode,
      outputMode,
      audioUrl,
      timestamp: new Date(),
    };

    logger.info("Chat message created", {
      messageId,
      role,
      inputMode,
      outputMode,
      hasAudio: !!audioUrl,
      category: "voice",
    });

    return message;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceChatConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    logger.info("Voice chat configuration updated", {
      config: this.config,
      category: "voice",
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceChatConfig {
    return { ...this.config };
  }

  /**
   * Get current input mode
   */
  getCurrentInputMode(): InputMode {
    return this.currentInputMode;
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    // Revoke all cached URLs
    for (const url of this.audioCache.values()) {
      URL.revokeObjectURL(url);
    }

    this.audioCache.clear();

    logger.info("Audio cache cleared", {
      category: "voice",
    });
  }
}

export const bidirectionalController = new BidirectionalController();
