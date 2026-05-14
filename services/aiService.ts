import { StagedTripData, StagedCategories } from "../types";
import { TRIP_OUTPUT_SCHEMA } from "./aiSchema";
import { auth } from "./firebaseConfig";

// Worker enforces a per-email allow-list and rejects unauthenticated calls.
// We attach the current user's Firebase ID token on every request.
const getAuthHeader = async (): Promise<Record<string, string>> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in — AI features require login.');
  const idToken = await user.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
};

// ============================================================================
// 🏗️ CONFIGURATION — Model Chains & Constants
// ============================================================================

const GOOGLE_MODELS = {
  // Tier 1: Used for SMART/ANALYZE intent (trip extraction, PDF parsing, structured JSON).
  // Ordered fastest+cheapest first. gemini-3.1-flash-lite is GA as of May 2026
  // and Google bills it as "frontier-class performance at a fraction of the cost"
  // — strictly better than 2.5-flash-lite for the same price point, so it sits at
  // the top of the chain. Pro stays as the absolute last resort for heavy PDFs.
  SMART_CANDIDATES: [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
  ],
  // Tier 2: SEARCH intent (restaurant/attraction market research).
  // Flash-first — Pro 3.1 Preview removed: TTFT (21–35s) exceeds the
  // Cloudflare Worker 30s lifecycle, causing every Pro 3.1 call to time
  // out before returning. 2.5-flash with googleSearch grounding produces
  // excellent results in ~3–8s. Pro stays in chain as escalation only.
  RESEARCH_CANDIDATES: [
    "gemini-2.5-flash",                                   // PRIMARY — fast + grounded (~3–8s)
    "gemini-3-flash-preview",                             // FALLBACK 1 — Gemini 3 Flash
    "gemini-3.1-flash-lite",                              // FALLBACK 2 — cheapest GA option
    "gemini-2.5-pro",                                     // FALLBACK 3 — escalate when Flash output is thin
    "gemini-2.5-flash-lite",                              // FALLBACK 4 — legacy cheap option
    "openrouter:meta-llama/llama-3.3-70b-instruct:free",  // FALLBACK 5 — non-Google last resort
  ],
  // Tier 3: Used for FAST intent (chat, quick suggestions)
  FAST_CANDIDATES: [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "openrouter:meta-llama/llama-3.3-70b-instruct:free",  // last resort if all Gemini quota gone
  ]
};

// File upload safety limits
const FILE_LIMITS = {
  MAX_FILES: 10,
  MAX_FILE_SIZE_MB: 20,
  MAX_TOTAL_SIZE_MB: 50,
  SUPPORTED_MIME_TYPES: [
    'application/pdf',
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    'text/plain', 'text/csv', 'text/html',
  ] as string[],
};

// ============================================================================
// 🔧 TYPES
// ============================================================================

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

export interface FileValidationError {
  fileName: string;
  reason: string;
}

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================

/**
 * Robust JSON Cleaner — handles all known LLM output quirks.
 * Inspired by Google Document AI post-processing pipelines.
 *
 * Strategy:
 * 1. Strip markdown fences, BOM, zero-width chars
 * 2. Find the outermost JSON object or array
 * 3. Attempt parse; if it fails, try aggressive repairs
 */
export const cleanJSON = (text: string): string => {
  if (!text) return "{}";

  // Phase 1: Strip common wrappers
  let cleaned = text
    .replace(/^\uFEFF/, '')                  // BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '')   // Zero-width chars
    .replace(/```json\s*/gi, '')             // Markdown JSON fence open
    .replace(/```\s*/g, '')                  // Markdown fence close
    .trim();

  // Phase 2: Extract the outermost JSON structure
  // Find first { or [ and last matching } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start: number;
  let end: number;
  let openChar: string;

  if (firstBrace === -1 && firstBracket === -1) return "{}";

  if (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) {
    openChar = '{';
    start = firstBrace;
    end = cleaned.lastIndexOf('}');
  } else {
    openChar = '[';
    start = firstBracket;
    end = cleaned.lastIndexOf(']');
  }

  if (start >= 0 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Phase 3: Fix common JSON issues
  cleaned = cleaned
    .replace(/,\s*([}\]])/g, '$1')           // Trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // Unquoted keys (simple cases)
    .replace(/:\s*'([^']*)'/g, ': "$1"');      // Single-quoted values

  return cleaned;
};

/**
 * Read a File object as base64 string (data URI → pure base64).
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

/**
 * Validate files before processing — enforces size/type/count limits.
 * Returns { validFiles, errors } so the UI can report issues.
 */
export const validateFiles = (files: File[]): { validFiles: File[]; errors: FileValidationError[] } => {
  const errors: FileValidationError[] = [];
  const validFiles: File[] = [];
  let totalSize = 0;

  if (files.length > FILE_LIMITS.MAX_FILES) {
    errors.push({ fileName: '(batch)', reason: `ניתן להעלות עד ${FILE_LIMITS.MAX_FILES} קבצים בבת אחת` });
    // Still process up to the limit
    files = files.slice(0, FILE_LIMITS.MAX_FILES);
  }

  for (const file of files) {
    const sizeMB = file.size / (1024 * 1024);

    // Size check
    if (sizeMB > FILE_LIMITS.MAX_FILE_SIZE_MB) {
      errors.push({ fileName: file.name, reason: `הקובץ גדול מדי (${sizeMB.toFixed(1)}MB, מקסימום ${FILE_LIMITS.MAX_FILE_SIZE_MB}MB)` });
      continue;
    }

    // MIME type check (allow common extensions as fallback)
    const isSupported = FILE_LIMITS.SUPPORTED_MIME_TYPES.includes(file.type)
      || file.name.endsWith('.json')
      || file.name.endsWith('.md')
      || file.name.endsWith('.eml')
      || file.name.endsWith('.msg');

    if (!isSupported) {
      errors.push({ fileName: file.name, reason: `סוג קובץ לא נתמך: ${file.type || 'unknown'}` });
      continue;
    }

    totalSize += sizeMB;
    if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE_MB) {
      errors.push({ fileName: file.name, reason: `חריגה מנפח כולל מקסימלי (${FILE_LIMITS.MAX_TOTAL_SIZE_MB}MB)` });
      continue;
    }

    validFiles.push(file);
  }

  return { validFiles, errors };
};

/**
 * Smart delay with exponential backoff for rate-limit retries.
 */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const parseRetryDelayMs = (message: string, fallbackMs = 5000): number => {
  const retryInfoMatch = message.match(/retryDelay["']?\s*[:=]\s*["']?(\d+)s/i);
  if (retryInfoMatch) return Number(retryInfoMatch[1]) * 1000;

  const plainMatch = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (plainMatch) return Math.ceil(Number(plainMatch[1]) * 1000);

  return fallbackMs;
};

const isTransientWorkerError = (status: number, message: string): boolean => {
  // Permanent quota (limit:0, PerDay) must be checked first — even for 429
  if (/PerDay|per_day|GenerateRequestsPerDay|InputTokensPerModelPerDay|limit:\s*0/i.test(message)) return false;
  if (status === 429) return true;
  // Worker-side timeout (model.generateContent took >25s) — fall through to next model
  if (status === 504 || /GeminiTimeout/i.test(message)) return true;
  if (status < 500) return false;
  return /503|Service Unavailable|high demand|temporar|retry/i.test(message);
};

// ============================================================================
// 🔄 GENERATE WITH FALLBACK (THE WATERFALL)
// ============================================================================

/**
 * The core proxy caller. Tries each model in the chain, with backoff on 429.
 * CRITICAL FIX: Uses spread operator to avoid mutating the shared model arrays.
 */
export const generateWithFallback = async (
  _unused: any,
  contents: any,
  config: any = {},
  intent: AIIntent = 'SMART',
  preferTier: 'paid' | 'free' = 'free'
): Promise<any> => {
  // Build model chain WITHOUT mutating the originals.
  // - SEARCH: market research (food / attractions) — depth matters, pro first.
  // - SMART / ANALYZE: structured parsing — flash-lite first, pro as fallback.
  // - FAST: chat / quick lookups — flash-lite only, stay cheap.
  let chain: string[];
  if (intent === 'SEARCH') {
    chain = [...GOOGLE_MODELS.RESEARCH_CANDIDATES];
  } else if (intent === 'SMART' || intent === 'ANALYZE') {
    chain = [...GOOGLE_MODELS.SMART_CANDIDATES, ...GOOGLE_MODELS.FAST_CANDIDATES];
  } else {
    chain = [...GOOGLE_MODELS.FAST_CANDIDATES];
  }

  // Deduplicate (in case same model appears in both tiers)
  chain = [...new Set(chain)];

  let lastError: Error | null = null;
  let hadDayQuotaError = false;
  let hadNonDayQuotaError = false;
  const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://travelplannerai-api.amitzahy1.workers.dev";

  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i];
    try {
      console.log(`🤖 [AI] Attempt ${i + 1}/${chain.length}: ${modelId} (${intent})`);

      // Normalize contents → always Content[] format: [{role:'user', parts:[{text:...}]}]
      let adaptedContents: any[];
      if (Array.isArray(contents) && contents.length > 0 && typeof contents[0] === 'object' && contents[0] !== null && 'role' in contents[0]) {
        // Already in Content[] format: [{role: 'user', parts: [...]}]
        adaptedContents = contents;
      } else if (Array.isArray(contents)) {
        // Array of strings/Parts → wrap into single Content
        adaptedContents = [{ role: 'user', parts: contents.map((c: any) => typeof c === 'string' ? { text: c } : c) }];
      } else if (typeof contents === 'string') {
        adaptedContents = [{ role: 'user', parts: [{ text: contents }] }];
      } else {
        adaptedContents = [{ role: 'user', parts: [contents] }];
      }

      const controller = new AbortController();
      // Worker has its own 25s race timeout. Frontend timeout MUST be longer,
      // otherwise we abort with "signal aborted" before the Worker can return
      // its clean 504/GeminiTimeout — and isTransientWorkerError never gets
      // to mark the failure transient. Setting frontend = 30s ensures the
      // Worker's 504 always wins the race.
      const timeoutMs = 30_000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      // SEARCH intent uses Google Search grounding on the Worker side.
      // Grounding is incompatible with structured JSON output (responseMimeType /
      // responseSchema), so we omit those for SEARCH and parse JSON from the
      // model's free-form text via cleanJSON() below.
      const isSearch = intent === 'SEARCH';
      const generationConfig = isSearch
        ? { ...config }  // keep caller-supplied temperature etc; Worker defaults to 0.2
        : {
            ...config,
            responseMimeType: "application/json",
            responseSchema: config.responseSchema || (intent === 'ANALYZE' ? TRIP_OUTPUT_SCHEMA : undefined),
          };

      const authHeader = await getAuthHeader();
      let response: Response;
      try {
        response = await fetch(`${WORKER_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          signal: controller.signal,
          body: JSON.stringify({
            contents: adaptedContents,  // Send full structured content (multimodal support)
            prompt: adaptedContents,    // Backward compat with old worker
            Model: modelId,
            intent,                     // Worker uses this to enable googleSearch tool for SEARCH
            tier: preferTier,           // 'paid' → Worker uses GEMINI_PREMIUM_KEY when set
            generationConfig,
          })
        });
      } finally {
        clearTimeout(timeout);  // always clear — prevents orphaned timers on network throws
      }

      // Rate-limit / temporary provider outage — wait and retry same model once.
      if (response.status === 429 || !response.ok) {
        let errDetail = '';
        if (!response.ok) {
          try {
            const errBody = await response.json();
            errDetail = errBody.error || errBody.message || '';
          } catch { /* ignore parse error */ }
        }

        if (!isTransientWorkerError(response.status, errDetail)) {
          console.error(`❌ [AI] Worker ${response.status} on ${modelId}:`, errDetail || response.statusText);
          throw new Error(`Worker Error: ${response.status}${errDetail ? ` — ${errDetail}` : ''}`);
        }

        const retryAfterHeader = Number(response.headers.get('retry-after'));
        const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : parseRetryDelayMs(errDetail);
        console.warn(`⏳ [AI] Temporary failure on ${modelId}, waiting ${Math.ceil(retryAfterMs / 1000)}s...`);
        await delay(retryAfterMs);

        // Retry once on same model — include full config to match original request.
        const retryAuthHeader = await getAuthHeader();
        const retryResponse = await fetch(`${WORKER_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...retryAuthHeader },
          body: JSON.stringify({
            contents: adaptedContents,
            prompt: adaptedContents,
            Model: modelId,
            intent,
            tier: preferTier,
            generationConfig,
          })
        });
        if (!retryResponse.ok) {
          let errDetail = '';
          try { const e = await retryResponse.json(); errDetail = e.error || ''; } catch { /* ignore */ }
          throw new Error(`Retry failed: ${retryResponse.status}${errDetail ? ` — ${errDetail}` : ''}`);
        }
        const retryData = await retryResponse.json();
        const rawRetryText = retryData.text;
        // SEARCH responses are grounded free-form text — extract JSON via cleanJSON.
        const retryText = isSearch ? cleanJSON(rawRetryText) : rawRetryText;
        JSON.parse(retryText);
        console.log(`✅ [AI] Success with ${modelId} (after retry)`);
        return { text: retryText, model: modelId };
      }

      const data = await response.json();
      // For non-SEARCH intents the Worker enforces a JSON schema, so we can
      // parse straight through. SEARCH responses come back as grounded
      // free-form text — strip prose / fences before parsing.
      const rawText = data.text;
      const text = isSearch ? cleanJSON(rawText) : rawText;
      JSON.parse(text); // Verify JSON validity

      console.log(`✅ [AI] Success with ${modelId}${isSearch ? ' (grounded)' : ''}`);
      return { text, model: modelId };

    } catch (error: any) {
      console.warn(`⚠️ [AI] Failed ${modelId}:`, error.message);
      lastError = error;
      const isDayQuotaError = /PerDay|per_day|GenerateRequestsPerDay|InputTokensPerModelPerDay/i.test(error.message || '');
      if (isDayQuotaError) hadDayQuotaError = true;
      else hadNonDayQuotaError = true;
      // Small backoff between different models
      if (i < chain.length - 1) {
        await delay(500 * (i + 1));
      }
    }
  }

  console.error("❌ [AI] All models failed.");
  const lastMsg = lastError?.message || '';
  // FreeTier billing failure — distinct from a daily-quota cap. The
  // project's API key is on a Google Cloud project without billing
  // enabled, so every model lands at limit:0. Surface a clearer message
  // so the user fixes the right thing (Google Cloud billing) instead of
  // waiting a day.
  const isFreeTierBilling = /FreeTier|free_tier|limit:\s*0/i.test(lastMsg);
  if (isFreeTierBilling) {
    throw new Error(`FreeTierBilling — Gemini API key is on a Google Cloud project without billing enabled. Enable billing on the project or swap the GEMINI_API_KEY in the worker. Last error: ${lastMsg}`);
  }
  // Only surface a hard daily-quota message when every observed failure was
  // day-quota related. If Flash failed due to temporary demand after Pro quota
  // errors, keep the true last error so callers can retry later.
  if (hadDayQuotaError && !hadNonDayQuotaError) {
    throw new Error(`PerDay quota exhausted — all models failed. Last error: ${lastMsg}`);
  }
  throw lastError || new Error("All AI models failed to generate response.");
};

// ============================================================================
// 🔬 DEEP RESEARCH TEXT PARSER
// ============================================================================
//
// Takes raw text from an external Deep Research session (ChatGPT, Gemini
// Advanced, Claude with web access) and coerces it into our internal
// Restaurant / Attraction shape. Routed through SMART intent + Flash-Lite —
// no grounding (we already have the research), structured-JSON output mode,
// pennies per import.

export interface DeepResearchParseResult {
  restaurants: any[];
  attractions: any[];
  newRestaurantCategories: string[];
  newAttractionCategories: string[];
}

const DEEP_RESEARCH_PARSE_PROMPT = `
You are a JSON normalizer. The user pasted the raw output of a Deep Research
session about restaurants and attractions for a specific trip. The input may
be ANY format — strict JSON, narrative prose, markdown tables, mixed Hebrew
and English, headings with bullet lists, a research paper with tables at the
end of each section. Extract every distinct restaurant or attraction the
research mentions and convert them to the JSON schema below.

Extraction rules:
- A "restaurant" or "attraction" is a named venue with at least a Hebrew
  description OR a category OR a vibe/location field.
- If the input has tables at the end of city sections (common in Gemini
  Deep Research output), each table row is one entry.
- COLUMN MAPPING (CRITICAL — this is where Deep Research outputs trip people up):
   * The "Name" / "שם המסעדה" column → "name" field. This is the LATIN /
     ENGLISH venue name (e.g. "Baan Tepa", "Wat Pho"). NEVER put Hebrew
     prose, descriptions, or non-Latin scripts in the "name" field.
   * The "Hebrew Description" / "תיאור בעברית" column → "description" field.
   * The "Category" / "קטגוריה" column → "categoryTitle" field.
   * The "Vibe/Location" / "סגנון ומיקום" column → "vibe" + "location" fields.
   * The "Source" / "מקור" column → "recommendationSource" field.
- If the input shows the name in original script (Thai/Arabic/Hebrew) AND a
  Latin transliteration, USE THE LATIN ONE for "name". Drop the original-script.
- If the narrative mentions a venue but it's NOT in any table, still
  extract it — pull the description from the surrounding paragraph.
- Do not invent, summarize, or expand. Only extract what is explicitly
  present in the input.

OUTPUT SCHEMA (no markdown, no prose, only this object):
{
  "restaurants": [
    {
      "name": string,                       // original-script display name
      "nameEnglish": string,                // Latin-script
      "description": string,                // Hebrew if present, otherwise English
      "location": string,                   // address as written
      "lat": number,                        // optional
      "lng": number,                        // optional
      "priceLevel": "$" | "$$" | "$$$" | "$$$$",  // optional
      "priceRange": string,                 // optional, display
      "cuisine": string,                    // optional
      "must_try_dish": string,              // optional
      "recommendedDishes": string[],        // optional, max 5
      "vibe": string,                       // optional
      "bestTime": "Breakfast" | "Lunch" | "Dinner" | "Late Night",
      "reservationRequired": boolean,       // only if explicitly stated
      "googleRating": number,               // 0–5
      "reviewCount": number,
      "michelin": boolean,                  // only if explicitly Michelin
      "tags": string[],                     // optional, max 5
      "recommendationSource": string,       // verbatim source name
      "categoryTitle": string,              // Hebrew category name
      "googleMapsUrl": string,              // only if a real URL is present
      "googleSearchQuery": string           // optional, "{name} {city}"
    }
  ],
  "attractions": [
    {
      "name": string, "nameEnglish": string, "description": string,
      "location": string, "lat": number, "lng": number,
      "price": string, "costNumeric": number,
      "rating": number, "reviewCount": number,
      "type": string,
      "activity_type": string,
      "duration": string,
      "best_time_to_visit": string,
      "recommendationSource": string,
      "categoryTitle": string,
      "googleMapsUrl": string
    }
  ],
  "newRestaurantCategories": string[],
  "newAttractionCategories": string[]
}

RULES:
1. OMIT any field you cannot fill with confidence from the input. Empty
   string and null are NOT acceptable values — leave the key out entirely.
2. Never invent lat/lng. Only include them if the input explicitly states
   decimal coordinates.
3. \`name\` and \`nameEnglish\` MUST be venue display names — never an
   address fragment, "Moo X", "Soi Y", or coordinates.
4. \`recommendedDishes\` and \`tags\` capped at 5 entries each.
5. \`categoryTitle\` should match one of the existing trip categories when
   the entry obviously belongs to it. If clearly distinct, propose a new
   short Hebrew title and ALSO list it in \`newRestaurantCategories\` /
   \`newAttractionCategories\`.

INPUT (raw Deep Research text follows the marker):
========== DEEP RESEARCH TEXT ==========
`;

export const parseDeepResearchText = async (rawText: string): Promise<DeepResearchParseResult> => {
  if (!rawText || rawText.trim().length < 50) {
    throw new Error('Deep Research text is too short to parse (need ≥50 chars).');
  }

  // FAST PATH: input is already valid JSON in our schema. Skip Flash-Lite —
  // sending 50KB of JSON to the LLM only to receive 50KB back blows the
  // Worker's 25s timeout and costs money for zero value.
  //
  // Two accepted shapes:
  //   A) Native Deep schema: { restaurants: [...], attractions: [...] }
  //   B) Quick schema (from buildExternalAiPrompt):
  //      { kind: 'attractions'|'restaurants', categories: [{ title, attractions|restaurants: [...] }] }
  // Shape B is flattened into A — each item gets `categoryTitle` from its parent.
  //
  // Aggressive prose-stripping: Gemini often prepends "Here is the JSON:"
  // or wraps in ```json …``` fences even when told not to. We strip fences,
  // then carve out the first balanced { … } block by brace counting before
  // attempting JSON.parse — same recovery the slow-path uses.
  const stripped = rawText.replace(/```json|```/g, '').trim();
  let candidateJson: string | null = null;
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidateJson = stripped.slice(firstBrace, lastBrace + 1);
  }
  try {
    if (!candidateJson) throw new Error('no-brace');
    const direct = JSON.parse(candidateJson);

    // Shape A
    if (direct && (Array.isArray(direct.restaurants) || Array.isArray(direct.attractions))) {
      console.log('[DeepResearch] Fast-path: native Deep JSON, skipping Flash-Lite');
      return {
        restaurants: Array.isArray(direct.restaurants) ? direct.restaurants : [],
        attractions: Array.isArray(direct.attractions) ? direct.attractions : [],
        newRestaurantCategories: Array.isArray(direct.newRestaurantCategories) ? direct.newRestaurantCategories : [],
        newAttractionCategories: Array.isArray(direct.newAttractionCategories) ? direct.newAttractionCategories : [],
      };
    }

    // Shape B — Quick-prompt categories schema. Flatten and tag each item
    // with categoryTitle from its parent.
    if (direct && (direct.kind === 'attractions' || direct.kind === 'restaurants') && Array.isArray(direct.categories)) {
      console.log('[DeepResearch] Fast-path: Quick-schema JSON, flattening categories');
      const itemKey: 'attractions' | 'restaurants' = direct.kind;
      const flattened: any[] = [];
      const titles: string[] = [];
      for (const cat of direct.categories) {
        const title = typeof cat?.title === 'string' ? cat.title.trim() : '';
        if (!title) continue;
        titles.push(title);
        const items = Array.isArray(cat?.[itemKey]) ? cat[itemKey] : [];
        for (const item of items) {
          if (!item || typeof item.name !== 'string') continue;
          flattened.push({ ...item, categoryTitle: title });
        }
      }
      return {
        restaurants: itemKey === 'restaurants' ? flattened : [],
        attractions: itemKey === 'attractions' ? flattened : [],
        newRestaurantCategories: itemKey === 'restaurants' ? titles : [],
        newAttractionCategories: itemKey === 'attractions' ? titles : [],
      };
    }
  } catch (err) {
    // Not valid JSON — fall through to LLM parsing for narrative / table inputs.
    // Log so the user can see in the console why the fast-path didn't trigger
    // (e.g. malformed paste, truncated JSON, unexpected shape).
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[DeepResearch] Fast-path skipped — falling through to LLM. Reason:', msg);
  }

  const prompt = `${DEEP_RESEARCH_PARSE_PROMPT}\n${rawText}\n========== END ==========\nReturn ONLY the JSON object now.`;

  // Use the PAID key — Deep Research outputs are 5–15k tokens long, which
  // burns through the free 20/day Flash-Lite quota in a single import.
  // Cost is still tiny (~$0.003 per import on Flash-Lite paid).
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    {
      responseMimeType: 'application/json',
      temperature: 0.1,
      // No responseSchema — Gemini can be picky about deeply optional schemas.
      // The parser below is forgiving.
    },
    'SMART',  // routes to Flash-Lite first → cheapest path
    'paid'    // bypass the 20/day free-tier ceiling
  );

  const text: string = response?.text || '';
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Strip code fences, then extract the first balanced { ... } block —
    // covers Gemini Deep Research outputs that wrap JSON in prose / markdown.
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace < 0 || lastBrace <= firstBrace) {
        throw new Error('Parser could not locate a JSON object in the response.');
      }
      parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }

  return {
    restaurants: Array.isArray(parsed?.restaurants) ? parsed.restaurants : [],
    attractions: Array.isArray(parsed?.attractions) ? parsed.attractions : [],
    newRestaurantCategories: Array.isArray(parsed?.newRestaurantCategories) ? parsed.newRestaurantCategories : [],
    newAttractionCategories: Array.isArray(parsed?.newAttractionCategories) ? parsed.newAttractionCategories : [],
  };
};

// ============================================================================
// 🧠 THE EXTRACTION PROMPT — Best-Practice Prompt Engineering
// ============================================================================
//
// Techniques used:
// 1. Role anchoring with expertise domains
// 2. Document classification FIRST (route to specialized logic)
// 3. Chain-of-thought reasoning (analyze before extracting)
// 4. Few-shot examples (Hebrew ticket → correct output)
// 5. Exhaustive field coverage (every field in our types)
// 6. Strict locale-aware parsing (RTL, date/currency disambiguation)
// 7. Cross-document linking (connect flights to hotels by date/city)
// 8. Confidence scoring per extracted item
//

export const SYSTEM_PROMPT_ANALYZE_TRIP = `
You are an Elite Travel Document Intelligence System, combining expertise from:
- IATA NDC data standards for aviation
- Hotel industry PMS (Property Management System) standards
- Google Document AI visual parsing
- Multi-language OCR with specialization in Hebrew, Arabic, English
- Maritime & Rail transport standards

═══════════════════════════════════════════════════════════════
PHASE 1: DOCUMENT CLASSIFICATION & VISUAL CALIBRATION
═══════════════════════════════════════════════════════════════

Before extracting ANY data, classify each document:
- **E-Ticket / Boarding Pass** → Extract flights, PNR, baggage, terminal
- **Train Ticket** → Extract train number, carriage, seat, platform
- **Cruise Confirmation** → Extract ship name, cabin, ports of call
- **Ferry Ticket** → Extract vessel, vehicle details, deck
- **Bus Ticket** → Extract operator, seat, bus station
- **Hotel Confirmation** → Extract hotel, dates, room, price, cancellation, meal plan
- **Car Rental Agreement** → Extract provider, dates, pickup/dropoff, price, insurance
- **Restaurant / Activity Reservation** → Extract venue, date, time, party size
- **Travel Insurance** → Extract policy number, coverage dates, provider
- **Passport / Visa** → Extract document number, expiry, holder name
- **Invoice / Receipt** → Extract amounts, items, vendor
- **Unknown / Noise** → Report as unprocessable with reason

RTL & Bi-Directional Rules:
- Hebrew/Arabic text flows Right-to-Left, but NUMBERS flow Left-to-Right
- "897" stays "897" (never reverse digits)
- "תל אביב → לונדון" means Origin: Tel Aviv, Destination: London
- Read tables carefully: Hebrew tables may have reversed column order

═══════════════════════════════════════════════════════════════
PHASE 2: EXHAUSTIVE DATA EXTRACTION
═══════════════════════════════════════════════════════════════

A. TRANSPORT (Flights, Trains, Ferries, Cruises, Buses)
   
   Expected Output Format:
   { 
     "type": "flight" | "train" | "ferry" | "cruise" | "bus",
     "data": { ...specific fields... } 
   }

   1. FLIGHTS — Extract ALL fields:
      - airline (full name), airlineCode (IATA 2-letter)
      - flightNumber (e.g. "LY5103"), pnr (6-char), ticketNumber (13-digit)
      - departure: { city, iata (3-letter), isoDate (YYYY-MM-DD), time (HH:MM 24h) }
      - arrival: { city, iata (3-letter), isoDate (YYYY-MM-DD), time (HH:MM 24h) }
      - terminal, gate, baggage, seat, class (Economy/Business)
      - passengers (list), price: { amount, currency }
      
      ⚠️ MULTI-SEGMENT RULE (CRITICAL):
      - Each flight LEG must be a SEPARATE transport entry.
      - A round-trip (TLV→ATH outbound, ATH→TLV return) MUST produce TWO transport entries.

   2. TRAINS — Extract:
      - provider (e.g. "Eurostar", "Amtrak", "Renfe", "SNCF")
      - trainNumber, carriage, seat, platform, class
      - departure: { station, city, isoDate (YYYY-MM-DD), time (HH:MM) }
      - arrival: { station, city, isoDate (YYYY-MM-DD), time (HH:MM) }
      - bookingReference
   
   3. CRUISES — Extract:
      - cruiseLine (e.g. "Royal Caribbean"), shipName
      - cabinNumber, deck, bookingReference
      - departure: { port, isoDate, time }, arrival: { port, isoDate, time }
      - portsOfCall: [{ name, arrivalDate, departureDate }]
      - mealPlan (e.g. "All Inclusive", "Full Board")

   4. FERRIES — Extract:
      - provider, vesselName
      - departure: { port, isoDate, time }, arrival: { port, isoDate, time }
      - vehicle (e.g. "Car - Toyota Rav4", "Foot Passenger")
      - seat/cabin/deck

   5. BUSES — Extract:
      - provider (e.g. "FlixBus", "Greyhound"), busNumber
      - departure: { station, city, isoDate, time }
      - arrival: { station, city, isoDate, time }
      - seat

B. ACCOMMODATION (Hotels, Airbnb) — Extract ALL fields:
    - hotelName (exact name), address, city, country
    - checkIn: { isoDate, time }, checkOut: { isoDate, time }
    - bookingId, roomType, roomView (e.g. "Sea View")
    - guestName, numberOfGuests, numberOfRooms
    - mealPlan (e.g. "Room Only", "Breakfast Included", "Half Board", "All Inclusive")
    - cancellationPolicy (e.g. "Free cancellation until Mar 15")
    - checkInInstructions (e.g. "Keybox code 1234", "Reception open 24/7")
    - price: { amount, currency }
    - bookingSource (Booking.com, Airbnb, Agoda, Direct)

C. CAR RENTAL — Extract ALL fields:
    - provider, vehicleType (e.g. "Compact", "SUV")
    - pickup: { location, city, isoDate, time }
    - dropoff: { location, city, isoDate, time }
    - confirmationCode, driverName
    - insurance (e.g. "Full Coverage", "CDW Included")
    - mileageLimit (e.g. "Unlimited", "200km/day")
    - price: { amount, currency }

D. RESTAURANTS & ACTIVITIES:
    - name, address, city
    - reservationDate, reservationTime, partySize
    - type: "dining" | "activity"
    - cuisine (for dining), category (for activity)
    - price: { amount, currency }

E. WALLET (Documents):
    - type: "passport" | "visa" | "insurance" | "other"
    - documentName, holderName, documentNumber
    - expiryDate, issuingCountry

═══════════════════════════════════════════════════════════════
PHASE 3: DATE & TIME RULES (CRITICAL)
═══════════════════════════════════════════════════════════════

1. ALL dates MUST be ISO 8601: YYYY-MM-DD
2. ALL times MUST be 24-hour: HH:MM
3. If year is missing, assume 2026 (forward bias)
4. Hebrew months: ינואר=01, פברואר=02, מרץ=03, אפריל=04, מאי=05, יוני=06, 
   יולי=07, אוגוסט=08, ספטמבר=09, אוקטובר=10, נובמבר=11, דצמבר=12
5. ⚠️ THE "1930" TRAP: A 4-digit number after a date is TIME (19:30), NOT year!
6. Arrival MUST be after departure. If arrival < departure → add +1 day

═══════════════════════════════════════════════════════════════
PHASE 4: MULTI-DOCUMENT INTELLIGENCE
═══════════════════════════════════════════════════════════════

- Cross-reference dates to build a coherent timeline
- Link flights to hotels (arrival city = hotel city)
- Infer trip name from destinations
- Detect duplicates (e-ticket vs boarding pass)

═══════════════════════════════════════════════════════════════
PHASE 5: VALIDATION & SANITY CHECK
═══════════════════════════════════════════════════════════════

1. Arrival time is logically AFTER departure
2. IATA codes are 3 uppercase letters
3. Hotel check-out is after check-in
4. Prices are positive numbers
5. No "Unknown" if data is available

═══════════════════════════════════════════════════════════════
PHASE 6: OUTPUT FORMAT (STRICT JSON SCHEMA)
═══════════════════════════════════════════════════════════════

The output must strictly follow the provided JSON Schema.
Ensure all dates are YYYY-MM-DD.
Ensure all passengers are extracted into the 'passengers' array.
Ensure round-trip flights are SPLIT into separate transport items.

  "processedFileIds": ["filename.pdf"],
  "unprocessedFiles": [{ "fileName": "noise.pdf", "reason": "No travel data found" }],
  "categories": {
    "transport": [
      {
        "type": "flight" | "train" | "ferry" | "cruise" | "bus",
        "sourceFileIds": ["file.pdf"],
        "confidence": 0.95,
        "data": {
           // Common fields
           "departure": { "city", "iata", "station", "port", "isoDate", "time" },
           "arrival": { "city", "iata", "station", "port", "isoDate", "time" },
           "price": { "amount", "currency" },
           
           // Flight specific
           "airline", "flightNumber", "pnr", "ticketNumber", "terminal", "gate", "baggage", "seat", "class",
           
           // Train specific
           "provider", "trainNumber", "carriage", "platform",
           
           // Cruise/Ferry specific
           "shipName", "cabinNumber", "deck", "vehicle", "mealPlan",
           
           // Bus specific
           "busNumber"
        }
      }
    ],
    "accommodation": [
      {
        "type": "hotel" | "airbnb",
        "data": {
          "hotelName", "address", "city", "country",
          "checkIn": { "isoDate", "time" },
          "checkOut": { "isoDate", "time" },
          "bookingId", "roomType", "roomView", "mealPlan", "cancellationPolicy", "checkInInstructions",
          "guestName", "numberOfGuests", "price": { "amount", "currency" }, "bookingSource"
        }
      }
    ],
    "carRental": [
       {
         "type": "car_rental",
         "data": {
           "provider", "vehicleType", 
           "pickup": { "location", "city", "isoDate", "time" },
           "dropoff": { "location", "city", "isoDate", "time" },
           "confirmationCode", "driverName", "insurance", "mileageLimit", "price": { "amount", "currency" }
         }
       }
    ],
    "dining": [ ... ],
    "activities": [ ... ],
    "wallet": [ ... ]
  }
}
`;

// ============================================================================
// 📊 RUNTIME VALIDATION — Schema Guard (Pydantic-style for TypeScript)
// ============================================================================

/**
 * Validates and normalizes the raw AI output into a consistent StagedTripData.
 * Fixes common AI mistakes: wrong date formats, missing fields, wrong types.
 */
const normalizeExtractionResult = (raw: any): StagedTripData => {
  // Helper: fix dates to YYYY-MM-DD
  const fixDate = (d: any): string => {
    if (!d) return "";
    const str = String(d).trim();
    // Already ISO
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.split('T')[0];
    // European: DD/MM/YYYY or DD.MM.YYYY
    const eurMatch = str.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
    if (eurMatch) {
      const year = eurMatch[3].length === 2 ? `20${eurMatch[3]}` : eurMatch[3];
      return `${year}-${eurMatch[2].padStart(2, '0')}-${eurMatch[1].padStart(2, '0')}`;
    }
    return str;
  };

  // Helper: ensure time is HH:MM
  const fixTime = (t: any): string => {
    if (!t) return "";
    const str = String(t).trim();
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return str;
  };

  // Helper: extract date from nested object or string
  const extractDate = (obj: any, ...keys: string[]): string => {
    if (!obj) return "";
    for (const key of keys) {
      if (obj[key]) {
        if (typeof obj[key] === 'string') return fixDate(obj[key]);
        if (typeof obj[key] === 'object' && obj[key].isoDate) return fixDate(obj[key].isoDate);
      }
    }
    return "";
  };

  // Helper: extract time from nested object or string
  const extractTime = (obj: any, ...keys: string[]): string => {
    if (!obj) return "";
    for (const key of keys) {
      if (obj[key]) {
        if (typeof obj[key] === 'string') return fixTime(obj[key]);
        if (typeof obj[key] === 'object') {
          return fixTime(obj[key].time || obj[key].displayTime || "");
        }
      }
    }
    return "";
  };

  // Helper: extract price
  const extractPrice = (obj: any): { amount: number; currency: string } => {
    if (!obj) return { amount: 0, currency: "USD" };
    if (typeof obj === 'number') return { amount: obj, currency: "USD" };
    if (typeof obj === 'object') {
      return {
        amount: Number(obj.amount || obj.totalPrice || obj.price || 0),
        currency: String(obj.currency || "USD").toUpperCase()
      };
    }
    return { amount: 0, currency: "USD" };
  };

  // Ensure categories exist
  const cats = raw.categories || {};

  // Normalize transport
  const transport = (cats.transport || []).map((item: any) => {
    const d = item.data || {};
    const dep = d.departure || {};
    const arr = d.arrival || {};
    const type = item.type || 'flight';

    // Helper: Clean City Name (Remove Zip Codes like "Napareuli 2200")
    const cleanCity = (city: string) => {
      if (!city) return "";
      return city.replace(/\s+\d{3,6}$/, '').trim();
    };

    // Common Transport Data
    const commonData = {
      departure: {
        city: cleanCity(dep.city || d.fromCity || d.from || ""),
        iata: dep.iata || d.fromCode || "",
        station: dep.station || "",
        port: dep.port || "",
        isoDate: fixDate(dep.isoDate || dep.date || d.departureDate || d.date),
        displayTime: fixTime(dep.displayTime || dep.time || d.departureTime || "")
      },
      arrival: {
        city: cleanCity(arr.city || d.toCity || d.to || ""),
        iata: arr.iata || d.toCode || "",
        station: arr.station || "",
        port: arr.port || "",
        isoDate: fixDate(arr.isoDate || arr.date || d.arrivalDate || ""),
        displayTime: fixTime(arr.displayTime || arr.time || d.arrivalTime || "")
      },
      price: extractPrice(d.price || d.totalPrice),
      // Legacy compat
      from: cleanCity(dep.city || dep.port || dep.station || d.fromCity || d.from || ""),
      to: cleanCity(arr.city || arr.port || arr.station || d.toCity || d.to || ""),
      departureTime: fixTime(dep.displayTime || dep.time || d.departureTime || ""),
      displayTime: fixTime(dep.displayTime || dep.time || d.departureTime || "")
    };

    // Type-Specific Data
    let specificData = {};
    if (type === 'flight') {
      specificData = {
        airline: d.airline || d.airlineName || "",
        airlineCode: d.airlineCode || "",
        flightNumber: d.flightNumber || d.flight || "",
        pnr: d.pnr || d.bookingReference || "",
        ticketNumber: d.ticketNumber || "",
        passengers: d.passengers || (d.passengerName ? [d.passengerName] : []),
        terminal: d.terminal || dep.terminal || "",
        gate: d.gate || dep.gate || "",
        baggage: d.baggage || "",
        seat: d.seat || "",
        class: d.class || ""
      };
    } else if (type === 'train') {
      specificData = {
        provider: d.provider || d.operator || "",
        trainNumber: d.trainNumber || "",
        carriage: d.carriage || d.coach || "",
        seat: d.seat || "",
        platform: d.platform || "",
        class: d.class || "",
        bookingReference: d.bookingReference || ""
      };
    } else if (type === 'cruise' || type === 'ferry') {
      specificData = {
        provider: d.provider || d.operator || d.cruiseLine || "",
        shipName: d.shipName || d.vesselName || "",
        cabinNumber: d.cabinNumber || "",
        deck: d.deck || "",
        vehicle: d.vehicle || "",
        mealPlan: d.mealPlan || "",
        bookingReference: d.bookingReference || ""
      };
    } else if (type === 'bus') {
      specificData = {
        provider: d.provider || d.operator || "",
        busNumber: d.busNumber || "",
        seat: d.seat || ""
      };
    }

    return {
      type: type,
      sourceFileIds: item.sourceFileIds || [],
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
      data: { ...commonData, ...specificData }
    };
  });

  // Normalize accommodation
  const accommodation = (cats.accommodation || []).map((item: any) => {
    const d = item.data || {};
    const checkInDate = extractDate(d, 'checkIn', 'checkInDate');
    const checkOutDate = extractDate(d, 'checkOut', 'checkOutDate');
    const checkInTime = extractTime(d, 'checkIn') || "14:00";
    const checkOutTime = extractTime(d, 'checkOut') || "11:00";

    return {
      type: item.type || 'hotel',
      sourceFileIds: item.sourceFileIds || [],
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
      data: {
        hotelName: d.hotelName || d.name || "",
        name: d.hotelName || d.name || "",
        address: d.address || "",
        city: (d.city || "").replace(/\s+\d{3,6}$/, '').trim(),
        country: d.country || "",
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        checkIn: { isoDate: checkInDate, time: checkInTime },
        checkOut: { isoDate: checkOutDate, time: checkOutTime },
        bookingId: d.bookingId || d.confirmationCode || "",
        roomType: d.roomType || "",
        roomView: d.roomView || "",
        guests: d.guests || (d.guestName ? [d.guestName] : []),
        numberOfGuests: d.numberOfGuests || d.guests?.length || 1,
        breakfastIncluded: d.breakfastIncluded || (d.mealPlan && d.mealPlan.toLowerCase().includes('breakfast')) || false,
        mealPlan: d.mealPlan || "",
        cancellationPolicy: d.cancellationPolicy || "",
        checkInInstructions: d.checkInInstructions || "",
        bookingSource: d.bookingSource || "",
        totalPrice: extractPrice(d.price).amount,
        currency: extractPrice(d.price).currency,
        price: extractPrice(d.price),
        displayTime: `${checkInDate} ${checkInTime}`,
      }
    };
  });

  // Normalize car rental
  const carRental = (cats.carRental || []).map((item: any) => {
    const d = item.data || {};
    return {
      type: 'car_rental' as const,
      sourceFileIds: item.sourceFileIds || [],
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
      data: {
        provider: d.provider || "",
        vehicleType: d.vehicleType || "",
        pickupLocation: d.pickupLocation || "",
        pickupCity: d.pickupCity || "",
        pickupDate: fixDate(d.pickupDate),
        pickupTime: fixTime(d.pickupTime),
        dropoffLocation: d.dropoffLocation || "",
        dropoffCity: d.dropoffCity || "",
        dropoffDate: fixDate(d.dropoffDate),
        dropoffTime: fixTime(d.dropoffTime),
        confirmationCode: d.confirmationCode || "",
        driverName: d.driverName || "",
        insurance: d.insurance || "",
        mileageLimit: d.mileageLimit || "",
        price: extractPrice(d.price),
        displayTime: `${fixDate(d.pickupDate)} ${fixTime(d.pickupTime)}`,
        from: d.pickupCity || d.pickupLocation || "",
        to: d.dropoffCity || d.dropoffLocation || "",
      }
    };
  });

  // Normalize wallet
  const wallet = (cats.wallet || []).map((item: any) => {
    const d = item.data || {};
    return {
      type: item.type || 'other',
      sourceFileIds: item.sourceFileIds || [],
      isSensitive: item.isSensitive !== false,
      title: item.title || d.documentName || item.type || "Document",
      data: {
        documentName: d.documentName || item.title || "",
        holderName: d.holderName || "",
        documentNumber: d.documentNumber || "",
        expiryDate: fixDate(d.expiryDate || d.validUntil),
        validUntil: fixDate(d.validUntil || d.expiryDate),
        issuingCountry: d.issuingCountry || "",
        displayTime: d.displayTime || (d.expiryDate ? `Valid until ${fixDate(d.expiryDate)}` : ""),
      },
      uiMessage: item.uiMessage || "Stored securely on your device only"
    };
  });

  // Normalize dining
  const dining = (cats.dining || []).map((item: any) => {
    const d = item.data || {};
    return {
      type: item.type || 'dining',
      sourceFileIds: item.sourceFileIds || [],
      title: item.title || d.name || "",
      data: {
        name: d.name || "",
        address: d.address || "",
        city: d.city || "",
        reservationDate: fixDate(d.reservationDate),
        reservationTime: fixTime(d.reservationTime),
        partySize: d.partySize || d.guests || 0,
        cuisine: d.cuisine || d.inferredCuisine || "",
        confirmationCode: d.confirmationCode || "",
        price: extractPrice(d.price),
        displayTime: d.displayTime || `${fixDate(d.reservationDate)} ${fixTime(d.reservationTime)}`.trim(),
      },
      uiMessage: item.uiMessage || ""
    };
  });

  // Normalize activities
  const activities = (cats.activities || []).map((item: any) => {
    const d = item.data || {};
    return {
      type: item.type || 'activity',
      sourceFileIds: item.sourceFileIds || [],
      title: item.title || d.name || "",
      data: {
        name: d.name || "",
        address: d.address || "",
        city: d.city || "",
        reservationDate: fixDate(d.reservationDate || d.date),
        reservationTime: fixTime(d.reservationTime || d.time),
        displayTime: d.displayTime || `${fixDate(d.reservationDate || d.date)} ${fixTime(d.reservationTime || d.time)}`.trim(),
      },
      uiMessage: item.uiMessage || ""
    };
  });

  // Build metadata
  const meta = raw.tripMetadata || {};

  // Collect all dates for start/end inference
  const allDates: string[] = [];
  transport.forEach((t: any) => {
    if (t.data.departure?.isoDate) allDates.push(t.data.departure.isoDate);
    if (t.data.arrival?.isoDate) allDates.push(t.data.arrival.isoDate);
  });
  accommodation.forEach((a: any) => {
    if (a.data.checkInDate) allDates.push(a.data.checkInDate);
    if (a.data.checkOutDate) allDates.push(a.data.checkOutDate);
  });
  carRental.forEach((c: any) => {
    if (c.data.pickupDate) allDates.push(c.data.pickupDate);
    if (c.data.dropoffDate) allDates.push(c.data.dropoffDate);
  });
  const sortedDates = allDates.filter(Boolean).sort();

  return {
    tripMetadata: {
      suggestedName: meta.suggestedName || "New Trip",
      suggestedDates: sortedDates.length >= 2 ? `${sortedDates[0]} - ${sortedDates[sortedDates.length - 1]}` : "",
      mainDestination: meta.mainDestination || "",
      uniqueCityNames: meta.uniqueCityNames || [],
    },
    processedFileIds: raw.processedFileIds || [],
    unprocessedFiles: raw.unprocessedFiles || [],
    categories: {
      transport,
      accommodation,
      carRental,
      wallet,
      dining,
      activities,
    } as any, // Using any to handle the extended StagedCategories
  };
};

// ============================================================================
// 🔍 VALIDATION — Post-Extraction Sanity Checks
// ============================================================================

export const validateTripData = (data: TripAnalysisResult): TripAnalysisResult => {
  const validated = { ...data };
  const raw = validated.rawStagedData;

  if (!raw?.categories) return validated;

  // Helper: fix date order
  const ensureOrder = (start: string, end: string): [string, string] => {
    if (!start || !end) return [start, end];
    return new Date(start) > new Date(end) ? [end, start] : [start, end];
  };

  // 1. TRANSPORT VALIDATION & INFERENCE
  if (raw.categories.transport) {
    raw.categories.transport = raw.categories.transport.map((item: any) => {
      // Fix overnight arrival (if arrival < departure, add +1 day)
      if (item.data.departure?.isoDate && item.data.arrival?.isoDate) {
        const depStr = `${item.data.departure.isoDate}T${item.data.departure.displayTime || '00:00'}`;
        const arrStr = `${item.data.arrival.isoDate}T${item.data.arrival.displayTime || '00:00'}`;

        if (new Date(arrStr) < new Date(depStr)) {
          console.warn(`⚠️ Fixing overnight travel: ${item.type} ${item.data.flightNumber || item.data.trainNumber}`);
          const nextDay = new Date(new Date(depStr));
          nextDay.setDate(nextDay.getDate() + 1);
          item.data.arrival.isoDate = nextDay.toISOString().split('T')[0];
        }
      }

      // Context Inference: If missing arrival city, check hotels starting on that date
      if (!item.data.arrival?.city && item.data.arrival?.isoDate && raw.categories.accommodation) {
        const matchingHotel = raw.categories.accommodation.find((h: any) => h.data.checkInDate === item.data.arrival.isoDate);
        if (matchingHotel?.data.city) {
          console.log(`🧠 Inferred arrival city ${matchingHotel.data.city} from hotel ${matchingHotel.data.hotelName}`);
          item.data.arrival.city = matchingHotel.data.city;
          item.data.to = matchingHotel.data.city;
        }
      }

      return item;
    }).filter((item: any) => {
      // Filter out empty items
      return item.data.departure?.isoDate || item.data.arrival?.isoDate || item.data.bookingReference;
    });
  }

  // 2. ACCOMMODATION VALIDATION
  if (raw.categories.accommodation) {
    raw.categories.accommodation = raw.categories.accommodation.map((item: any) => {
      // Ensure Check-In < Check-Out
      if (item.data.checkInDate && item.data.checkOutDate) {
        const [start, end] = ensureOrder(item.data.checkInDate, item.data.checkOutDate);
        item.data.checkInDate = start;
        item.data.checkOutDate = end;
        item.data.checkIn.isoDate = start;
        item.data.checkOut.isoDate = end;
      }
      return item;
    });
  }

  // 3. CAR RENTAL VALIDATION
  if (raw.categories.carRental) {
    raw.categories.carRental = raw.categories.carRental.map((item: any) => {
      // Ensure Pickup < Dropoff
      if (item.data.pickupDate && item.data.dropoffDate) {
        const [start, end] = ensureOrder(item.data.pickupDate, item.data.dropoffDate);
        item.data.pickupDate = start;
        item.data.dropoffDate = end;
      }
      return item;
    });
  }

  // 4. METADATA ENRICHMENT
  const meta = validated.metadata;
  // Ensure main destination is in cities list
  if (meta.destination && !meta.cities.includes(meta.destination)) {
    meta.cities.push(meta.destination);
  }
  // If destination is missing, try to infer from first hotel
  if (!meta.destination && raw.categories.accommodation?.length > 0) {
    meta.destination = raw.categories.accommodation[0].data.city;
    meta.cities.push(meta.destination);
  }

  return validated;
};

// ============================================================================
// 📄 ANALYZE TRIP FILES — THE MASTER PARSER
// ============================================================================

export const analyzeTripFiles = async (files: File[]): Promise<TripAnalysisResult> => {
  // 1. Validate and filter files
  const { validFiles, errors } = validateFiles(files);
  if (validFiles.length === 0) {
    throw new Error(errors.length > 0 ? errors[0].reason : "No valid files to analyze.");
  }

  // Filter out email files (not supported in vision API)
  const safeFiles = validFiles.filter(f => !f.type.includes('message/rfc822') && !f.name.endsWith('.eml'));
  if (safeFiles.length === 0) throw new Error("No processable files found. Email files (.eml) are not supported for direct upload.");

  // 2. Build multimodal request with the UNIFIED prompt
  const contentParts: any[] = [
    { text: SYSTEM_PROMPT_ANALYZE_TRIP },
    { text: `\n\nProcess the following ${safeFiles.length} file(s). Return the extracted data as JSON.\nFile names: ${safeFiles.map(f => f.name).join(', ')}` }
  ];

  const processedFileNames: string[] = [];

  for (const file of safeFiles) {
    try {
      const base64 = await readFileAsBase64(file);
      // Normalize MIME type
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (file.name.match(/\.(jpg|jpeg)$/i)) mimeType = 'image/jpeg';
        else if (file.name.endsWith('.png')) mimeType = 'image/png';
        else if (file.name.endsWith('.webp')) mimeType = 'image/webp';
        else mimeType = 'text/plain';
      }
      contentParts.push({ inlineData: { mimeType, data: base64 } });
      processedFileNames.push(file.name);
    } catch (e) {
      console.warn(`⚠️ Skipping file ${file.name}: ${e}`);
      errors.push({ fileName: file.name, reason: `Failed to read file: ${e}` });
    }
  }

  // 3. Send to the SMART model chain (see SMART_CANDIDATES at the top of this file).
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    {},
    'SMART'
  );

  // 4. Parse and normalize with schema validation
  let raw: any;
  try {
    raw = JSON.parse(cleanJSON(response.text));
  } catch (e) {
    console.error("❌ JSON parsing failed:", e);
    console.error("Raw text (first 500 chars):", response.text?.substring(0, 500));
    throw new Error("Failed to parse AI response. The AI returned invalid JSON.");
  }

  // 5. Normalize through our schema validator
  const normalizedData = normalizeExtractionResult(raw);

  // Add file tracking
  normalizedData.processedFileIds = processedFileNames;
  normalizedData.unprocessedFiles = [
    ...(normalizedData.unprocessedFiles || []),
    ...errors.map(e => ({ fileName: e.fileName, reason: e.reason }))
  ];

  // 6. Build result
  const allDates: string[] = [];
  normalizedData.categories.transport.forEach((t: any) => {
    if (t.data.departure?.isoDate) allDates.push(t.data.departure.isoDate);
  });
  normalizedData.categories.accommodation.forEach((a: any) => {
    if (a.data.checkInDate) allDates.push(a.data.checkInDate);
    if (a.data.checkOutDate) allDates.push(a.data.checkOutDate);
  });
  const sortedDates = allDates.filter(Boolean).sort();

  const result: TripAnalysisResult = {
    metadata: {
      suggestedName: normalizedData.tripMetadata.suggestedName || "New Imported Trip",
      destination: normalizedData.tripMetadata.mainDestination || "",
      startDate: sortedDates[0] || "",
      endDate: sortedDates[sortedDates.length - 1] || "",
      cities: normalizedData.tripMetadata.uniqueCityNames || []
    },
    processedFileIds: normalizedData.processedFileIds,
    unprocessedFiles: normalizedData.unprocessedFiles,
    rawStagedData: normalizedData
  };

  // 7. Final validation
  return validateTripData(result);
};

// ============================================================================
// 🔧 OTHER AI TASK IMPLEMENTATIONS
// ============================================================================

export const getDestinationRestaurants = async (destination: string, preferences?: string): Promise<any[]> => {
  const prompt = `Find 5 top-rated restaurants in ${destination}. ${preferences || ''}. JSON output only: { "restaurants": [{ "name", "cuisine", "priceLevel", "description" }] }`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json' },
    'SMART'
  );
  return JSON.parse(response.text).restaurants || [];
};

export const getAttractions = async (destination: string, interests?: string): Promise<any[]> => {
  const prompt = `Suggest 5 attractions in ${destination}. ${interests || ''}. JSON output only: { "attractions": [{ "name", "category", "description", "estimatedTime" }] }`;
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
