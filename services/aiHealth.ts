// Frontend AI health: on-demand probing of Gemini models via the Worker's
// /api/probe endpoint, plus runtime filtering of the fallback chain based on
// the most recent probe result.
//
// Design choices (per user direction):
//   - On-demand ONLY. Never auto-probe on boot. The admin clicks "Probe Now"
//     in ModelHealthPanel when they want to refresh the view.
//   - Result cached in sessionStorage with 10-min TTL. Cache survives nav
//     between pages but resets on a hard reload — appropriate for a tool
//     used to diagnose a "right now" issue.
//   - Chain filtering is *advisory*: if no cached probe exists, the chain
//     is unchanged. Filtering kicks in only after at least one probe.

import { auth } from './firebaseConfig';

export type ProbeErrorKind = 'QUOTA' | 'PERMISSION' | 'INVALID_MODEL' | 'AUTH' | 'TIMEOUT' | 'UNKNOWN';

export interface ProbeResult {
  model: string;
  ok: boolean;
  latencyMs: number;
  key: string;             // 'PREMIUM' | 'FREE' | 'PREMIUM_FALLBACK' | 'OPENROUTER' | 'NONE'
  keyTail: string;         // e.g. "…YdF8"
  errorKind?: ProbeErrorKind;
  errorDetail?: string;
  remediation?: string;
}

export interface ProbeBundle {
  results: ProbeResult[];
  probedAt: number;        // Date.now() at probe time
}

const CACHE_KEY = 'ai-model-probe-v1';
const CACHE_TTL_MS = 10 * 60 * 1000;  // 10 minutes

const getAuthHeader = async (): Promise<Record<string, string>> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in — probe requires login.');
  const idToken = await user.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
};

/**
 * Read the cached probe bundle from sessionStorage. Returns null when there
 * is no cache OR the cache is older than CACHE_TTL_MS.
 */
export const readProbeCache = (): ProbeBundle | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const bundle = JSON.parse(raw) as ProbeBundle;
    if (!bundle || typeof bundle.probedAt !== 'number') return null;
    if (Date.now() - bundle.probedAt > CACHE_TTL_MS) return null;
    return bundle;
  } catch {
    return null;
  }
};

/**
 * Hit the Worker /api/probe endpoint with the requested model list. Writes
 * the result into sessionStorage so subsequent calls (this session) can read
 * it without another network round-trip.
 */
export const probeModels = async (models: string[]): Promise<ProbeBundle> => {
  const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://travelplannerai-api.amitzahy1.workers.dev';
  const authHeader = await getAuthHeader();
  const response = await fetch(`${WORKER_URL}/api/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ models }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Probe failed: ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
  }
  const bundle = await response.json() as ProbeBundle;
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(bundle)); } catch { /* quota */ }
  return bundle;
};

export const clearProbeCache = (): void => {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  loggedDemotions.clear();
};

// =====================================================================
// 🔄 Dynamic chain config — fetched from Worker /api/chains, cached in
// sessionStorage so the wider app can read it synchronously. The Worker
// cron resyncs daily and the admin can trigger a manual resync via
// /api/sync-models. When the Worker is unreachable or KV is empty, the
// frontend silently falls back to its hardcoded GOOGLE_MODELS const.
// =====================================================================

export type Intent = 'SMART' | 'RESEARCH' | 'FAST' | 'DOC';

export interface RemoteChains {
  SMART_CANDIDATES: string[];
  RESEARCH_CANDIDATES: string[];
  FAST_CANDIDATES: string[];
  DOC_CANDIDATES: string[];
}

export interface RemoteChainsBundle {
  chains: RemoteChains;
  syncedAt: number;
  providerStats?: Record<string, { ok: boolean; count: number; error?: string }>;
}

const CHAINS_CACHE_KEY = 'ai-remote-chains-v1';
const CHAINS_TTL_MS = 60 * 60 * 1000; // 1h client cache

const readChainsCache = (): RemoteChainsBundle | null => {
  try {
    const raw = sessionStorage.getItem(CHAINS_CACHE_KEY);
    if (!raw) return null;
    const bundle = JSON.parse(raw) as RemoteChainsBundle;
    if (!bundle?.chains || typeof bundle.syncedAt !== 'number') return null;
    if (Date.now() - bundle.syncedAt > CHAINS_TTL_MS) return null;
    return bundle;
  } catch { return null; }
};

const writeChainsCache = (bundle: RemoteChainsBundle): void => {
  try { sessionStorage.setItem(CHAINS_CACHE_KEY, JSON.stringify(bundle)); } catch { /* quota */ }
};

// In-memory copy so generateWithFallback can read synchronously (avoids the
// async-everywhere refactor). Hydrated by getRemoteChains() on first call.
let inMemoryChains: RemoteChainsBundle | null = readChainsCache();

/**
 * Fetch the dynamic chain config from the Worker. Public endpoint (no auth).
 * Returns null on any error so the caller can fall back to its hardcoded
 * constants without throwing.
 */
export const getRemoteChains = async (): Promise<RemoteChainsBundle | null> => {
  // Serve from in-memory if still fresh.
  if (inMemoryChains && Date.now() - inMemoryChains.syncedAt <= CHAINS_TTL_MS) {
    return inMemoryChains;
  }
  // Disk-cache fallback.
  const disk = readChainsCache();
  if (disk) {
    inMemoryChains = disk;
    return disk;
  }
  try {
    const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://travelplannerai-api.amitzahy1.workers.dev';
    const response = await fetch(`${WORKER_URL}/api/chains`);
    if (!response.ok) {
      console.warn(`[aiHealth] /api/chains returned ${response.status} — using hardcoded chain`);
      return null;
    }
    const body = await response.json() as RemoteChainsBundle & { stale?: boolean };
    if (body.stale || !body.chains) {
      console.warn('[aiHealth] /api/chains returned stale=true — using hardcoded chain');
      return null;
    }
    inMemoryChains = body;
    writeChainsCache(body);
    console.log(`📡 [aiHealth] Loaded dynamic chains synced ${Math.round((Date.now() - body.syncedAt) / 60000)}m ago`);
    return body;
  } catch (err: any) {
    console.warn(`[aiHealth] Failed to fetch /api/chains: ${err?.message} — using hardcoded chain`);
    return null;
  }
};

/**
 * Synchronous accessor for the in-memory chains. Returns null if no remote
 * fetch has succeeded yet. Used by generateWithFallback to prefer dynamic
 * chains without making every call async.
 */
export const getCachedRemoteChains = (): RemoteChainsBundle | null => inMemoryChains;

/**
 * Admin-only: triggers a fresh sync on the Worker. Returns the full sync
 * result (chains + per-provider stats + model metadata) so the panel can
 * show what was discovered.
 */
export const syncModelsOnWorker = async (): Promise<{ chains: RemoteChains; syncedAt: number; providerStats: any; models: any[] }> => {
  const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://travelplannerai-api.amitzahy1.workers.dev';
  const authHeader = await getAuthHeader();
  const response = await fetch(`${WORKER_URL}/api/sync-models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Sync failed: ${response.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
  }
  const result = await response.json() as any;
  // Update local cache so subsequent calls use the freshly-synced data.
  const bundle: RemoteChainsBundle = {
    chains: result.chains,
    syncedAt: result.syncedAt,
    providerStats: result.providerStats,
  };
  inMemoryChains = bundle;
  writeChainsCache(bundle);
  return result;
};

/**
 * Mark a specific model as failed in the probe cache without running a full
 * probe. Used by generateWithFallback when it observes a hard failure
 * (spend-cap, daily quota, permission denied) — that result is good enough
 * to demote the model for the next ~10 minutes, saving the chain from burning
 * retries on the same dead model on every subsequent request.
 *
 * If no probe bundle exists yet, creates a minimal one with only this entry.
 * Existing entries for this model are overwritten.
 */
/**
 * Mark EVERY model belonging to a given provider as failed in the probe
 * cache. Called from generateWithFallback when one provider's model
 * returns a key-level error (SPEND_CAP, AUTH, billing) — sibling models
 * share the same key/project so they'll all fail the same way. Without
 * this, the chain wastes 5+ attempts (~10 seconds) trying each Gemini
 * variant before reaching Groq/OpenRouter.
 */
export const markProviderFailed = (providerPrefix: 'gemini' | 'groq:' | 'openrouter:' | string, errorKind: ProbeErrorKind, detail?: string, keyTail = '????'): void => {
  try {
    const existing = readProbeCache() || { results: [], probedAt: Date.now() };
    // We don't have a list of all provider models here — instead, mark a
    // wildcard entry that applyProbeToChain will respect for ANY model
    // matching the prefix. Implemented by adding entries for any models
    // currently in cache that match the prefix, PLUS a sentinel entry
    // keyed by the prefix itself.
    const prefix = providerPrefix === 'gemini' ? 'gemini-' : providerPrefix;
    const updated = existing.results.map(r =>
      r.model.startsWith(prefix) ? { ...r, ok: false, errorKind, errorDetail: detail?.slice(0, 240), keyTail } : r,
    );
    // Sentinel — applyProbeToChain checks for this and demotes ANY chain
    // model starting with the prefix even if it wasn't probed.
    const sentinelId = `__provider:${prefix}`;
    const without = updated.filter(r => r.model !== sentinelId);
    without.push({
      model: sentinelId,
      ok: false,
      latencyMs: 0,
      key: 'AUTO',
      keyTail,
      errorKind,
      errorDetail: detail?.slice(0, 240),
      remediation: undefined,
    });
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ results: without, probedAt: existing.probedAt }));
    console.warn(`📌 [aiHealth] Marked ALL ${prefix}* models as ${errorKind} — short-circuiting future ${prefix} attempts this session.`);
  } catch {
    /* sessionStorage quota / unavailable */
  }
};

export const markModelFailed = (model: string, errorKind: ProbeErrorKind, detail?: string, keyTail = '????'): void => {
  try {
    const existing = readProbeCache() || { results: [], probedAt: Date.now() };
    const filtered = existing.results.filter(r => r.model !== model);
    filtered.push({
      model,
      ok: false,
      latencyMs: 0,
      key: 'AUTO',
      keyTail,
      errorKind,
      errorDetail: detail?.slice(0, 240),
      remediation: undefined,
    });
    const bundle: ProbeBundle = { results: filtered, probedAt: existing.probedAt };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
    console.warn(`📌 [aiHealth] Marked ${model} as ${errorKind} in probe cache — will be demoted on next request.`);
  } catch {
    /* sessionStorage quota or unavailable — ignore */
  }
};

// Track which models we've already logged about this session so the demote /
// drop log only fires once per (model, kind) pair instead of on every request.
// Reset on page reload — sessionStorage scope.
const loggedDemotions = new Set<string>();

/**
 * Apply the cached probe result to a static fallback chain. Rules:
 *
 *   - `errorKind: 'INVALID_MODEL'` or `'PERMISSION'` → DROP from chain.
 *     These are not transient — the model can't run on this key at all.
 *   - `errorKind: 'AUTH'`         → DROP. Same reason.
 *   - `errorKind: 'QUOTA'`        → DEMOTE to last position. Quota usually
 *     recovers within minutes, but in the meantime we'd rather try a
 *     working model first.
 *   - `errorKind: 'TIMEOUT'`      → kept in place. The probe is tiny, so
 *     timeout there means the model is genuinely too slow — but for short
 *     prompts it may still work. We log a warning and leave it.
 *   - `ok: true` or no probe data → unchanged.
 *
 * If there is no probe cache (user hasn't clicked "Probe Now" this session),
 * the chain is returned untouched.
 */
export const applyProbeToChain = (chain: string[]): string[] => {
  const bundle = readProbeCache();
  if (!bundle) return chain;
  const byModel = new Map<string, ProbeResult>();
  // Provider-level sentinels (added by markProviderFailed) — keyed
  // "__provider:gemini-" / "__provider:groq:" / etc.
  const providerSentinels: Array<{ prefix: string; res: ProbeResult }> = [];
  for (const r of bundle.results) {
    if (r.model.startsWith('__provider:')) {
      providerSentinels.push({ prefix: r.model.replace(/^__provider:/, ''), res: r });
    } else {
      byModel.set(r.model, r);
    }
  }

  const survivors: string[] = [];
  const demoted: string[] = [];
  for (const m of chain) {
    // First check provider sentinel — if any model in chain starts with a
    // failed-provider prefix, treat it as failed without an explicit probe.
    const sentinelHit = providerSentinels.find(s => m.startsWith(s.prefix));
    const r = byModel.get(m) || (sentinelHit ? { ...sentinelHit.res, model: m } : undefined);
    if (!r) { survivors.push(m); continue; }
    if (r.ok) { survivors.push(m); continue; }
    if (r.errorKind === 'INVALID_MODEL' || r.errorKind === 'PERMISSION' || r.errorKind === 'AUTH') {
      // Drop entirely. Log once per session so the console doesn't spam on
      // every request — the cache persists, so the demotion fact doesn't
      // change between requests within the same session.
      const logKey = `drop:${m}:${r.errorKind}`;
      if (!loggedDemotions.has(logKey)) {
        loggedDemotions.add(logKey);
        console.warn(`🛑 [aiHealth] Dropping ${m} from fallback chain (${r.errorKind} on key ${r.keyTail}).`);
      }
      continue;
    }
    if (r.errorKind === 'QUOTA') {
      const logKey = `demote:${m}:QUOTA`;
      if (!loggedDemotions.has(logKey)) {
        loggedDemotions.add(logKey);
        console.warn(`⬇️ [aiHealth] Demoting ${m} to end of chain (QUOTA on key ${r.keyTail}).`);
      }
      demoted.push(m);
      continue;
    }
    // TIMEOUT / UNKNOWN: keep in place but warn once per session.
    const logKey = `keep:${m}:${r.errorKind || 'UNKNOWN'}`;
    if (!loggedDemotions.has(logKey)) {
      loggedDemotions.add(logKey);
      console.warn(`⚠️ [aiHealth] Keeping ${m} despite probe failure (${r.errorKind} — likely transient).`);
    }
    survivors.push(m);
  }
  return [...survivors, ...demoted];
};
