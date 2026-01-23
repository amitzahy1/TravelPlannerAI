import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { generateLocalContent, isEngineReady } from "./webLlmService";
import { getCachedResponse, cacheResponse } from "./cacheService";

/**
 * System prompt for AI
 */
export const SYSTEM_PROMPT = `You are a skeptical researcher and expert in culinary arts and travel.

When providing recommendations:
- Cite professional sources (Michelin Guide, James Beard Foundation, Lonely Planet, etc.)
- Prioritize authenticity and quality over popularity
- Provide context (awards, chef credentials, history)
- Consider value for money

CRITICAL OUTPUT RULES:
1. You MUST return ONLY valid JSON.
2. Do NOT format with markdown (no \`\`\`json blocks if possible).
3. Do NOT include conversational text before or after the JSON.
4. Validate your JSON before sending.`;

// --- CONFIGURATION ---

// 1. Google Gemini Models (Direct SDK)
// Updated based on technical report for stability and speed
// 1. Google Gemini Models (Direct SDK)
const GOOGLE_MODELS = [
  "gemini-2.0-flash",                  // Best overall (Stable/Preview)
  "gemini-1.5-flash-latest",           // New stable alias
  "gemini-1.5-flash",                  // Legacy stable
];

// 2. Groq Models (Fast Inference Fallback)
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
];

// 3. OpenRouter Models (Universal Fallback)
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free", // New Free Source
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];

export const AI_MODEL = GOOGLE_MODELS[0]; // For display purposes

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

export const generateWithFallback = async (
  _unused: any,
  contents: string | any[],
  config?: Record<string, any>
) => {
  let lastError: any = null;

  // 1. Google Gemini (Preferred)
  const googleAI = getGoogleClient();
  if (googleAI) {
    for (const model of GOOGLE_MODELS) {
      try {
        console.log(`🤖 [Google] Trying ${model}...`);

        const geminiContent = typeof contents === 'string' ? contents : contents;

        const result = await withBackoff(async () => {
          return await googleAI.models.generateContent({
            model,
            contents: geminiContent,
            config
          });
        });

        console.log(`✅ [Google] Success: ${model}`);

        const safeResponse = result as any;
        let rawText = typeof safeResponse.text === 'function' ? safeResponse.text() : safeResponse.text; // Handle different SDK versions

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
        // If it's a 404/403 (Invalid model/Permission), don't retry same provider, just move to next model in list
        // If it's 429, backoff was already attempted by withBackoff, so we really failed.
      }
    }
  }

  // Prepare standard OpenAI messages format for Groq/OpenRouter
  let messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (typeof contents === 'string') {
    messages.push({ role: "user", content: contents });
  } else if (Array.isArray(contents)) {
    contents.forEach((msg: any) => {
      if (msg.role && msg.content) {
        messages.push(msg);
      } else if (msg.parts) {
        // Convert Gemini parts to OpenAI content
        const textPart = msg.parts.find((p: any) => p.text);
        if (textPart) messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: textPart.text });

        // Handle images? Simple text fallback for now in fallback layers
      }
    });
  }

  // 2. Groq (High Speed Fallback)
  const groqAI = getGroqClient();
  if (groqAI) {
    for (const model of GROQ_MODELS) {
      try {
        console.log(`⚡ [Groq] Trying ${model}...`);

        const completion = await withBackoff(async () => {
          return await groqAI.chat.completions.create({
            model,
            messages,
            temperature: config?.temperature || 0.7,
            response_format: config?.responseMimeType === 'application/json' ? { type: "json_object" } : undefined
          });
        });

        console.log(`✅ [Groq] Success: ${model}`);
        const text = completion.choices[0]?.message?.content || "";
        return { text: text, candidates: [{ content: { parts: [{ text }] } }] };

      } catch (error: any) {
        console.warn(`⚠️ [Groq] Failed ${model}:`, error.message || error);
        lastError = error;
      }
    }
  }

  // 3. OpenRouter (Universal Fallback)
  const routerAI = getOpenRouterClient();
  if (routerAI) {
    for (const model of OPENROUTER_MODELS) {
      try {
        console.log(`🌐 [OpenRouter] Trying ${model}...`);

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
        }

        return { text: text, candidates: [{ content: { parts: [{ text }] } }] };

      } catch (error: any) {
        console.warn(`⚠️ [OpenRouter] Failed ${model}:`, error.message || error);
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

      const text = await generateLocalContent(prompt, SYSTEM_PROMPT);
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
  return generateWithFallback(null, contents, { responseMimeType: "application/json" });
};

// Export simple getter for backward compatibility
export const getAI = getGoogleClient;
