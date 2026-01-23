import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';

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
const GOOGLE_MODELS = [
  "gemini-2.0-flash-exp",              // Best free experimental
  "gemini-1.5-flash",                  // Standard Stable
];

// 2. OpenRouter Models (Fallback / Specific Capabilities)
// 2. OpenRouter Models (Fallback / Specific Capabilities)
const OPENROUTER_MODELS = [
  // --- Verified Western Providers Only (Privacy Focused) ---
  "google/gemini-2.0-flash-exp:free",                // Google (US)
  "meta-llama/llama-3.3-70b-instruct:free",          // Meta (US)
  "mistralai/mistral-7b-instruct:free",              // Mistral (France - GDPR Safe)
  "microsoft/phi-3-mini-128k-instruct:free",         // Microsoft (US)
];

export const AI_MODEL = GOOGLE_MODELS[0]; // For display

// --- HELPER: Extract JSON from text ---
// Enhanced to handle arrays, objects, and loose markdown
const extractJSON = (text: string): string => {
  if (!text) return "{}";

  // 1. Try finding content between ```json blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // 2. Try finding the first '{' or '[' and the last '}' or ']'
  const firstOpenBrace = text.indexOf('{');
  const firstOpenBracket = text.indexOf('[');

  let startIndex = -1;
  let isArray = false;

  // Determine if it starts with { or [
  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
    startIndex = firstOpenBrace;
  } else if (firstOpenBracket !== -1) {
    startIndex = firstOpenBracket;
    isArray = true;
  }

  if (startIndex !== -1) {
    // Find the matching closing character (searching from the end)
    const lastIndex = text.lastIndexOf(isArray ? ']' : '}');
    if (lastIndex !== -1 && lastIndex > startIndex) {
      return text.substring(startIndex, lastIndex + 1);
    }
  }

  // 3. Fallback: If it looks like pure JSON already
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // 4. Last Resort: return empty object if nothing found (prevent crash)
  console.warn("Could not extract JSON from response:", text.substring(0, 100));
  return "{}";
};

// --- CLIENT CACHING ---
let googleClient: GoogleGenAI | null = null;
let openAIClient: OpenAI | null = null;     // NEW: Direct OpenAI
let openRouterClient: OpenAI | null = null; // Existing: OpenRouter

const getGoogleClient = () => {
  if (googleClient) return googleClient;
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (key) {
    googleClient = new GoogleGenAI({ apiKey: key });
  }
  return googleClient;
};

// NEW: Get Direct OpenAI Client
const getOpenAIClient = () => {
  if (openAIClient) return openAIClient;
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  // Only init if key exists and is not the OpenRouter one (basic check)
  if (key && !key.startsWith('sk-or-')) {
    openAIClient = new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true // Client-side app
    });
  }
  return openAIClient;
};

// Export for backward compatibility (used by consumers)
export const getAI = getGoogleClient;

const getOpenRouterClient = () => {
  if (openRouterClient) return openRouterClient;
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (key) {
    openRouterClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: key,
      dangerouslyAllowBrowser: true
    });
  }
  return openRouterClient;
};

/**
 * Main Generation Function - Hybrid Strategy
 * 1. Try Google SDK (VITE_GEMINI_API_KEY)
 * 2. Try Direct OpenAI (VITE_OPENAI_API_KEY) - NEW
 * 3. Try OpenRouter (VITE_OPENROUTER_API_KEY) - Fallback
 */
export const generateWithFallback = async (
  _unused: any,
  contents: string | any[],
  config?: Record<string, any>
) => {
  let lastError: any = null;

  // --- PHASE 1: GOOGLE SDK ---
  const googleAI = getGoogleClient();
  if (googleAI) {
    for (const model of GOOGLE_MODELS) {
      try {
        console.log(`🤖 [GoogleDirect] Trying model: ${model}`);

        // Ensure contents is in Google format
        let geminiContent = contents;
        if (typeof contents === 'string') {
          geminiContent = contents;
        }

        const response = await googleAI.models.generateContent({
          model,
          contents: geminiContent,
          config
        });

        console.log(`✅ [GoogleDirect] Success with ${model}`);

        const safeResponse = response as any;
        let rawText = typeof safeResponse.text === 'function' ? safeResponse.text() : safeResponse.text;

        if (config && config.responseMimeType === 'application/json') {
          try {
            const cleanJson = extractJSON(rawText);
            rawText = cleanJson;
          } catch (e) {
            console.warn("Failed to auto-extract JSON in centralized service", e);
          }
        }

        return {
          ...response,
          text: rawText
        };

      } catch (error: any) {
        console.warn(`⚠️ [GoogleDirect] Model ${model} failed:`, error.message?.substring(0, 100));
        const isRetryable = error.status === 404 || error.status === 429 || error.status === 503;
        if (isRetryable) continue;
        lastError = error;
      }
    }
  }

  // Common: Prepare OpenAI-format messages for Phase 2 & 3
  let messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (typeof contents === 'string') {
    messages.push({ role: "user", content: contents });
  } else if (Array.isArray(contents)) {
    contents.forEach((msg: any) => {
      // Simple adapter for Gemini structure to OpenAI
      if (msg.role && msg.content) {
        messages.push(msg);
      } else if (msg.parts) {
        const textPart = msg.parts.find((p: any) => p.text);
        if (textPart) messages.push({ role: "user", content: textPart.text });
      }
    });
  }

  // --- PHASE 2: DIRECT OPENAI (NEW) ---
  const directOpenAI = getOpenAIClient();
  if (directOpenAI) {
    console.log("🔄 Switching to Direct OpenAI...");
    try {
      const model = "gpt-4o-mini"; // Verified efficient model
      console.log(`🤖 [OpenAIDirect] Trying model: ${model}`);

      const completion = await directOpenAI.chat.completions.create({
        model,
        messages,
        temperature: config?.temperature || 0.7,
      });

      console.log(`✅ [OpenAIDirect] Success with ${model}`);
      const text = completion.choices[0]?.message?.content || "";

      return {
        text: () => text,
        extractedText: text,
        candidates: [{ content: { parts: [{ text }] } }]
      };

    } catch (error: any) {
      console.warn(`⚠️ [OpenAIDirect] Failed:`, error.message);
      lastError = error;
    }
  }

  // --- PHASE 3: OPENROUTER ---
  console.log("🔄 Switching to OpenRouter Fallback...");

  const routerAI = getOpenRouterClient();
  if (!routerAI) {
    console.error("❌ No VITE_OPENROUTER_API_KEY found. Cannot use fallback.");
    throw lastError || new Error("All models failed and no OpenRouter key provided.");
  }

  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`🤖 [OpenRouter] Trying model: ${model}`);

      const completion = await routerAI.chat.completions.create({
        model: model,
        messages: messages,
        temperature: config?.temperature || 0.7,
        top_p: config?.topP,
        // @ts-ignore
        referer: "https://travel-planner-pro.vercel.app",
        appName: "Travel Planner Pro",
      });

      console.log(`✅ [OpenRouter] Success with ${model}`);

      const text = completion.choices[0]?.message?.content || "";
      return {
        text: () => text,
        extractedText: text,
        candidates: [{ content: { parts: [{ text }] } }]
      };

    } catch (error: any) {
      console.warn(`⚠️ [OpenRouter] Model ${model} failed:`, error);
      lastError = error;
      if (error.status === 401) break;
    }
  }

  throw lastError || new Error("All AI Providers failed.");
};

/**
 * Extract trip details from a document
 */
export const extractTripFromDoc = async (fileBase64: string, mimeType: string, promptText: string) => {
  // We construct the "Gemini style" content object first, as Phase 1 expects that.
  // Phase 2 (OpenRouter) logic inside generateWithFallback will convert it if needed.

  const contents = [
    {
      role: "user",
      parts: [
        { text: promptText },
        { inlineData: { mimeType: mimeType, data: fileBase64 } }
      ]
    }
  ];

  return generateWithFallback(null, contents, { responseMimeType: "application/json" });
};
