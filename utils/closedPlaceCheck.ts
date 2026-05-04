/**
 * Second-pass AI verifier for closed places.
 *
 * The primary defense against "permanently closed" listings is the prompt
 * inside RestaurantsView/AttractionsView (which instructs the model to
 * omit closed places + set business_status="OPERATIONAL"). But the user
 * caught one slip-through: "Rimpa Lapin" in Pratumnak Hill, Pattaya was
 * recommended even though Google Maps marks it permanently closed.
 *
 * This module is a safety net: after research returns N places, it asks
 * a fast model "for each of these names + cities, is the place currently
 * permanently/temporarily closed?". Any flagged item is dropped from the
 * UI. Cached per (name, city) so a re-render doesn't re-ask.
 *
 * Cost control:
 *   - Single batched call per research run (up to 80 places per call).
 *   - FAST intent (flash-lite) so each call is cheap and quick.
 *   - Cache in localStorage so the same place is never re-asked.
 */

import { generateWithFallback } from '../services/aiService';

export interface ClosedCheckPlace {
        id: string;
        name: string;
        city?: string;
        country?: string;
}

interface ClosedCheckResult {
        id: string;
        is_closed: boolean;
        reason?: string;
}

const CACHE_KEY = 'weTravel.closedPlaceCheck.v1';
const CACHE_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

interface CacheEntry { closed: boolean; t: number; reason?: string }
type Cache = Record<string, CacheEntry>;

const readCache = (): Cache => {
        try {
                if (typeof localStorage === 'undefined') return {};
                return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        } catch { return {}; }
};
const writeCache = (cache: Cache) => {
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
        catch { /* quota */ }
};
const cacheKey = (p: ClosedCheckPlace): string =>
        `${(p.name || '').trim().toLowerCase()}|${(p.city || '').trim().toLowerCase()}|${(p.country || '').trim().toLowerCase()}`;

const buildPrompt = (places: ClosedCheckPlace[]): string => `
You are a closed-place verifier. For each item below, determine whether
the named place is currently CLOSED — either permanently closed, or
temporarily closed for an extended period. Use Google Maps status as the
primary signal, plus recent reviews (last 6 months) for closure reports.

DO NOT mark seasonal closures (winter / monsoon / regular closed days)
as closed. We want only places that are NO LONGER A VALID DESTINATION.

Items:
${places.map((p, i) => `${i + 1}. id=${p.id} | "${p.name}"${p.city ? ` in ${p.city}` : ''}${p.country ? `, ${p.country}` : ''}`).join('\n')}

Return JSON ONLY:
{ "results": [{ "id": string, "is_closed": boolean, "reason"?: string }] }
`;

/**
 * Verify a list of place names against known-closed status. Returns ONLY
 * the IDs that should be DROPPED (i.e. is_closed === true). Items not
 * present in the result default to "keep" (fail-open: a verifier failure
 * shouldn't blank out the whole list).
 */
export const findClosedPlaces = async (
        places: ClosedCheckPlace[],
): Promise<Set<string>> => {
        if (places.length === 0) return new Set();

        const cache = readCache();
        const now = Date.now();
        const closedIds = new Set<string>();
        const toAsk: ClosedCheckPlace[] = [];

        for (const p of places) {
                const k = cacheKey(p);
                const hit = cache[k];
                if (hit && now - hit.t < CACHE_TTL_MS) {
                        if (hit.closed) closedIds.add(p.id);
                } else {
                        toAsk.push(p);
                }
        }
        if (toAsk.length === 0) return closedIds;

        // Batch — 80 per call keeps each prompt small + the response parse fast.
        const BATCH = 80;
        let cacheChanged = false;
        for (let i = 0; i < toAsk.length; i += BATCH) {
                const batch = toAsk.slice(i, i + BATCH);
                try {
                        const res = await generateWithFallback(
                                null,
                                [{ role: 'user', parts: [{ text: buildPrompt(batch) }] }],
                                { responseMimeType: 'application/json', temperature: 0 },
                                'FAST',
                        );
                        const parsed = JSON.parse(res?.text || '{}');
                        const results: ClosedCheckResult[] = Array.isArray(parsed?.results) ? parsed.results : [];
                        for (const r of results) {
                                if (!r || typeof r.id !== 'string') continue;
                                const place = batch.find(p => p.id === r.id);
                                if (!place) continue;
                                cache[cacheKey(place)] = { closed: !!r.is_closed, t: now, reason: r.reason };
                                cacheChanged = true;
                                if (r.is_closed) closedIds.add(r.id);
                        }
                } catch (e) {
                        console.warn('[closedPlaceCheck] AI verification failed — keeping all places in batch', e);
                        // Fail-open: don't drop anything if the verifier itself broke.
                }
        }
        if (cacheChanged) writeCache(cache);
        return closedIds;
};
