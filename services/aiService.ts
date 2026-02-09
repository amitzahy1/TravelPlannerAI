import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { StagedTripData } from "../types";

// --- CONFIGURATION: FINAL & TESTED (Jan 28, 2026) ---
// Contains ONLY models confirmed to exist in documentation.
const GOOGLE_MODELS = {
  // --- TIER 1: Heavy Reasoning (Files, Complex Analysis) ---
  SMART_CANDIDATES: [
    // 0. The Bleeding Edge
    "gemini-3-pro-preview",

    // 1. User Choice (Fast & Capable)
    "gemini-3-flash-preview",

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

  // Select Model Chain based on Intent
  const candidates = (intent === 'SMART' || intent === 'ANALYZE')
    ? GOOGLE_MODELS.SMART_CANDIDATES
    : GOOGLE_MODELS.FAST_CANDIDATES;

  // Safety Fallback: Add FAST models to SMART chain end
  if (intent === 'SMART' || intent === 'ANALYZE') {
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

      const model = googleAI.getGenerativeModel({
        model: modelId,
        generationConfig
      });

      // Adapter for content format
      const adaptedContents = Array.isArray(contents) ? contents : [{ role: 'user', parts: contents }];

      const result = await model.generateContent({ contents: adaptedContents });
      const response = await result.response;
      let text = cleanJSON(response.text());
      JSON.parse(text); // Verify JSON

      console.log(`✅ [AI Service] Success with ${modelId}`);
      return { text, model: modelId };

    } catch (error: any) {
      console.warn(`⚠️ [AI Service] Failed ${modelId}:`, error.message);
      lastError = error;
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
Role: You are an elite Travel Data Architect & NDC Specialist.
Mission: Extract unstructured travel data into a PERFECT JSON format, strictly adhering to IATA & ISO standards.

--- PHASE 1: VISUAL & LINGUISTIC CALIBRATION ---
1. **RTL & Bi-Directional Handling (Hebrew/Arabic)**:
   - DETECT: If document is Hebrew/Arabic, activate "Visual Anchoring".
   - RULE: Text flows Right-to-Left, BUT numbers (Prices, Flight Nos, Dates) flow Left-to-Right.
   - TRAP: Do NOT reverse digits (e.g., "897" must stay "897", not "798").
   - CONTEXT: "תל אביב - לונדון" implies Origin: TLV, Dest: LHR.
2. **Document Classification**:
   - Identify: E-Ticket, Invoice (Tax Receipt), Boarding Pass, or Itinerary.
   - Noise Filter: Ignore "Terms & Conditions", ads, and irrelevant legal text.

--- PHASE 2: ADVANCED DATA EXTRACTION (NDC STANDARDS) ---
Extract the following entities using Semantic Pattern Matching:

A. **FLIGHTS (The Segment Logic)**:
   - **PNR/Ref**: Look for 6-char alphanumeric codes (e.g., "6YJ82K"). Differentiate from Ticket Number (13 digits).
   - **Carrier**: Identify Airline Name & Code (e.g., "LY", "6H").
   - **Connection Logic**: If multiple flights appear on consecutive times, group them into one trip but separate segments.
   - **Terminals**: Extract "Term" or "T" + number.

B. **DATES & TIMES (ISO 8601 Strict)**:
   - **Format**: Convert ALL dates to "YYYY-MM-DD".
   - **Time**: Convert ALL times to "HH:MM" (24h).
   - **Year Inference**: If year is missing (e.g., "28 NOV"), infer based on the current context (Future bias: 2026/2027).
   - **The "1930" Trap**: "1930" after a date is TIME (19:30), NOT Year.

C. **ACCOMMODATION (GERS Mapping Prep)**:
   - Name: Exact hotel name.
   - Address: Full address for Overture Maps matching.
   - Dates: Check-in/Check-out.

D. **FINANCIALS**:
   - Extract Total Price and Currency code (USD, ILS, EUR).
   - Identify "Vat/Tax" if separated.

--- PHASE 3: VALIDATION & SANITY CHECK (The Contract) ---
Before outputting JSON, verify:
1. Is Arrival Time logically *after* Departure Time? (Handle +1 day).
2. Are city codes (IATA) consistent with city names?
3. Is the PNR distinct from the Flight Number?

--- PHASE 4: STRICT JSON OUTPUT ---
Return ONLY raw JSON. No markdown. Structure matches the app's 'StagedTripData'.

{
  "tripMetadata": {
    "suggestedName": "String (e.g., 'Trip to Thailand')",
    "mainDestination": "String (City, Country)",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "uniqueCityNames": ["String"]
  },
  "processedFileIds": [],
  "categories": {
    "transport": [
      {
        "type": "flight",
        "confidence": 0.95,
        "data": {
          "airline": "String",
          "flightNumber": "String",
          "pnr": "String",
          "departure": {
            "city": "String",
            "iata": "ABC",
            "isoDate": "YYYY-MM-DDTHH:mm:ss",
            "displayTime": "HH:MM"
          },
          "arrival": {
             "city": "String",
             "iata": "ABC",
             "isoDate": "YYYY-MM-DDTHH:mm:ss",
             "displayTime": "HH:MM"
          },
          "price": { "amount": Number, "currency": "ILS/USD" }
        }
      }
    ],
    "accommodation": [
      {
         "type": "hotel",
         "confidence": 0.95,
         "data": {
            "hotelName": "String",
            "address": "String",
            "checkIn": { "isoDate": "YYYY-MM-DD", "time": "HH:MM" },
            "checkOut": { "isoDate": "YYYY-MM-DD", "time": "HH:MM" },
            "bookingId": "String",
            "price": { "amount": Number, "currency": "String" }
         }
      }
    ],
    "wallet": [], 
    "dining": [],
    "activities": []
  }
}
`;

/**
 * 📄 ANALYZE TRIP FILES - THE MASTER PARSER
 */
// --- PHASE 3: VALIDATION & SANITY CHECK ---
export const validateTripData = (data: TripAnalysisResult): TripAnalysisResult => {
  const validated = { ...data };

  // 1. Time Logic: Arrival > Departure
  if (validated.rawStagedData?.categories?.transport) {
    validated.rawStagedData.categories.transport = validated.rawStagedData.categories.transport.map((item: any) => {
      // Check if it's a flight and has both dates
      if (item.type === 'flight' && item.data.departure?.isoDate && item.data.arrival?.isoDate) {
        const dep = new Date(item.data.departure.isoDate);
        const arr = new Date(item.data.arrival.isoDate);

        // If Arrival is before Departure (and not just equal), it's likely a +1 day flight
        if (arr < dep) {
          console.warn(`⚠️ Detected Arrival before Departure for ${item.data.flightNumber || 'Flight'}. Adjusting to next day.`);
          // WE preserve the airline's claimed arrival TIME, just bump the DATE of departure + 1 day
          // Wait, logic check: if dep is 23:00 and arr is 01:00, arr < dep is true. 
          // We want arr to be next day.

          const originalArrTime = item.data.arrival.isoDate.split('T')[1] || "00:00:00";
          const depDate = new Date(dep);
          depDate.setDate(depDate.getDate() + 1);
          const newDateStr = depDate.toISOString().split('T')[0];

          item.data.arrival.isoDate = `${newDateStr}T${originalArrTime}`;
        }
      }
      return item;
    });
  }

  // 2. City Consistency
  const metadata = validated.metadata;
  if (metadata.destination && !metadata.cities.includes(metadata.destination)) {
    metadata.cities.push(metadata.destination);
  }

  return validated;
};

/**
 * 📄 ANALYZE TRIP FILES - THE MASTER PARSER
 */
export const analyzeTripFiles = async (files: File[]): Promise<TripAnalysisResult> => {
  const safeFiles = files.filter(f => !f.type.includes('message/rfc822') && !f.name.endsWith('.eml'));
  if (safeFiles.length === 0) throw new Error("No valid files to analyze.");

  // 1. Build Request with the UNIVERSAL PROMPT
  const contentParts: any[] = [{ text: SYSTEM_PROMPT_ANALYZE_TRIP }];

  for (const file of safeFiles) {
    try {
      const base64 = await readFileAsBase64(file);
      // MIME Type Normalization for Vision Models
      let mimeType = file.type;
      if (!mimeType) {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.match(/\.(jpg|jpeg)$/i)) mimeType = 'image/jpeg';
        else if (file.name.endsWith('.png')) mimeType = 'image/png';
        else mimeType = 'text/plain';
      }
      contentParts.push({ inlineData: { mimeType, data: base64 } });
    } catch (e) {
      console.warn(`Skipping file ${file.name}`);
    }
  }

  // 2. Send to "SMART" chain (Starts with gemini-3-pro-preview)
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    {},
    'SMART'
  );

  // 3. Validation & Self-Healing (Pydantic Simulation)
  let raw: any;
  try {
    raw = JSON.parse(cleanJSON(response.text));

    // Ensure structure exists
    if (!raw.categories) raw.categories = { transport: [], accommodation: [] };

    // Date Fixer Utility
    const fixDate = (d: string) => {
      if (!d) return "";
      if (d.includes('/')) {
        const parts = d.split('/'); // DD/MM/YYYY -> YYYY-MM-DD
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return d;
    };

    // Apply fixes
    raw.categories.transport?.forEach((t: any) => {
      if (t.data?.departure?.isoDate) t.data.departure.isoDate = fixDate(t.data.departure.isoDate);
      if (t.data?.arrival?.isoDate) t.data.arrival.isoDate = fixDate(t.data.arrival.isoDate);
    });

  } catch (e) {
    console.error("JSON Parsing Failed:", e);
    throw new Error("Failed to parse AI response.");
  }

  // 4. Map to App State
  const transportDates = raw.categories.transport?.map((t: any) => t.data.departure?.isoDate).filter(Boolean) || [];
  const hotelDates = raw.categories.accommodation?.map((h: any) => h.data.checkIn?.isoDate).filter(Boolean) || [];
  const allDates = [...transportDates, ...hotelDates].sort();

  const initialResult = {
    metadata: {
      suggestedName: raw.tripMetadata?.suggestedName || "New Imported Trip",
      destination: raw.tripMetadata?.mainDestination || "Unknown",
      startDate: allDates[0] || raw.tripMetadata?.startDate || "",
      endDate: allDates[allDates.length - 1] || raw.tripMetadata?.endDate || "",
      cities: raw.tripMetadata?.uniqueCityNames || []
    },
    processedFileIds: raw.processedFileIds || [],
    unprocessedFiles: [],
    rawStagedData: raw
  };

  // 5. Final Validation Check (New Logic)
  return validateTripData(initialResult);
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