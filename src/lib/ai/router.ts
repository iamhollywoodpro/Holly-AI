/**
 * HOLLY Multi-Model Router
 * Dynamically selects the most suitable LLM based on user intent and task complexity
 */

export type AIModel = 'groq-llama-3.3' | 'google-gemini-2.0' | 'web-llm' | 'local-qwen-7b';

export interface RoutingResult {
    model: AIModel;
    reason: string;
}

export class ModelRouter {
    /**
     * Determine the best model for the given user message
     */
    static route(message: string): RoutingResult {
        const input = message.toLowerCase();

        // 1. "Unlimited" / "Full RAM" / Qwen Specific -> Local Qwen (Ollama)
        if (
            input.includes('unlimited') ||
            input.includes('full ram') ||
            input.includes('qwen') ||
            input.includes('no limits')
        ) {
            return {
                model: 'local-qwen-7b',
                reason: 'Task requested for unlimited/full RAM inference. Routing to local Qwen 2.5 Coder.'
            };
        }

        // 2. Private / Offline / Zero-Quota / Browser-Only -> WebLLM (Qwen 2.5 7B)
        if (
            input.includes('private') ||
            input.includes('offline') ||
            input.includes('browser-only') ||
            input.includes('no-network') ||
            input.includes('in-browser')
        ) {
            return {
                model: 'web-llm',
                reason: 'Task requested specifically for in-browser inference. Using WebLLM with Qwen 2.5 7B.'
            };
        }

        // 3. Complex Coding / Architecture / Refactoring / Large Context / Vision -> Gemini (Free Tier)
        if (
            input.includes('refactor') ||
            input.includes('architecture') ||
            input.includes('complex logic') ||
            input.includes('fix these bugs') ||
            input.includes('optimize') ||
            input.includes('analyze') ||
            input.includes('summarize') ||
            input.includes('image') ||
            input.length > 500
        ) {
            return {
                model: 'google-gemini-2.0',
                reason: 'Complex task or large context requiring Gemini\'s extensive free tier capabilities.'
            };
        }

        // 4. Default / Fast Interaction / General Chat -> Groq (Llama)
        return {
            model: 'groq-llama-3.3',
            reason: 'General inquiry prioritizing speed and efficiency using Groq\'s free tier.'
        };
    }
}
