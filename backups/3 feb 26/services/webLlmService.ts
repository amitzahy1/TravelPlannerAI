import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

// Selected Model: Llama-3.2-1B-Instruct (Quantized)
// Reason: Extremely fast, low memory usage (~800MB), good enough for simple JSON/Summarization
const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let isInitializing = false;

export interface WebLLMInitProgress {
        progress: number;
        text: string;
}

export const isEngineReady = () => !!engine;

/**
 * Check if WebGPU is available ensuring we don't crash on non-supported devices
 */
export const isWebGPUSupported = async (): Promise<boolean> => {
        if (typeof navigator === 'undefined' || !navigator.gpu) return false;
        try {
                const adapter = await navigator.gpu.requestAdapter();
                return !!adapter;
        } catch (e) {
                return false;
        }
};

/**
 * Initialize the WebLLM Engine
 * This triggers the download of the model weights (once).
 */
export const initWebLLM = async (
        onProgress?: (p: WebLLMInitProgress) => void
): Promise<MLCEngine> => {
        if (engine) return engine;
        if (isInitializing) {
                // Simple polling wait if already initializing
                while (isInitializing) {
                        await new Promise((r) => setTimeout(r, 500));
                        if (engine) return engine;
                }
        }

        try {
                isInitializing = true;

                // Custom progress handler
                const initProgressCallback: InitProgressCallback = (report) => {
                        console.log(`[WebLLM] Progress: ${report.text}`, report.progress);
                        if (onProgress) {
                                onProgress({
                                        progress: report.progress,
                                        text: report.text
                                });
                        }
                };

                engine = await CreateMLCEngine(
                        SELECTED_MODEL,
                        { initProgressCallback }
                );

                console.log("[WebLLM] Engine initialized successfully!");
                return engine;
        } catch (error) {
                console.error("[WebLLM] Initialization Failed:", error);
                throw error;
        } finally {
                isInitializing = false;
        }
};

/**
 * Generate content using the local in-browser model
 */
export const generateLocalContent = async (
        prompt: string,
        systemPrompt?: string
): Promise<string> => {
        if (!engine) {
                throw new Error("WebLLM Engine not initialized. Call initWebLLM() first.");
        }

        const messages: any[] = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: prompt });

        const reply = await engine.chat.completions.create({
                messages,
                temperature: 0.7,
        });

        return reply.choices[0]?.message?.content || "";
};
