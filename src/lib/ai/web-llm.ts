/**
 * WebLLM Service - Local Browser Inference (stub)
 *
 * Placeholder kept so the UI badge renders correctly.
 * Ollama (OLLAMA_BASE_URL) is the recommended local inference path.
 *
 * @see https://github.com/mlc-ai/web-llm
 */

export interface WebLLMChatOptions {
  messages: Array<{ role: string; content: string }>;
  onProgress?: (progress: number, message: string) => void;
}

export class WebLLMService {
  /** Returns false — in-browser WebGPU inference is not implemented. */
  static isAvailable(): boolean {
    return false;
  }

  /**
   * Stub — returns a graceful error message instead of throwing.
   * The UI will show this message and allow the user to switch provider.
   */
  static async chat(options: WebLLMChatOptions): Promise<string> {
    // Signal progress callback so the UI doesn't hang
    options.onProgress?.(0, 'Local browser inference is not available.');
    return (
      "In-browser AI isn't available yet. " +
      'For private/offline inference, install Ollama (https://ollama.com) ' +
      'and set OLLAMA_BASE_URL in your environment.'
    );
  }
}
