import { StagedTripData, StagedCategories } from "../types";
import { TRIP_OUTPUT_SCHEMA } from "./aiSchema";
import { auth } from "./firebaseConfig";
import { parseJsonLenient, sanitizeJsonControlChars } from "./jsonSanitizer";
import { applyProbeToChain, markModelFailed, getCachedRemoteChains, getRemoteChains } from "./aiHealth";

// Fire-and-forget boot-time fetch — pulls the dynamically-synced chains from
// /api/chains so generateWithFallback can prefer them over the hardcoded
// constants below. Falls back gracefully when the Worker is unreachable.
void getRemoteChains();
import { toast } from "../stores/useToastStore";

// Fire the "ungrounded SEARCH" warning only ONCE per browser session — the
// underlying cause (Gemini spend-cap exhausted) is persistent for ~hours, so
// repeating the toast on every restaurant/attraction click is just noise.
let warnedUngroundedThisSession = false;

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

// Multi-provider model chains. Named GOOGLE_MODELS for backwards compat with
// existing imports, but as of 2026-05-21 it spans Gemini + Groq + OpenRouter:
//   - Gemini: PREMIUM key (billing-enabled) by default in the Worker. When the
//     project hits its monthly spend cap, every Gemini model returns 429.
//   - Groq: free, no card, no spend cap. Llama 3.3 70B handles JSON extraction
//     comparably to Gemini Flash for trip parsing. Requires GROQ_API_KEY in
//     the Worker (get one at https://console.groq.com/keys).
//   - OpenRouter free tier: shared across multiple models so even when one
//     model is rate-limited another usually has headroom.
//
// Order intent: when Gemini is healthy, it wins. When Gemini spend-caps,
// services/aiHealth.ts auto-demotes it (cached 10 min) so Groq takes over
// without per-request retry-burn.
export const GOOGLE_MODELS = {
  // Tier 1: SMART intent (text-only trip extraction, hotel/flight matching).
  // Order per user direction (2026-05-21): trip-creation quality > cost,
  // so Gemini Pro is primary. Behind it sit the strongest verified free
  // providers (Groq → OpenRouter) and finally smaller / rate-limited
  // backups.
  //
  // All slugs probe-verified 2026-05-21. Removed: deepseek-v4-flash:free
  // (402 paid-only), and 4 hallucinated slugs that don't exist.
  SMART_CANDIDATES: [
    "gemini-2.5-pro",                                              // PRIMARY — best accuracy for trip base
    "gemini-3.5-flash",                                            // strong Gemini fallback
    "groq:openai/gpt-oss-120b",                                    // ⭐ 120B model @ 133ms — best free SMART option
    "groq:llama-3.3-70b-versatile",                                // ⭐ 64ms — fastest Groq
    "groq:meta-llama/llama-4-scout-17b-16e-instruct",              // Llama 4 generation (slower but newest)
    "groq:qwen/qwen3-32b",                                         // Qwen 3 reasoning
    "openrouter:nvidia/nemotron-3-super-120b-a12b:free",           // 120B NVIDIA, slow but works
    "openrouter:arcee-ai/trinity-large-thinking:free",             // thinking model, slow but works
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "groq:openai/gpt-oss-20b",                                     // smaller GPT-OSS @ 102ms
    "groq:llama-3.1-8b-instant",                                   // tiny Groq fallback
    "openrouter:meta-llama/llama-3.3-70b-instruct:free",           // rate-limited but real
    "openrouter:nousresearch/hermes-3-llama-3.1-405b:free",        // 405B rate-limited but real
    "openrouter:google/gemma-4-31b-it:free",                       // Gemma 4 rate-limited but real
    "gemini-2.5-flash-lite",
  ],
  // Tier 2: SEARCH intent (restaurant/attraction market research, grounded).
  // Grounding ONLY works on Gemini. Non-Gemini = ungrounded fallbacks.
  RESEARCH_CANDIDATES: [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "groq:openai/gpt-oss-120b",                                    // ⭐ 120B ungrounded
    "groq:llama-3.3-70b-versatile",                                // 64ms ungrounded
    "openrouter:nvidia/nemotron-3-super-120b-a12b:free",           // 120B ungrounded backup
    "openrouter:nousresearch/hermes-3-llama-3.1-405b:free",        // 405B (rate-limited)
    "openrouter:meta-llama/llama-3.3-70b-instruct:free",           // (rate-limited)
  ],
  // Tier 3: FAST intent (chat, quick suggestions). Latency > capability.
  FAST_CANDIDATES: [
    "gemini-3.1-flash-lite",
    "groq:llama-3.1-8b-instant",                                   // ⭐ 173ms — fastest free
    "groq:openai/gpt-oss-20b",                                     // ⭐ 102ms — even faster GPT-OSS small
    "groq:llama-3.3-70b-versatile",                                // 64ms — overkill for chat but free
    "gemini-2.5-flash-lite",
    "groq:openai/gpt-oss-120b",                                    // 133ms — overkill but available
    "gemini-2.5-flash",
    "openrouter:google/gemma-4-26b-a4b-it:free",                   // Gemma 4 small (rate-limited)
    "openrouter:meta-llama/llama-3.3-70b-instruct:free",
  ],
  // Tier 4: ANALYZE intent — deep document/PDF extraction. Pro 2.5 PRIMARY
  // (user-locked: trip-creation quality > cost). Multimodal is Gemini-only;
  // other models help when content has been converted to text upstream.
  DOC_CANDIDATES: [
    "gemini-2.5-pro",                                              // PRIMARY — best multimodal PDF
    "gemini-3.5-flash",                                            // multimodal fallback
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "groq:openai/gpt-oss-120b",                                    // ⭐ 120B text-only post-extraction
    "groq:llama-3.3-70b-versatile",                                // text-only fallback
    "openrouter:arcee-ai/trinity-large-thinking:free",             // text-only reasoning fallback
    "openrouter:nvidia/nemotron-3-super-120b-a12b:free",           // text-only 120B fallback
  ],
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

  // Phase 4: Escape unescaped control chars and literal quotes inside string
  // values (the most common LLM corruption — see services/jsonSanitizer.ts).
  // Cheap to always apply: a valid JSON string is a fixed-point of the sanitizer.
  cleaned = sanitizeJsonControlChars(cleaned);

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

/**
 * Map a Worker / Gemini error to a single-line remediation action the user
 * can take. Used by both the console error path and the final "all models
 * failed" toast so the user never has to guess what to do.
 *
 * Returns `null` for transient errors that auto-recover (the chain will
 * retry; no user action needed).
 */
export const classifyAiError = (
  status: number,
  message: string,
  diag?: { key?: string; keyTail?: string },
): { kind: 'QUOTA' | 'PERMISSION' | 'INVALID_MODEL' | 'AUTH' | 'TIMEOUT' | 'UNKNOWN'; action: string } | null => {
  const m = (message || '').slice(0, 800);
  const tail = diag?.keyTail || '????';
  const key = diag?.key || 'UNKNOWN';

  // Monthly spending cap — Google-Cloud-side budget limit the user set themselves.
  // Distinct from quota: raising RPM/RPD does nothing; user must adjust the cap.
  if (/spending cap|spend cap|exceeded.*spend|monthly.*spending|project spend|ai\.studio\/spend/i.test(m)) {
    return {
      kind: 'QUOTA',
      action: `Project monthly SPEND CAP exhausted on the ${key} key ending in ${tail}. ` +
        `Go to https://ai.studio/spend and either raise the monthly cap or remove it. ` +
        `Identify the project at https://aistudio.google.com/app/apikey (match the key tail ${tail}).`,
    };
  }
  // Daily quota: definitive cap, retrying won't help.
  if (/PerDay|per_day|GenerateRequestsPerDay|InputTokensPerModelPerDay|limit:\s*0/i.test(m)) {
    return {
      kind: 'QUOTA',
      action: `Daily quota exhausted on the ${key} key ending in ${tail}. ` +
        `Enable billing OR increase quota for the project owning this key. ` +
        `Find the key at https://aistudio.google.com/app/apikey ; manage quotas at https://console.cloud.google.com/iam-admin/quotas`,
    };
  }
  // Per-minute / generic 429 — usually transient.
  if (status === 429 || /\b429\b|rate.?limit|too many requests/i.test(m)) {
    return {
      kind: 'QUOTA',
      action: `Per-minute rate limit on the ${key} key ending in ${tail}. ` +
        `Will retry automatically; if it persists, the project needs billing enabled or an RPM quota increase. ` +
        `Find the key at https://aistudio.google.com/app/apikey`,
    };
  }
  if (status === 403 || /PERMISSION_DENIED|API has not been used|API_DISABLED/i.test(m)) {
    return {
      kind: 'PERMISSION',
      action: `Generative Language API not enabled on the project owning key ${tail}. ` +
        `Enable at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com`,
    };
  }
  if (status === 401 || /API_KEY_INVALID|key not valid|invalid api key/i.test(m)) {
    return {
      kind: 'AUTH',
      action: `API key ${tail} is invalid or revoked. ` +
        `Regenerate at https://aistudio.google.com/app/apikey and update the Cloudflare Worker secret (GEMINI_API_KEY / GEMINI_PREMIUM_KEY).`,
    };
  }
  if (status === 404 || /NOT_FOUND.*model|model.*not.*found|INVALID_ARGUMENT.*model/i.test(m)) {
    return {
      kind: 'INVALID_MODEL',
      action: `This model is not available for key ${tail}. ` +
        `Either Google hasn't rolled it out to this project yet, or the model id is wrong. ` +
        `Remove it from the fallback chain or wait for rollout.`,
    };
  }
  if (status === 504 || /GeminiTimeout|deadline exceeded/i.test(m)) {
    return {
      kind: 'TIMEOUT',
      action: `Model exceeded the 25s Worker race timeout. ` +
        `For very large prompts this is expected on Pro models — the chain will fall back to a smaller model automatically.`,
    };
  }
  // 503 / 5xx — transient backend issues. No user action.
  if (status >= 500 && status < 600) return null;
  // Catch-all for unknown failures.
  return {
    kind: 'UNKNOWN',
    action: `Unhandled error from key ${tail}. See https://ai.google.dev/gemini-api/docs/troubleshooting`,
  };
};

/**
 * Map a thrown AI error (from generateWithFallback or any downstream caller)
 * to a Hebrew headline + concrete action the user can take, with a deep-link
 * URL when relevant. Used by wizard error displays so users don't have to open
 * DevTools to figure out why an import failed.
 */
export const describeAiErrorForUser = (err: unknown): { headline: string; action?: string; url?: string } => {
  const raw = String((err as any)?.message || err || '');
  const m = raw.toLowerCase();
  if (!raw) return { headline: 'אירעה שגיאה לא צפויה.' };

  // Spend cap — the user-set monthly budget on the project. Distinct from
  // a quota — raising RPM/RPD won't help; user must raise the cap.
  if (/spending cap|spend cap|exceeded.*spend|monthly.*spending|ai\.studio\/spend|spendcapexhausted/i.test(raw)) {
    const tailMatch = raw.match(/tail=(\S+?)[\s\]]/) || raw.match(/ending in (\S+)/i);
    const tail = tailMatch?.[1] || '????';
    return {
      headline: 'תקרת ההוצאה החודשית של ה-AI נגמרה',
      action: `המפתח שמסתיים ב-${tail} הגיע לתקרת התקציב החודשי שהגדרת. צריך להעלות (או להסיר) את התקרה לפני שאפשר להמשיך לעבד טקסטים.`,
      url: 'https://ai.studio/spend',
    };
  }
  if (/PerDay|per_day|GenerateRequestsPerDay|limit:\s*0|FreeTier|free_tier/i.test(raw)) {
    return {
      headline: 'המכסה היומית של ה-AI נגמרה',
      action: 'נסה שוב מחר, או הפעל חיוב על הפרויקט ב-Google Cloud כדי להגדיל את המכסה.',
      url: 'https://aistudio.google.com/app/apikey',
    };
  }
  if (/\b429\b|rate.?limit|too many requests/i.test(raw)) {
    return {
      headline: 'יותר מדי בקשות ל-AI בדקה האחרונה',
      action: 'נסה שוב בעוד דקה. אם זה חוזר על עצמו — צריך להפעיל חיוב או להעלות את ה-RPM של הפרויקט.',
      url: 'https://aistudio.google.com/app/apikey',
    };
  }
  if (/PERMISSION_DENIED|\b403\b|API has not been used/i.test(raw)) {
    return {
      headline: 'API ה-AI לא מופעל בפרויקט',
      action: 'יש להפעיל את Generative Language API בפרויקט הענן הרלוונטי.',
      url: 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
    };
  }
  if (/API_KEY_INVALID|key not valid|\b401\b/i.test(raw)) {
    return {
      headline: 'מפתח ה-API לא תקין או בוטל',
      action: 'יש לייצר מפתח חדש ב-AI Studio ולעדכן את ה-Worker.',
      url: 'https://aistudio.google.com/app/apikey',
    };
  }
  if (/GeminiTimeout|deadline exceeded|\b504\b|aborted|etimedout/i.test(m)) {
    return {
      headline: 'התגובה מה-AI נקטעה (timeout)',
      action: 'נסה שוב, או קצר את הטקסט אם הוא ארוך מאוד.',
    };
  }
  if (/network|failed to fetch|networkerror/i.test(m)) {
    return {
      headline: 'בעיית חיבור לאינטרנט',
      action: 'בדוק את הרשת ונסה שוב.',
    };
  }
  // Generic — surface the first ~120 chars so the user can copy/paste for help.
  return {
    headline: 'לא הצלחנו לעבד את הטקסט',
    action: raw.slice(0, 140),
  };
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
  // Prefer the dynamic chains synced from /api/chains (Worker KV) when
  // available. Falls back to the hardcoded GOOGLE_MODELS below when the
  // remote fetch hasn't completed yet or the Worker is unreachable.
  const remote = getCachedRemoteChains();
  const SMART = remote?.chains.SMART_CANDIDATES ?? GOOGLE_MODELS.SMART_CANDIDATES;
  const SEARCH = remote?.chains.RESEARCH_CANDIDATES ?? GOOGLE_MODELS.RESEARCH_CANDIDATES;
  const FAST = remote?.chains.FAST_CANDIDATES ?? GOOGLE_MODELS.FAST_CANDIDATES;
  const DOC = remote?.chains.DOC_CANDIDATES ?? GOOGLE_MODELS.DOC_CANDIDATES;

  // Build model chain WITHOUT mutating the originals.
  // - SEARCH:  market research (food / attractions) — flash with grounding first.
  // - ANALYZE: deep doc/PDF extraction — Pro first, then flash chain as fallback.
  // - SMART:   structured parsing — pro first (per user direction), free fallbacks.
  // - FAST:    chat / quick lookups — flash-lite only, stay cheap.
  let chain: string[];
  if (intent === 'SEARCH') {
    chain = [...SEARCH];
  } else if (intent === 'ANALYZE') {
    chain = [...DOC, ...SMART];
  } else if (intent === 'SMART') {
    chain = [...SMART, ...FAST];
  } else {
    chain = [...FAST];
  }

  // Deduplicate (in case same model appears in both tiers)
  chain = [...new Set(chain)];

  // Apply the cached probe result (services/aiHealth.ts). When the admin has
  // run a recent probe via ModelHealthPanel, models known to be DEAD for the
  // current keys (INVALID_MODEL / PERMISSION / AUTH) are dropped, and models
  // that QUOTA-failed are demoted to the end of the chain. When there is no
  // cached probe, the chain is returned unchanged (no behavior change for
  // first-time users / fresh sessions).
  const beforeFilter = chain;
  chain = applyProbeToChain(chain);
  if (chain.length === 0) {
    console.warn('⚠️ [AI] Probe cache nuked the entire chain — falling back to unfiltered chain. Re-probe via admin panel.');
    chain = beforeFilter;
  }

  let lastError: Error | null = null;
  let hadDayQuotaError = false;
  let hadNonDayQuotaError = false;
  // All per-attempt errors so the "all models failed" summary can scan them
  // for the most actionable cause (spend cap > daily quota > generic 429).
  const attemptErrors: Array<{ model: string; message: string }> = [];
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
        let errDiagnostic: any = null;
        if (!response.ok) {
          try {
            const errBody = await response.json();
            errDetail = errBody.error || errBody.message || '';
            // Worker now returns { error, model, tier, key, keyTail, intent }
            // on every failure (see workers/src/index.ts). Surface the key
            // fingerprint so the user can identify which Google Cloud project
            // is hitting the quota.
            if (errBody.key || errBody.keyTail || errBody.tier) {
              errDiagnostic = { key: errBody.key, keyTail: errBody.keyTail, tier: errBody.tier, intent: errBody.intent };
            }
          } catch { /* ignore parse error */ }
        }
        const diagSuffix = errDiagnostic
          ? ` [key=${errDiagnostic.key} tail=${errDiagnostic.keyTail} tier=${errDiagnostic.tier}]`
          : '';

        if (!isTransientWorkerError(response.status, errDetail)) {
          console.error(`❌ [AI] Worker ${response.status} on ${modelId}${diagSuffix}:`, errDetail || response.statusText);
          const classification = classifyAiError(response.status, errDetail, errDiagnostic || undefined);
          if (classification) {
            console.error(`🔑 [AI] ${classification.kind} — ${classification.action}`);
          }
          throw new Error(`Worker Error: ${response.status}${errDetail ? ` — ${errDetail}` : ''}${diagSuffix}`);
        }

        const retryAfterHeader = Number(response.headers.get('retry-after'));
        const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : parseRetryDelayMs(errDetail);
        console.warn(`⏳ [AI] Temporary failure on ${modelId}${diagSuffix}, waiting ${Math.ceil(retryAfterMs / 1000)}s...`);
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
          let retryDiag: any = null;
          try {
            const e = await retryResponse.json();
            errDetail = e.error || '';
            if (e.key || e.keyTail || e.tier) {
              retryDiag = { key: e.key, keyTail: e.keyTail, tier: e.tier };
            }
          } catch { /* ignore */ }
          const retryDiagSuffix = retryDiag
            ? ` [key=${retryDiag.key} tail=${retryDiag.keyTail} tier=${retryDiag.tier}]`
            : '';
          throw new Error(`Retry failed: ${retryResponse.status}${errDetail ? ` — ${errDetail}` : ''}${retryDiagSuffix}`);
        }
        const retryData = await retryResponse.json();
        const rawRetryText = retryData.text;
        // SEARCH responses are grounded free-form text — extract JSON via cleanJSON.
        // Lenient parse: recover from unescaped control chars / quotes before
        // discarding the model output as invalid.
        const retryCleaned = isSearch ? cleanJSON(rawRetryText) : rawRetryText;
        const retryLenient = parseJsonLenient(retryCleaned);
        const retryText = retryLenient.sanitized ? sanitizeJsonControlChars(retryCleaned) : retryCleaned;
        if (retryLenient.sanitized) {
          console.warn(`⚠️ [AI] ${modelId} returned JSON with control-char corruption — sanitized.`);
        }
        const retryGrounded = isSearch && !modelId.startsWith('groq:') && !modelId.startsWith('openrouter:');
        console.log(`✅ [AI] Success with ${modelId} (after retry)${retryLenient.sanitized ? ' (sanitized)' : ''}`);
        return { text: retryText, model: modelId, grounded: retryGrounded };
      }

      const data = await response.json();
      // For non-SEARCH intents the Worker enforces a JSON schema, so we can
      // parse straight through. SEARCH responses come back as grounded
      // free-form text — strip prose / fences before parsing.
      // Lenient parse: recover from unescaped control chars / quotes inside
      // string values (common LLM corruption pattern) before treating the
      // model as failed.
      const rawText = data.text;
      const cleanedText = isSearch ? cleanJSON(rawText) : rawText;
      const lenient = parseJsonLenient(cleanedText);
      const text = lenient.sanitized ? sanitizeJsonControlChars(cleanedText) : cleanedText;
      if (lenient.sanitized) {
        console.warn(`⚠️ [AI] ${modelId} returned JSON with control-char corruption — sanitized.`);
      }

      // Only Gemini-with-googleSearch is actually grounded. Groq/OpenRouter
      // SEARCH calls go ungrounded (model generates from training data) — don't
      // mislabel them. The `grounded` flag flows up to callers so SEARCH-intent
      // UIs (RestaurantsView / AttractionsView) can warn the user when results
      // are AI-invented rather than retrieved from real-world sources.
      const isActuallyGrounded = isSearch && !modelId.startsWith('groq:') && !modelId.startsWith('openrouter:');
      console.log(`✅ [AI] Success with ${modelId}${isActuallyGrounded ? ' (grounded)' : ''}${lenient.sanitized ? ' (sanitized)' : ''}`);
      if (isSearch && !isActuallyGrounded) {
        console.warn(`⚠️ [AI] ${modelId} returned SEARCH results WITHOUT internet grounding. Items may be hallucinated.`);
        if (!warnedUngroundedThisSession) {
          warnedUngroundedThisSession = true;
          toast.warning(
            'תוצאות ה-AI נוצרו ללא חיפוש אמיתי באינטרנט (Gemini חסום בגלל תקרת תקציב). ' +
            'ייתכן ששמות מסעדות/אטרקציות מומצאים. אמת לפני שמירה, או הסר את התקרה ב-https://ai.studio/spend',
            12000,
          );
        }
      }
      return { text, model: modelId, grounded: isActuallyGrounded };

    } catch (error: any) {
      const errMsg = error.message || String(error);
      console.warn(`⚠️ [AI] Failed ${modelId}:`, errMsg);
      lastError = error;
      // Record every attempt's failure with its model id so the "all failed"
      // summary can pick the most informative one. The last attempt (often
      // an OpenRouter 500 wrapping a 429 — no key info) tends to be the
      // LEAST informative; a Gemini spend-cap 429 earlier in the chain is
      // what the user actually needs to know about.
      attemptErrors.push({ model: modelId, message: errMsg });
      const isDayQuotaError = /PerDay|per_day|GenerateRequestsPerDay|InputTokensPerModelPerDay/i.test(errMsg);
      if (isDayQuotaError) hadDayQuotaError = true;
      else hadNonDayQuotaError = true;

      // Persistent-failure auto-demote: when a model fails with a cause that
      // won't fix itself in the next few minutes (spend cap, daily quota,
      // permission denied, invalid key), write it to the probe cache so
      // subsequent generateWithFallback calls skip it entirely or demote it
      // to the end. The cache TTL is 10 minutes; QUOTA failures recover on
      // their own after the cache expires. Permission/auth/invalid-model
      // entries get DROPPED entirely by applyProbeToChain.
      const m = errMsg.match(/\[key=(\S+)\s+tail=(\S+)\s+tier=(\S+)\]/);
      const tail = m?.[2] || '????';
      if (/spending cap|spend cap|ai\.studio\/spend/i.test(errMsg)) {
        markModelFailed(modelId, 'QUOTA', 'Spend cap exhausted', tail);
      } else if (isDayQuotaError || /FreeTier|free_tier|limit:\s*0/i.test(errMsg)) {
        markModelFailed(modelId, 'QUOTA', 'Daily quota exhausted', tail);
      } else if (/PERMISSION_DENIED|\b403\b|API has not been used/i.test(errMsg)) {
        markModelFailed(modelId, 'PERMISSION', 'Generative Language API not enabled', tail);
      } else if (/API_KEY_INVALID|key not valid|\b401\b/i.test(errMsg)) {
        markModelFailed(modelId, 'AUTH', 'Key invalid or revoked', tail);
      } else if (/NOT_FOUND.*model|model.*not.*found|INVALID_ARGUMENT.*model|\b404\b/i.test(errMsg)) {
        markModelFailed(modelId, 'INVALID_MODEL', 'Model not available for this key', tail);
      }
      // Transient errors (429 RPM, 504 timeout, 503, etc.) are NOT auto-demoted —
      // they recover on their own.

      // Small backoff between different models
      if (i < chain.length - 1) {
        await delay(500 * (i + 1));
      }
    }
  }

  console.error("❌ [AI] All models failed.");
  const lastMsg = lastError?.message || '';

  // Scan every attempt for actionable patterns and pick the most concrete one
  // to surface. Priority: spend-cap > daily quota > generic 429 > anything else.
  // This avoids the bug where an OpenRouter "free tier exhausted" message
  // (last in the chain) drowned out the real Gemini spend-cap cause.
  const SPEND_CAP_RE = /spending cap|spend cap|exceeded.*spend|monthly.*spending|project spend|ai\.studio\/spend/i;
  const spendCapAttempt = attemptErrors.find(a => SPEND_CAP_RE.test(a.message));
  if (spendCapAttempt) {
    const m = spendCapAttempt.message.match(/\[key=(\S+)\s+tail=(\S+)\s+tier=(\S+)\]/);
    const keyKind = m?.[1] || 'PREMIUM';
    const keyTail = m?.[2] || '????';
    console.error(
      `🚨 [AI] ACTION REQUIRED — SPEND_CAP: Monthly spend cap exhausted on key ${keyKind} ${keyTail}. ` +
      `Go to https://ai.studio/spend and raise (or remove) the cap on the project owning this key. ` +
      `Identify the project at https://aistudio.google.com/app/apikey.`,
    );
    throw new Error(
      `SpendCapExhausted — Monthly spend cap reached on the ${keyKind} key ending in ${keyTail}. ` +
      `Raise or remove the cap at https://ai.studio/spend, then try again. ` +
      `(${attemptErrors.length} models attempted; last: ${spendCapAttempt.model})`,
    );
  }

  // Fall back to the previous behavior: pull diagnostics off the last error.
  const diagMatch = lastMsg.match(/\[key=(\S+)\s+tail=(\S+)\s+tier=(\S+)\]/);
  if (diagMatch) {
    const finalClassification = classifyAiError(0, lastMsg, { key: diagMatch[1], keyTail: diagMatch[2] });
    if (finalClassification) {
      console.error(`🚨 [AI] ACTION REQUIRED — ${finalClassification.kind}: ${finalClassification.action}`);
    }
  }
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
    // Lenient parse: strict first, then auto-sanitize control chars / unescaped
    // quotes inside string values. Fixes the common LLM corruption pattern
    // (literal \n inside string values) without falling through to a paid AI
    // call. parseJsonLenient throws only when BOTH passes fail.
    const lenient = parseJsonLenient<any>(candidateJson);
    const direct = lenient.value;
    if (lenient.sanitized) {
      console.warn(
        '[DeepResearch] JSON had unescaped control chars / quotes — recovered via sanitizer. ' +
        `Strict error was: ${lenient.strictError?.message?.slice(0, 120) || 'unknown'}`,
      );
    }

    // Shape A
    if (direct && (Array.isArray(direct.restaurants) || Array.isArray(direct.attractions))) {
      console.log(`[DeepResearch] Fast-path: native Deep JSON, skipping Flash-Lite${lenient.sanitized ? ' (sanitized)' : ''}`);
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
      console.log(`[DeepResearch] Fast-path: Quick-schema JSON, flattening categories${lenient.sanitized ? ' (sanitized)' : ''}`);
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

export interface AnalyzeTripFilesHints {
  cities?: string[];
  travelers?: { adults: number; children: number; babies: number };
  destination?: string;
  groupType?: 'family' | 'couple' | 'friends' | 'solo' | 'business' | 'group';
}

export const analyzeTripFiles = async (
  files: File[],
  hints?: AnalyzeTripFilesHints,
): Promise<TripAnalysisResult> => {
  // 1. Validate and filter files
  const { validFiles, errors } = validateFiles(files);
  if (validFiles.length === 0) {
    throw new Error(errors.length > 0 ? errors[0].reason : "No valid files to analyze.");
  }

  // Filter out email files (not supported in vision API)
  const safeFiles = validFiles.filter(f => !f.type.includes('message/rfc822') && !f.name.endsWith('.eml'));
  if (safeFiles.length === 0) throw new Error("No processable files found. Email files (.eml) are not supported for direct upload.");

  // 2. Build multimodal request with the UNIFIED prompt
  // Hint preamble: when the user filled in the optional TripDetailsPanel in
  // the wizard, prepend a small context block so the model knows which cities
  // and traveler counts to bias toward. Hints fill gaps; the model still
  // prefers structured data extracted from the file itself.
  const hintParts: string[] = [];
  if (hints?.destination) hintParts.push(`Destination: ${hints.destination}`);
  if (hints?.cities && hints.cities.length > 0) hintParts.push(`Cities to expect: ${hints.cities.join(', ')}`);
  if (hints?.groupType) hintParts.push(`Trip type: ${hints.groupType}`);
  if (hints?.travelers) {
    const t = hints.travelers;
    const total = t.adults + t.children + t.babies;
    if (total > 0) hintParts.push(`Group size: ${t.adults} adults, ${t.children} children, ${t.babies} babies (total ${total})`);
  }
  const hintBlock = hintParts.length > 0
    ? `\n\n⚠️ TRIP CONTEXT (from wizard, fill gaps only — never override file data):\n${hintParts.map(p => `- ${p}`).join('\n')}\n`
    : '';

  const contentParts: any[] = [
    { text: SYSTEM_PROMPT_ANALYZE_TRIP + hintBlock },
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

  // 3. Send to the ANALYZE model chain — Pro 2.5 first, then Flash fallbacks
  //    (see DOC_CANDIDATES at the top of this file). PDFs/images need depth;
  //    Flash-Lite was dropping cities from multi-page documents.
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: contentParts }],
    {},
    'ANALYZE'
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

  // Text-only path stays on SMART (Flash 3.5 primary) — no need for Pro 2.5
  // since there's no PDF to extract from. analyzeTripFiles() above handles the
  // file path and routes through ANALYZE for Pro-first.
  // Pass TRIP_OUTPUT_SCHEMA explicitly: the old ANALYZE intent auto-applied it,
  // SMART does not — keep the same schema-constrained output.
  const prompt = `${SYSTEM_PROMPT_ANALYZE_TRIP}\n\nTEXT INPUT:\n${text}`;
  const response = await generateWithFallback(
    null,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { responseMimeType: 'application/json', responseSchema: TRIP_OUTPUT_SCHEMA },
    'SMART'
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
