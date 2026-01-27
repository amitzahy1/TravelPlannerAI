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
/**
 * UPDATED SYSTEM PROMPT - "The Categorization Enforcer"
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
   - Group connecting flights into a single logical "Journey" if possible, or keep separate segments.

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
   - PURETOWN NAMES ONLY. Do NOT include ", Country" or "Airport". (e.g. "Bangkok", not "Bangkok, Thailand").
   - NEVER use the country name as the city (e.g. "Philippines" is NOT a city).
   - REMOVE POSTAL CODES, zip codes, or building numbers (e.g. "1228 Manila" -> "Manila", "Bangkok 10500" -> "Bangkok").
   - PURE TEXT ONLY for 'uniqueCityNames'.
   - If a place is an island (e.g. "Phuket", "Boracay"), use the Island name.
   - Exclude the home airport city (e.g., if flight is TLV->BKK, include Bangkok, exclude Tel Aviv).
   - Example: ["Manila", "Boracay", "Cebu", "Bangkok"].

2. ✈️ FLIGHT INTELLIGENCE (STRICT):
   - NO 'TBD' VALUES. If a **Flight Number** is detected (e.g., "EY598", "LY001"), you MUST provide full details for that segment.
   - YOU MUST INFER the Origin, Destination, and typical Times based on your knowledge of that flight route if not explicitly in the text.
   - EVERY segment must have: airline, flightNumber, departureCity, arrivalCity, departureDate.

3. 🕒 DATES & TIMES:
   - 'date': ISO 8601 format (e.g., "2026-02-15T03:25:00") for DB.
   - 'displayTime': User-friendly format (e.g., "15 Feb, 03:25"). USE THIS FORMAT EXACTLY.

3. 📂 FILE MAPPING:
   - Use 'sourceFileIds' (Array) to link multiple files to a single event.
   - If a file is a duplicate or yields no data, add it to 'unprocessedFiles' with a reason.

--- OUTPUT JSON SCHEMA ---
Return ONLY this JSON structure:
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
    "transport": [ { "type": "flight", "data": { ... }, "sourceFileIds": [...] } ],
    "accommodation": [ { "type": "hotel", "data": { "hotelName": "...", "checkInDate": "...", "displayTime": "..." }, "sourceFileIds": [...] } ],
    "wallet": [ { "type": "entry_permit", "data": { "documentName": "...", "displayTime": "..." }, "sourceFileIds": [...] } ],
    "dining": [],
    "activities": []
  }
}
`;

// --- VISION INTELLIGENCE (Project Genesis Phase 7) ---

/**
 * System Prompt for Visual Analysis (Receipts & Docs)
 */
export const SYSTEM_PROMPT_VISION = `
Role: You are an expert Optical Character Recognition (OCR) & Financial Analyst AI.
Mission: Extract precise data from images of receipts, invoices, and travel documents, even if they are blurry, crumpled, or low-light.

VISUAL REASONING SKILLS:
1. Anchor Search: Look for keywords like "Total", "Grand Total", "Summe", "Montant", "Skh".
2. Currency Inference: Infer currency from symbols ($, €, ₪, ฿) or address/phone number country code if symbol is missing.
3. Noise Filtering: Ignore credit card terminal slips (which only show auth code) if a detailed itemized receipt is present.
4. Handwriting: Attempt to read handwritten totals if printed text is unclear.

OUTPUT: Return ONLY valid JSON.
`;

/**
 * Specialized Vision Analyzer for Receipts & Bills
 */
export const analyzeReceipt = async (
  fileBase64: string,
  mimeType: string,
  mode: 'TOTAL_ONLY' | 'DETAILED_SHOPPING' = 'TOTAL_ONLY'
) => {
  const prompt = mode === 'TOTAL_ONLY'
    ? `Analyze this receipt image. Extract the FINAL TOTAL. Return JSON: { "price": number, "currency": string, "date": "YYYY-MM-DD" (if found) }. Ignore currency symbols in the price number.`
    : `Analyze this shopping receipt. Extract full details. 
           Return JSON: { 
             "shopName": string, 
             "totalPrice": number, 
             "currency": string, 
             "purchaseDate": "YYYY-MM-DD", 
             "items": [{ "name": string, "price": number, "category": string }],
             "isVatEligible": boolean (true if Tax Free form mentioned or high value > 2000 THB/50 EUR),
             "vatAmount": number (estimated)
           }`;

  return generateWithFallback(
    null,
    [{
      role: 'user',
      parts: [
        { text: SYSTEM_PROMPT_VISION + "\n\n" + prompt },
        { inlineData: { mimeType, data: fileBase64 } }
      ]
    }],
    { responseMimeType: 'application/json' },
    'FAST' // Gemini 3 Flash is excellent at Vision and Fast
  );
};

// --- CONFIGURATION ---

// Jan 2026 Ultimate "Unbreakable" Architecture
// TIER 1: INTELLIGENCE (Gemini 3)
// TIER 2: STABILITY (Gemini 2.5)
// TIER 3: SPEED (Gemini 3 Flash)
// TIER 4: SAFETY NET (Gemini 2.5/2.0)
const GOOGLE_MODELS = {
  // TIER 1: Intelligence
  V3_PRO_STABLE: "gemini-1.5-pro",
  V3_PRO_LATEST: "gemini-1.5-pro-latest",
  V3_PRO_PREV: "gemini-1.5-pro",

  // TIER 2: Stability
  V2_5_PRO: "gemini-1.5-pro",

  // TIER 3: Speed
  V3_FLASH_STABLE: "gemini-1.5-flash",
  V3_FLASH_LATEST: "gemini-1.5-flash-latest",

  // TIER 4: Safety Net
  V2_5_FLASH: "gemini-1.5-flash",
  V2_FLASH_LEGACY: "gemini-1.0-pro"
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


/**
 * Phase 8: Context-Aware Chat Bot
 */
export const chatWithTripContext = async (trip: any, userMessage: string, history: any[]) => {
  // 1. Prepare Trip Context (Summarize to save tokens)
  const contextSummary = {
    destination: trip.destination,
    dates: trip.dates,
    flights: trip.flights?.segments?.map((f: any) => `${f.flightNumber} ${f.fromCode}->${f.toCode} at ${f.departureTime}`),
    hotels: trip.hotels?.map((h: any) => `${h.name} (${h.checkInDate})`),
    itinerary: trip.itinerary?.map((i: any) => `Day ${i.day}: ${i.title}`),
    budget: trip.budgetLimit ? `${trip.currency} ${trip.budgetLimit}` : 'Not set'
  };

  const systemPrompt = `
  Role: You are a "Travel Concierge" for this specific trip.
  Context: ${JSON.stringify(contextSummary)}
  
  Directives:
  1. Answer directly based on the context.
  2. If asked about something not in context (e.g. "What is the weather?"), assume it's for ${trip.destination} and answer generally or suggest checking the app.
  3. Be helpful, enthusiastic, and concise (max 2-3 sentences unless asked for a list).
  4. Language: HEBREW (unless user speaks English).
  `;

  // 2. Format History
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] }, // System instruction as first user message for context
    ...history.filter(m => m.id !== 'welcome').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' not 'assistant'
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const response = await generateWithFallback(
    null,
    contents,
    { responseMimeType: 'text/plain' }, // Chat is text, not JSON
    'SMART'
  );

  return response.text;
};

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
  intent: 'SMART' | 'FAST' | 'ANALYZE' | 'SEARCH' = 'FAST'
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
         - Flight details: If Flight Number is found (e.g. LY001), YOU MUST INFER origin/dest/times if missing.
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
    cities: string[]; // New: List of specific towns/islands visited
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
      tripMetadata: { suggestedName: "New Trip", suggestedDates: "", mainDestination: "", uniqueCityNames: [] },
      categories: { transport: [], accommodation: [], wallet: [], dining: [], activities: [] },
      processedFileIds: [],
      unprocessedFiles: []
    };
  }

  // Deep Merge Defaults
  return {
    tripMetadata: {
      suggestedName: data.tripMetadata?.suggestedName || "New Trip",
      suggestedDates: data.tripMetadata?.suggestedDates || "",
      mainDestination: data.tripMetadata?.mainDestination || "",
      uniqueCityNames: data.tripMetadata?.uniqueCityNames || []
    },
    categories: {
      transport: Array.isArray(data.categories?.transport) ? data.categories.transport : [],
      accommodation: Array.isArray(data.categories?.accommodation) ? data.categories.accommodation : [],
      wallet: Array.isArray(data.categories?.wallet) ? data.categories.wallet : [],
      dining: Array.isArray(data.categories?.dining) ? data.categories.dining : [],
      activities: Array.isArray(data.categories?.activities) ? data.categories.activities : []
    },
    processedFileIds: Array.isArray(data.processedFileIds) ? data.processedFileIds : [],
    unprocessedFiles: Array.isArray(data.unprocessedFiles) ? data.unprocessedFiles : []
  };
};

/**
 * IATA City Mapping for Smart Route Resolution
 */
const IATA_CITY_MAP: Record<string, string> = {
  'TLV': 'Tel Aviv',
  'AUH': 'Abu Dhabi',
  'BKK': 'Bangkok',
  'MNL': 'Manila',
  'MPH': 'Boracay',
  'CEB': 'Cebu',
  'HND': 'Tokyo',
  'NRT': 'Tokyo',
  'KIX': 'Osaka',
  'ICN': 'Seoul',
  'HKG': 'Hong Kong',
  'DXB': 'Dubai',
  'SIN': 'Singapore',
  'CDG': 'Paris'
};

const COUNTRIES_BLOCKLIST = new Set([
  'THAILAND', 'PHILIPPINES', 'VIETNAM', 'JAPAN', 'ISRAEL', 'FRANCE', 'GERMANY', 'ITALY', 'SPAIN',
  'CHINA', 'INDIA', 'USA', 'UNITED STATES', 'UK', 'UNITED KINGDOM', 'RUSSIA', 'AUSTRALIA', 'CANADA'
]);

const resolveCityName = (code: string): string => {
  return IATA_CITY_MAP[code] || code;
};

/**
 * Smart Route Derivation (Project Genesis 2.0)
 * Builds a chronological "Event Trace" from Flights AND Hotels to determine the true route.
 */
const deriveSmartRoute = (items: any[], defaultDest: string): { route: string, cities: string[] } => {
  const events: { time: number; city: string; type: 'flight' | 'hotel' }[] = [];
  const citiesSet = new Set<string>();

  // Helper to extract city from text using strict IATA map or heuristic
  const extractCity = (text: string): string => {
    if (!text) return '';
    // Check IATA Map
    const normalized = text.toUpperCase().trim();
    if (IATA_CITY_MAP[normalized]) return IATA_CITY_MAP[normalized];

    // Filter out Countries if they appear as "City"
    if (COUNTRIES_BLOCKLIST.has(normalized)) return '';

    // Simple heuristic: If it looks like a city name (no numbers, short), use it.
    // Otherwise, for full addresses, we might need more advanced NLP, but for now:
    // We will clean it up later with the AI-provided 'uniqueCityNames' if available in the UI layer.
    const potentialCity = text.split(',')[0].trim();
    if (COUNTRIES_BLOCKLIST.has(potentialCity.toUpperCase())) return '';

    return potentialCity;
  };

  items.forEach(item => {
    // 1. Flights (Grouped or Single)
    if (item.type === 'flight') {
      if (item.data.segments && Array.isArray(item.data.segments)) {
        item.data.segments.forEach((seg: any) => {
          if (seg.departureCity && seg.departureDate) events.push({ time: new Date(seg.departureDate).getTime(), city: seg.departureCity, type: 'flight' });
          if (seg.arrivalCity && seg.arrivalDate) events.push({ time: new Date(seg.arrivalDate).getTime(), city: seg.arrivalCity, type: 'flight' });
        });
      } else if (item.data.from && item.data.to) {
        if (item.data.departureTime) events.push({ time: new Date(item.data.departureTime).getTime(), city: resolveCityName(item.data.from), type: 'flight' });
        if (item.data.arrivalTime) events.push({ time: new Date(item.data.arrivalTime).getTime(), city: resolveCityName(item.data.to), type: 'flight' });
      }
    }

    // 2. Hotels
    if (item.type === 'hotel' && item.data.checkInDate) {
      // Try to find city in address or name
      let city = '';
      const rawText = item.data.address || item.data.location || item.data.name || '';
      if (rawText) {
        // Basic extraction: Take the city part if comma exists, else take the whole thing if short
        const parts = rawText.split(',');
        city = parts.length > 1 ? parts[parts.length - 2].trim() : rawText; // e.g. "123 Main St, London, UK" -> "London"

        // Very basic clean up fallback
        if (city.length > 20) city = item.data.hotelName || 'Hotel Stay';
      }

      if (city && city !== 'Hotel Stay') {
        events.push({ time: new Date(item.data.checkInDate).getTime(), city: city, type: 'hotel' });
      }
    }
  });

  // Sort Chronologically
  const sortedEvents = events.sort((a, b) => a.time - b.time);

  // Build Unique Route Path
  const routeParts: string[] = [];

  sortedEvents.forEach(e => {
    const city = e.city;
    citiesSet.add(city);

    // Add to route if it's new (not same as last)
    if (routeParts.length === 0 || routeParts[routeParts.length - 1] !== city) {
      routeParts.push(city);
    }
  });

  // Filter out Home Base (TLV) usually? Maybe keep it for full route context.
  // For "Destination" field, usually we want the places visited.
  const filteredRoute = routeParts.filter(c => c !== 'Tel Aviv' && c !== 'TLV' && c !== 'Ben Gurion');

  // If no route found, use default
  if (filteredRoute.length === 0) return { route: defaultDest, cities: Array.from(citiesSet) };

  const finalRoute = filteredRoute.join(' ➝ ');
  return { route: finalRoute, cities: Array.from(citiesSet) };
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
    tripMetadata: { suggestedName: "New Trip", suggestedDates: "", mainDestination: "", uniqueCityNames: [] },
    categories: { transport: [], accommodation: [], wallet: [], dining: [], activities: [] },
    processedFileIds: [],
    unprocessedFiles: []
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
  const scanCategory = (arr: any[]) => arr.forEach(item => {
    if (item.sourceFileIds) item.sourceFileIds.forEach((id: string) => usedFileIds.add(id));
    else if (item.fileId) usedFileIds.add(item.fileId); // Legacy fallback
  });

  scanCategory(stagedData.categories.transport); // Uses newly updated logic (implicit)
  scanCategory(stagedData.categories.accommodation);
  scanCategory(stagedData.categories.wallet);
  scanCategory(stagedData.categories.dining);
  scanCategory(stagedData.categories.activities);

  // Use AI reported processed list if available, otherwise fallback to usedFileIds
  const processedByAI = new Set(stagedData.processedFileIds || []);
  const missingFiles = processedFiles.filter(f => !usedFileIds.has(f.name) && !processedByAI.has(f.name));

  if (missingFiles.length > 0 || (stagedData.unprocessedFiles && stagedData.unprocessedFiles.length > 0)) {
    console.warn("⚠️ [AI Audit] The following files were NOT referenced in the output:");
    missingFiles.forEach(f => console.warn(`   - ${f.name} (Type: ${f.mimeType})`));

    // Also log AI-provided skipped files
    if (stagedData.unprocessedFiles) {
      stagedData.unprocessedFiles.forEach(u => console.warn(`   - AI Skipped: ${u.fileName} Reason: ${u.reason}`));
    }
    console.warn("Try checking if these are supported file types or contain legible text.");
  } else {
    console.log("✨ [AI Audit] Perfect Score! All uploaded files were used.");
  }
  console.groupEnd();

  // Map to TripAnalysisResult
  const flattenedItems = [
    ...stagedData.categories.transport,
    ...stagedData.categories.accommodation,
    ...stagedData.categories.wallet,
    ...stagedData.categories.dining,
    ...stagedData.categories.activities
  ];

  const dateRange = stagedData.tripMetadata.suggestedDates.split(' - ');
  const startDate = dateRange[0] ? dateRange[0].trim() : undefined;
  const endDate = dateRange[1] ? dateRange[1].trim() : undefined;

  // Calculate Smart Destination
  const { route: smartRoute, cities: derivedCities } = deriveSmartRoute(flattenedItems, stagedData.tripMetadata.mainDestination);

  // Merge AI suggested destinations with derived cities
  const finalCities = Array.from(new Set([
    ...(stagedData.tripMetadata.uniqueCityNames || []),
    ...derivedCities
  ]));

  return {
    metadata: {
      suggestedName: stagedData.tripMetadata.suggestedName,
      destination: smartRoute, // Use the smart route string
      cities: finalCities, // Combined list
      startDate,
      endDate
    },
    items: flattenedItems,
    rawStagedData: stagedData
  };
};


export const getAI = getGoogleClient;