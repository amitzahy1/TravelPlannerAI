import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { generateLocalContent, isEngineReady } from "./webLlmService";
import { getCachedResponse, cacheResponse } from "./cacheService";

/**
 * System prompt for Research & Recommendations (SMART tasks)
 * Includes strict business verification and professional sourcing
 */
export const SYSTEM_PROMPT_RESEARCH = `You are a skeptical researcher and expert in culinary arts and travel at Google.

CRITICAL VERIFICATION RULES (January 2026):
1. MUST perform web search to verify current business status
2. MUST filter out ANY business marked as "Permanently Closed" or "Temporarily Closed"
3. MUST prioritize results from professional sources (Michelin Guide, James Beard Foundation, Lonely Planet, TripAdvisor Travelers' Choice, UNESCO)
4. MUST include verification_needed: true if data is older than 6 months or status is uncertain
5. REJECT viral/TikTok trends - only evidence-based professional recommendations

When providing recommendations:
- Cite professional sources with recent timestamps (2025-2026)
- Verify current ratings from Google Maps or TripAdvisor
- Prioritize authenticity and quality over social media popularity
- Provide context (awards, chef credentials, historical significance)
- Consider value for money
- Set business_status to "OPERATIONAL" only if verified

CRITICAL OUTPUT RULES:
1. You MUST return ONLY valid JSON
2. Do NOT format with markdown (no \`\`\`json blocks)
3. Do NOT include conversational text before or after the JSON
4. Validate your JSON before sending`;

/**
 * System prompt for Data Extraction (FAST tasks)
 * Optimized for accuracy and speed in document parsing
 */
export const SYSTEM_PROMPT_EXTRACT = `You are a precise data extraction specialist.

Your task is to extract structured information from documents with 100% accuracy.

EXTRACTION RULES:
- Extract ONLY information explicitly stated in the document
- Use exact dates, times, and locations as written
- Do NOT infer or guess missing information
- If a field is not found, omit it or set to null
- Preserve original formatting for names and addresses

CRITICAL OUTPUT RULES:
1. You MUST return ONLY valid JSON
2. Do NOT format with markdown (no \`\`\`json blocks)
3. Do NOT include conversational text
4. Validate your JSON before sending`;

/**
 * Legacy system prompt for backward compatibility
 */
export const SYSTEM_PROMPT = SYSTEM_PROMPT_RESEARCH;

// --- CONFIGURATION ---

// 1. Google Gemini Models (Direct SDK)
const GOOGLE_MODELS = {
  FAST: "gemini-3-flash-preview",   // User requested
  SMART: "gemini-3-pro-preview",    // User requested
  FALLBACK: "gemini-2.0-flash-exp"  // Updated: 2.0 > 1.5
};

// 2. Groq Models (Fast Inference Fallback)
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
];

// 3. OpenRouter Models (Universal Fallback)
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];

export const AI_MODEL = GOOGLE_MODELS.FAST; // For display purposes

// --- HELPERS ---

// Exponential Backoff Utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000,
  factor = 2
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      // Only retry on rate limits (429) or server errors (5xx)
      const isRetryable = error?.status === 429 || error?.status === 503 || error?.status === 500 ||
        (error?.message && error.message.includes("429"));

      if (!isRetryable || attempt >= retries) {
        throw error;
      }

      // Calculate delay with jitter: base * 2^attempt + random(0-100ms)
      const delay = (baseDelay * Math.pow(factor, attempt)) + (Math.random() * 100);
      console.warn(`⚠️ [AI] Retry attempt ${attempt}/${retries} after ${Math.round(delay)}ms due to error:`, error.message?.substring(0, 50));
      await wait(delay);
    }
  }
  throw new Error("Max retries reached");
}

// Enhanced JSON Extraction
const extractJSON = (text: string): string => {
  if (!text) return "{}";
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1];

  const firstOpenBrace = text.indexOf('{');
  const firstOpenBracket = text.indexOf('[');
  let startIndex = -1;
  let isArray = false;

  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
    startIndex = firstOpenBrace;
  } else if (firstOpenBracket !== -1) {
    startIndex = firstOpenBracket;
    isArray = true;
  }

  if (startIndex !== -1) {
    const lastIndex = text.lastIndexOf(isArray ? ']' : '}');
    if (lastIndex !== -1 && lastIndex > startIndex) {
      return text.substring(startIndex, lastIndex + 1);
    }
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

  console.warn("Could not extract JSON from response:", text.substring(0, 100));
  return "{}";
};

// Injection Helper for Offline Models
const injectVerificationWarning = (text: string): string => {
  try {
    const json = JSON.parse(extractJSON(text));
    if (typeof json === 'object' && json !== null) {
      json.verification_needed = true;
      json.data_source = "offline_model";
      return JSON.stringify(json);
    }
  } catch (e) {
    // ignore
  }
  return text;
};

// --- CLIENTS ---

let googleClient: GoogleGenAI | null = null;
let groqClient: OpenAI | null = null;
let openRouterClient: OpenAI | null = null;

const getGoogleClient = () => {
  if (googleClient) return googleClient;
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (key) {
    try {
      googleClient = new GoogleGenAI({ apiKey: key });
    } catch (e) { console.error("Invalid Google Client init", e); }
  }
  return googleClient;
};

const getGroqClient = () => {
  if (groqClient) return groqClient;
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (key) {
    try {
      groqClient = new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: key,
        dangerouslyAllowBrowser: true
      });
      console.log("✅ Groq Client initialized successfully");
    } catch (e) { console.error("Invalid Groq Client init", e); }
  } else {
    console.warn("⚠️ No VITE_GROQ_API_KEY found. Groq fallback will be skipped.");
  }
  return groqClient;
};

const getOpenRouterClient = () => {
  if (openRouterClient) return openRouterClient;
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (key) {
    try {
      openRouterClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: key,
        dangerouslyAllowBrowser: true,
        // @ts-ignore
        defaultHeaders: {
          "HTTP-Referer": "https://travel-planner-pro.vercel.app",
          "X-Title": "Travel Planner Pro"
        }
      });
    } catch (e) { console.error("Invalid OpenRouter Client init", e); }
  } else {
    console.warn("⚠️ No VITE_OPENROUTER_API_KEY found. OpenRouter fallback will be skipped.");
  }
  return openRouterClient;
};

// --- MAIN GENERATION ---

export type AIIntent = 'FAST' | 'SMART';

export const generateWithFallback = async (
  _unused: any,
  contents: string | any[],
  config?: Record<string, any>,
  intent: AIIntent = 'FAST'
) => {
  let lastError: any = null;

  // 1. Google Gemini (Preferred)
  const googleAI = getGoogleClient();
  if (googleAI) {
    // Select model and tools based on intent
    const selectedModel = intent === 'SMART' ? GOOGLE_MODELS.SMART : GOOGLE_MODELS.FAST;
    const tools = intent === 'SMART' ? [{ googleSearchRetrieval: {} }] : undefined;

    // Retry logic loop now just tries the selected model, or maybe fallbacks?
    // For simplicity given the requirement: Try selected, then fallback to stable.
    const modelsToTry = [selectedModel, GOOGLE_MODELS.FALLBACK];

    for (const model of modelsToTry) {
      // Don't use tools with fallback/flash unless desired (Flash supports tools too but let's keep separate)
      // Only apply tools if we are strictly using the SMART model that was requested for grounding
      const currentTools = (model === GOOGLE_MODELS.SMART && tools) ? tools : undefined;

      try {
        console.log(`🤖 [Google] Trying ${model} (Intent: ${intent})...`);

        const geminiContent = typeof contents === 'string' ? contents : contents;

        const result = await withBackoff(async () => {
          return await googleAI.models.generateContent({
            model,
            contents: geminiContent,
            config: {
              ...config,
              tools: currentTools,
            },
          });
        });

        console.log(`✅ [Google] Success: ${model}`);

        const safeResponse = result as any;
        let rawText = typeof safeResponse.text === 'function' ? safeResponse.text() : safeResponse.text;

        // Append Grounding Metadata if available (e.g. source links) ? 
        // For now just return text. Grounding usually embeds citations in text or provides metadata.

        // Normalize JSON if needed
        if (config?.responseMimeType === 'application/json') {
          rawText = extractJSON(rawText);
        }

        return {
          text: rawText,
          candidates: [{ content: { parts: [{ text: rawText }] } }]
        };

      } catch (error: any) {
        console.warn(`⚠️ [Google] Failed ${model}:`, error.message || error);
        lastError = error;
      }
    }
  }

  // Fallback to other providers (OpenRouter/Groq) - typically FAST logic (no tools)

  // 2. OpenRouter (Reliable Universal Fallback)
  const routerAI = getOpenRouterClient();
  if (routerAI) {
    // Select appropriate system prompt based on intent
    const systemPrompt = intent === 'SMART' ? SYSTEM_PROMPT_RESEARCH : SYSTEM_PROMPT_EXTRACT;

    for (const model of OPENROUTER_MODELS) {
      try {
        console.log(`🌐 [OpenRouter] Trying ${model}...`);

        let messages: any[] = [{ role: "system", content: systemPrompt }];
        if (typeof contents === 'string') {
          messages.push({ role: "user", content: contents });
        } else if (Array.isArray(contents)) {
          contents.forEach((msg: any) => {
            if (msg.role && msg.content) {
              messages.push(msg);
            } else if (msg.parts) {
              const textPart = msg.parts.find((p: any) => p.text);
              if (textPart) messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: textPart.text });
            }
          });
        }

        const completion = await withBackoff(async () => {
          return await routerAI.chat.completions.create({
            model,
            messages,
            temperature: config?.temperature || 0.7, // Top_p handling depends on model
          });
        });

        console.log(`✅ [OpenRouter] Success: ${model}`);
        let text = completion.choices[0]?.message?.content || "";

        if (config?.responseMimeType === 'application/json') {
          text = extractJSON(text);
          if (intent === 'SMART') text = injectVerificationWarning(text);
        }

        return { text: text, candidates: [{ content: { parts: [{ text }] } }] };

      } catch (error: any) {
        console.warn(`⚠️ [OpenRouter] Failed ${model}:`, error.message || error);
        lastError = error;
      }
    }
  }

  // 3. Groq (High Speed Fallback)
  const groqAI = getGroqClient();
  if (groqAI) {
    // Select appropriate system prompt based on intent
    const systemPrompt = intent === 'SMART' ? SYSTEM_PROMPT_RESEARCH : SYSTEM_PROMPT_EXTRACT;

    for (const model of GROQ_MODELS) {
      try {
        console.log(`⚡ [Groq] Trying ${model}...`);

        let messages: any[] = [{ role: "system", content: systemPrompt }];
        if (typeof contents === 'string') {
          messages.push({ role: "user", content: contents });
        } else if (Array.isArray(contents)) {
          contents.forEach((msg: any) => {
            if (msg.role && msg.content) {
              messages.push(msg);
            } else if (msg.parts) {
              const textPart = msg.parts.find((p: any) => p.text);
              if (textPart) messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: textPart.text });
            }
          });
        }

        const completion = await withBackoff(async () => {
          return await groqAI.chat.completions.create({
            model,
            messages,
            temperature: config?.temperature || 0.7,
            response_format: config?.responseMimeType === 'application/json' ? { type: "json_object" } : undefined
          });
        });

        console.log(`✅ [Groq] Success: ${model}`);
        let text = completion.choices[0]?.message?.content || "";
        if (config?.responseMimeType === 'application/json' && intent === 'SMART') {
          text = injectVerificationWarning(text);
        }
        return { text: text, candidates: [{ content: { parts: [{ text }] } }] };

      } catch (error: any) {
        console.warn(`⚠️ [Groq] Failed ${model}:`, error.message || error);
        lastError = error;
      }
    }
  }

  // 4. WebLLM (Client-Side Fallback)
  // Only tries if the engine is already initialized (user opted-in via UI) to avoid unexpected 2GB downloads
  if (isEngineReady()) {
    try {
      console.log(`💻 [WebLLM] Trying local execution...`);
      // Convert contents to simple string prompt if needed
      let prompt = "";
      if (typeof contents === 'string') {
        prompt = contents;
      } else {
        // Naive extraction for now
        contents.forEach((c: any) => {
          if (c.parts) prompt += c.parts.map((p: any) => p.text).join('\n');
          else if (c.content) prompt += c.content;
        });
      }

      const systemPrompt = intent === 'SMART' ? SYSTEM_PROMPT_RESEARCH : SYSTEM_PROMPT_EXTRACT;
      const text = await generateLocalContent(prompt, systemPrompt);
      console.log(`✅ [WebLLM] Success!`);

      return { text: text, candidates: [{ content: { parts: [{ text }] } }] };

    } catch (error: any) {
      console.warn(`⚠️ [WebLLM] Failed:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error("All AI Providers failed.");
};

/**
 * Extract trip details from a document
 * Falls back to standard generation but prepares mime data for Google if available
 */
export const extractTripFromDoc = async (fileBase64: string, mimeType: string, promptText: string) => {
  // Google supports inline data directly
  const contents = [
    {
      role: "user",
      parts: [
        { text: promptText },
        { inlineData: { mimeType: mimeType, data: fileBase64 } }
      ]
    }
  ];

  // Note: Groq/OpenRouter might not support image/pdf inputs in this specific text-only implementation 
  // without employing Vision models explicitly. This implementation prioritizes Google for docs.
  return generateWithFallback(null, contents, { responseMimeType: "application/json" }, 'FAST');
};

// Export simple getter for backward compatibility
export const getAI = getGoogleClient;
