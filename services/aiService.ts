import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { generateLocalContent, isEngineReady } from "./webLlmService";
import { getCachedResponse, cacheResponse } from "./cacheService";
import { StagedTripData } from "../types";

/**
 * System prompt for Research & Recommendations (SMART tasks)
 * Includes strict business verification and professional sourcing
 */
export const SYSTEM_PROMPT_RESEARCH = `Role: You are a Senior AI Architect & Product Lead at Google Travel.

Mission: Perform a holistic upgrade of the AI engine to ensure Real-Time Accuracy, Deep Local Knowledge, and Visual Precision for BOTH Restaurants AND Attractions.

--- DUAL-BRAIN LOGIC ---

SECTION A: THE "MICHELIN SCOUT" (Restaurants)
- Rule: No global chains (Starbucks/KFC/McDonalds) unless explicitly asked.
- Priority: "Local Legends", "Hole-in-the-wall", "Chef-driven".
- Data Requirements:
  1. must_try_dish: BE SPECIFIC (e.g. "Truffle Carbonara in a cheese wheel").
  2. vibe: "Romantic", "Loud & Energetic", "Business Casual", "Hidden Gem".
  3. price_level: $, $$, $$$, $$$$
  4. match_reason: Explain WHY it fits the user (e.g. "Perfect for your anniversary because...").

SECTION B: THE "LOCAL EXPLORER" (Attractions)
- Rule: Balance "Tourist Musts" (Eiffel Tower) with "Hidden Gems" (Local markets, secret gardens).
- Data Requirements:
  1. best_time_to_visit: e.g. "Sunset for the view", "Early morning to avoid crowds".
  2. activity_type: "Adventure", "Culture", "Relaxation", "Shopping".
  3. duration: "1-2 hours", "Half day".
  4. visual_tag: Generate a keyword for the image mapper (e.g. "temple_gold", "beach_sunset", "modern_mall", "market_food").

--- CRITICAL VERIFICATION (REAL-TIME GROUNDING) ---
1. MUST perform web search to verify status.
2. Filter out "Permanently Closed".
3. Validate "reservationRequired" (true/false) based on popularity.

--- SCHEMA GUARDIAN ---
1. Dates: ISO 8601 ONLY.
2. Arrays: Must exist even if empty.
3. Descriptions: HEBREW (max 15 words). Names: English.
4. Prices: Numeric.

OUTPUT: Return ONLY valid JSON.`;

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

CRITICAL SCHEMA RULES (Schema Guardian):
1. Use ONLY ISO 8601 for dates (YYYY-MM-DD). Never use DD/MM or slashes.
2. Ensure all arrays exist, even if empty (restaurants, hotels, itinerary).
3. 'price' fields should be numbers (estimatedCost, budgetLimit) unless explicitly marked for display.
4. Descriptions must be in HEBREW (max 15 words). Names must be in English.

CRITICAL OUTPUT RULES:
1. You MUST return ONLY valid JSON
2. Do NOT format with markdown (no \`\`\`json blocks)
3. Do NOT include conversational text
4. Validate your JSON before sending`;

/**
 * System prompt for Search Agent (User Intent)
 * Optimized for Obedience, Neutrality, and Semantic Relevance.
 * "The Google PM Standard" - finds what asked, no snobbery.
 */
export const SYSTEM_PROMPT_SEARCH = `Role: You are an intelligent Search Engine Agent for a Travel App.

Mission: Retrieve accurate, relevant results matching the user's specific query within the Destination.

DIRECTIVES:
1. OBEDIENCE: If the user searches for "McDonalds", return McDonalds. Do NOT filter out chains, fast food, or "low rated" places unless explicitly asked.
2. NEUTRALITY: You are a search engine, not a food critic. Your job is to find what was asked, not what you think is "good".
3. SEMANTIC MATCHING:
   - Input: "Italian" -> Find Pizza, Pasta, Trattorias.
   - Input: "Romantic" -> Find places with good ambiance, views, quiet atmosphere.
   - Input: "Cheap eats" -> Find street food, fast food, budget friendly.
4. FALLBACK: If an exact match isn't found, return the closest available alternative.

CRITICAL SCHEMA RULES:
1. Dates: ISO 8601 ONLY.
2. Descriptions: HEBREW (max 15 words). Names: English.
3. Prices: Numeric.

OUTPUT: Return ONLY valid JSON.`;

/**
 * Legacy system prompt for backward compatibility
 */
export const SYSTEM_PROMPT = SYSTEM_PROMPT_RESEARCH;

/**
 * System Prompt for Deep Understanding (Project Genesis)
 */
export const SYSTEM_PROMPT_ANALYZE_TRIP = `Role: You are the Chief Architect & Product Lead at Google Travel. Mission: Build the "Omni-Import Engine". This system accepts ANY travel-related file, understands its purpose, and routes it to the correct "bucket" in the application.

Core Directives:

1. **Trip Metadata Extraction (CRITICAL):**
   - Analyze the uploaded files to determine the **Main Destination**, **Trip Name**, and **Start/End Dates**.
   - **Trip Name Strategy:** DO NOT Use the filename! Create a short, exciting name based on the destination and vibe (e.g., "Parisian Getaway", "Tokyo Adventure").
   - **Date Logic:** Look for Flight Tickets or Hotel Confirmations to define the Trip Date range. Do NOT use Passport expiry dates or Credit Card expiry dates for the trip dates.
   - If unsure about exact dates, make a best guess from the logistics found, or return null.

2. **Total Classification:**
   - Categorize every file into: Logistics (Flights/Hotels), Wallet (Passports/Stickts), or Experiences (Dining/Activities).

3. **FLIGHT EXTRACTION RULES (STRICT - FLAT LIST ONLY):**
   - **NO CONSOLIDATION:** Do NOT create a single "flight_itinerary" item with a "segments" list.
   - **INDIVIDUAL ITEMS:** Every single flight leg (e.g., TLV->AUH, AUH->BKK) MUST be its own separate object in the \`logistics\` array with \`type: "flight"\`.
   - **DATA SOURCE:** Each flight item MUST use the \`fileId\` of the ACTUAL file where that leg's details were found. Do NOT reference only the first file if info exists in others.
   - **Full Chronology:** Capture all segments: Outbound, Inbound, and Internal flights.

4. **JSON Output Specification (Strict):** Return a StagedTripData object.
   {
      "tripMetadata": {
        "suggestedName": "Tokyo Adventure",
        "suggestedDates": "2026-05-01 - 2026-05-10",
        "mainDestination": "Tokyo, Japan"
      },
      "categories": {
        "logistics": [
          {
            "type": "flight",
            "fileId": "flight_ticket_1.pdf",
            "confidence": 0.9,
            "data": { 
               "airline": "JAL", "flightNumber": "JL002", 
               "departureTime": "2026-05-01T10:00:00", 
               "from": "TLV", "to": "NRT" 
            }
          }
        ],
        "wallet": [],
        "experiences": []
      }
   }

OUTPUT: Return ONLY valid JSON.
`;

// --- CONFIGURATION ---

// Jan 2026 Ultimate "Unbreakable" Architecture
// TIER 1: INTELLIGENCE (Gemini 3)
// TIER 2: STABILITY (Gemini 2.5)
// TIER 3: SPEED (Gemini 3 Flash)
// TIER 4: SAFETY NET (Gemini 2.5/2.0)
const GOOGLE_MODELS = {
  // TIER 1: Intelligence
  V3_PRO_STABLE: "gemini-3-pro",
  V3_PRO_LATEST: "gemini-pro-latest",
  V3_PRO_PREV: "gemini-3-pro-preview",

  // TIER 2: Stability
  V2_5_PRO: "gemini-2.5-pro",

  // TIER 3: Speed
  V3_FLASH_STABLE: "gemini-3-flash",
  V3_FLASH_LATEST: "gemini-flash-latest",

  // TIER 4: Safety Net
  V2_5_FLASH: "gemini-2.5-flash",
  V2_FLASH_LEGACY: "gemini-2.0-flash"
};

// Fallback Candidate Chains (Updated Jan 2026 - Removing invalid v1beta 404 models)
const CANDIDATES_SMART = [
  GOOGLE_MODELS.V3_PRO_LATEST, // Stable Alias
  GOOGLE_MODELS.V2_5_PRO,
  GOOGLE_MODELS.V3_PRO_PREV
];

const CANDIDATES_FAST = [
  GOOGLE_MODELS.V3_FLASH_STABLE,
  GOOGLE_MODELS.V3_FLASH_LATEST,
  GOOGLE_MODELS.V2_5_FLASH,
  GOOGLE_MODELS.V2_FLASH_LEGACY
];

export const AI_MODEL = GOOGLE_MODELS.V3_PRO_LATEST; // For display purposes

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

// Enhanced JSON Extraction with Truncation Detection
const extractJSON = (text: string): string => {
  if (!text) return "{}";

  // Strip markdown code blocks early
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleanInput = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  // Find boundaries
  const firstOpenBrace = cleanInput.indexOf('{');
  const firstOpenBracket = cleanInput.indexOf('[');

  let startIndex = -1;
  let isArray = false;

  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
    startIndex = firstOpenBrace;
  } else if (firstOpenBracket !== -1) {
    startIndex = firstOpenBracket;
    isArray = true;
  }

  if (startIndex === -1) return "{}";

  const lastIndex = cleanInput.lastIndexOf(isArray ? ']' : '}');
  if (lastIndex === -1 || lastIndex <= startIndex) return "{}";

  const extracted = cleanInput.substring(startIndex, lastIndex + 1);

  try {
    // Quick validation
    JSON.parse(extracted);
    return extracted;
  } catch (e) {
    // Attempt repair only if parsing failed
    return repairJSON(extracted);
  }
};

// Robust JSON Repair for Truncated Responses
const repairJSON = (json: string): string => {
  let repaired = json.trim();

  // Step 1: Initial cleanup of obvious trailing junk
  repaired = repaired.replace(/,[\s\t\n]*$/, ""); // Remove trailing comma at the absolute end

  // Step 2: Fix unclosed strings
  // Count counts of quotes and check if we are mid-string
  let inString = false;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '"' && repaired[i - 1] !== '\\') inString = !inString;
  }
  if (inString) repaired += '"';

  // Step 3: Progressive Structural Backtracking
  // We will repeatedly try to close brackets and parse. 
  // If it fails, we strip back to the last likely boundary and try again.
  const tryFix = (str: string): string | null => {
    let current = str.trim();
    const stack: string[] = [];
    let insideStr = false;

    for (let i = 0; i < current.length; i++) {
      const char = current[i];
      if (char === '"' && current[i - 1] !== '\\') {
        insideStr = !insideStr;
        continue;
      }
      if (insideStr) continue;

      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
      else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
    }

    let closed = current;
    const tempStack = [...stack];
    while (tempStack.length > 0) {
      const open = tempStack.pop();
      if (open === '{') closed += '}';
      if (open === '[') closed += ']';
    }

    // Clean up trailing commas before closing
    closed = closed.replace(/,(\s*[}\\]])/g, '$1');

    try {
      JSON.parse(closed);
      return closed;
    } catch (e) {
      return null;
    }
  };

  // Try original
  let result = tryFix(repaired);
  if (result) return result;

  // Step 4: Destructive Repair
  // If simple closing fails, it's likely a half-written property: "price": 
  // We backtrack to the last successfully closed object } or array ] 
  for (let limit = 0; limit < 10; limit++) { // Up to 10 attempts to find a boundary
    const lastBrace = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'));
    if (lastBrace === -1) break;

    repaired = repaired.substring(0, lastBrace + 1);
    result = tryFix(repaired);
    if (result) {
      console.log(`🔧 [JSON] Structural repair succeeded after backtracking to index ${lastBrace}`);
      return result;
    }
    // If that didn't work, strip the brace we just found and look for the one before it
    repaired = repaired.substring(0, lastBrace);
  }

  // Final fallback: just return what we have (likely still broken, but it's our best shot)
  return repaired;
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

/**
 * Schema Guardian: Ensures a partial Trip object from AI 
 * matches the required application schema to prevent UI crashes.
 */
export const ensureTripSchema = (data: any): any => {
  if (!data || typeof data !== 'object') return {};

  const defaults = {
    hotels: [],
    restaurants: [],
    attractions: [],
    itinerary: [],
    documents: [],
    flights: { segments: [], passengerName: '', pnr: '' }
  };

  return {
    ...defaults,
    ...data,
    // Deep merge/cleanup for flights
    flights: {
      ...defaults.flights,
      ...(data.flights || {})
    }
  };
};

// --- CLIENTS ---

let googleClient: GoogleGenAI | null = null;

const getGoogleClient = () => {
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

// --- MAIN GENERATION ---

export type AIIntent = 'FAST' | 'SMART' | 'SEARCH' | 'ANALYZE';

/**
 * Jan 2026 Ultimate "Zero Downtime" Generator
 * Iterates through a "Monster Fallback Chain" to ensure success.
 */
export const generateWithFallback = async (
  aiClient: any,
  input: any,
  config: any = {},
  intent: 'SMART' | 'FAST' | 'ANALYZE' = 'FAST'
) => {
  // CRITICAL: Remove responseSchema to prevent 400 errors with Gemini Models
  const { responseSchema, ...safeConfig } = config;
  const finalConfig: any = {
    ...safeConfig,
    responseMimeType: 'application/json'
  };

  // Select Candidate Chain based on Intent
  let candidates = (intent === 'SMART' || intent === 'ANALYZE')
    ? [...CANDIDATES_SMART]
    : [...CANDIDATES_FAST];

  // If analyzing, we might want to prioritize speed after smart fails, so append fast candidates as last resort
  if (intent === 'ANALYZE') {
    candidates = [...candidates, ...CANDIDATES_FAST];
  }

  // Remove duplicates
  candidates = Array.from(new Set(candidates));

  console.log(`[AI Service] Starting Generation Chain. Candidates: ${candidates.join(' -> ')}`);

  const clientToUse = aiClient || getGoogleClient();
  if (!clientToUse) throw new Error("Google AI Client not initialized");

  let lastError: any = null;

  // Iterate Strategy
  for (const modelName of candidates) {
    try {
      console.log(`🤖 [AI] Trying Model: ${modelName}`);

      // Inject Thinking Mode for Gemini 3 Flash (if applicable)
      const specificConfig = { ...finalConfig };
      if (modelName.includes("gemini-3-flash")) {
        // @ts-ignore - 'thinking_level' might not be in typed defs yet
        specificConfig.thinking_level = "medium";
        console.log("   --> 🧠 Thinking Mode Strategy Injected");
      }

      // SUPPORT FOR @google/genai SDK (v1+) vs Legacy
      let rawText = '';

      if (clientToUse.models && clientToUse.models.generateContent) {
        // New SDK
        const result = await clientToUse.models.generateContent({
          model: modelName,
          contents: Array.isArray(input) ? input : [{ role: 'user', parts: [{ text: input }] }],
          config: specificConfig
        });

        // Response Handling
        if (typeof result.text === 'function') rawText = result.text();
        else if (result.response && typeof result.response.text === 'function') rawText = result.response.text();
        else if (result.response && result.response.text) rawText = result.response.text;
        else rawText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      } else {
        // Legacy SDK
        const model = clientToUse.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: Array.isArray(input) ? input : [{ role: 'user', parts: [{ text: input }] }],
          generationConfig: specificConfig
        });
        const response = await result.response;
        rawText = response.text();
      }

      // Success!
      console.log(`✅ [AI] Success with ${modelName}`);

      // Apply JSON Cleaner (Standard Guardrail)
      if (finalConfig.responseMimeType === 'application/json') {
        rawText = extractJSON(rawText);
      }

      return { text: rawText };

    } catch (error: any) {
      console.warn(`⚠️ [AI] Failed ${modelName}:`, error.message?.substring(0, 100));
      lastError = error;
      // Continue to next candidate
    }
  }

  // If we get here, everything failed.
  throw new Error(`All AI Models Failed. Last error: ${lastError?.message}`);
};

/**
 * Parse inputs from Trip Wizard (Text + Files)
 * Used to normalize dates, extract details from notes/files, and build initial trip
 */
export const parseTripWizardInputs = async (inputs: { name: string, dates: string, destination: string, notes: string, files: any[] }) => {
  const { name, dates, destination, notes, files } = inputs;

  // Filter out unsupported files (e.g. emails) to prevent 400 errors
  // Strict Allowlist: PDF, Text, Images
  const supportedFiles = files.filter(f => {
    const type = f.type;
    const name = f.name;
    return (
      type === 'application/pdf' ||
      type === 'text/plain' ||
      type.startsWith('image/') ||
      name.endsWith('.pdf') ||
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.json') ||
      name.endsWith('.csv')
    );
  });

  const contentParts: any[] = [
    {
      text: `You are an AI Travel Assistant. Your goal is to structure a trip based on user inputs.
      
      User Inputs:
      - Trip Name: "${name}"
      - Dates Input (Manual): "${dates}"
      - Destination (Manual): "${destination}"
      - User Notes: "${notes}"
      - Additional Files provided below.

      CRITICAL INSTRUCTION - SOURCE OF TRUTH:
      1. If the user provided uploaded files (tickets, hotel bookings, screenshots), you MUST trust the dates and locations in those files ABOVE the manual inputs.
      2. People often make typos in manual entry. The file is the authority.
      3. If the file says "Aug 6 - Aug 26" but user typed "Aug 7", use the FILE's dates.

      TASKS:
      1. Dates: The manual dates are already formatted as "YYYY-MM-DD - YYYY-MM-DD". Verify they match the files. If files differ, use dates from files.
      2. Destination: Normalize city/country name (e.g., "Thailand" -> "Thailand", "NYC" -> "New York, USA").
      3. Extraction: Scan notes and any file content for:
         - Hotel names (add to hotels array)
         - Flight details (add to flights.segments array if possible, or just a summary)
         - Activities/Attractions
         
      OUTPUT FORMAT (JSON ONLY):
      {
        "name": "Final Trip Name",
        "dates": "YYYY-MM-DD - YYYY-MM-DD",
        "destination": "City, Country",
        "hotels": [{ "id": "h-...", "name": "Hotel Name", "address": "City/Area" }],
        "flights": { "segments": [{ "fromCode": "...", "toCode": "...", "date": "...", "flightNumber": "..." }] }
        "itinerary": [] (optional, if detailed itinerary found)
      }
      
      Do NOT return markdown. Return ONLY valid JSON.`
    }
  ];

  // רשימת סוגים מותרים בלבד לשליחה ל-API
  const ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf', 'text/plain', 'text/csv', 'text/html'
  ];

  // Append files safely
  files.forEach(f => {
    if (f.isText) {
      contentParts.push({ text: `File (${f.name}):\n${f.data}` });
    }
    // התיקון: בדיקה שסוג הקובץ נתמך לפני השליחה
    else if (f.mimeType && f.data && ALLOWED_MIME_TYPES.includes(f.mimeType)) {
      contentParts.push({
        inlineData: { mimeType: f.mimeType, data: f.data }
      });
    } else {
      console.warn(`Skipping unsupported MIME type for AI: ${f.mimeType} (${f.name})`);
    }
  });

  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    { responseMimeType: 'application/json' },
    'FAST' // Use Flash for speed
  );

  // Apply Schema Guardian
  if (response.text) {
    try {
      const raw = JSON.parse(response.text);
      response.text = JSON.stringify(ensureTripSchema(raw));
    } catch (e) { /* fallback to original if parse failed */ }
  }

  return response;
};

/**
 * Plan a full day for an empty slot in the itinerary
 */
export const planFullDay = async (city: string, date: string, tripNotes: string = "") => {
  const prompt = `
  You are an expert local guide for ${city}.
  Plan a complete, high-quality one-day itinerary for ${date}.
  
  Trip Context/Style: ${tripNotes}

  CRITICAL STRUCTURE:
  - 3-4 distinct activities (Morning, Lunch, Afternoon, evening).
  - Each activity MUST include a suggested time (HH:MM).
  - Descriptions MUST be in HEBREW (max 15 words).
  - Titles MUST be in Hebrew or common English (e.g. "ביקור במגדל אייפל").
  - Be specific. Don't say "Go see a park", say "Visit Luxembourg Gardens".

  OUTPUT FORMAT (JSON ONLY):
  {
    "activities": [
      "09:00 ☕ ארוחת בוקר קונטיננטלית בבית קפה מקומי",
      "10:30 🏛️ סיור מודרך במוזיאון הלובר",
      "13:30 🍽️ ארוחת צהריים ברובע הלטיני",
      "16:00 🗼 תצפית מהפיסגה של מגדל אייפל",
      "20:00 🍷 ארוחת ערב רומנטית על גדות הסיין"
    ]
  }
  
  Do NOT return markdown. Return ONLY valid JSON.
  `;

  return generateWithFallback(
    null,
    prompt,
    { responseMimeType: "application/json" },
    'SMART'
  );
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

/**
 * Task 3: The "Sanity Check" Function (Preparation for Real-Data)
 * Currently a semantic filter, effectively preparing for Google Places API ID swap.
 */
export const verifyPlacesWithGoogle = async (places: any[]) => {
  // Placeholder for future Places API integration
  // Currently, we just filter out obviously generic names
  return places.filter(p => {
    const genericNames = ["Restaurant", "Cafe", "Bar", "Local Restaurant", "The Restaurant"];
    return !genericNames.includes(p.name);
  });
};

// --- NEW PROCESSOR (Project Genesis) ---

export interface ProcessedFile {
  name: string;
  mimeType: string;
  data: string; // Base64 or text
  isText: boolean;
}

export const readFiles = async (files: File[]): Promise<ProcessedFile[]> => {
  return Promise.all(files.map(file => {
    const mimeType = file.type || '';
    const isTextFile = (
      mimeType === 'text/plain' ||
      mimeType === 'application/json' ||
      mimeType === 'message/rfc822' || // Emails - Treat as text for reading
      file.name.endsWith('.eml') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.json')
    );

    return new Promise<ProcessedFile>((resolve) => {
      const reader = new FileReader();
      if (isTextFile) {
        reader.onloadend = () => {
          resolve({
            data: reader.result as string,
            mimeType: 'text/plain',
            name: file.name,
            isText: true
          });
        };
        reader.readAsText(file);
      } else {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;

          // Force Mime Type by Extension if missing (Crucial for AI PDF reading)
          let finalMime = file.type;
          if (!finalMime || finalMime === 'application/octet-stream') {
            if (file.name.toLowerCase().endsWith('.pdf')) finalMime = 'application/pdf';
            else if (file.name.toLowerCase().endsWith('.png')) finalMime = 'image/png';
            else if (file.name.toLowerCase().endsWith('.jpg')) finalMime = 'image/jpeg';
            else if (file.name.toLowerCase().endsWith('.jpeg')) finalMime = 'image/jpeg';
            else if (file.name.toLowerCase().endsWith('.webp')) finalMime = 'image/webp';
          }
          finalMime = finalMime || 'application/octet-stream';

          resolve({
            data: base64,
            mimeType: finalMime,
            name: file.name,
            isText: false
          });
        };
        reader.readAsDataURL(file);
      }
    });
  }));
};

/**
 * Phase 1: The "Deep Understanding" Brain
 * Performs Multi-Document Reasoning to build a Staged Trip.
 */
export interface TripAnalysisResult {
  metadata: {
    suggestedName: string;
    destination: string;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
  };
  items: any[]; // The categorized files (Logistics, Wallet, Experiences)
  rawStagedData: StagedTripData; // Keep original for ImportsReviewModal compatibility
}

/**
 * Schema Guardian for Staged Trip Data (Omni-Import)
 * Ensures 'categories' structure exists to prevent UI crashes.
 */
const ensureStagedTripSchema = (data: any): StagedTripData => {
  if (!data || typeof data !== 'object') {
    return {
      tripMetadata: { suggestedName: "New Trip", suggestedDates: "", mainDestination: "" },
      categories: { logistics: [], wallet: [], experiences: [] }
    };
  }

  // Deep Merge Defaults
  return {
    tripMetadata: {
      suggestedName: data.tripMetadata?.suggestedName || "New Trip",
      suggestedDates: data.tripMetadata?.suggestedDates || "",
      mainDestination: data.tripMetadata?.mainDestination || ""
    },
    categories: {
      logistics: Array.isArray(data.categories?.logistics) ? data.categories.logistics : [],
      wallet: Array.isArray(data.categories?.wallet) ? data.categories.wallet : [],
      experiences: Array.isArray(data.categories?.experiences) ? data.categories.experiences : []
    }
  };
};

/**
 * Smart Route Derivation (Project Genesis)
 * Scans flight segments to build a dynamic multi-city route string.
 */
const deriveSmartRoute = (items: any[], defaultDest: string): string => {
  // Support both flat segments and nested flight_itinerary segments (Legacy/Safety)
  const allSegments: any[] = [];

  items.forEach(item => {
    if (item.type === 'flight' && item.data.from && item.data.to) {
      allSegments.push(item.data);
    } else if (item.type === 'flight_itinerary' && Array.isArray(item.data.segments)) {
      allSegments.push(...item.data.segments);
    }
  });

  if (allSegments.length === 0) return defaultDest;

  // Sort by time
  const sorted = allSegments.sort((a, b) => {
    const timeA = new Date(a.departureTime || 0).getTime();
    const timeB = new Date(b.departureTime || 0).getTime();
    return timeA - timeB;
  });

  // Build chain
  const route: string[] = [];
  if (sorted[0]) route.push(sorted[0].from);

  sorted.forEach(f => {
    if (f.to && route[route.length - 1] !== f.to) {
      route.push(f.to);
    }
  });

  // If route is just A -> B, maybe just use destination name. But if A -> B -> C, use route.
  if (route.length > 2) return route.join(' ➝ ');

  return defaultDest;
};

/**
 * Phase 1: The "Deep Understanding" Brain
 * Performs Multi-Document Reasoning to build a Staged Trip.
 */
export const analyzeTripFiles = async (files: File[]): Promise<TripAnalysisResult> => {
  // 1. Process Files
  const processedFiles = await readFiles(files);

  console.group("🕵️‍♂️ [AI Debug] analyzing items...");
  console.log("Files prepared for AI:", processedFiles.map(f => ({
    name: f.name,
    type: f.mimeType,
    isText: f.isText,
    dataLen: f.data.length
  })));

  // 2. Build Content for Gemini
  // We prepend the system prompt as a user message since generateWithFallback handling for SMART/ANALYZE custom prompts with Google is minimal
  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT_ANALYZE_TRIP }] },
    { role: "user", parts: [{ text: "Here are the trip files to analyze:" }] },
    ...processedFiles.map(f => ({
      role: "user",
      parts: [
        { text: `Filename: ${f.name}` },
        f.isText ? { text: f.data } : { inlineData: { mimeType: f.mimeType, data: f.data } }
      ]
    }))
  ];

  // 3. Generate Staged Trip
  const schema = {
    type: "OBJECT",
    properties: {
      tripMetadata: {
        type: "OBJECT",
        properties: {
          suggestedName: { type: "STRING" },
          suggestedDates: { type: "STRING" },
          mainDestination: { type: "STRING" }
        }
      },
      categories: {
        type: "OBJECT",
        properties: {
          logistics: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING" },
                fileId: { type: "STRING" },
                data: { type: "OBJECT" },
                confidence: { type: "NUMBER" }
              }
            }
          },
          wallet: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING" },
                fileId: { type: "STRING" },
                title: { type: "STRING" },
                data: { type: "OBJECT" },
                isSensitive: { type: "BOOLEAN" },
                uiMessage: { type: "STRING" }
              }
            }
          },
          experiences: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING" },
                fileId: { type: "STRING" },
                title: { type: "STRING" },
                data: { type: "OBJECT" },
                uiMessage: { type: "STRING" }
              }
            }
          }
        }
      }
    }
  };

  const ai = getAI();
  const response = await generateWithFallback(
    ai,
    contents,
    {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.1
    },
    'ANALYZE'
  );

  // Fix: response.text is a string from generateWithFallback
  const textContent = response.text || '';

  console.log("📝 [AI] Raw Response:", textContent);

  // Default Empty Structure
  const emptyStagedData: StagedTripData = {
    tripMetadata: { suggestedName: "New Trip", suggestedDates: "", mainDestination: "" },
    categories: { logistics: [], wallet: [], experiences: [] }
  };

  let stagedData: StagedTripData = emptyStagedData;

  try {
    const rawData = JSON.parse(textContent);
    // CRITICAL FIX: Use specific schema validator for StagedData, NOT ensureTripSchema
    stagedData = ensureStagedTripSchema(rawData);
    console.log("✅ [AI] Staged Data Parsed:", stagedData);
  } catch (e) {
    console.error("Failed to parse Omni-Import response", e);
    console.log("❌ [AI Debug] Parsing Failure Context. Raw Text was:", textContent);
  }

  // -- AUDIT MISSING FILES --
  const usedFileIds = new Set<string>();
  const scanCategory = (arr: any[]) => arr.forEach(item => { if (item.fileId) usedFileIds.add(item.fileId) });

  scanCategory(stagedData.categories.logistics);
  scanCategory(stagedData.categories.wallet);
  scanCategory(stagedData.categories.experiences);

  const missingFiles = processedFiles.filter(f => !usedFileIds.has(f.name));

  if (missingFiles.length > 0) {
    console.warn("⚠️ [AI Audit] The following files were NOT referenced in the output:");
    missingFiles.forEach(f => console.warn(`   - ${f.name} (Type: ${f.mimeType})`));
    console.warn("Try checking if these are supported file types or contain legible text.");
  } else {
    console.log("✨ [AI Audit] Perfect Score! All uploaded files were used.");
  }
  console.groupEnd();

  // Map to TripAnalysisResult
  const flattenedItems = [
    ...stagedData.categories.logistics,
    ...stagedData.categories.wallet,
    ...stagedData.categories.experiences
  ];

  const dateRange = stagedData.tripMetadata.suggestedDates.split(' - ');
  const startDate = dateRange[0] ? dateRange[0].trim() : undefined;
  const endDate = dateRange[1] ? dateRange[1].trim() : undefined;

  // Calculate Smart Destination
  const smartDestination = deriveSmartRoute(flattenedItems, stagedData.tripMetadata.mainDestination);

  return {
    metadata: {
      suggestedName: stagedData.tripMetadata.suggestedName,
      destination: smartDestination, // Use the smart route!
      startDate,
      endDate
    },
    items: flattenedItems,
    rawStagedData: stagedData
  };
};


export const getAI = getGoogleClient;