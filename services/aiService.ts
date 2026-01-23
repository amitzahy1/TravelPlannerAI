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
// Note: SDK usually adds 'models/' prefix automatically. If 404 occurs, try without.
const GOOGLE_MODELS = [
  "gemini-2.0-flash-exp",              // Latest experimental
  "gemini-1.5-flash",                  // Standard Flash
  "gemini-1.5-flash-latest",           // Latest Flash
  "gemini-1.5-pro",                    // Standard Pro
  "gemini-1.5-pro-latest"              // Latest Pro
];

// 2. OpenRouter Models (Fallback / Specific Capabilities)
// 2. OpenRouter Models (Fallback / Specific Capabilities)
const OPENROUTER_MODELS = [
  // --- Online / Search Models (Best for "Market Research") ---
  "perplexity/llama-3.1-sonar-huge-128k-online", // Strongest Search
  "perplexity/llama-3.1-sonar-large-128k-online",

  // --- High Intelligence Models ---
  "anthropic/claude-3.5-sonnet",           // Top tier reasoning
  "openai/gpt-4o",                         // Top tier general

  // --- Free / Economy Tier ---
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash-thinking-exp:free", // Thinking model
  "meta-llama/llama-3.1-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "huggingfaceh4/zephyr-7b-beta:free",
  "openchat/openchat-7b:free",
  "gryphe/mythomax-l2-13b:free"
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
let openRouterClient: OpenAI | null = null;

const getGoogleClient = () => {
  if (googleClient) return googleClient;
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (key) {
    googleClient = new GoogleGenAI({ apiKey: key });
  }
  return googleClient;
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
 * 2. If all fail, Try OpenRouter (VITE_OPENROUTER_API_KEY)
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
        // Simpler for this demo: if it's OpenAI format (array of objects), we might need conversion, 
        // but assuming pure Gemini format for now or simple string.
        let geminiContent = contents;
        if (typeof contents === 'string') {
          geminiContent = contents; // Works directly
        } else if (Array.isArray(contents)) {
          // Basic check: if it looks like OpenAI messages, we might need simple conversion or pass as is if Google accepts it (it doesn't usually).
          // However, the app sends Google format mostly. 
          // If we receive OpenAI format, we try to extract text.
          // For safety in this hybrid mode, we assume the inputs from the app are currently tailored for Google format (parts).
        }

        const response = await googleAI.models.generateContent({
          model,
          contents: geminiContent,
          config
        });

        console.log(`✅ [GoogleDirect] Success with ${model}`);

        // Normalize response
        // Cast to any to handle different SDK versions where text might be a function or property
        const safeResponse = response as any;
        let rawText = typeof safeResponse.text === 'function' ? safeResponse.text() : safeResponse.text;

        // AUTO-FIX: Extract JSON if format is requested
        // If the caller asked for JSON (responseMimeType), we ensure we return Clean JSON string in .text
        // This solves the issue where models return "Here is the JSON: {...}"
        if (config && config.responseMimeType === 'application/json') {
          try {
            const cleanJson = extractJSON(rawText);
            rawText = cleanJson; // Replace conversational text with pure JSON
          } catch (e) {
            console.warn("Failed to auto-extract JSON in centralized service", e);
            // We still return rawText, hoping consumer can handle it or it's actually valid
          }
        }

        return {
          ...response,
          text: rawText // Now guaranteed to be extracted JSON if mimeType was set
        };

      } catch (error: any) {
        console.warn(`⚠️ [GoogleDirect] Model ${model} failed:`, error.message?.substring(0, 100));

        // 404 = Not found, 429 = Limit, 503 = Overloaded
        const isRetryable =
          error.status === 404 ||
          error.status === 429 ||
          error.status === 503 ||
          error.message?.includes('404') ||
          error.message?.includes('429');

        if (isRetryable) {
          continue;
        }
        // If it's an API Key error (400/403), we might want to skip Google entirely? 
        // For now, let's treat mostly as retryable or failover to OpenRouter
        lastError = error;
      }
    }
  } else {
    console.warn("⚠️ No VITE_GEMINI_API_KEY found. Skipping Google Direct phase.");
  }

  // --- PHASE 2: OPENROUTER ---
  console.log("🔄 All Google Direct models failed. Switching to OpenRouter Fallback...");

  const routerAI = getOpenRouterClient();
  if (!routerAI) {
    console.error("❌ No VITE_OPENROUTER_API_KEY found. Cannot use fallback.");
    throw lastError || new Error("All models failed and no OpenRouter key provided.");
  }

  // Convert Content to OpenAI Format
  let messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

  if (typeof contents === 'string') {
    messages.push({ role: "user", content: contents });
  } else if (Array.isArray(contents)) {
    // Convert standard Gemini "parts" structure to OpenAI
    contents.forEach((msg: any) => {
      if (msg.role && msg.content) {
        messages.push(msg); // Already OpenAI?
      } else if (msg.parts) {
        const content = msg.parts.map((p: any) => {
          if (p.text) return { type: "text", text: p.text };
          if (p.inlineData) {
            return {
              type: "image_url",
              image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }
            };
          }
          return null;
        }).filter(Boolean);
        messages.push({ role: msg.role || "user", content });
      }
    });
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

      // ADAPTER: Convert OpenAI response to look like Google Response for the App
      const text = completion.choices[0]?.message?.content || "";
      return {
        text: () => text,
        extractedText: text, // Store for JSON extraction
        candidates: [{ content: { parts: [{ text }] } }]
      };

    } catch (error: any) {
      console.warn(`⚠️ [OpenRouter] Model ${model} failed:`, error);
      lastError = error;
      if (error.status === 401) break; // Auth failed
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
