/**
 * HOLLY WebLLM Service
 * Enables zero-quota, in-browser AI inference using WebGPU (via @mlc-ai/web-llm)
 */

export interface WebLLMChatRequest {
    messages: { role: string; content: string }[];
    onProgress?: (progress: number, message: string) => void;
}

export class WebLLMService {
    private static engine: any = null;
    private static selectedModel: string = "Qwen2.5-7B-Instruct-q4f32_1-MLC"; // High-capacity free model

    /**
     * Lazy-load the WebLLM engine
     */
    static async getEngine(onProgress?: (progress: number, message: string) => void) {
        if (this.engine) return this.engine;

        // Note: In real implementation, we would use dynamic import:
        // const webllm = await import("@mlc-ai/web-llm");

        console.log(`[WebLLM] Selected model for initialization: ${this.selectedModel}`);

        // Placeholder for the engine creation logic
        // this.engine = await webllm.CreateMLCEngine(this.selectedModel, {
        //     initProgressCallback: (report: any) => {
        //         if (onProgress) onProgress(report.progress, report.text);
        //         console.log("[WebLLM] Init Progress:", report.text);
        //     },
        // });

        return this.engine;
    }

    /**
     * Check if WebGPU is supported by the user's browser
     */
    static async isSupported(): Promise<boolean> {
        if (typeof navigator === "undefined" || !("gpu" in navigator)) {
            return false;
        }
        try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            return !!adapter;
        } catch (e) {
            return false;
        }
    }

    /**
     * Chat with the in-browser model
     */
    static async chat(request: WebLLMChatRequest): Promise<string> {
        try {
            const engine = await this.getEngine(request.onProgress);
            if (!engine) {
                throw new Error("WebLLM Engine failed to initialize or not implemented yet.");
            }

            const chunks = await engine.chat.completions.create({
                messages: request.messages,
                stream: false, // Simple chat for now
            });

            return chunks.choices[0].message.content || "";
        } catch (error: any) {
            console.error("[WebLLM] Chat Error:", error);
            throw error;
        }
    }
}
