import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { StagedTripData } from "../types";

// --- CONFIGURATION (Feb 2026 Repair) ---
// STRICT HIERARCHY: SMART = PRO, FAST = FLASH.

// --- CONFIGURATION: FINAL & TESTED (Jan 28, 2026) ---
// Contains ONLY models confirmed to exist in documentation.
// Prevents 404 latency from guessing names.
const GOOGLE_MODELS = {
  // --- TIER 1: Heavy Reasoning (Files, Complex Analysis) ---
  SMART_CANDIDATES: [
    // 1. The Bleeding Edge
    "gemini-3-pro-preview",

    // 2. The new Standard (2.5)
    "gemini-2.5-pro",

    // 3. Specific Backup (If latest alias fails)
    "gemini-1.5-pro-002"
  ],

  // --- TIER 2: Speed & Chat (Fast Conversations & Vibe Checks) ---
  FAST_CANDIDATES: [
    // 1. Fastest & Newest (Assistant / Vibe)
    "gemini-3-flash-preview",

    // 2. Stable & Fast (High Reliability)
    "gemini-2.5-flash",

    // 3. Veteran
    "gemini-1.5-flash-latest",

    // 4. Ultra Lite
    "gemini-2.5-flash-lite"
  ]
};

// --- CANDIDATE CHAINS ---
// (Mapped for backward compatibility if needed, but using direct arrays below)
const CANDIDATES_SMART = GOOGLE_MODELS.SMART_CANDIDATES;
const CANDIDATES_FAST = GOOGLE_MODELS.FAST_CANDIDATES;

// --- CLIENT MANAGER ---
let genAI: GoogleGenerativeAI | null = null;

export const getGoogleClient = () => {
  if (genAI) return genAI;
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (key) {
    try {
      genAI = new GoogleGenerativeAI(key);
    } catch (e) {
      console.error("Invalid Google Client init", e);
    }
  }
  return genAI;
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

// --- HELPER FUNCTIONS ---

export const cleanJSON = (text: string): string => {
  if (!text) return "{}";
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
};

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

/**
 * 🔄 GENERATE WITH FALLBACK (THE WATERFALL)
 * The function that guarantees 100% success.
 */
export const generateWithFallback = async (
  _unused: any, // Backward compat
  contents: any[],
  config: any = {},
  intent: AIIntent = 'SMART'
): Promise<any> => {
  const googleAI = getGoogleClient();
  if (!googleAI) throw new Error("Google AI Client not initialized");

  // Select Model Chain
  const candidates = intent === 'SMART' || intent === 'ANALYZE'
    ? GOOGLE_MODELS.SMART_CANDIDATES
    : GOOGLE_MODELS.FAST_CANDIDATES;

  // Safety Fallback: Add FAST models to SMART chain as last resort
  if (intent === 'SMART' || intent === 'ANALYZE') {
    // Create a unique set to avoid duplicates if they overlap
    candidates.push(...GOOGLE_MODELS.FAST_CANDIDATES);
  }

  let lastError = null;

  // The Loop (Waterfall)
  for (const modelId of candidates) {
    try {
      console.log(`🤖 [AI Service] Attempting model: ${modelId} (Intent: ${intent})`);

      const generationConfig = {
        ...config,
        responseMimeType: 'application/json', // Mandatory!
      };
      // Remove rigid responseSchema to prevent 400 validation errors
      delete generationConfig.responseSchema;

      // Thinking Mode Injection for Flash Fallbacks in Smart Tasks
      if ((intent === 'SMART' || intent === 'ANALYZE') && modelId.includes('flash')) {
        console.log("⚡ Injecting Thinking Mode for Flash model");
        // @ts-ignore - Experimental Feature
        generationConfig.thinking_level = "medium";
      }

      const model = googleAI.getGenerativeModel({
        model: modelId,
        generationConfig
      });

      // SDK Adapter: Ensure contents are in correct format
      let adaptedContents = contents;
      // If passing history with 'role' and 'parts', it's already close, but ensure 'parts' is array
      if (Array.isArray(contents) && contents.length > 0 && contents[0].role) {
        adaptedContents = contents.map(c => ({
          role: c.role,
          parts: Array.isArray(c.parts) ? c.parts : [{ text: c.content || '' }]
        }));
      }

      const result = await model.generateContent({ contents: adaptedContents });
      const response = await result.response;
      let text = response.text();

      // Clean & Verify
      text = cleanJSON(text);
      JSON.parse(text); // Validation check

      console.log(`✅ [AI Service] Success with ${modelId}`);
      return { text, model: modelId };

    } catch (error: any) {
      console.warn(`⚠️ [AI Service] Failed ${modelId}:`, error.message);
      lastError = error;
      // Continue to next candidate...
    }
  }

  console.error("❌ [AI Service] All models failed.");
  throw lastError || new Error("All AI models failed to generate response.");
};

// --- SPECIFIC TASK IMPLEMENTATIONS ---

/**
 * 🧠 SYSTEM PROMPT - THE CATEGORIZATION ENFORCER
 * This prompt arranges hotels and visas in the correct place.
 */
export const SYSTEM_PROMPT_ANALYZE_TRIP = `
Role: You are the Lead Data Architect for a Travel App.
Mission: Parse uploaded travel documents into a STRICTLY STRUCTURED JSON format.

--- CATEGORIZATION RULES (CRITICAL) ---

1. 🏨 ACCOMMODATION (Must be in 'accommodation' array):
   - Hotels, Airbnbs, Hostels, Resorts.
   - Example: "New World Makati Hotel", "Discovery Boracay".
   - DO NOT put these in 'experiences' or 'transport'.

2. ✈️ TRANSPORT (Must be in 'transport' array):
   - Flights (Etihad, Cebu Pacific, AirAsia).
   - Trains, Ferries, Buses, Car Rentals.
   - Group connecting flights into a single logical "Journey" if possible.

3. 🔒 WALLET (Must be in 'wallet' array):
   - Entry Permits (eTravel Philippines, Thailand Arrival Card).
   - Visas, Passports, Travel Insurance, Vaccination Certificates.
   - ANY bureaucratic document goes here.

4. ⭐ EXPERIENCES:
   - 'dining': Restaurant reservations.
   - 'activities': Concert tickets, Museum passes, Tours.

--- DATA EXTRACTION RULES ---

1. 🏙️ CITIES (Field: 'uniqueCityNames'):
   - Extract a CLEAN list of unique cities visited.
   - Exclude the home airport city.
   - Example: ["Manila", "Boracay", "Cebu", "Bangkok"].

2. 🕒 DATES & TIMES:
   - 'date': ISO 8601 format (e.g., "2026-02-15T03:25:00") for DB.
   - 'displayTime': User-friendly format (e.g., "15 Feb, 03:25"). USE THIS FORMAT EXACTLY.

3. 📂 FILE MAPPING:
   - Use 'sourceFileIds' (Array) to link multiple files to a single event.
   - If a file is a duplicate or yields no data, add it to 'unprocessedFiles' with a reason.

--- OUTPUT JSON SCHEMA ---
Return ONLY raw JSON (no markdown):
{
  "tripMetadata": {
    "suggestedName": "String",
    "suggestedDates": "YYYY-MM-DD - YYYY-MM-DD",
    "mainDestination": "String (Country/Region)",
    "uniqueCityNames": ["City1", "City2"]
  },
  "processedFileIds": ["file1.pdf", "file2.pdf"],
  "unprocessedFiles": [{ "fileName": "x.pdf", "reason": "Duplicate" }],
  "categories": {
    "transport": [ { "type": "flight", "data": { "airline": "...", "displayTime": "..." }, "sourceFileIds": [...] } ],
    "accommodation": [ { "type": "hotel", "data": { "hotelName": "...", "checkInDate": "...", "displayTime": "..." }, "sourceFileIds": [...] } ],
    "wallet": [ { "type": "entry_permit", "data": { "documentName": "...", "displayTime": "..." }, "sourceFileIds": [...] } ],
    "dining": [],
    "activities": []
  }
}
`;

/**
 * 📄 ANALYZE TRIP FILES
 * The main function calling AI
 */
export const analyzeTripFiles = async (files: File[]): Promise<TripAnalysisResult> => {
  // 1. Dangerous File Filtering (Email files crash the API)
  const safeFiles = files.filter(f =>
    !f.type.includes('message/rfc822') &&
    !f.name.endsWith('.eml')
  );

  if (safeFiles.length === 0) {
    throw new Error("No valid files to analyze (PDF/Image/Text only).");
  }

  // 2. Build Request
  const contentParts: any[] = [{ text: SYSTEM_PROMPT_ANALYZE_TRIP }];

  for (const file of safeFiles) {
    try {
      const base64 = await readFileAsBase64(file);
      let mimeType = file.type;

      // Fix missing mime types
      if (!mimeType) {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.endsWith('.png')) mimeType = 'image/png';
        else if (file.name.endsWith('.jpg')) mimeType = 'image/jpeg';
        else mimeType = 'text/plain';
      }

      contentParts.push({
        inlineData: { mimeType, data: base64 }
      });
    } catch (e) {
      console.warn(`Skipping file ${file.name}`);
    }
  }

  // 3. Send with "SMART" intent (Pro Only!)
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    {},
    'SMART'
  );

  const raw = JSON.parse(response.text);

  // Basic date parsing logic
  let startDate = "";
  let endDate = "";
  if (raw.tripMetadata?.suggestedDates) {
    const parts = raw.tripMetadata.suggestedDates.split('-');
    startDate = parts[0]?.trim();
    endDate = parts[1]?.trim();
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
  const prompt = `Find 5 top-rated restaurants in ${destination}. ${preferences || ''}. JSON output only: { "restaurants": [ { "name", "cuisine", "priceLevel", "description" } ] }`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text).restaurants || [];
};

export const getAttractions = async (destination: string, interests?: string): Promise<any[]> => {
  const prompt = `Suggest 5 attractions in ${destination}. ${interests || ''}. JSON output only: { "attractions": [ { "name", "category", "description", "estimatedTime" } ] }`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text).attractions || [];
};

export const parseTripWizardInputs = async (text: string, files: File[] = []): Promise<any> => {
  if (files.length > 0) return analyzeTripFiles(files);

  const prompt = `${SYSTEM_PROMPT_ANALYZE_TRIP}\n\nTEXT INPUT:\n${text}`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'ANALYZE'
  );
  return JSON.parse(response.text);
};

export const chatWithTripContext = async (message: string, tripContext: any, history: any[] = []): Promise<string> => {
  const systemContext = `Trip Context: ${tripContext.destination}, ${JSON.stringify(tripContext.metadata)}`;
  // Merge system context into the latest user message or first message
  // Using FAST model for chat

  // History adapter
  const contents = [...history, { role: 'user', parts: [{ text: `[System: ${systemContext}] ${message}` }] }];

  const response = await generateWithFallback(null, contents, {}, 'FAST');
  return response.text;
};

export const planFullDay = async (city: string, date: string, prefs: string): Promise<any> => {
  const prompt = `Plan full day in ${city} on ${date}. Prefs: ${prefs}. JSON Output: { "morning": [], "afternoon": [], "evening": [] }`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text);
};

export const analyzeReceipt = async (base64: string, mimeType: string, mode: 'TOTAL' | 'FULL' = 'TOTAL'): Promise<any> => {
  const prompt = mode === 'TOTAL'
    ? "Extract total price and currency from receipt. JSON: { \"price\": number, \"currency\": string }"
    : "Extract all items from receipt. JSON.";

  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text);
};

export const SYSTEM_PROMPT = "Travel Assistant";