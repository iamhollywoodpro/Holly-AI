/**
 * WebLLM Service - Local Browser Inference
 * 
 * Enables HOLLY to run AI inference locally in the browser via WebGPU.
 * Currently a placeholder - Phase 4 Action Engine will implement this fully.
 * 
 * @see https://github.com/mlc-ai/web-llm
 */

export interface WebLLMChatOptions {
  messages: Array<{ role: string; content: string }>;
  onProgress?: (progress: number, message: string) => void;
}

export class WebLLMService {
  /**
   * Run local inference via WebGPU
   * Phase 4: Will use @mlc-ai/web-llm with Qwen-7B or Llama models
   */
  static async chat(options: WebLLMChatOptions): Promise<string> {
    // Phase 4 implementation will load model weights into browser GPU memory
    throw new Error('Local AI inference not yet available. Please use the cloud backend.');
  }
}
