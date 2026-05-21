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
  for (const r of bundle.results) byModel.set(r.model, r);

  const survivors: string[] = [];
  const demoted: string[] = [];
  for (const m of chain) {
    const r = byModel.get(m);
    if (!r) { survivors.push(m); continue; }
    if (r.ok) { survivors.push(m); continue; }
    if (r.errorKind === 'INVALID_MODEL' || r.errorKind === 'PERMISSION' || r.errorKind === 'AUTH') {
      // Drop entirely. Log once so the user can see it in the console.
      console.warn(`🛑 [aiHealth] Dropping ${m} from fallback chain (${r.errorKind} on key ${r.keyTail}).`);
      continue;
    }
    if (r.errorKind === 'QUOTA') {
      console.warn(`⬇️ [aiHealth] Demoting ${m} to end of chain (QUOTA on key ${r.keyTail}).`);
      demoted.push(m);
      continue;
    }
    // TIMEOUT / UNKNOWN: keep in place but warn.
    console.warn(`⚠️ [aiHealth] Keeping ${m} despite probe failure (${r.errorKind} — likely transient).`);
    survivors.push(m);
  }
  return [...survivors, ...demoted];
};
