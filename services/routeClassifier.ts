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
export type SubMode = 'drive' | 'flight' | 'train' | 'ferry';

export interface LegSegment {
        /** Name of the intermediate waypoint this sub-segment ENDS at. E.g.
         *  for Pattaya → Koh Chang the first segment ends at "Trat Pier",
         *  the second segment ends at the final destination. */
        via: string;
        mode: SubMode;
        durationHours?: number;
}

export interface LegClassification {
        mode: LegMode;
        durationHours?: number;
        notes?: string;
        /** Populated when the leg is multi-modal (drive+ferry / multi). Each
         *  segment represents one transport mode and its end-point so the
         *  map can draw distinct lines + an intermediate pin. */
        segments?: LegSegment[];
}

export interface LegInput {
        from: string;
        to: string;
        /** Date the traveler leaves the `from` city (ISO yyyy-mm-dd). Lets the
         *  AI infer airport→hotel transfers when same-day as a flight. */
        departDate?: string;
        /** Date the traveler arrives at `to` (ISO yyyy-mm-dd). When equal to
         *  departDate the legs is same-day; when a hotel was just checked-out
         *  it usually means a transit day. */
        arrivalDate?: string;
        /** True when `from` is an airport (i.e. user just landed). Helps the
         *  AI add a drive transfer for landing-day legs. */
        fromIsAirport?: boolean;
        /** True when `to` is an airport (i.e. departure flight day). */
        toIsAirport?: boolean;
}

// v2 — bumped because the prompt + cache shape changed (now includes date
// context). Old v1 cached classifications are stale and would suppress the
// new same-day-transfer / drive+ferry inference, so we let them naturally
// expire by changing the key.
const CACHE_KEY = 'travel_app_route_classify_v2';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry { t: number; sig: string; byLeg: Record<string, LegClassification>; }
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
        legs.map(l =>
                `${legKey(l.from, l.to)}@${l.departDate || ''}_${l.arrivalDate || ''}_${l.fromIsAirport ? 'A' : ''}${l.toIsAirport ? 'A' : ''}`
        ).join('|');

export const classifyTripRoute = async (
        tripId: string,
        legs: LegInput[],
): Promise<Record<string, LegClassification>> => {
        if (legs.length === 0) return {};

        const cache = readCache();
        const tripCache = cache[tripId];
        const sig = signature(legs);

        // Cache hit AND signature unchanged → done. Including the signature
        // means a date / airport-flag change busts the cache so the AI
        // re-classifies with the new context.
        if (tripCache && Date.now() - tripCache.t < CACHE_TTL_MS && tripCache.sig === sig) {
                const allKnown = legs.every(l => tripCache.byLeg[legKey(l.from, l.to)]);
                if (allKnown) return tripCache.byLeg;
        }

        // Build prompt — single AI call for all legs so we pay ~1 s once.
        // Each leg gets context tags so the AI can infer same-day airport
        // transfers and ferry crossings without us hard-coding routes.
        const legList = legs.map((l, i) => {
                const tags: string[] = [];
                if (l.fromIsAirport) tags.push('FROM_IS_AIRPORT');
                if (l.toIsAirport) tags.push('TO_IS_AIRPORT');
                if (l.departDate && l.arrivalDate && l.departDate === l.arrivalDate) tags.push('SAME_DAY');
                const dateInfo = l.departDate
                        ? ` (depart ${l.departDate}${l.arrivalDate && l.arrivalDate !== l.departDate ? `, arrive ${l.arrivalDate}` : ''})`
                        : '';
                const tagInfo = tags.length ? ` [${tags.join(', ')}]` : '';
                return `${i + 1}. "${l.from}" → "${l.to}"${dateInfo}${tagInfo}`;
        }).join('\n');

        const prompt = `You are a travel logistics expert. For each leg below, decide the most likely transport mode for a Hebrew-speaking leisure traveller, based on real-world geography AND the date / airport context tags.

Legs:
${legList}

Rules:
- "drive" = road trip by car / van / taxi / shuttle. Use when < 400 km within the same country/island.
- "flight" = commercial flight. Use when far or no road access.
- "train" = long-distance intercity rail.
- "ferry" = island-to-island sea crossing with vehicle or without.
- "drive+ferry" = drive to a ferry terminal then cross by ferry.
- "multi" = two or more modes chained together.

CONTEXT TAGS (when present in [...]):
- FROM_IS_AIRPORT + SAME_DAY  → traveller just landed and must reach
  the destination same day. If destination is < 250 km, classify as
  "drive" (taxi / shuttle / private transfer). Realistic durationHours
  for known transfers: BKK→Pattaya ≈ 2, BKK→Hua Hin ≈ 3, BKK→Cha-Am
  ≈ 2.5, NRT→Tokyo ≈ 1, FCO→Rome ≈ 0.6.
- TO_IS_AIRPORT + SAME_DAY → traveller is heading to the airport for
  a departing flight; usually a "drive" leg.
- If the two cities are a Thai mainland-coast ↔ island pair (e.g.
  Pattaya↔Koh Chang, Trat↔Koh Chang, Krabi↔Phi Phi, Surat Thani↔Ko
  Samui), classify as "drive+ferry" with proper segments.
- Pattaya → Koh Chang specifically = drive to Trat (Laem Ngop Pier),
  then ferry across.

IMPORTANT — if the leg is "drive+ferry" or "multi", you MUST also
return a "segments" array describing each sub-leg in order. Each
segment has: "via" (name of the pier / station / airport where the
sub-leg ENDS — the final segment's "via" is the leg's final
destination), "mode" (one of drive|flight|train|ferry), and
"durationHours". Example, for "Pattaya → Koh Chang":
  [
    {"via":"Trat Laem Ngop Pier", "mode":"drive",  "durationHours":3},
    {"via":"Koh Chang",            "mode":"ferry",  "durationHours":0.5}
  ]

For each leg also estimate the TOTAL duration in hours (decimal OK,
e.g. 2.5) and a short Hebrew note (≤ 40 chars) describing the route.

Respond ONLY with a JSON array, one object per leg, in the same order. Example:
[
  {"mode":"drive","durationHours":2,"notes":"מעבר משדה תעופה"},
  {
    "mode":"drive+ferry",
    "durationHours":3.5,
    "notes":"נסיעה לטראט + מעבורת",
    "segments":[
      {"via":"Trat Laem Ngop Pier","mode":"drive","durationHours":3},
      {"via":"Koh Chang","mode":"ferry","durationHours":0.5}
    ]
  }
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
                        const segments: LegSegment[] | undefined = Array.isArray(entry.segments)
                                ? entry.segments
                                        .map((s: any) => ({
                                                via: typeof s?.via === 'string' ? s.via.trim() : '',
                                                mode: (['drive', 'flight', 'train', 'ferry'].includes(s?.mode) ? s.mode : 'drive') as SubMode,
                                                durationHours: typeof s?.durationHours === 'number' ? s.durationHours : undefined,
                                        }))
                                        .filter((s: LegSegment) => s.via.length > 0)
                                : undefined;
                        byLeg[legKey(leg.from, leg.to)] = {
                                mode,
                                durationHours: typeof entry.durationHours === 'number' ? entry.durationHours : undefined,
                                notes: entry.notes || '',
                                segments,
                        };
                });
                const nextCache: Cache = { ...cache, [tripId]: { t: Date.now(), sig, byLeg } };
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
