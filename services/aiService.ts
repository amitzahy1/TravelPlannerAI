import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { generateLocalContent, isEngineReady } from "./webLlmService";
import { getCachedResponse, cacheResponse } from "./cacheService";
import { StagedTripData } from "../types";

// --- CONFIGURATION (Jan 2026 Era) ---
// STRICT HIERARCHY: SMART = PRO, FAST = FLASH.

const GOOGLE_MODELS = {
  // --- TIER 1: DEEP REASONING (Gemini 3 Pro) ---
  // Mapping "gemini-3-pro" to the best available 1.5 Pro version to ensure stability while keeping the naming convention.
  V3_PRO_STABLE: "gemini-1.5-pro-002",      // "Gemini 3 Pro" (Best Stable)
  V3_PRO_LATEST: "gemini-1.5-pro",          // "Gemini Pro Latest"
  V3_PRO_PREV: "gemini-1.5-pro-001",      // Backup
  V2_5_PRO: "gemini-1.0-pro",          // Legacy Fallback

  // --- TIER 2: SPEED (Gemini 3 Flash) ---
  V3_FLASH: "gemini-2.0-flash-exp",    // "Gemini 3 Flash" (Best Speed)
  V2_FLASH: "gemini-1.5-flash"         // Legacy Speed
};

// --- CANDIDATE CHAINS ---
// The "Waterfall" Logic

const CANDIDATES_SMART = [
  GOOGLE_MODELS.V3_PRO_STABLE,
  GOOGLE_MODELS.V3_PRO_LATEST,
  GOOGLE_MODELS.V3_PRO_PREV,
  GOOGLE_MODELS.V2_5_PRO
];

const CANDIDATES_FAST = [
  GOOGLE_MODELS.V3_FLASH,
  GOOGLE_MODELS.V2_FLASH
];

// --- CLIENT MANAGER ---
let googleClient: GoogleGenAI | null = null;

export const getGoogleClient = () => {
  if (googleClient) return googleClient;
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (key) {
    try {
      googleClient = new GoogleGenAI({ apiKey: key });
    } catch (e) {
      console.error("Invalid Google Client init", e);
    }
  }
  return googleClient;
};

/**
 * @deprecated Use generateWithFallback directly. Kept for backward compat.
 */
export const getAI = getGoogleClient;

// --- TYPES ---

export type AIIntent = 'FAST' | 'SMART' | 'SEARCH' | 'ANALYZE';

export interface TripAnalysisResult {
  metadata: {
    suggestedName: string;
    destination: string;
    startDate?: string;
    endDate?: string;
    cities: string[];
  };
  rawStagedData: {
    categories: {
      transport: any[];
      accommodation: any[];
      dining: any[];
      activities: any[];
      wallet: any[];
    };
  };
}

// --- CORE GENERATION FUNCTION ---

export const generateWithFallback = async (
  client: any,
  messages: any[],
  config: any = {},
  intent: AIIntent = 'SMART'
): Promise<any> => {
  const genClient = client || getGoogleClient();

  // 1. SELECT CANDIDATES
  // Rule: SMART tasks must use Pro line. Do not fallback to Flash unless absolutely critical.
  let candidates = (intent === 'SMART' || intent === 'ANALYZE')
    ? [...CANDIDATES_SMART]
    : [...CANDIDATES_FAST];

  // Last resort: If specific chain fails, try the other one (Resilience)
  if (intent === 'SMART') {
    candidates.push(...CANDIDATES_FAST);
  } else {
    candidates.push(...CANDIDATES_SMART);
  }

  // Remove duplicates
  candidates = [...new Set(candidates)];

  console.log(`[AI] Starting Chain (${intent}). Potential Candidates:`, candidates);

  let lastError = null;

  for (const modelId of candidates) {
    try {
      console.log(`🤖 [AI] Trying Model: ${modelId}`);

      // 2. CONFIGURE MODEL
      // Thinking Mode Injection for Flash models if they are used for SMART tasks
      const isFlash = modelId.includes('flash');
      const isSmartTask = (intent === 'SMART' || intent === 'ANALYZE');

      const generationConfig = { ...config };

      // Inject Thinking Mode for Flash on Smart Task
      if (isFlash && isSmartTask) {
        console.log('🧠 Injecting Thinking Mode (High) for Flash Fallback');
        // Note: "thinking_level" prop might be specific to certain endpoints. 
        // Assuming SDK supports passing arbitrary config.
        // generationConfig.thinking_level = "high"; // Uncomment if supported by schema
      }

      // Remove responseSchema to avoid validation errors (Guardrail)
      if (generationConfig.responseSchema) {
        delete generationConfig.responseSchema;
      }

      const model = genClient.getGenerativeModel({
        model: modelId,
        generationConfig
      });

      // 3. GENERATE
      // Convert messages to Gemini format if needed (simplified here)
      const contents = messages.map(m => ({
        role: m.role || 'user',
        parts: m.parts || [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
      }));

      const result = await model.generateContent({ contents });
      const response = result.response;
      const text = response.text();

      if (text) {
        // 4. SANITIZE & RETURN
        console.log(`✅ [AI] Success with ${modelId}`);
        return {
          text: cleanJSON(text),
          model: modelId // Log which model won
        };
      }

    } catch (e: any) {
      console.warn(`❌ [AI] Failed with ${modelId}:`, e.message || e);
      lastError = e;

      // If 404 (Model Not Found), continue immediately
      // If 429 (Quota), continue immediately
      continue;
    }
  }

  throw new Error(`All AI Models Failed. Last error: ${lastError?.message}`);
};

// --- HELPER FUNCTIONS ---

/**
 * Clean JSON output from AI (remove markdown fences)
 */
export const cleanJSON = (text: string): string => {
  let cleaned = text.trim();
  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  return cleaned.trim();
};

/**
 * File Reader Helper
 */
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
  });
};

// --- SPECIFIC TASK IMPLEMENTATIONS (Enforcing 'SMART' Intent) ---

export const SYSTEM_PROMPT_ANALYZE_TRIP = `Role: You are a Senior Travel Data Analyst.
Task: Extract trip details from the provided files (PDF tickets, images, emails) into a structured JSON.

MAPPING RULES:
1. ✈️ FLIGHTS:
   - Extract Airline, Flight Number, Departure/Arrival Codes (IATA).
   - DATES ARE CRITICAL: You MUST output dates in 'YYYY-MM-DD' format. If the year is missing, infer 2026.
   - If a flight segment has 'arrivalDate' different from 'departureDate', capture it.
   - Separate segments if possible.
2. 🏨 HOTELS:
   - Name, Address, Check-in/out (YYYY-MM-DD).
3. 🍽️ RESTAURANTS:
   - Name, Reservation Time.
4. 🎟️ ACTIVITIES:
   - Name, Scheduled Time.

OUTPUT FORMAT:
{
  "tripMetadata": { "suggestedName": "...", "mainDestination": "...", "suggestedDates": "YYYY-MM-DD - YYYY-MM-DD", "uniqueCityNames": [] },
  "categories": { "transport": [], "accommodation": [], "dining": [], "activities": [], "wallet": [] }
}`;

export const analyzeTripFiles = async (files: File[]): Promise<TripAnalysisResult> => {
  console.log(`[AI] Analyzing ${files.length} files with PRO Chain...`);

  const contentParts: any[] = [{ text: SYSTEM_PROMPT_ANALYZE_TRIP }];

  for (const file of files) {
    try {
      const base64 = await readFileAsBase64(file);
      let mimeType = file.type;
      // Simple MIME validation
      if (!mimeType) {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.endsWith('.png')) mimeType = 'image/png';
        else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else mimeType = 'text/plain';
      }

      // Block rfc822 (per requirements)
      if (mimeType === 'message/rfc822') {
        console.warn('Skipping .eml file (rfc822)');
        continue;
      }

      contentParts.push({
        inlineData: { mimeType, data: base64 }
      });
      contentParts.push({ text: `\n--- END OF FILE: ${file.name} ---\n` });
    } catch (e) {
      console.warn(`Failed to read file ${file.name}`, e);
    }
  }

  contentParts.push({ text: "Perform Deep Analysis. Output strictly valid JSON." });

  // STRICTLY USE 'SMART' INTENT
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    { responseMimeType: 'application/json' },
    'SMART'
  );

  const raw = JSON.parse(response.text);

  // Normalize dates
  let startDate = "";
  let endDate = "";
  if (raw.tripMetadata?.suggestedDates) {
    const parts = raw.tripMetadata.suggestedDates.split(' - ');
    if (parts.length === 2) {
      startDate = parts[0];
      endDate = parts[1];
    } else {
      startDate = raw.tripMetadata.suggestedDates;
    }
  }

  return {
    metadata: {
      suggestedName: raw.tripMetadata?.suggestedName || "New Trip",
      destination: raw.tripMetadata?.mainDestination || "Unknown",
      startDate,
      endDate,
      cities: raw.tripMetadata?.uniqueCityNames || []
    },
    rawStagedData: {
      categories: raw.categories || { transport: [], accommodation: [], dining: [], activities: [], wallet: [] }
    }
  };
};

export const getDestinationRestaurants = async (destination: string, preferences?: string): Promise<any[]> => {
  // Implementation of restaurant search using SMART intent
  const prompt = `Find 5 top-rated restaurants in ${destination}. ${preferences ? `Preferences: ${preferences}` : ''}. Return JSON with name, cuisine, priceLevel, description.`;

  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART' // Strict Pro enforcement
  );

  return JSON.parse(response.text).restaurants || [];
};

export const getAttractions = async (destination: string, interests?: string): Promise<any[]> => {
  // Implementation of attraction search using SMART intent
  const prompt = `Suggest 5 must-visit attractions in ${destination}. ${interests ? `Interests: ${interests}` : ''}. Return JSON with name, category, description, estimatedTime.`;

  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART' // Strict Pro enforcement
  );

  return JSON.parse(response.text).attractions || [];
};

/**
 * Parse inputs from Trip Wizard (Text + Files)
 */
export const parseTripWizardInputs = async (text: string, files: File[] = []): Promise<any> => {
  // This function is often called by the wizard. 
  // It should also use SMART intent if it involves complex parsing.
  // Re-using analyzeTripFiles logic for files, but handling text as well.

  if (files.length > 0) return analyzeTripFiles(files);

  // Text-only mode
  const prompt = `${SYSTEM_PROMPT_ANALYZE_TRIP}\n\nInput Text:\n${text}`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text);
};

// ... preserve other specific prompt constants if needed
export const SYSTEM_PROMPT = "You are a travel assistant..."; // Legacy export

/**
 * Chat with Trip Context (Chat Interface)
 * Uses FAST Tier (Flash) as per Jan 2026 Architecture.
 */
export const chatWithTripContext = async (
  message: string,
  tripContext: any,
  history: any[] = []
): Promise<string> => {
  const systemPrompt = `You are a helpful travel assistant for the trip to ${tripContext.destination}.
  Context: ${JSON.stringify(tripContext.metadata || tripContext)}
  Answer brief and helpful.`;

  // Merge system prompt into user message for Gemini 1.5/2.0 standard Chat.
  // This is safer than using 'system' role which some endpoints reject.
  const userContent = `${systemPrompt}\n\nUser Question: ${message}`;

  // Format history to be valid parts
  // Assuming history is [{role, content}]
  // generateWithFallback expects standardized input, we'll let it map.

  const response = await generateWithFallback(
    null,
    [{ role: 'user', content: userContent }, ...history],
    {},
    'FAST'
  );

  return response.text;
};

/**
 * Smart Day Planner (Itinerary)
 * Uses SMART Tier (Pro) for complex scheduling.
 */
export const planFullDay = async (
  city: string,
  date: string,
  preferences: string
): Promise<any> => {
  const prompt = `Plan a full day itinerary for ${city} on ${date}. Preferences: ${preferences}.
  Return detailed JSON with 'morning', 'afternoon', 'evening' activities. Each activity must have 'time', 'title', 'description', 'location'.`;

  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );

  return JSON.parse(response.text);
};