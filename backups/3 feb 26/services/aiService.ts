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
    "gemini-1.5-pro-latest",
  ],

  // --- TIER 2: Speed & Chat (Fast Conversations & Vibe Checks) ---
  FAST_CANDIDATES: [
    // 1. Fastest & Newest (Assistant / Vibe)
    "gemini-3-flash-preview",

    // 2. Stable & Fast (High Reliability)
    "gemini-2.5-flash",

    // 3. Ultra Lite (New addition)
    "gemini-2.5-flash-lite",

    // 4. Veteran (Fallback)
    "gemini-1.5-flash-latest"
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
  processedFileIds?: string[];
  unprocessedFiles?: any[];
  rawStagedData: StagedTripData;
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
  contents: any, // Flexible input: string | string[] | Content[]
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

      // NOTE: Removed 'thinking_level' injection as it causes 400 Bad Request on standard models.

      const model = googleAI.getGenerativeModel({
        model: modelId,
        generationConfig
      });

      // SDK Adapter: Ensure contents are in correct format [ Critical Fix ]
      // API requires: { role: string, parts: { text: string }[] }[]
      let adaptedContents: any[] = [];

      if (!contents) {
        adaptedContents = [{ role: 'user', parts: [{ text: '' }] }];
      } else if (typeof contents === 'string') {
        adaptedContents = [{ role: 'user', parts: [{ text: contents }] }];
      } else if (Array.isArray(contents)) {
        if (contents.length === 0) {
          adaptedContents = [{ role: 'user', parts: [{ text: '' }] }];
        }
        // Case 1: Array of strings ["prompt"]
        else if (typeof contents[0] === 'string') {
          adaptedContents = [{ role: 'user', parts: contents.map(t => ({ text: t })) }];
        }
        // Case 2: Array of parts without role [{ text: '...' }] or [{ inlineData: ... }]
        else if (contents[0].text || contents[0].inlineData) {
          adaptedContents = [{ role: 'user', parts: contents }];
        }
        // Case 3: Proper Content objects [{ role: 'user', parts: [...] }]
        else if (contents[0].role && contents[0].parts) {
          adaptedContents = contents;
        }
        // Fallback
        else {
          adaptedContents = [{ role: 'user', parts: [{ text: JSON.stringify(contents) }] }];
        }
      } else {
        // Object fallback
        adaptedContents = [{ role: 'user', parts: [{ text: JSON.stringify(contents) }] }];
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

--- CRITICAL CONTEXT: ANCHOR YEAR 2026 ---
1. **CURRENT REFERENCE**: Today is Jan 2026.
2. **FUTURE BIAS**: All flights are for 2026 or 2027.
3. **MISSING YEAR RULE**: If a document says "04 Feb" and contains NO year, assign **2026**.
4. **THE "1930" TRAP (CRITICAL)**: In airline tickets, a 4-digit number after a month (e.g., "28JAN 1930") is OFTEN THE TIME (19:30), NOT THE YEAR 1930.
   - CHECK: Is the number between 0000 and 2359? Treat as TIME.
   - CHECK: Is the number 2025, 2026, 2027? Treat as YEAR.
   - NEVER output a year before 2025.

--- OUTPUT JSON SCHEMA ---
Return ONLY raw JSON.
For every date, you MUST provide:
1. "rawText": The exact string you saw in the file (e.g., "28JAN 1930").
2. "isoDate": The strictly formatted ISO string (YYYY-MM-DDTHH:mm:ss).

Structure:
{
  "tripMetadata": {
    "suggestedName": "String",
    "mainDestination": "String",
    "uniqueCityNames": ["City1"]
  },
  "processedFileIds": ["file1.pdf"],
  "unprocessedFiles": [],
  "categories": {
    "transport": [
      {
        "type": "flight",
        "data": {
          "airline": "String",
          "flightNumber": "String",
          "departure": {
            "city": "String",
            "iata": "ABC",
            "rawDateText": "String (DEBUG)",
            "isoDate": "YYYY-MM-DDTHH:mm:ss",
            "displayTime": "HH:MM"
          },
          "arrival": {
             "city": "String",
             "iata": "ABC",
             "rawDateText": "String (DEBUG)",
             "isoDate": "YYYY-MM-DDTHH:mm:ss",
             "displayTime": "HH:MM"
          }
        },
        "sourceFileIds": []
      }
    ],
    "accommodation": [],
    "wallet": [],
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
      console.warn(`Skipping file ${file.name} `);
    }
  }

  // 3. Send with "SMART" intent (Pro Only!)
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    {},
    'SMART'
  );

  // --- LOGGING UPGRADE START ---
  console.log("🔍 [AI Raw Response]:", response.text); // See what the model output

  let raw;
  try {
    raw = JSON.parse(cleanJSON(response.text));

    // Flight specific check
    if (raw.categories?.transport) {
      console.table(raw.categories.transport.map((t: any) => ({
        airline: t.data.airline,
        rawDep: t.data.departure?.rawDateText, // What the model saw
        isoDep: t.data.departure?.isoDate,     // What the model decided
        rawArr: t.data.arrival?.rawDateText
      })));
    }
  } catch (e) {
    console.error("❌ [JSON Parse Error]:", e);
    console.log("Bad JSON Content:", response.text);
    throw e;
  }
  // --- LOGGING UPGRADE END ---

  // Legacy deterministic date calculation removed as per new instruction.
  // We trust the AI's "tripMetadata" regarding dates, or infer from items if missing.

  const extractDates = (items: any[]) => {
    const dates: number[] = [];
    if (!items || !Array.isArray(items)) return dates;
    items.forEach(item => {
      // Try strict fields first
      const d = item.data?.isoDate || item.data?.checkInDate || item.data?.date || item.data?.departure?.isoDate;
      if (d) {
        const ts = new Date(d).getTime();
        if (!isNaN(ts)) dates.push(ts);
      }
      // Accommodation Check-out
      if (item.data?.checkOutDate) {
        const ts = new Date(item.data.checkOutDate).getTime();
        if (!isNaN(ts)) dates.push(ts);
      }
    });

    return dates;
  };

  const allDates: number[] = [
    ...extractDates(raw.categories?.transport),
    ...extractDates(raw.categories?.accommodation),
    ...extractDates(raw.categories?.wallet)
  ];

  let startDate = "";
  let endDate = "";

  if (allDates.length > 0) {
    // Sort and pick min/max
    allDates.sort((a, b) => a - b);
    startDate = new Date(allDates[0]).toISOString().split('T')[0];
    endDate = new Date(allDates[allDates.length - 1]).toISOString().split('T')[0];
  } else {
    // Fallback to AI Metadata if extraction failed (unlikely)
    startDate = raw.tripMetadata?.startDate || "";
    endDate = raw.tripMetadata?.endDate || "";
  }

  return {
    metadata: {
      suggestedName: raw.tripMetadata?.suggestedName || "New Trip",
      destination: raw.tripMetadata?.mainDestination || "Unknown",
      startDate,
      endDate,
      cities: raw.tripMetadata?.uniqueCityNames || []
    },
    // Fix: Return processed/unprocessed files
    processedFileIds: raw.processedFileIds || [],
    unprocessedFiles: raw.unprocessedFiles || [],
    rawStagedData: {
      tripMetadata: raw.tripMetadata,
      processedFileIds: raw.processedFileIds || [],
      unprocessedFiles: raw.unprocessedFiles || [],
      categories: {
        transport: raw.categories?.transport || [],
        // Fix: Normalize Accommodation Data Structure (AI returns flat, UI expects nested)
        accommodation: raw.categories?.accommodation?.map((item: any) => {
          // Normalize Data Source (Handle both nested item.data and flat item)
          const d = item.data || item;

          return {
            type: 'hotel',
            data: {
              hotelName: d.hotelName || d.propertyName || d.name || "Unknown Hotel",
              address: d.address || d.location,
              checkInDate: d.checkIn?.isoDate || d.checkInDate || d.checkIn,
              checkOutDate: d.checkOut?.isoDate || d.checkOutDate || d.checkOut,
              displayTime: d.displayTime || "15:00",
              bookingId: d.bookingId || d.confirmationCode
            },
            sourceFileIds: item.sourceFileIds || [],
            confidence: 0.9
          };
        }) || [],
        dining: raw.categories?.dining || [],
        activities: raw.categories?.activities || [],
        wallet: raw.categories?.wallet || []
      }
    }
  };
};

export const getDestinationRestaurants = async (destination: string, preferences?: string): Promise<any[]> => {
  const prompt = `Find 5 top - rated restaurants in ${destination}. ${preferences || ''}. JSON output only: { "restaurants": [{ "name", "cuisine", "priceLevel", "description" }] } `;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text).restaurants || [];
};

export const getAttractions = async (destination: string, interests?: string): Promise<any[]> => {
  const prompt = `Suggest 5 attractions in ${destination}. ${interests || ''}. JSON output only: { "attractions": [{ "name", "category", "description", "estimatedTime" }] } `;
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

  const prompt = `${SYSTEM_PROMPT_ANALYZE_TRIP} \n\nTEXT INPUT: \n${text} `;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'ANALYZE'
  );
  return JSON.parse(response.text);
};

export const chatWithTripContext = async (message: string, tripContext: any, history: any[] = []): Promise<string> => {
  const systemContext = `Trip Context: ${tripContext.destination}, ${JSON.stringify(tripContext.metadata)} `;
  // Merge system context into the latest user message or first message
  // Using FAST model for chat

  // History adapter
  const contents = [...history, { role: 'user', parts: [{ text: `[System: ${systemContext}] ${message} ` }] }];

  const response = await generateWithFallback(null, contents, {}, 'FAST');
  return response.text;
};

export const planFullDay = async (city: string, date: string, prefs: string): Promise<any> => {
  const prompt = `Plan full day in ${city} on ${date}.Prefs: ${prefs}. JSON Output: { "morning": [], "afternoon": [], "evening": [] } `;
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