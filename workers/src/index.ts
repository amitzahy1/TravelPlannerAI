/**
 * Travel Planner Pro - Smart Email Import Worker (v2.0 - Robust)
 * Implementation of "Google-Scale Reliability" Architecture.
 * Features:
 * - Unshackled Gemini Safety Settings (BLOCK_NONE)
 * - Non-blocking Logging (ctx.waitUntil)
 * - Fallback Data Preservation (Raw Save)
 * - Strict FinishReason Validation
 */

import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from 'jose';
import PostalMime from 'postal-mime';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { categorize, buildChains, type ModelMeta, type BuiltChains } from './lib/modelCategorizer';

// --- INTERFACES ---
interface Env {
        GEMINI_API_KEY?: string;
        GEMINI_PREMIUM_KEY?: string;   // Billing-enabled key — used for Pro models or when tier='paid'
        OPENROUTER_API_KEY?: string;
        GROQ_API_KEY?: string;         // Free-tier non-Google fallback — Llama 3.3 70B at no cost
        FIREBASE_SERVICE_ACCOUNT: string;
        FIREBASE_PROJECT_ID: string;
        AUTH_SECRET: string;
        AI_CHAINS_CACHE?: KVNamespace;  // Cloudflare KV — caches dynamic chain config
}

// Hard allow-list. Only these accounts can invoke /api/generate.
const ALLOWED_EMAILS = new Set<string>([
        'amitzahy1@gmail.com',
]);

// Firebase ID tokens are RS256-signed JWTs from Google's secure token service.
const FIREBASE_JWKS = createRemoteJWKSet(
        new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const verifyFirebaseToken = async (token: string, projectId: string): Promise<{ email: string; uid: string }> => {
        const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
                issuer: `https://securetoken.google.com/${projectId}`,
                audience: projectId,
        });
        const email = (payload.email as string | undefined) ?? '';
        const uid = (payload.user_id as string | undefined) ?? (payload.sub as string | undefined) ?? '';
        if (!email) throw new Error('Token missing email claim');
        if (payload.email_verified !== true) throw new Error('Email not verified');
        return { email: email.toLowerCase(), uid };
};

const isOpenRouterModel = (modelId: string) => modelId.startsWith("openrouter:");
const isProModel = (modelId: string) => /(?:^|[-/])(?:gemini-)?\d+(?:\.\d+)?-pro\b/i.test(modelId) || modelId.toLowerCase().includes('pro');

/**
 * Classify a Gemini SDK error into the kind of action the user needs to take.
 * Used by /api/probe to populate the `remediation` field per model, and by
 * /api/generate's error path so production failures carry the same hint.
 *
 * Keep these patterns in sync with services/aiService.ts:classifyAiError so
 * the user sees a consistent message whether the failure comes from a probe
 * or a live request.
 */
type ErrorKind = 'QUOTA' | 'PERMISSION' | 'INVALID_MODEL' | 'AUTH' | 'TIMEOUT' | 'UNKNOWN';

const classifyGeminiError = (errMsg: string, modelId: string, keyTail: string): { kind: ErrorKind; remediation: string } => {
        const m = (errMsg || '').slice(0, 800);
        // Monthly spending cap — user-set budget limit, NOT a quota. Distinct
        // because raising RPM/RPD won't help; user must adjust the cap.
        if (/spending cap|spend cap|exceeded.*spend|monthly.*spending|project spend|ai\.studio\/spend/i.test(m)) {
                return {
                        kind: 'QUOTA',
                        remediation: `Project monthly SPEND CAP exhausted on key …${keyTail}. Go to https://ai.studio/spend and raise or remove the monthly cap on the project owning this key.`,
                };
        }
        if (/PerDay|per_day|GenerateRequestsPerDay|InputTokensPerModelPerDay|limit:\s*0/i.test(m)) {
                return {
                        kind: 'QUOTA',
                        remediation: `Daily quota exhausted on key …${keyTail}. Enable billing OR raise quota for the project owning this key. https://aistudio.google.com/app/apikey`,
                };
        }
        if (/\b429\b|rate.?limit|too many requests|quota/i.test(m)) {
                return {
                        kind: 'QUOTA',
                        remediation: `Per-minute rate limit on key …${keyTail}. Usually transient. If persistent, enable billing OR request an RPM increase on the project. https://aistudio.google.com/app/apikey`,
                };
        }
        if (/PERMISSION_DENIED|\b403\b|API has not been used|API_DISABLED/i.test(m)) {
                return {
                        kind: 'PERMISSION',
                        remediation: `Generative Language API not enabled on the project owning key …${keyTail}. Enable at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com`,
                };
        }
        if (/API_KEY_INVALID|key not valid|invalid api key|\b401\b/i.test(m)) {
                return {
                        kind: 'AUTH',
                        remediation: `Key …${keyTail} is invalid or revoked. Regenerate at https://aistudio.google.com/app/apikey and update the Cloudflare Worker secret.`,
                };
        }
        if (/NOT_FOUND.*model|model.*not.*found|INVALID_ARGUMENT.*model|\b404\b/i.test(m)) {
                return {
                        kind: 'INVALID_MODEL',
                        remediation: `Model ${modelId} not available for key …${keyTail}. Either Google hasn't rolled it out to this project yet, or the model id is wrong. Remove from chain or wait.`,
                };
        }
        if (/GeminiTimeout|deadline exceeded|\b504\b/i.test(m)) {
                return {
                        kind: 'TIMEOUT',
                        remediation: `Model ${modelId} exceeded the 25s Worker race timeout on a probe. Probably too slow for grounded/long prompts but may still work for short tasks.`,
                };
        }
        return {
                kind: 'UNKNOWN',
                remediation: `Unhandled error on key …${keyTail}. See https://ai.google.dev/gemini-api/docs/troubleshooting`,
        };
};

const partToText = (part: any): string => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part.text === "string") return part.text;
        return "";
};

const contentsToOpenRouterMessages = (requestContent: any): any[] => {
        if (typeof requestContent === "string") return [{ role: "user", content: requestContent }];
        if (!Array.isArray(requestContent)) return [{ role: "user", content: String(requestContent || "") }];

        return requestContent.map((entry: any) => {
                if (entry?.content) return entry;
                const content = Array.isArray(entry?.parts)
                        ? entry.parts.map(partToText).filter(Boolean).join("\n")
                        : partToText(entry);
                return {
                        role: entry?.role === "model" ? "assistant" : (entry?.role || "user"),
                        content,
                };
        }).filter((message: any) => message.content);
};

const callOpenRouter = async (
        requestContent: any,
        modelId: string,
        generationConfig: any,
        env: Env,
        signal?: AbortSignal,
): Promise<{ text: string; model: string }> => {
        if (!env.OPENROUTER_API_KEY) {
                throw new Error("Missing OPENROUTER_API_KEY");
        }

        const actualModelId = modelId.replace(/^openrouter:/, "");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                        "HTTP-Referer": "https://amitzahy1.github.io/TravelPlannerAI/",
                        "X-Title": "Travel Planner Pro",
                },
                signal,
                body: JSON.stringify({
                        model: actualModelId,
                        messages: contentsToOpenRouterMessages(requestContent),
                        temperature: generationConfig?.temperature ?? 0.2,
                }),
        });

        if (!response.ok) {
                let detail = "";
                try {
                        const errorBody = await response.json() as any;
                        detail = errorBody?.error?.message || errorBody?.message || JSON.stringify(errorBody);
                } catch { /* ignore */ }
                throw new Error(`OpenRouter Error: ${response.status}${detail ? ` — ${detail}` : ""}`);
        }

        const data = await response.json() as any;
        const text = data?.choices?.[0]?.message?.content || "";
        if (!text) throw new Error("OpenRouter returned an empty response");
        return { text, model: data?.model || modelId };
};

const isGroqModel = (modelId: string) => modelId.startsWith("groq:");

/**
 * Free-tier non-Google fallback. Groq hosts Llama 3.3 70B and friends with no
 * card required, ~30 RPM and ~14,400 RPD on the free tier — enough for a
 * single-user app even with Gemini fully out. Uses OpenAI-compatible chat
 * completions, so the wire format mirrors callOpenRouter() above. When the
 * generation config asks for JSON output, we set `response_format: json_object`
 * — Groq's structured-output mode is strict like Gemini's responseSchema.
 */
const callGroq = async (
        requestContent: any,
        modelId: string,
        generationConfig: any,
        env: Env,
        signal?: AbortSignal,
): Promise<{ text: string; model: string }> => {
        if (!env.GROQ_API_KEY) {
                throw new Error("Missing GROQ_API_KEY");
        }
        const actualModelId = modelId.replace(/^groq:/, "");
        const wantJson = (generationConfig?.responseMimeType || "").includes("json");
        const messages = contentsToOpenRouterMessages(requestContent);
        // Groq's OpenAI-compat layer HARD-rejects (400) any request that asks
        // for response_format=json_object whose messages don't literally contain
        // the word "json". When the caller wants JSON but the prompt doesn't
        // already include the word, inject a one-line system hint so Groq lets
        // us through. Mirrors the trick OpenAI compatible SDKs do internally.
        if (wantJson) {
                const hasJsonWord = messages.some((m: any) => /json/i.test(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)));
                if (!hasJsonWord) {
                        messages.unshift({ role: 'system', content: 'Reply with valid JSON only.' });
                }
        }
        const body: any = {
                model: actualModelId,
                messages,
                temperature: generationConfig?.temperature ?? 0.2,
        };
        if (wantJson) body.response_format = { type: "json_object" };

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                },
                signal,
                body: JSON.stringify(body),
        });
        if (!response.ok) {
                let detail = "";
                try {
                        const errorBody = await response.json() as any;
                        detail = errorBody?.error?.message || errorBody?.message || JSON.stringify(errorBody);
                } catch { /* ignore */ }
                throw new Error(`Groq Error: ${response.status}${detail ? ` — ${detail}` : ""}`);
        }
        const data = await response.json() as any;
        const text = data?.choices?.[0]?.message?.content || "";
        if (!text) throw new Error("Groq returned an empty response");
        return { text, model: data?.model || modelId };
};

// ============================================================================
// 📦 DYNAMIC MODEL CHAIN SYNC
// ============================================================================
//
// Each provider exposes a /models endpoint with their current catalog. The
// sync helpers below fetch them, normalize the IDs (prefix groq: / openrouter:),
// run them through the shared categorizer, and store the assembled chains in
// Cloudflare KV. Triggered by:
//   - daily cron at 04:00 UTC (see [triggers] in wrangler.toml → scheduled())
//   - manual admin click → POST /api/sync-models
// Frontend reads the cached result via GET /api/chains; falls back to its
// own hardcoded constants when KV is empty or the Worker is unreachable.
//
// Provider catalogs:
//   Groq:       GET https://api.groq.com/openai/v1/models  (Bearer GROQ_API_KEY)
//   OpenRouter: GET https://openrouter.ai/api/v1/models     (no auth needed)
//   Gemini:     GET https://generativelanguage.googleapis.com/v1beta/models?key=KEY

const CHAINS_KV_KEY = 'chains:v1';

interface SyncResult {
        chains: BuiltChains;
        models: ModelMeta[];
        syncedAt: number;
        providerStats: Record<string, { ok: boolean; count: number; error?: string }>;
}

// Shared denylist regex — anything non-chat (TTS/audio/image-gen/embedding/
// language-specialized) that we never want in a fallback chain regardless of
// which provider lists it. Centralizing here makes the per-provider filters
// readable.
const NON_CHAT_DENY = /tts|whisper|audio|image-gen|image-preview|computer-use|customtools|embedding|guard|safeguard|orpheus|lyria|voice|moderation/i;

const fetchGroqModels = async (env: Env): Promise<string[]> => {
        if (!env.GROQ_API_KEY) return [];
        const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
        });
        if (!response.ok) throw new Error(`Groq /models ${response.status}`);
        const data = await response.json() as { data?: Array<{ id: string; active?: boolean }> };
        return (data.data || [])
                .filter(m => m.active !== false)
                .map(m => `groq:${m.id}`)
                .filter(id => !NON_CHAT_DENY.test(id))
                // Drop language-specialized models (e.g. allam-* is Arabic-only)
                .filter(id => !/allam/i.test(id));
};

// Score an OpenRouter free model on "how useful is it as a backup". Bigger
// size + reasoning capability + brand-name vendors score higher. We use this
// to cap OpenRouter at the top ~10 free models instead of including all
// 50+, which were bloating the probe and the fallback chain without value.
const scoreOpenRouterModel = (id: string): number => {
        let score = 0;
        // Size token — primary signal. Bigger = better in this context because
        // we already have Groq's small/fast models for FAST intent.
        const sizeMatch = id.match(/(\d+(?:\.\d+)?)b\b/);
        if (sizeMatch) score += parseFloat(sizeMatch[1]);  // 70b → +70
        // Reasoning bonus — thinking/distill/r1 models add diversity.
        if (/-r1\b|reasoning|thinking|distill/i.test(id)) score += 30;
        // Brand bonus — vendor reliability matters when we're using free tier
        // (community-hosted models churn faster than vendor-hosted).
        if (/meta-llama|nvidia|openai|google|qwen|deepseek|anthropic|mistralai|nousresearch/i.test(id)) {
                score += 20;
        }
        return score;
};

const fetchOpenRouterModels = async (env: Env): Promise<string[]> => {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) throw new Error(`OpenRouter /models ${response.status}`);
        const data = await response.json() as { data?: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }> };
        // Only free-tier models — keeps the chain entirely no-cost. When the
        // user funds OpenRouter, we can flip this to also include paid models
        // by removing the pricing filter.
        const all = (data.data || [])
                .filter(m => m.pricing?.prompt === '0' && m.pricing?.completion === '0')
                .map(m => `openrouter:${m.id}`)
                .filter(id => !NON_CHAT_DENY.test(id))
                // Drop coding-specialized + "weird" non-general-purpose models
                // (laguna = poolside coding model; cobuddy/owl-alpha are
                // experimental free-tier promos; openrouter/free is a redirect).
                .filter(id => !/laguna|cobuddy|owl-alpha|openrouter\/free$|coder|\bcode-/i.test(id));

        // Score + cap at top 10. Eliminates noise from tiny/specialty models
        // we'd never reach in the chain anyway — keeps the heavy hitters
        // (Llama 405B, Nemotron 120B, Hermes 405B, GPT-OSS 120B, etc.).
        return all
                .map(id => ({ id, score: scoreOpenRouterModel(id) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map(x => x.id);
};

const fetchGeminiModels = async (env: Env): Promise<string[]> => {
        const key = env.GEMINI_PREMIUM_KEY || env.GEMINI_API_KEY;
        if (!key) return [];
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error(`Gemini /models ${response.status}`);
        const data = await response.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[]; description?: string }> };
        return (data.models || [])
                .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                // The name comes as "models/gemini-2.5-flash" — strip the prefix.
                .map(m => m.name.replace(/^models\//, ''))
                // Strict allowlist: only the 2.5+/3.x main families (pro, flash, flash-lite).
                // Excludes TTS / image / computer-use / customtools / preview-001 variants
                // and any other specialty SKUs Google might add.
                .filter(id => /^gemini-(2\.5|3\.[0-9]+)-(pro|flash|flash-lite)(-preview)?$/.test(id))
                // Drop deprecated -001 / -002 frozen snapshots — they're superseded by named aliases.
                .filter(id => !/-00[0-9]+$/.test(id))
                .filter(id => !NON_CHAT_DENY.test(id));
};

/**
 * Fetch all provider catalogs, build chains, and write to KV. Pure side-effect
 * function — returns the result so the caller can either log it (cron) or
 * return it to the client (manual sync via /api/sync-models).
 */
const syncModels = async (env: Env): Promise<SyncResult> => {
        const providerStats: Record<string, { ok: boolean; count: number; error?: string }> = {};

        const safeFetch = async (name: string, fn: () => Promise<string[]>): Promise<string[]> => {
                try {
                        const ids = await fn();
                        providerStats[name] = { ok: true, count: ids.length };
                        return ids;
                } catch (e: any) {
                        providerStats[name] = { ok: false, count: 0, error: e?.message?.slice(0, 200) };
                        console.warn(`[sync] ${name} fetch failed: ${e?.message}`);
                        return [];
                }
        };

        const [groqIds, openrouterIds, geminiIds] = await Promise.all([
                safeFetch('groq', () => fetchGroqModels(env)),
                safeFetch('openrouter', () => fetchOpenRouterModels(env)),
                safeFetch('gemini', () => fetchGeminiModels(env)),
        ]);

        const allIds = [...geminiIds, ...groqIds, ...openrouterIds];
        const models = allIds.map(categorize);
        const chains = buildChains(models);

        const result: SyncResult = {
                chains,
                models,
                syncedAt: Date.now(),
                providerStats,
        };

        // Cache for 25 hours (one hour over the cron interval so the worker
        // never serves an empty result while a fresh sync is in flight).
        if (env.AI_CHAINS_CACHE) {
                await env.AI_CHAINS_CACHE.put(CHAINS_KV_KEY, JSON.stringify(result), {
                        expirationTtl: 25 * 3600,
                });
        }

        console.log(`[sync] gemini=${providerStats.gemini?.count ?? 0} groq=${providerStats.groq?.count ?? 0} openrouter=${providerStats.openrouter?.count ?? 0} total=${allIds.length}`);
        return result;
};

// --- MAIN HANDLER ---
export default {
        // Cron trigger — daily 04:00 UTC per wrangler.toml [triggers].
        async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
                ctx.waitUntil(
                        syncModels(env).then(r => {
                                console.log(`[cron] sync ok at ${new Date(r.syncedAt).toISOString()}`);
                        }).catch(e => {
                                console.error(`[cron] sync failed: ${e?.message}`);
                        }),
                );
        },

        async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
                console.log(`[Email Handler] Received email from: ${message.from}`);
                try {
                        const result = await handleEmail(message.from, message.raw, env, ctx);
                        console.log(`[Email Handler] Result:`, JSON.stringify(result));
                        if (!result.success) {
                                console.error(`[Email Handler] FAILED:`, result.message || result.error);
                        }
                } catch (e: any) {
                        console.error(`[Email Handler] UNCAUGHT CRASH:`, e.message, e.stack);
                }
        },

        async fetch(request: Request, env: Env, ctx: ExecutionContext) {
                // CORS Headers — allow production + local dev
                const origin = request.headers.get("Origin") || "";
                const allowedOrigin = (
                        origin === "https://amitzahy1.github.io" ||
                        origin.startsWith("http://localhost:") ||
                        origin.startsWith("http://127.0.0.1:")
                ) ? origin : "https://amitzahy1.github.io";
                const corsHeaders = {
                        "Access-Control-Allow-Origin": allowedOrigin,
                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Token",
                };

                if (request.method === "OPTIONS") {
                        return new Response(null, { headers: corsHeaders });
                }

                const url = new URL(request.url);

                try {
                        // Secure API Endpoint for Frontend (supports multimodal content)
                        if (url.pathname === "/api/generate" && request.method === "POST") {
                                // Auth: verify Firebase ID token + check email allow-list before doing any work.
                                const authHeader = request.headers.get('Authorization') || '';
                                const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
                                if (!idToken) {
                                        return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
                                                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                        });
                                }
                                if (!env.FIREBASE_PROJECT_ID) {
                                        return new Response(JSON.stringify({ error: 'Server misconfigured: FIREBASE_PROJECT_ID missing' }), {
                                                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                        });
                                }
                                let caller: { email: string; uid: string };
                                try {
                                        caller = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
                                } catch (e: any) {
                                        console.warn(`[Auth] Token verification failed: ${e?.message}`);
                                        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                                                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                        });
                                }
                                if (!ALLOWED_EMAILS.has(caller.email)) {
                                        console.warn(`[Auth] Forbidden email: ${caller.email} (uid=${caller.uid})`);
                                        return new Response(JSON.stringify({ error: 'Forbidden' }), {
                                                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                        });
                                }

                                const body = await request.json() as any;
                                const { contents, prompt, Model, generationConfig, intent, tier } = body;

                                // Accept either structured 'contents' (new) or flat 'prompt' (backward compat)
                                const requestContent = contents || prompt;
                                if (!requestContent) return new Response("Missing prompt/contents", { status: 400, headers: corsHeaders });

                                const modelId = Model || "gemini-2.5-flash";
                                const isSearch = intent === 'SEARCH';
                                const finalGenConfig = isSearch
                                        ? { temperature: generationConfig?.temperature ?? 0.2 }
                                        : (generationConfig || { responseMimeType: "application/json" });

                                if (isOpenRouterModel(modelId)) {
                                        try {
                                                const openRouter = await callOpenRouter(requestContent, modelId, finalGenConfig, env);
                                                return new Response(JSON.stringify({
                                                        text: openRouter.text,
                                                        model: openRouter.model,
                                                        grounded: false,
                                                        provider: "openrouter",
                                                }), {
                                                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                                                });
                                        } catch (e: any) {
                                                // Surface OpenRouter failures as a proper non-200 (with key fingerprint
                                                // shape the frontend understands) so the chain falls through cleanly
                                                // instead of bubbling up as an opaque 500.
                                                const msg = e?.message || String(e);
                                                console.error(`[Worker] OpenRouter ${modelId} failed: ${msg.slice(0, 200)}`);
                                                return new Response(JSON.stringify({
                                                        error: msg,
                                                        model: modelId,
                                                        key: 'OPENROUTER',
                                                        keyTail: env.OPENROUTER_API_KEY ? `…${env.OPENROUTER_API_KEY.slice(-4)}` : '????',
                                                        tier: tier ?? 'free',
                                                }), { status: /429|rate.?limit/i.test(msg) ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                                        }
                                }

                                if (isGroqModel(modelId)) {
                                        try {
                                                const groq = await callGroq(requestContent, modelId, finalGenConfig, env);
                                                return new Response(JSON.stringify({
                                                        text: groq.text,
                                                        model: groq.model,
                                                        grounded: false,
                                                        provider: "groq",
                                                        key: 'GROQ',
                                                        keyTail: env.GROQ_API_KEY ? `…${env.GROQ_API_KEY.slice(-4)}` : '????',
                                                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                                        } catch (e: any) {
                                                const msg = e?.message || String(e);
                                                console.error(`[Worker] Groq ${modelId} failed: ${msg.slice(0, 200)}`);
                                                return new Response(JSON.stringify({
                                                        error: msg,
                                                        model: modelId,
                                                        key: 'GROQ',
                                                        keyTail: env.GROQ_API_KEY ? `…${env.GROQ_API_KEY.slice(-4)}` : 'missing',
                                                        tier: tier ?? 'free',
                                                }), { status: /429|rate.?limit/i.test(msg) ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                                        }
                                }

                                // Smart key routing: when GEMINI_PREMIUM_KEY is set we prefer it
                                // for EVERYTHING (Flash + Pro), because that's the billing-enabled
                                // key — sending traffic to the free key just to hit its 429 cap is
                                // a waste of the chain's fallback budget. Caller can still force
                                // the free key with tier='free-only' (used by /api/probe to keep
                                // probes off the metered key). Falls back to whichever key is set
                                // when only one exists.
                                const forceFree = tier === 'free-only';
                                const usePremiumKey = !forceFree && !!env.GEMINI_PREMIUM_KEY;
                                const apiKey = usePremiumKey
                                        ? env.GEMINI_PREMIUM_KEY!
                                        : (env.GEMINI_API_KEY || env.GEMINI_PREMIUM_KEY);
                                if (!apiKey) {
                                        throw new Error("Missing GEMINI_API_KEY");
                                }
                                // Diagnostic fingerprint so the user can identify WHICH Google Cloud
                                // project to fix when a 429 hits. The full key is never logged. The
                                // last 4 chars are stable across the key's lifetime — the user can
                                // match them to a row in https://aistudio.google.com/app/apikey.
                                const keyTail = apiKey.length >= 4 ? apiKey.slice(-4) : '????';
                                const keyKind = usePremiumKey
                                        ? 'PREMIUM'
                                        : (env.GEMINI_API_KEY ? 'FREE' : 'PREMIUM_FALLBACK');
                                console.log(
                                        `[Worker] caller=${caller.email} model=${modelId} tier=${tier ?? 'free'} ` +
                                        `key=${keyKind} keyTail=…${keyTail} intent=${intent ?? '(none)'}`,
                                );

                                // SEARCH intent → ground via Google Search + low temperature.
                                // Tools and structured-JSON output are mutually exclusive in the
                                // Gemini API, so when grounding we drop responseMimeType /
                                // responseSchema and ask the model for free-form text. The frontend
                                // re-extracts JSON via cleanJSON().
                                const genAI = new GoogleGenerativeAI(apiKey);
                                const modelOptions: any = {
                                        model: modelId,
                                        generationConfig: finalGenConfig,
                                };
                                if (isSearch) {
                                        modelOptions.tools = [{ googleSearch: {} } as any];
                                }

                                const model = genAI.getGenerativeModel(modelOptions);

                                // Cloudflare Workers (free tier) cap a single request at ~30s wall-clock.
                                // Race the SDK call against an explicit 25s timeout so we return a clean
                                // 504/GeminiTimeout to the client (which treats it as transient and falls
                                // through to the next model) instead of letting Cloudflare kill the
                                // Worker mid-flight and surface an opaque 500.
                                let result: any;
                                try {
                                        result = await Promise.race([
                                                model.generateContent({ contents: requestContent }),
                                                new Promise<never>((_, reject) =>
                                                        setTimeout(() => reject(new Error('GeminiTimeout: 25s')), 25_000)
                                                ),
                                        ]);
                                } catch (e: any) {
                                        // Attach the diagnostic fingerprint to EVERY upstream failure so
                                        // the frontend (and the user reading the console) can identify
                                        // which Google Cloud project is hitting the 429 / 504 / etc.
                                        const diagnostic = {
                                                model: modelId,
                                                tier: tier ?? 'free',
                                                key: keyKind,
                                                keyTail: `…${keyTail}`,
                                                intent: intent ?? null,
                                        };
                                        if (/GeminiTimeout/.test(e?.message || '')) {
                                                console.warn(`[Worker] ${modelId} timed out after 25s (key=${keyKind} tail=…${keyTail})`);
                                                return new Response(JSON.stringify({ error: e.message, ...diagnostic }), {
                                                        status: 504,
                                                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                                                });
                                        }
                                        // Quota / 429 / billing errors from the Gemini SDK land here.
                                        // Surface them with full diagnostic info so the user can pin down
                                        // which API key (PREMIUM vs FREE) is misconfigured.
                                        const msg = e?.message || String(e);
                                        const status = /\b429\b/.test(msg)
                                                ? 429
                                                : /\b403\b/.test(msg) ? 403
                                                : /\b401\b/.test(msg) ? 401
                                                : 500;
                                        console.error(`[Worker] ${modelId} failed (key=${keyKind} tail=…${keyTail}): ${msg.slice(0, 200)}`);
                                        return new Response(JSON.stringify({ error: msg, ...diagnostic }), {
                                                status,
                                                headers: { ...corsHeaders, "Content-Type": "application/json" }
                                        });
                                }
                                const response = await result.response;
                                const text = response.text();

                                return new Response(JSON.stringify({ text, model: modelId, grounded: isSearch, key: keyKind, keyTail: `…${keyTail}` }), {
                                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                                });
                        }

                        // Pre-flight model probe — fires a tiny "ping" against each requested
                        // model so the admin UI can see which Gemini models are actually
                        // reachable for this account's keys. On-demand only (no auto-trigger).
                        if (url.pathname === "/api/probe" && request.method === "POST") {
                                // Auth: same allow-list as /api/generate.
                                const authHeader = request.headers.get('Authorization') || '';
                                const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
                                if (!idToken) {
                                        return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
                                                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }
                                if (!env.FIREBASE_PROJECT_ID) {
                                        return new Response(JSON.stringify({ error: 'Server misconfigured: FIREBASE_PROJECT_ID missing' }), {
                                                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }
                                let caller: { email: string; uid: string };
                                try {
                                        caller = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
                                } catch {
                                        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                                                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }
                                if (!ALLOWED_EMAILS.has(caller.email)) {
                                        return new Response(JSON.stringify({ error: 'Forbidden' }), {
                                                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }

                                const body = await request.json() as { models?: string[] };
                                const models = Array.isArray(body.models) ? body.models : [];
                                if (models.length === 0 || models.length > 80) {
                                        return new Response(JSON.stringify({ error: 'Provide 1–80 model ids in `models`.' }), {
                                                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }

                                // Parallel probe with concurrency=6. Each model has an 8-second hard
                                // AbortSignal timeout — Cloudflare Workers' setTimeout doesn't reliably
                                // fire while an `await fetch` is pending (race conditions with the event
                                // loop), so we use AbortSignal.timeout() which forcibly cancels the
                                // underlying TCP connection. A previous probe run logged a 508-second
                                // latency for one OpenRouter model because the setTimeout-based race
                                // never won — AbortSignal closes that loophole.
                                const PROBE_TIMEOUT_MS = 8000;

                                const probeOne = async (modelId: string): Promise<any> => {
                                        const start = Date.now();
                                        const abortSignal = AbortSignal.timeout(PROBE_TIMEOUT_MS);

                                        // OpenRouter probe
                                        if (isOpenRouterModel(modelId)) {
                                                if (!env.OPENROUTER_API_KEY) {
                                                        return { model: modelId, ok: false, latencyMs: 0, key: 'OPENROUTER', keyTail: 'missing', errorKind: 'AUTH' as ErrorKind, remediation: 'OPENROUTER_API_KEY secret missing — set it in Cloudflare Worker.' };
                                                }
                                                const orTail = env.OPENROUTER_API_KEY.slice(-4);
                                                try {
                                                        await callOpenRouter([{ role: 'user', parts: [{ text: 'ping' }] }], modelId, { temperature: 0, maxOutputTokens: 1 }, env, abortSignal);
                                                        console.log(`[Probe] ${modelId} OK (${Date.now() - start}ms key=OPENROUTER tail=…${orTail})`);
                                                        return { model: modelId, ok: true, latencyMs: Date.now() - start, key: 'OPENROUTER', keyTail: `…${orTail}` };
                                                } catch (e: any) {
                                                        const msg = e?.message || String(e);
                                                        // AbortError fires when AbortSignal.timeout cancels the fetch.
                                                        const isTimeout = /AbortError|abort|timeout/i.test(msg);
                                                        const errorKind: ErrorKind = isTimeout ? 'TIMEOUT'
                                                                : /429|rate.?limit|too many/i.test(msg) ? 'QUOTA'
                                                                : /401|invalid.*key|API_KEY_INVALID/i.test(msg) ? 'AUTH'
                                                                : /404|not.?found|model.*not/i.test(msg) ? 'INVALID_MODEL'
                                                                : /403|forbidden|permission/i.test(msg) ? 'PERMISSION'
                                                                : 'UNKNOWN';
                                                        const remediation = errorKind === 'TIMEOUT'
                                                                ? `${modelId} took >${PROBE_TIMEOUT_MS}ms to respond to a 1-token ping. Too slow for production. Demoted in chain.`
                                                                : errorKind === 'QUOTA'
                                                                ? `OpenRouter free tier rate-limited on ${modelId}. Wait a minute, or fund the key at https://openrouter.ai/credits to unlock paid variants.`
                                                                : errorKind === 'INVALID_MODEL'
                                                                ? `Model ${modelId} not available on OpenRouter. Remove from chain or check the slug at https://openrouter.ai/models.`
                                                                : errorKind === 'AUTH'
                                                                ? `OpenRouter key …${orTail} invalid. Regenerate at https://openrouter.ai/keys.`
                                                                : `OpenRouter error on key …${orTail}: ${msg.slice(0, 120)}`;
                                                        console.warn(`[Probe] ${modelId} FAIL (${errorKind} key=OPENROUTER tail=…${orTail}): ${msg.slice(0, 160)}`);
                                                        return { model: modelId, ok: false, latencyMs: Date.now() - start, key: 'OPENROUTER', keyTail: `…${orTail}`, errorKind, errorDetail: msg.slice(0, 240), remediation };
                                                }
                                        }

                                        // Groq probe
                                        if (isGroqModel(modelId)) {
                                                if (!env.GROQ_API_KEY) {
                                                        return { model: modelId, ok: false, latencyMs: 0, key: 'GROQ', keyTail: 'missing', errorKind: 'AUTH' as ErrorKind, remediation: 'GROQ_API_KEY secret missing — sign up at console.groq.com (free, no card) and set the secret in Cloudflare Worker.' };
                                                }
                                                const groqTail = env.GROQ_API_KEY.slice(-4);
                                                try {
                                                        await callGroq([{ role: 'user', parts: [{ text: 'ping' }] }], modelId, { temperature: 0 }, env, abortSignal);
                                                        console.log(`[Probe] ${modelId} OK (${Date.now() - start}ms key=GROQ tail=…${groqTail})`);
                                                        return { model: modelId, ok: true, latencyMs: Date.now() - start, key: 'GROQ', keyTail: `…${groqTail}` };
                                                } catch (e: any) {
                                                        const msg = e?.message || String(e);
                                                        // AbortError fires when AbortSignal.timeout cancels the fetch.
                                                        const isTimeout = /AbortError|abort|timeout/i.test(msg);
                                                        return {
                                                                model: modelId,
                                                                ok: false,
                                                                latencyMs: Date.now() - start,
                                                                key: 'GROQ',
                                                                keyTail: `…${groqTail}`,
                                                                errorKind: isTimeout ? 'TIMEOUT' as ErrorKind
                                                                        : /429|rate.?limit/i.test(msg) ? 'QUOTA' as ErrorKind
                                                                        : /401|invalid/i.test(msg) ? 'AUTH' as ErrorKind
                                                                        : /404|not.?found/i.test(msg) ? 'INVALID_MODEL' as ErrorKind
                                                                        : 'UNKNOWN' as ErrorKind,
                                                                errorDetail: msg.slice(0, 240),
                                                                remediation: isTimeout
                                                                        ? `${modelId} took >${PROBE_TIMEOUT_MS}ms — too slow for production. Demoted in chain.`
                                                                        : `Groq key …${groqTail}: ${msg.slice(0, 120)}. Check the key at https://console.groq.com/keys.`,
                                                        };
                                                }
                                        }

                                        // Gemini probe — uses PREMIUM key by default (same as /api/generate)
                                        const usePremiumKey = !!env.GEMINI_PREMIUM_KEY;
                                        const apiKey = usePremiumKey
                                                ? env.GEMINI_PREMIUM_KEY!
                                                : (env.GEMINI_API_KEY || env.GEMINI_PREMIUM_KEY);
                                        if (!apiKey) {
                                                return { model: modelId, ok: false, latencyMs: 0, key: 'NONE', keyTail: 'missing', errorKind: 'AUTH' as ErrorKind, remediation: 'Neither GEMINI_API_KEY nor GEMINI_PREMIUM_KEY is set in the Cloudflare Worker.' };
                                        }
                                        const probeKeyTail = apiKey.length >= 4 ? apiKey.slice(-4) : '????';
                                        const probeKeyKind = usePremiumKey ? 'PREMIUM' : (env.GEMINI_API_KEY ? 'FREE' : 'PREMIUM_FALLBACK');

                                        // Direct fetch to the REST endpoint instead of GoogleGenerativeAI
                                                // SDK, so we can attach the same AbortSignal.timeout as the
                                                // OpenRouter / Groq probes. The SDK's Promise.race-based
                                                // timeout has the same Cloudflare event-loop bug we just
                                                // worked around. Endpoint shape matches v1beta generateContent.
                                                try {
                                                const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
                                                const probeResponse = await fetch(url, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        signal: abortSignal,
                                                        body: JSON.stringify({
                                                                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                                                                generationConfig: { maxOutputTokens: 1, temperature: 0 },
                                                        }),
                                                });
                                                if (!probeResponse.ok) {
                                                        const errBody = await probeResponse.text().catch(() => '');
                                                        throw new Error(`Gemini ${probeResponse.status}: ${errBody.slice(0, 200)}`);
                                                }
                                                console.log(`[Probe] ${modelId} OK (${Date.now() - start}ms key=${probeKeyKind} tail=…${probeKeyTail})`);
                                                return { model: modelId, ok: true, latencyMs: Date.now() - start, key: probeKeyKind, keyTail: `…${probeKeyTail}` };
                                        } catch (e: any) {
                                                const msg = e?.message || String(e);
                                                // AbortError fires when AbortSignal.timeout cancels the fetch.
                                                const isTimeout = /AbortError|abort|timeout/i.test(msg);
                                                if (isTimeout) {
                                                        console.warn(`[Probe] ${modelId} TIMEOUT (key=${probeKeyKind} tail=…${probeKeyTail})`);
                                                        return {
                                                                model: modelId, ok: false, latencyMs: Date.now() - start,
                                                                key: probeKeyKind, keyTail: `…${probeKeyTail}`,
                                                                errorKind: 'TIMEOUT' as ErrorKind,
                                                                errorDetail: msg.slice(0, 240),
                                                                remediation: `${modelId} took >${PROBE_TIMEOUT_MS}ms — too slow for production. Demoted in chain.`,
                                                        };
                                                }
                                                const classification = classifyGeminiError(msg, modelId, probeKeyTail);
                                                console.warn(`[Probe] ${modelId} FAIL (${classification.kind} key=${probeKeyKind} tail=…${probeKeyTail}): ${msg.slice(0, 160)}`);
                                                return { model: modelId, ok: false, latencyMs: Date.now() - start, key: probeKeyKind, keyTail: `…${probeKeyTail}`, errorKind: classification.kind, errorDetail: msg.slice(0, 240), remediation: classification.remediation };
                                        }
                                };

                                // Worker pool with concurrency=6. Each worker pulls the next model
                                // off the cursor and pushes its result; when the queue is empty
                                // the worker exits. Combined with the 8s per-probe timeout, a
                                // typical 25-model chain finishes in ~6-12s well under the
                                // Cloudflare Worker 30s wall.
                                const CONCURRENCY = 6;
                                const results: any[] = new Array(models.length);
                                let cursor = 0;
                                const worker = async () => {
                                        while (cursor < models.length) {
                                                const idx = cursor++;
                                                results[idx] = await probeOne(models[idx]);
                                        }
                                };
                                await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

                                return new Response(JSON.stringify({ results, probedAt: Date.now() }), {
                                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                                });
                        }

                        // Dynamic chain config — frontend reads the cached chain on app
                        // boot. Public endpoint (no auth) since the data is purely a list
                        // of model ids, no secrets. Returns the most recent successful
                        // sync, or a clear "stale=true" marker if KV is empty.
                        if (url.pathname === "/api/chains" && request.method === "GET") {
                                if (!env.AI_CHAINS_CACHE) {
                                        return new Response(JSON.stringify({ error: 'AI_CHAINS_CACHE KV not bound on Worker', stale: true }), {
                                                status: 503,
                                                headers: { ...corsHeaders, "Content-Type": "application/json" },
                                        });
                                }
                                const cached = await env.AI_CHAINS_CACHE.get(CHAINS_KV_KEY);
                                if (!cached) {
                                        return new Response(JSON.stringify({ error: 'Chain cache empty — run /api/sync-models first', stale: true }), {
                                                status: 404,
                                                headers: { ...corsHeaders, "Content-Type": "application/json" },
                                        });
                                }
                                return new Response(cached, {
                                        headers: {
                                                ...corsHeaders,
                                                "Content-Type": "application/json",
                                                "Cache-Control": "public, max-age=600", // browser/CDN can hold for 10 min
                                        },
                                });
                        }

                        // Manual sync trigger — admin click in ModelHealthPanel. Same
                        // auth + allow-list as /api/generate. Cron runs this daily, but
                        // the admin can force a refresh on demand if a provider just
                        // shipped a new model and they don't want to wait.
                        if (url.pathname === "/api/sync-models" && request.method === "POST") {
                                const authHeader = request.headers.get('Authorization') || '';
                                const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
                                if (!idToken) {
                                        return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), {
                                                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }
                                if (!env.FIREBASE_PROJECT_ID) {
                                        return new Response(JSON.stringify({ error: 'Server misconfigured: FIREBASE_PROJECT_ID missing' }), {
                                                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }
                                let caller: { email: string; uid: string };
                                try {
                                        caller = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
                                } catch {
                                        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                                                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }
                                if (!ALLOWED_EMAILS.has(caller.email)) {
                                        return new Response(JSON.stringify({ error: 'Forbidden' }), {
                                                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        });
                                }

                                try {
                                        const result = await syncModels(env);
                                        return new Response(JSON.stringify(result), {
                                                headers: { ...corsHeaders, "Content-Type": "application/json" },
                                        });
                                } catch (e: any) {
                                        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
                                                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
                                        });
                                }
                        }

                        // Email Import Endpoint (Apps Script + Testing)
                        if (request.method === "POST" && (url.pathname === "/api/email" || url.pathname === "/")) {
                                const body = await request.json() as any;
                                console.log(`[Fetch] POST ${url.pathname} - Keys: ${Object.keys(body).join(', ')}`);

                                const from = body.from || "unknown@example.com";
                                const emailContent = body.content || body.raw || body.body || body.html || body.subject || "";

                                if (!from || from === "unknown@example.com") {
                                        return new Response(JSON.stringify({ error: "Missing 'from' field" }), {
                                                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                        });
                                }

                                console.log(`[Fetch] Processing email from: ${from}, content length: ${emailContent.length}`);

                                const stream = new ReadableStream({
                                        start(controller) {
                                                controller.enqueue(new TextEncoder().encode(emailContent || "Subject: Test"));
                                                controller.close();
                                        }
                                });
                                const result = await handleEmail(from, stream, env, ctx);
                                return new Response(JSON.stringify(result, null, 2), {
                                        status: result.success ? 200 : 500,
                                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                });
                        }

                        // Fallback for unknown POST paths
                        if (request.method === "POST") {
                                console.warn(`[Fetch] Unknown POST path: ${url.pathname}`);
                                return new Response(JSON.stringify({ error: `Unknown endpoint: ${url.pathname}` }), {
                                        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                });
                        }

                        return new Response("Not Found", { status: 404, headers: corsHeaders });

                } catch (e: any) {
                        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
        }
};

async function handleEmail(from: string, rawStream: ReadableStream, env: Env, ctx: ExecutionContext) {
        console.log(`[EmailPipe] Processing email from: ${from}`);
        const logs: string[] = [`Processing email from ${from} at ${new Date().toISOString()}`];

        // Safe Logger Helper (Non-blocking)
        const safeLog = (uid: string | null, msg: string, data?: any) => {
                if (uid) {
                        ctx.waitUntil(logToSystem(uid, env.FIREBASE_PROJECT_ID, token, msg, data));
                }
        };

        let token: string = "";
        let uid: string | null = null;
        let textBody = "";

        try {
                // 0. Env Var Validation
                if (!env.FIREBASE_SERVICE_ACCOUNT) {
                        console.error('[Pipeline] FATAL: FIREBASE_SERVICE_ACCOUNT env var is missing!');
                        return { success: false, error: 'Missing FIREBASE_SERVICE_ACCOUNT', logs };
                }
                if (!env.FIREBASE_PROJECT_ID) {
                        console.error('[Pipeline] FATAL: FIREBASE_PROJECT_ID env var is missing!');
                        return { success: false, error: 'Missing FIREBASE_PROJECT_ID', logs };
                }
                if (!env.GEMINI_API_KEY) {
                        console.error('[Pipeline] FATAL: GEMINI_API_KEY env var is missing!');
                        return { success: false, error: 'Missing GEMINI_API_KEY', logs };
                }

                // 1. Auth (Blocking, Required)
                logs.push("Step 1: Authenticating...");
                token = await getFirebaseAccessToken(env, logs) || "";
                console.log(`[Pipeline] Step 1 Result: token=${token ? 'OK' : 'FAILED'}`);
                if (!token) throw new Error("Firebase Auth Token is null");

                const senderEmail = extractEmail(from);
                console.log(`[Pipeline] Step 1b: Looking up user for email: ${senderEmail}`);
                uid = await getUserByEmail(senderEmail, env.FIREBASE_PROJECT_ID, token);
                console.log(`[Pipeline] Step 1b Result: uid=${uid || 'NOT FOUND'}`);

                if (!uid) {
                        console.error(`[Pipeline] Step 1b FAILED: User not found for ${senderEmail}`);
                        return { success: false, message: `User not found: ${senderEmail}`, logs };
                }

                // From here on, use safeLog for non-critical logging
                safeLog(uid, "Email Received", { from: senderEmail, subject: "Parsing..." });

                // 2. Parse Email
                logs.push("Step 2: Parsing Email...");
                const rawBuffer = await streamToArrayBuffer(rawStream);
                let attachments: any[] = [];
                let email: any = null;

                // Try MIME parsing first (for Cloudflare Email Routing)
                try {
                        const parser = new PostalMime();
                        email = await parser.parse(rawBuffer);
                        textBody = email.text || email.html || "";
                        attachments = (email.attachments || []).filter((att: any) =>
                                att.mimeType === "application/pdf" || att.mimeType.startsWith("image/")
                        );
                } catch (parseError: any) {
                        console.warn(`[Pipeline] PostalMime parse failed: ${parseError.message}`);
                }

                // Fallback: if MIME parsing yielded nothing, use raw buffer as plain text
                // (Apps Script sends formatted text, not raw MIME)
                if (!textBody || textBody.trim().length < 10) {
                        textBody = new TextDecoder().decode(rawBuffer);
                        console.log(`[Pipeline] Using raw text fallback (${textBody.length} chars)`);
                }

                logs.push(`Body Length: ${textBody.length}, Attachments: ${attachments.length}`);
                console.log(`[Pipeline] Step 2 Done: body=${textBody.length} chars, attachments=${attachments.length}`);

                // 3. Get Context
                const existingTrips = await getUserFutureTrips(uid, env.FIREBASE_PROJECT_ID, token).catch(() => []);

                // 4. Gemini Extraction (Critical Step)
                logs.push("Step 4: Gemini Analysis...");
                let analysis;
                try {
                        analysis = await analyzeTripWithGemini(
                                textBody,
                                attachments,
                                existingTrips,
                                env.GEMINI_API_KEY
                        );

                        if (!analysis) throw new Error("Null Analysis Returned");

                        safeLog(uid, "Gemini Success", { action: analysis.action, tripId: analysis.tripId });

                } catch (geminiError: any) {
                        // --- FALLBACK PRESERVATION ---
                        logs.push(`Gemini Failed: ${geminiError.message}. Saving Raw...`);
                        safeLog(uid, "Gemini Failed - Saving Raw", { error: geminiError.message });

                        // Save to Processing Queue
                        await saveToProcessingQueue(uid, env.FIREBASE_PROJECT_ID, token, {
                                from: senderEmail,
                                receivedAt: new Date().toISOString(),
                                subject: email?.subject || "No Subject",
                                bodySnippet: textBody.substring(0, 5000),
                                error: geminiError.message
                        });

                        throw new Error(`Gemini Failed (Saved to Queue): ${geminiError.message}`);
                }

                // 5. Apply Changes
                let finalTripId = "";
                let finalAction = "";

                // ENRICH DATA: Explicitly link ownership for Frontend Visibility
                const enrichedData = {
                        ...analysis.data,
                        ownerEmail: senderEmail,
                        userId: uid,
                        status: 'confirmed',
                        collaborators: [],
                        source: 'email_import'
                };

                // --- TEMPORAL MATCHING OVERRIDE (Feb 2026) ---
                // If Gemini says "create" (or gave a tripId), double-check dates.
                // We trust strict date overlap more than AI hallucination.
                if (enrichedData.startDate && enrichedData.endDate) {
                        const overlapId = findOverlappingTrip(uid, enrichedData.startDate, enrichedData.endDate, existingTrips);
                        if (overlapId) {
                                logs.push(`🕒 Temporal Match: Found existing trip ${overlapId}. Overriding action to 'update'.`);
                                analysis.action = 'update';
                                analysis.tripId = overlapId;
                        }
                }

                if (analysis.action === 'update' && analysis.tripId) {
                        logs.push(`Updating Trip ${analysis.tripId}...`);
                        const originalTrip = await getTripById(uid, analysis.tripId, env.FIREBASE_PROJECT_ID, token);

                        if (originalTrip) {
                                const mergedTrip = mergeTripData(originalTrip, enrichedData);
                                await updateTrip(uid, analysis.tripId, mergedTrip, env.FIREBASE_PROJECT_ID, token);
                                finalTripId = analysis.tripId;
                                finalAction = "update";
                        } else {
                                // Fallback to create if ID invalid
                                finalAction = 'create';
                                finalTripId = await createTrip(uid, enrichedData, env.FIREBASE_PROJECT_ID, token);
                        }
                } else {
                        logs.push("Creating New Trip...");
                        finalTripId = await createTrip(uid, enrichedData, env.FIREBASE_PROJECT_ID, token);
                        finalAction = "create";
                }

                safeLog(uid, "Success", { action: finalAction, tripId: finalTripId });
                return { success: true, action: finalAction, tripId: finalTripId, logs };

        } catch (error: any) {
                console.error("Fatal Error:", error);

                // Best effort log using safeLog (waitUntil)
                safeLog(uid, "Worker Crashed", { error: error.message });

                logs.push(`Error: ${error.message}`);
                return { success: false, error: error.message, logs };
        }
}

// --- GEMINI (ROBUST) ---


// --- UTILS: ROBUST PARSING ENGINE ---

// 1. Aggressive JSON Cleaning
const cleanJSON = (text: string): string => {
        if (!text) return "{}";
        // Remove Markdown, remove JSON comments if any, and clean spaces
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Fix for cases where the model adds text before/after the JSON
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return cleaned;
};

// 2. Smart Date Fixing (Converts everything to ISO)
const fixDate = (d: string | undefined): string => {
        if (!d) return "";
        d = d.trim();

        // If it's already in ISO format (2026-03-30)
        if (d.match(/^\d{4}-\d{2}-\d{2}/)) return d.split('T')[0];

        // If it's in Israeli/European format (30/03/2026 or 30.03.2026)
        const eurMatch = d.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{2,4})/);
        if (eurMatch) {
                const year = eurMatch[3].length === 2 ? `20${eurMatch[3]}` : eurMatch[3];
                return `${year}-${eurMatch[2].padStart(2, '0')}-${eurMatch[1].padStart(2, '0')}`;
        }
        return d; // Return original if failed, for manual handling
};

// 3. Safe Extraction
// Function that knows how to take info even if it's inside 'data' or direct
const safeGet = (obj: any, path: string[]) => {
        let current = obj;
        // Try searching in the normal path
        for (const key of path) {
                if (!current) break;
                current = current[key];
        }
        if (current) return current;

        // Try searching without 'data' (for structure hallucinations)
        if (path.includes('data')) {
                const newPath = path.filter(k => k !== 'data');
                current = obj;
                for (const key of newPath) {
                        if (!current) break;
                        current = current[key];
                }
                return current;
        }
        return undefined;
};

// --- HELPERS ---

// פונקציה להמרת קבצים ל-Base64 כדי שג'מיני יקרא אותם
function arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
}

// 4. Robust Time Extraction
const extractTimeFromText = (text: string | undefined): string => {
        if (!text) return "12:00";
        // Look for HH:MM pattern
        const match = text.match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
        return match ? match[0].padStart(5, '0') : "12:00";
};

// --- THE CORE LOGIC ---

// --- WORKER TRIP SCHEMA (Duplicated to avoid import issues) ---
const WORKER_TRIP_SCHEMA: any = {
        type: "OBJECT",
        description: "A structured comprehensive travel itinerary extracted from documents.",
        properties: {
                tripMetadata: {
                        type: "OBJECT",
                        description: "High-level details about the trip",
                        properties: {
                                suggestedName: { type: "STRING", description: "A creative, short name for the trip" },
                                mainDestination: { type: "STRING" },
                                startDate: { type: "STRING", description: "ISO 8601 (YYYY-MM-DD)" },
                                endDate: { type: "STRING", description: "ISO 8601 (YYYY-MM-DD)" },
                                uniqueCityNames: { type: "ARRAY", items: { type: "STRING" } }
                        },
                        required: ["suggestedName", "startDate", "endDate"]
                },
                categories: {
                        type: "OBJECT",
                        properties: {
                                transport: {
                                        type: "ARRAY",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["flight", "train", "bus", "ferry", "cruise", "car_rental", "other"] },
                                                        confidence: { type: "NUMBER" },
                                                        data: {
                                                                type: "OBJECT",
                                                                properties: {
                                                                        airline: { type: "STRING" },
                                                                        flightNumber: { type: "STRING" },
                                                                        pnr: { type: "STRING" },
                                                                        passengers: { type: "ARRAY", items: { type: "STRING" } }, // Multi-Passenger
                                                                        departure: {
                                                                                type: "OBJECT",
                                                                                properties: { city: { type: "STRING" }, iata: { type: "STRING" }, isoDate: { type: "STRING" }, time: { type: "STRING" } },
                                                                                required: ["isoDate", "time"]
                                                                        },
                                                                        arrival: {
                                                                                type: "OBJECT",
                                                                                properties: { city: { type: "STRING" }, iata: { type: "STRING" }, isoDate: { type: "STRING" }, time: { type: "STRING" } },
                                                                                required: ["isoDate", "time"]
                                                                        },
                                                                        price: { type: "OBJECT", properties: { amount: { type: "NUMBER" }, currency: { type: "STRING" } } },
                                                                        // Deep fields
                                                                        baggage: { type: "STRING" },
                                                                        seat: { type: "STRING" },
                                                                        class: { type: "STRING" },
                                                                        provider: { type: "STRING" },
                                                                        trainNumber: { type: "STRING" },
                                                                        shipName: { type: "STRING" },
                                                                        cabinNumber: { type: "STRING" }
                                                                }
                                                        }
                                                },
                                                required: ["type", "data"]
                                        }
                                },
                                accommodation: {
                                        type: "ARRAY",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["hotel", "airbnb", "other"] },
                                                        confidence: { type: "NUMBER" },
                                                        data: {
                                                                type: "OBJECT",
                                                                properties: {
                                                                        hotelName: { type: "STRING" },
                                                                        address: { type: "STRING" },
                                                                        checkIn: { type: "OBJECT", properties: { isoDate: { type: "STRING" }, time: { type: "STRING" } }, required: ["isoDate"] },
                                                                        checkOut: { type: "OBJECT", properties: { isoDate: { type: "STRING" }, time: { type: "STRING" } }, required: ["isoDate"] },
                                                                        guests: { type: "ARRAY", items: { type: "STRING" } }, // Multi-Guest
                                                                        price: { type: "OBJECT", properties: { amount: { type: "NUMBER" }, currency: { type: "STRING" } } },
                                                                        mealPlan: { type: "STRING" },
                                                                        cancellationPolicy: { type: "STRING" }
                                                                },
                                                                required: ["hotelName", "checkIn", "checkOut"]
                                                        }
                                                },
                                                required: ["type", "data"]
                                        }
                                },
                                carRental: {
                                        type: "ARRAY",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["car_rental"] },
                                                        data: {
                                                                type: "OBJECT",
                                                                properties: {
                                                                        provider: { type: "STRING" },
                                                                        pickupDate: { type: "STRING" },
                                                                        dropoffDate: { type: "STRING" }
                                                                }
                                                        }
                                                }
                                        }
                                }
                        }
                }
        }
};

async function analyzeTripWithGemini(text: string, attachments: any[], existingTrips: any[], apiKey: string) {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Flash-first chain — Pro is ~5-10x the cost of Flash and on most
        // booking PDFs (single-leg flights, hotel confirms) Flash returns
        // the same structured JSON. Pro stays in the chain as escalation
        // when Flash output is malformed or incomplete.
        const CANDIDATES = [
                "gemini-2.5-flash",        // 1. PRIMARY: cheap + fast, handles 80%+ of booking docs
                "gemini-3-flash-preview",  // 2. BACKUP: Gemini 3 Flash preview
                "gemini-3.1-pro-preview",  // 3. ESCALATION: best at complex multi-leg docs
                "gemini-2.5-pro",          // 4. LAST RESORT: stable Pro
        ];

        // THIS IS A SYSTEM GENERATED PROMPT -- DO NOT EDIT MANUALLY IF NOT SYNCING WITH AISERVICE.TS
        const SYSTEM_PROMPT = `
You are an Elite Travel Document Intelligence System, combining expertise from:
- IATA NDC data standards for aviation
- Hotel industry PMS standards
- Google Document AI visual parsing
- Multi-language OCR (Hebrew, Arabic, English)
- Maritime & Rail transport standards

═══════════════════════════════════════════════════════════════
PHASE 1: DOCUMENT CLASSIFICATION & VISUAL CALIBRATION
═══════════════════════════════════════════════════════════════

Before extracting ANY data, classify each document:
- **E-Ticket / Boarding Pass** → Extract flights, PNR, baggage, terminal
- **Train Ticket** → Extract train number, carriage, seat, platform
- **Cruise/Ferry** → Extract ship, cabin, ports
- **Hotel Confirmation** → Extract hotel, dates, room, price
- **Car Rental Agreement** → Extract provider, dates, pickup/dropoff
- **Unknown / Noise** → Report as unprocessable

RTL & Bi-Directional Rules:
- Hebrew/Arabic text flows Right-to-Left, but NUMBERS flow Left-to-Right
- "897" stays "897" (never reverse digits)
- "תל אביב → לונדון" means Origin: Tel Aviv, Destination: London

═══════════════════════════════════════════════════════════════
PHASE 2: EXHAUSTIVE DATA EXTRACTION
═══════════════════════════════════════════════════════════════

A. TRANSPORT (Flights, Trains, Ferries, Cruises, Buses)
   Expected Output Format: { "type": "flight" | "train" | "ferry", "data": { ... } }

   1. FLIGHTS — Extract ALL fields:
      - airline, airlineCode (IATA 2-letter)
      - flightNumber (e.g. "LY5103"), pnr (6-char)
      - departure: { city, iata, isoDate (YYYY-MM-DD), time (HH:MM) }
      - arrival: { city, iata, isoDate (YYYY-MM-DD), time (HH:MM) }
      - terminal, baggage, passengerName, price: { amount, currency }
      
      ⚠️ MULTI-SEGMENT RULE (CRITICAL):
      - Each flight LEG must be a SEPARATE transport entry.
      - A round-trip (TLV→ATH outbound, ATH→TLV return) MUST produce TWO separate entries.

      ⚠️ ISRAIR / HEBREW TICKET RULES:
      - Look closely for "Tel Aviv", "TLV", "Ben Gurion" in Hebrew "תל אביב", "נתב״ג".
      - Look for destination: "Tbilisi", "TBS", "Batumi", "BUS" in Hebrew "טביליסי", "באטומי".
      - Date format on these tickets is often DD/MM/YYYY. CONVERT TO ISO 8601 "YYYY-MM-DD".
      - If city is missing but IATA code exists (e.g. "TLV"), infer the city ("Tel Aviv").
      - Distinguish between "Flight" lines and "Passenger" lines. Don't create a flight for every passenger if it's the same flight. Group passengers under one flight entry if they share the same PNR and flight details.

   2. TRAINS/FERRIES — Extract provider, number, seat, platform/deck, dep/arr details.

B. ACCOMMODATION (Hotels, Airbnb) — Extract ALL fields:
    - hotelName, address, city, country
    - checkIn: { isoDate, time }, checkOut: { isoDate, time }
    - bookingId, roomType, guestName, price: { amount, currency }

C. CAR RENTAL — Extract ALL fields:
    - provider, vehicleType, pickup/dropoff details, price.

═══════════════════════════════════════════════════════════════
PHASE 3: DATE & TIME RULES (CRITICAL)
═══════════════════════════════════════════════════════════════

1. ALL dates MUST be ISO 8601: YYYY-MM-DD
2. ALL times MUST be 24-hour: HH:MM
3. If year is missing, assume the current year (${new Date().getFullYear()}) unless the month has already passed this year and the booking looks forward-dated — then use next year.
4. Hebrew months: ינואר=01, פברואר=02, ...
5. Arrival MUST be after departure.

═══════════════════════════════════════════════════════════════
PHASE 6: OUTPUT FORMAT (STRICT JSON SCHEMA)
═══════════════════════════════════════════════════════════════

The output must strictly follow the provided JSON Schema.
Ensure all dates are YYYY-MM-DD.
Ensure all passengers are extracted into the 'passengers' array.
Ensure round-trip flights are SPLIT into separate transport items.
`;

        // 1. בניית ה-Parts כולל הקבצים (זה החלק שהיה חסר!)
        const parts: any[] = [{ text: SYSTEM_PROMPT }, { text: `Email Context: ${text}` }];

        if (attachments && attachments.length > 0) {
                for (const att of attachments) {
                        // המרה ל-Base64 כדי שג'מיני יראה את הקובץ
                        // Note: PostalMime returns Uint8Array, checking compat
                        const buffer = att.content.buffer ? att.content.buffer : att.content;
                        const base64Data = arrayBufferToBase64(buffer);
                        parts.push({
                                inlineData: {
                                        mimeType: att.mimeType || "application/pdf",
                                        data: base64Data
                                }
                        });
                }
        } else {
                console.warn("No attachments found! Gemini might fail to read the ticket.");
        }

        // 2. קריאה ל-Gemini
        let frontendData: any = null;
        for (const modelName of CANDIDATES) {
                try {
                        const model = genAI.getGenerativeModel({
                                model: modelName,
                                generationConfig: {
                                        responseMimeType: "application/json"
                                        // responseSchema removed to allow flexible parsing of complex tickets
                                }
                        });

                        const result = await model.generateContent({ contents: [{ role: "user", parts }] });
                        const rawText = result.response.text();
                        frontendData = JSON.parse(rawText); // Direct Parse, No regex cleaning needed!
                        if (frontendData) break;
                } catch (e: any) {
                        console.warn(`[Gemini] Model ${modelName} failed: ${e.message}`);
                }
        }

        if (!frontendData) {
                console.error(`[Pipeline] ALL Gemini models failed! Tried: ${CANDIDATES.join(', ')}`);
                throw new Error("AI failed to extract data.");
        }
        console.log(`[Pipeline] Step 4 Done: Gemini returned data. Keys: ${Object.keys(frontendData).join(', ')}`);
        console.log(`[Pipeline] Flights found: ${frontendData.categories?.flights?.length || 0}`);
        if (frontendData.categories?.transport) {
                const flights = frontendData.categories.transport.filter((t: any) => t.type === 'flight');
                flights.forEach((f: any, i: number) => {
                        const d = f.data || {};
                        console.log(`[Pipeline] Flight ${i}: ${d.departure?.iata || '?'} → ${d.arrival?.iata || '?'} on ${d.departure?.isoDate || '?'} at ${d.departure?.time || '?'}, flight=${d.flightNumber || '?'}`);
                });
        }

        // --- IATA→City Fallback Map ---
        const IATA_CITY_MAP: Record<string, string> = {
                TLV: 'Tel Aviv', TBS: 'Tbilisi', BUS: 'Batumi', ATH: 'Athens',
                SKG: 'Thessaloniki', RHO: 'Rhodes', HER: 'Heraklion', LCA: 'Larnaca',
                PFO: 'Paphos', IST: 'Istanbul', SAW: 'Istanbul', AYT: 'Antalya',
                CDG: 'Paris', FCO: 'Rome', BCN: 'Barcelona', BKK: 'Bangkok',
                HKT: 'Phuket', SIN: 'Singapore', DXB: 'Dubai', JFK: 'New York',
                LHR: 'London', AMS: 'Amsterdam', FRA: 'Frankfurt', MUC: 'Munich',
                VIE: 'Vienna', PRG: 'Prague', BUD: 'Budapest', SOF: 'Sofia',
                OTP: 'Bucharest', WAW: 'Warsaw', MAD: 'Madrid', LIS: 'Lisbon',
        };

        const resolveCity = (city: string | undefined, iata: string | undefined): string => {
                if (city && city !== 'Unknown' && city.trim()) return city;
                if (iata && IATA_CITY_MAP[iata.toUpperCase()]) return IATA_CITY_MAP[iata.toUpperCase()];
                if (iata && iata.trim()) return iata; // Use raw IATA as last resort
                return 'Unknown';
        };

        // --- MAPPING ENGINE (Golden Schema v2.2) ---

        // 1. Process Flights (from Unified Schema 'transport' array)
        const allTransport = frontendData.categories?.transport || [];
        const aiFlights = allTransport
                .filter((t: any) => t.type === 'flight')
                .map((t: any) => t.data || {});

        const processedSegments = aiFlights.map((f: any) => {
                const depDate = fixDate(f.departure?.isoDate);

                const depTime = (f.departure?.time && f.departure?.time !== "00:00")
                        ? f.departure.time
                        : extractTimeFromText(JSON.stringify(f));

                const arrTime = (f.arrival?.time && f.arrival?.time !== "00:00")
                        ? f.arrival.time
                        : extractTimeFromText(JSON.stringify(f.arrival || {}));

                return {
                        airline: f.airline || "Unknown",
                        flight: f.flightNumber || "",
                        pnr: f.pnr || "",
                        passengers: f.passengers || (f.passengerName ? [f.passengerName] : []),
                        baggage: f.baggage || "",
                        from: resolveCity(f.departure?.city, f.departure?.iata),
                        to: resolveCity(f.arrival?.city, f.arrival?.iata),
                        fromCode: f.departure?.iata || "",
                        toCode: f.arrival?.iata || "",
                        date: depDate || new Date().toISOString().split('T')[0],
                        departureTime: depTime,
                        arrivalTime: arrTime,
                        arrivalDate: fixDate(f.arrival?.isoDate) || depDate || "",
                        price: f.price?.amount || f.totalPrice || 0,
                        currency: f.price?.currency || f.currency || "USD"
                };
        });

        // 2. Process Hotels (from Unified Schema 'accommodation' array)
        const allAccommodation = frontendData.categories?.accommodation || [];
        const aiHotels = allAccommodation
                .filter((h: any) => h.type === 'hotel' || !h.type) // Default to hotel if type missing
                .map((h: any) => h.data || {});

        const processedHotels = aiHotels.map((h: any) => ({
                name: h.hotelName || h.name || "Unknown Hotel",
                address: h.address || "",
                city: h.city || "Unknown",
                country: h.country || "",
                checkIn: fixDate(h.checkIn?.isoDate || h.checkIn),
                checkOut: fixDate(h.checkOut?.isoDate || h.checkOut),
                bookingId: h.bookingId || h.confirmationCode || "",
                price: h.price?.amount || h.price || 0,
                currency: h.price?.currency || h.currency || "USD"
        }));

        // 3. Process Car Rental (from Unified Schema 'carRental' array with wrapper)
        const allCars = frontendData.categories?.carRental || [];
        const aiCars = allCars.map((c: any) => c.data || {});

        const processedCars = aiCars.map((c: any) => ({
                provider: c.provider || "Unknown Rental",
                location: c.pickupLocation || "",
                city: c.pickupCity || c.city || "",
                country: c.country || "",
                pickupDate: fixDate(c.pickupDate),
                dropoffDate: fixDate(c.dropoffDate),
                price: c.price || 0,
                currency: c.currency || "USD"
        }));

        // 4. Construct Final Object — collect ALL dates from flights + hotels
        const allDates = [
                ...processedSegments.map((s: any) => s.date),
                ...processedSegments.map((s: any) => s.arrivalDate),
                ...processedHotels.flatMap((h: any) => [h.checkIn, h.checkOut])
        ].filter(Boolean).sort();
        const startDate = allDates[0] || fixDate(frontendData.tripMetadata?.startDate) || new Date().toISOString().split('T')[0];
        const endDate = allDates[allDates.length - 1] || fixDate(frontendData.tripMetadata?.endDate) || startDate;

        // Build display-friendly dates string for frontend
        const displayDates = startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
        console.log(`[Pipeline] Trip dates: ${startDate} → ${endDate} (from ${allDates.length} date points)`);

        // Compute total flight price across all segments
        const totalFlightPrice = aiFlights.reduce((sum: number, f: any) => sum + (f.totalPrice || 0), 0);

        const finalTripData: any = {
                name: frontendData.tripMetadata?.suggestedName || `Trip to ${processedSegments[0]?.to || "Unknown"}`,
                destination: frontendData.tripMetadata?.mainDestination || processedSegments[0]?.to || "Unknown",
                country: frontendData.tripMetadata?.mainCountry || "",
                startDate: startDate,
                endDate: endDate,
                dates: displayDates,
                status: 'confirmed',
                source: 'email_import',

                // Hotels & Car Rental arrays
                hotels: processedHotels,
                carRental: processedCars,
                documents: [],

                // Flight Logic: Correct Nesting + Price
                flights: processedSegments.length > 0 ? {
                        airline: processedSegments[0].airline,
                        pnr: processedSegments[0].pnr,
                        passengers: processedSegments[0].passengers || [],
                        totalPrice: totalFlightPrice || aiFlights[0]?.totalPrice || 0,
                        currency: aiFlights[0]?.currency || "USD",
                        segments: processedSegments
                } : undefined,

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
        };

        return {
                action: "create",
                tripId: "",
                data: finalTripData
        };
}

// --- FIREBASE / HELPERS remains similar but optimized ---

async function logToSystem(uid: string, projectId: string, token: string, message: string, details: any = {}) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/system_logs`;
        try {
                // Ensure details isn't too huge
                const safeDetails = JSON.stringify(details).substring(0, 2000);

                await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                                fields: {
                                        type: { stringValue: "EMAIL_IMPORT_DEBUG" },
                                        timestamp: { timestampValue: new Date().toISOString() },
                                        message: { stringValue: message },
                                        details: { stringValue: safeDetails }
                                }
                        })
                });
        } catch (e) {
                // Silently fail in worker logs, don't crash main thread
                console.error("Log failed", e);
        }
}

async function saveToProcessingQueue(uid: string, projectId: string, token: string, data: any) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/processing_queue`;
        // Map to Firestore
        const fields: any = {};
        for (const [k, v] of Object.entries(data)) {
                fields[k] = { stringValue: String(v) };
        }

        await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fields })
        }).catch(e => console.error("Failed to save to queue", e));
}



// --- LOGIC HELPER: TEMPORAL MATCHING (Feb 2026) ---
function findOverlappingTrip(userId: string, newStart: string, newEnd: string, existingTrips: any[]): string | null {
        if (!newStart || !newEnd || !existingTrips || existingTrips.length === 0) return null;

        try {
                const startA = new Date(newStart).getTime();
                const endA = new Date(newEnd).getTime();

                for (const trip of existingTrips) {
                        if (!trip.startDate || !trip.endDate) continue;

                        const startB = new Date(trip.startDate).getTime();
                        const endB = new Date(trip.endDate).getTime();

                        // Formula: (StartA <= EndB) AND (EndA >= StartB)
                        if (startA <= endB && endA >= startB) {
                                console.log(`🕒 Match Found! New: ${newStart}-${newEnd} overlaps with Trip ${trip.id} (${trip.startDate}-${trip.endDate})`);
                                return trip.id;
                        }
                }
        } catch (e) {
                console.warn("Date comparison error:", e);
        }
        return null;
}


// --- LOGIC HELPER: MERGE (v2.1 - with carRental) ---
function mergeTripData(original: any, newData: any): any {
        const merged = { ...original };
        const arrayFields = ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents', 'carRental'];
        arrayFields.forEach(field => {
                if (newData[field] && Array.isArray(newData[field])) {
                        merged[field] = [...(merged[field] || []), ...newData[field]];
                }
        });
        if (newData.flights) {
                if (!merged.flights) merged.flights = {};
                if (!merged.flights.pnr && newData.flights.pnr) merged.flights.pnr = newData.flights.pnr;
                if (!merged.flights.airline && newData.flights.airline) merged.flights.airline = newData.flights.airline;
                if (!merged.flights.totalPrice && newData.flights.totalPrice) merged.flights.totalPrice = newData.flights.totalPrice;
                if (!merged.flights.currency && newData.flights.currency) merged.flights.currency = newData.flights.currency;
                if (newData.flights.segments && Array.isArray(newData.flights.segments)) {
                        merged.flights.segments = [...(merged.flights.segments || []), ...newData.flights.segments];
                }
        }
        // Update country if missing
        if (newData.country && !merged.country) merged.country = newData.country;

        // SMART DATE EXPANSION: Extend trip duration if new events fall outside current bounds
        if (newData.startDate) {
                if (!merged.startDate || new Date(newData.startDate) < new Date(merged.startDate)) {
                        merged.startDate = newData.startDate;
                }
        }
        if (newData.endDate) {
                if (!merged.endDate || new Date(newData.endDate) > new Date(merged.endDate)) {
                        merged.endDate = newData.endDate;
                }
        }

        merged.updatedAt = new Date().toISOString();
        return merged;
}

// --- API CLIENTS (Unchanged) ---
async function getFirebaseAccessToken(env: Env, logs: string[]) {
        try {
                const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
                const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
                const now = Math.floor(Date.now() / 1000);
                const jwt = await new SignJWT({
                        scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit'
                }).setProtectedHeader({ alg: 'RS256' })
                        .setIssuer(serviceAccount.client_email)
                        .setSubject(serviceAccount.client_email)
                        .setAudience('https://oauth2.googleapis.com/token')
                        .setIssuedAt(now)
                        .setExpirationTime(now + 3600)
                        .sign(privateKey);

                const res = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
                });
                const data: any = await res.json();
                return data.access_token;
        } catch (e) { logs.push(`Auth Error: ${e}`); return null; }
}

function extractEmail(from: string) {
        const match = from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        return (match ? match[0] : from).toLowerCase().trim();
}

async function getUserByEmail(email: string, projectId: string, token: string) {
        // 1. Normalize email
        const cleanEmail = email.toLowerCase().trim();
        const emailsToTry = [cleanEmail];

        // Handle gmail.com / googlemail.com alias
        if (cleanEmail.endsWith('@gmail.com')) {
                emailsToTry.push(cleanEmail.replace('@gmail.com', '@googlemail.com'));
        } else if (cleanEmail.endsWith('@googlemail.com')) {
                emailsToTry.push(cleanEmail.replace('@googlemail.com', '@gmail.com'));
        }

        // 2. Try Firebase Auth Lookup (Primary)
        try {
                const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ email: emailsToTry })
                });
                const data: any = await res.json();
                if (data.users?.[0]?.localId) return data.users[0].localId;
        } catch (e) { console.warn("Auth Lookup Failed", e); }

        // 3. Fallback: Query Firestore 'users' collection (Secondary Emails / Aliases)
        // Check if email matches 'email' field OR is in 'aliases' array
        console.log(`[Lookup] Auth failed for ${cleanEmail}, trying Firestore...`);

        try {
                // Query: email == cleanEmail
                const qUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
                const queryBody = {
                        structuredQuery: {
                                from: [{ collectionId: "users" }],
                                where: {
                                        compositeFilter: {
                                                op: "OR",
                                                filters: [
                                                        { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: cleanEmail } } },
                                                        { fieldFilter: { field: { fieldPath: "aliases" }, op: "ARRAY_CONTAINS", value: { stringValue: cleanEmail } } }
                                                ]
                                        }
                                },
                                limit: 1
                        }
                };

                const fsRes = await fetch(qUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(queryBody)
                });

                const fsData: any = await fsRes.json();
                if (fsData[0]?.document?.name) {
                        return fsData[0].document.name.split('/').pop();
                }
        } catch (e) { console.warn("Firestore Lookup Failed", e); }

        return null; // User truly not found
}

async function getUserFutureTrips(uid: string, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips?pageSize=20&orderBy=updatedAt desc`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data: any = await res.json();
        if (!data.documents) return [];
        return data.documents.map((doc: any) => {
                const f = doc.fields;
                return {
                        id: doc.name.split('/').pop(),
                        name: f.name?.stringValue || "Untitled",
                        destination: f.destination?.stringValue || "",
                        startDate: f.startDate?.stringValue || "",
                        endDate: f.endDate?.stringValue || "",
                };
        });
}

async function getTripById(uid: string, tripId: string, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips/${tripId}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return null;
        const data: any = await res.json();
        return unmapFirestore(data);
}

async function createTrip(uid: string, data: any, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips`;
        const doc = mapJsonToFirestore(data);
        const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(doc)
        });
        const json: any = await res.json();
        if (!res.ok) {
                console.error(`[Firestore] CREATE FAILED: ${res.status} ${res.statusText}`, JSON.stringify(json));
                throw new Error(`Create Failed: ${res.status} - ${JSON.stringify(json).substring(0, 500)}`);
        }
        console.log(`[Pipeline] Step 5 Done: Trip created with ID ${json.name.split('/').pop()}`);
        return json.name.split('/').pop();
}

async function updateTrip(uid: string, tripId: string, data: any, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips/${tripId}`;
        const doc = mapJsonToFirestore(data);
        const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(doc)
        });
        if (!res.ok) {
                const errBody = await res.text();
                console.error(`[Firestore] UPDATE FAILED: ${res.status}`, errBody);
                throw new Error(`Update Failed: ${res.status} - ${errBody.substring(0, 500)}`);
        }
        console.log(`[Pipeline] Step 5 Done: Trip ${tripId} updated`);
}

function mapJsonToFirestore(data: any): any {
        const fields: any = {};
        const stringFields = ['name', 'destination', 'country', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'ownerEmail', 'userId', 'status'];
        const timeFields = ['createdAt', 'updatedAt', 'importedAt'];

        stringFields.forEach(k => {
                if (data[k] !== undefined && data[k] !== null) fields[k] = { stringValue: String(data[k]) }
        });

        // CRITICAL FIX: Always ensure timestamps exist, otherwise Firestore orderBy() hides the doc
        timeFields.forEach(k => {
                fields[k] = { timestampValue: data[k] || new Date().toISOString() };
        });
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents', 'carRental'].forEach(k => {
                const arr = data[k] || [];
                fields[k] = { arrayValue: { values: arr.map((item: any) => ({ mapValue: { fields: mapSimpleObject(item) } })) } };
        });

        // Explicitly handle collaborators (Array of Strings)
        if (data.collaborators && Array.isArray(data.collaborators)) {
                fields.collaborators = {
                        arrayValue: { values: data.collaborators.map((c: string) => ({ stringValue: c })) }
                };
        } else {
                fields.collaborators = { arrayValue: { values: [] } };
        }

        if (data.flights) {
                fields.flights = {
                        mapValue: {
                                fields: {
                                        pnr: { stringValue: data.flights.pnr || "" },
                                        airline: { stringValue: data.flights.airline || "" },
                                        totalPrice: { doubleValue: data.flights.totalPrice || 0 },
                                        currency: { stringValue: data.flights.currency || "USD" },
                                        segments: { arrayValue: { values: (data.flights.segments || []).map((seg: any) => ({ mapValue: { fields: mapSimpleObject(seg) } })) } }
                                }
                        }
                };
        } else {
                fields.flights = { mapValue: { fields: { segments: { arrayValue: { values: [] } } } } };
        }
        return { fields };
}

function unmapFirestore(doc: any): any {
        const f = doc.fields || {};
        const obj: any = {};
        ['name', 'destination', 'country', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'createdAt', 'updatedAt'].forEach(k => {
                if (f[k]) obj[k] = f[k].stringValue || f[k].timestampValue;
        });
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents', 'carRental'].forEach(k => {
                if (f[k] && f[k].arrayValue && f[k].arrayValue.values) {
                        obj[k] = f[k].arrayValue.values.map((v: any) => unmapSimpleObject(v.mapValue.fields));
                } else { obj[k] = []; }
        });
        if (f.flights && f.flights.mapValue && f.flights.mapValue.fields) {
                const ff = f.flights.mapValue.fields;
                obj.flights = {
                        pnr: ff.pnr?.stringValue || "",
                        airline: ff.airline?.stringValue || "",
                        totalPrice: ff.totalPrice?.doubleValue || 0,
                        currency: ff.currency?.stringValue || "USD",
                        segments: ff.segments?.arrayValue?.values?.map((v: any) => unmapSimpleObject(v.mapValue.fields)) || []
                };
        }
        return obj;
}

function mapToFirestoreValue(v: any): any {
        if (v === null || v === undefined) return { nullValue: null };
        if (typeof v === 'string') return { stringValue: v };
        if (typeof v === 'number') return { doubleValue: v };
        if (typeof v === 'boolean') return { booleanValue: v };
        if (Array.isArray(v)) {
                return { arrayValue: { values: v.map(mapToFirestoreValue) } };
        }
        if (typeof v === 'object') {
                // Should use mapValue
                const fields: any = {};
                for (const [key, val] of Object.entries(v)) {
                        fields[key] = mapToFirestoreValue(val);
                }
                return { mapValue: { fields } };
        }
        return { stringValue: String(v) }; // Fallback
}

function mapSimpleObject(obj: any) {
        // Legacy compat wrapper if needed, but we should use the new one.
        // Actually, let's just make mapSimpleObject use the new logic for the fields map.
        const f: any = {};
        for (const [k, v] of Object.entries(obj)) {
                f[k] = mapToFirestoreValue(v);
        }
        return f;
}

function unmapFirestoreValue(v: any): any {
        if (!v) return null;
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.doubleValue !== undefined) return Number(v.doubleValue);
        if (v.integerValue !== undefined) return Number(v.integerValue);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.timestampValue !== undefined) return v.timestampValue;
        if (v.nullValue !== undefined) return null;
        if (v.mapValue && v.mapValue.fields) {
                const obj: any = {};
                for (const [key, val] of Object.entries(v.mapValue.fields)) {
                        obj[key] = unmapFirestoreValue(val);
                }
                return obj;
        }
        if (v.arrayValue && v.arrayValue.values) {
                return v.arrayValue.values.map(unmapFirestoreValue);
        }
        return null; // Fallback
}

function unmapSimpleObject(fields: any) {
        const obj: any = {};
        for (const [k, v] of Object.entries(fields || {})) {
                obj[k] = unmapFirestoreValue(v);
        }
        return obj;
}

async function streamToArrayBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
        const reader = stream.getReader();
        const chunks = [];
        while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
        }
        const len = chunks.reduce((a, c) => a + c.length, 0);
        const res = new Uint8Array(len);
        let off = 0;
        for (const c of chunks) { res.set(c, off); off += c.length; }
        return res.buffer;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
        try { return btoa(binary); } catch (e) { return ""; }
}
