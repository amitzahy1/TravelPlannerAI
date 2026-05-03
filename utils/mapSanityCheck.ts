/**
 * AI-driven sanity check for map pin coordinates.
 *
 * Runs AFTER all geocoding completes. Sends a compact batch of pins to the
 * fastest model in the AI fallback chain and asks: "for each pin, do these
 * coordinates fall inside <country>?" Any pin the model says NO to is
 * dropped from the map and surfaced via a toast.
 *
 * This is a SECOND safety net on top of the deterministic bbox check in
 * `tripScope.coordInTripCountries`. The bbox check is fast and exact for
 * country-membership; the AI pass catches the rare case where a place's
 * lat/lng technically falls inside a country's bbox but is geographically
 * misplaced (e.g. a misspelled hotel name resolved to the wrong neighbourhood).
 *
 * Cost control:
 *  - One call per trip-data change (debounced via the caller's effect deps).
 *  - Up to 60 pins per call; if more, splits into batches.
 *  - Uses the FAST intent (flash-lite only) so each batch is cheap and quick.
 *  - Caches results by `${id}:${roundedLat}:${roundedLng}:${country}` so
 *    a re-render with the same pins never re-asks the AI.
 */

import { generateWithFallback } from '../services/aiService';

export interface SanityCheckPin {
        id: string;
        name: string;
        lat: number;
        lng: number;
}

export interface SanityCheckResult {
        id: string;
        in_country: boolean;
        actual_country?: string;
}

const cache = new Map<string, SanityCheckResult>();

const cacheKey = (pin: SanityCheckPin, country: string): string =>
        `${pin.id}|${pin.lat.toFixed(3)}|${pin.lng.toFixed(3)}|${country.toLowerCase()}`;

const buildPrompt = (pins: SanityCheckPin[], countries: string[]): string => `
You are a map-quality verifier. For each item below, decide whether the
given (lat, lng) coordinates fall inside any of the listed trip countries.
Be strict: if the coordinates are obviously in a different country
(e.g. coordinates in West Africa for a place named "Bangkok"), mark
in_country = false.

Trip countries: ${countries.join(', ')}

Items:
${pins.map((p, i) => `${i + 1}. id=${p.id} | name=${p.name} | lat=${p.lat.toFixed(4)} | lng=${p.lng.toFixed(4)}`).join('\n')}

Return JSON ONLY:
{ "results": [{ "id": string, "in_country": boolean, "actual_country"?: string }] }
`;

/**
 * Run the sanity check. Returns the results in the same order as `pins`.
 * Items with cached prior results skip the AI call.
 */
export const verifyPinsAgainstTripCountries = async (
        pins: SanityCheckPin[],
        countries: string[],
): Promise<SanityCheckResult[]> => {
        if (pins.length === 0 || countries.length === 0) {
                return pins.map(p => ({ id: p.id, in_country: true }));
        }

        const cachedById = new Map<string, SanityCheckResult>();
        const toAsk: SanityCheckPin[] = [];
        for (const p of pins) {
                const key = cacheKey(p, countries[0]);
                const hit = cache.get(key);
                if (hit) cachedById.set(p.id, hit);
                else toAsk.push(p);
        }
        if (toAsk.length === 0) {
                return pins.map(p => cachedById.get(p.id)!);
        }

        // Batch — 60 pins per call keeps the prompt under model context easily.
        const BATCH_SIZE = 60;
        const fresh: SanityCheckResult[] = [];
        for (let i = 0; i < toAsk.length; i += BATCH_SIZE) {
                const batch = toAsk.slice(i, i + BATCH_SIZE);
                const prompt = buildPrompt(batch, countries);
                try {
                        const res = await generateWithFallback(
                                null,
                                [{ role: 'user', parts: [{ text: prompt }] }],
                                { responseMimeType: 'application/json', temperature: 0 },
                                'FAST',
                        );
                        const parsed = JSON.parse(res?.text || '{}');
                        const results: SanityCheckResult[] = Array.isArray(parsed?.results) ? parsed.results : [];
                        // Cache + collect.
                        results.forEach(r => {
                                if (!r || typeof r.id !== 'string') return;
                                const pin = batch.find(b => b.id === r.id);
                                if (pin) cache.set(cacheKey(pin, countries[0]), r);
                                fresh.push(r);
                        });
                } catch (e) {
                        // On any AI failure, default to "in_country = true" so we never
                        // hide pins because the verifier itself broke. Log a warning so
                        // operators can investigate.
                        console.warn('[mapSanityCheck] AI verification failed — defaulting to pass-through', e);
                        batch.forEach(p => fresh.push({ id: p.id, in_country: true }));
                }
        }

        // Merge cached + fresh, preserving original order.
        const byId = new Map<string, SanityCheckResult>();
        cachedById.forEach((v, k) => byId.set(k, v));
        fresh.forEach(r => byId.set(r.id, r));
        return pins.map(p => byId.get(p.id) || { id: p.id, in_country: true });
};
