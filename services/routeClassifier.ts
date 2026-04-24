/**
 * AI-powered route-leg classifier. Given a list of stops on a trip, asks
 * Gemini (FAST intent) what transport mode each consecutive pair should
 * use — taking into account real-world geography (e.g. Pattaya → Koh
 * Chang requires a drive to Trat pier + a ferry across, not a single
 * car ride).
 *
 * Cached in localStorage per (trip.id, stops-signature) so the same trip
 * only pays the AI latency once. Network failures degrade silently —
 * the map falls back to its distance-based heuristic.
 */

import { generateWithFallback } from './aiService';

export type LegMode = 'drive' | 'flight' | 'train' | 'ferry' | 'drive+ferry' | 'multi';

export interface LegClassification {
        mode: LegMode;
        durationHours?: number;
        notes?: string;
}

interface LegInput {
        from: string;
        to: string;
}

const CACHE_KEY = 'travel_app_route_classify_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry { t: number; byLeg: Record<string, LegClassification>; }
type Cache = Record<string, CacheEntry>;

const readCache = (): Cache => {
        try {
                if (typeof localStorage === 'undefined') return {};
                return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        } catch { return {}; }
};

const writeCache = (next: Cache) => {
        try {
                if (typeof localStorage === 'undefined') return;
                localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch { /* quota */ }
};

const legKey = (from: string, to: string) => `${from}__${to}`.toLowerCase();

const signature = (legs: LegInput[]) =>
        legs.map(l => legKey(l.from, l.to)).join('|');

export const classifyTripRoute = async (
        tripId: string,
        legs: LegInput[],
): Promise<Record<string, LegClassification>> => {
        if (legs.length === 0) return {};

        const cache = readCache();
        const tripCache = cache[tripId];
        const sig = signature(legs);

        // Cache hit AND unchanged signature → done.
        if (tripCache && Date.now() - tripCache.t < CACHE_TTL_MS) {
                const allKnown = legs.every(l => tripCache.byLeg[legKey(l.from, l.to)]);
                if (allKnown) return tripCache.byLeg;
        }

        // Build prompt — single AI call for all legs so we pay ~1 s once.
        const legList = legs.map((l, i) => `${i + 1}. "${l.from}" → "${l.to}"`).join('\n');
        const prompt = `You are a travel logistics expert. For each leg below, decide the most likely transport mode for a Hebrew-speaking leisure traveller, based on real-world geography.

Legs:
${legList}

Rules:
- "drive" = road trip by car or van. Use when < 400 km within same country/island.
- "flight" = commercial flight. Use when far or no road access.
- "train" = long-distance intercity rail.
- "ferry" = island-to-island sea crossing with vehicle or without.
- "drive+ferry" = drive to a ferry terminal then cross by ferry (e.g. mainland → Koh Chang).
- "multi" = two or more modes; use notes to describe.

For each leg also estimate duration in hours (decimal OK, e.g. 2.5) and a short Hebrew note (≤ 40 chars) if the mode is not obvious.

Respond ONLY with a JSON array, one object per leg, in the same order. Example:
[
  {"mode":"drive","durationHours":2,"notes":""},
  {"mode":"drive+ferry","durationHours":3.5,"notes":"נסיעה לטראט + מעבורת"}
]

No explanation, no code fence, pure JSON.`;

        try {
                const res = await generateWithFallback(
                        null,
                        [{ role: 'user', parts: [{ text: prompt }] }],
                        { responseMimeType: 'application/json', temperature: 0.1 },
                        'FAST'
                );
                const raw = (res.text || '').trim();
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed) || parsed.length !== legs.length) {
                        throw new Error(`AI returned ${parsed?.length} entries, expected ${legs.length}`);
                }
                const byLeg: Record<string, LegClassification> = {};
                legs.forEach((leg, i) => {
                        const entry = parsed[i] || {};
                        const mode = (entry.mode || entry.type || 'drive') as LegMode;
                        byLeg[legKey(leg.from, leg.to)] = {
                                mode,
                                durationHours: typeof entry.durationHours === 'number' ? entry.durationHours : undefined,
                                notes: entry.notes || '',
                        };
                });
                const nextCache: Cache = { ...cache, [tripId]: { t: Date.now(), byLeg } };
                writeCache(nextCache);
                return byLeg;
        } catch (err) {
                console.warn('[routeClassifier] AI classification failed, falling back:', err);
                return tripCache?.byLeg || {};
        }
};

export const transportEmojiForMode = (mode: LegMode): string => {
        switch (mode) {
                case 'flight': return '✈️';
                case 'train': return '🚆';
                case 'ferry': return '⛴';
                case 'drive+ferry': return '🚗⛴';
                case 'multi': return '🧭';
                default: return '🚗';
        }
};

export const transportLabelForMode = (mode: LegMode): string => {
        switch (mode) {
                case 'flight': return 'טיסה';
                case 'train': return 'רכבת';
                case 'ferry': return 'מעבורת';
                case 'drive+ferry': return 'נסיעה + מעבורת';
                case 'multi': return 'משולב';
                default: return 'נסיעה';
        }
};
