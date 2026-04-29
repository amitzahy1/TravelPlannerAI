/**
 * Lazy geocoding for places (restaurants / attractions / hotels) that
 * came back from the AI without lat/lng. Strategy:
 *   1. If a googleMapsUrl is present, try to extract @lat,lng from it.
 *   2. Otherwise hit Photon (OSM) with "<name>, <location>".
 *
 * Results are cached in localStorage so repeat visits to the map don't
 * hammer public geocoding endpoints. Concurrency is gated to 4
 * to stay polite.
 */

// v2: invalidates stale wrong-country coordinates from v1
const STORAGE_KEY = 'tp_place_geocode_cache_v2';
const CACHE_TTL_MS = 90 * 24 * 3600 * 1000; // 90 days

// Bounding boxes [minLon, minLat, maxLon, maxLat] for common travel destinations.
// Used to (a) bias Photon queries and (b) reject results that landed in the wrong country.
const COUNTRY_BBOXES: Record<string, [number, number, number, number]> = {
  'thailand':       [97.5,   5.6, 105.7,  20.5],
  'japan':          [122.9, 24.0, 153.0,  45.6],
  'france':         [ -5.2, 41.3,   9.6,  51.1],
  'italy':          [  6.6, 36.5,  18.8,  47.1],
  'spain':          [ -9.3, 35.9,   4.3,  43.8],
  'portugal':       [ -9.5, 36.8,  -6.2,  42.2],
  'germany':        [  5.9, 47.3,  15.0,  55.1],
  'greece':         [ 20.0, 34.8,  29.6,  41.7],
  'turkey':         [ 25.7, 36.0,  44.8,  42.1],
  'united states':  [-125.0,24.0, -66.9,  49.4],
  'usa':            [-125.0,24.0, -66.9,  49.4],
  'mexico':         [-117.1,14.5, -86.7,  32.7],
  'indonesia':      [ 95.0,-11.0, 141.0,   6.0],
  'bali':           [114.4, -8.8, 115.7,  -8.1],
  'vietnam':        [102.1,  8.5, 109.5,  23.4],
  'cambodia':       [102.3, 10.0, 107.6,  14.7],
  'india':          [ 68.2,  8.4,  97.4,  37.1],
  'australia':      [113.3,-43.6, 153.6, -10.7],
  'united kingdom': [ -8.2, 49.9,   2.0,  59.5],
  'uk':             [ -8.2, 49.9,   2.0,  59.5],
  'switzerland':    [  5.9, 45.8,  10.5,  47.8],
  'netherlands':    [  3.4, 50.8,   7.2,  53.5],
  'croatia':        [ 13.5, 42.4,  19.4,  46.5],
  'israel':         [ 34.3, 29.5,  35.9,  33.3],
  'egypt':          [ 24.7, 22.0,  37.2,  31.7],
  'morocco':        [-13.2, 27.7,  -1.0,  35.9],
  'south korea':    [125.1, 33.1, 129.6,  38.6],
  'singapore':      [103.6,  1.1, 104.1,   1.5],
  'malaysia':       [ 99.6,  0.9, 119.3,   7.4],
  'philippines':    [116.9,  4.6, 126.6,  20.3],
  'dubai':          [ 54.9, 24.8,  55.8,  25.4],
  'uae':            [ 51.6, 22.6,  56.4,  26.1],
  'maldives':       [ 72.6, -0.7,  73.8,   7.1],
  'brazil':         [-73.9,-33.8, -28.8,   5.3],
  'argentina':      [-73.6,-55.1, -53.6, -21.8],
  'peru':           [-81.3,-18.4, -68.7,   0.0],
};

export const getCountryBbox = (hint: string): [number, number, number, number] | null => {
  if (!hint) return null;
  const lower = hint.toLowerCase();
  for (const [key, bbox] of Object.entries(COUNTRY_BBOXES)) {
    if (lower.includes(key)) return bbox;
  }
  return null;
};

export const coordInBbox = (lat: number, lng: number, bbox: [number, number, number, number]): boolean => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLon && lng <= maxLon;
};

interface CacheEntry { coords: { lat: number; lng: number }; t: number }
type Cache = Record<string, CacheEntry>;

const readCache = (): Cache => {
        try {
                if (typeof localStorage === 'undefined') return {};
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch { return {}; }
};

let memoryCache: Cache | null = null;
const cache = (): Cache => (memoryCache ??= readCache());

const persist = () => {
        try {
                if (typeof localStorage === 'undefined' || !memoryCache) return;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
        } catch { /* quota */ }
};

const cacheKey = (name: string, location: string): string =>
        `${(name || '').trim().toLowerCase()}|${(location || '').trim().toLowerCase()}`;

/**
 * Pull coordinates out of a Google Maps URL. Handles the most common
 * shapes: `/@lat,lng,zoom`, `?q=lat,lng`, `!3dlat!4dlng` (place URLs).
 */
export const extractCoordsFromMapsUrl = (url?: string): { lat: number; lng: number } | null => {
        if (!url) return null;
        const matchers: RegExp[] = [
                /@(-?\d+\.\d+),(-?\d+\.\d+)/,                                  // /@lat,lng
                /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,                              // ?q=lat,lng
                /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,                             // ?ll=lat,lng
                /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,                               // !3dlat!4dlng
                /destination=(-?\d+\.\d+),(-?\d+\.\d+)/,                        // directions
        ];
        for (const re of matchers) {
                const m = url.match(re);
                if (m) {
                        const lat = parseFloat(m[1]);
                        const lng = parseFloat(m[2]);
                        if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                                return { lat, lng };
                        }
                }
        }
        return null;
};

/**
 * Photon (Komoot) — open-source geocoder over OSM data with proper CORS
 * headers. Nominatim's public endpoint blocks browser requests from
 * github.io, so we avoid calling it from the client.
 */
const photonGeocode = async (
        query: string,
        bbox?: [number, number, number, number],
): Promise<{ lat: number; lng: number } | null> => {
        if (!query) return null;
        try {
                const bboxParam = bbox ? `&bbox=${bbox.join(',')}` : '';
                const res = await fetch(
                        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1${bboxParam}`,
                );
                if (!res.ok) return null;
                const data = await res.json();
                const feat = data?.features?.[0];
                const coords = feat?.geometry?.coordinates;
                // Photon returns [lng, lat] (GeoJSON)
                if (Array.isArray(coords) && coords.length >= 2) {
                        const lng = parseFloat(coords[0]);
                        const lat = parseFloat(coords[1]);
                        if (isFinite(lat) && isFinite(lng)) return { lat, lng };
                }
                return null;
        } catch {
                return null;
        }
};

const geocodeFallbackChain = async (
        query: string,
        bbox?: [number, number, number, number],
): Promise<{ lat: number; lng: number } | null> => {
        return await photonGeocode(query, bbox);
};

export interface GeocodableInput {
        name: string;
        location?: string;
        googleMapsUrl?: string;
        address?: string;
        // Country / destination hint appended to the geocoder query when
        // the location alone is ambiguous (e.g. "Pattaya" matches a tiny
        // village in Israel; "Pattaya, Thailand" finds the right place).
        countryHint?: string;
}

/**
 * Resolve coordinates for a single place. Order:
 *   1. localStorage cache
 *   2. extractCoordsFromMapsUrl (free, instant)
 *   3. Photon geocode (one HTTP round-trip)
 */
export const geocodePlace = async (input: GeocodableInput): Promise<{ lat: number; lng: number } | null> => {
        const c = cache();
        const k = cacheKey(input.name, input.location || input.address || '');
        const bbox = getCountryBbox(input.countryHint || '');
        const hit = c[k];
        if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
                // Reject cached coords that landed in the wrong country — they were
                // saved before bbox validation existed and will be re-geocoded now.
                if (bbox && !coordInBbox(hit.coords.lat, hit.coords.lng, bbox)) {
                        delete c[k];
                } else {
                        return hit.coords;
                }
        }

        const fromUrl = extractCoordsFromMapsUrl(input.googleMapsUrl);
        if (fromUrl) {
                if (!bbox || coordInBbox(fromUrl.lat, fromUrl.lng, bbox)) {
                        c[k] = { coords: fromUrl, t: Date.now() };
                        persist();
                        return fromUrl;
                }
        }

        // Build query variants: with bbox (primary) then without (fallback).
        // The bbox is passed to Photon so it only returns results inside the
        // trip's country — prevents "Koh Chang restaurant in Norway" mismatches.
        const baseQuery = [input.name, input.location || input.address].filter(Boolean).join(', ');
        const withHint = input.countryHint ? `${baseQuery}, ${input.countryHint}` : null;

        const attempts: Array<{ query: string; useBbox: boolean }> = [
                ...(withHint ? [{ query: withHint, useBbox: !!bbox }] : []),
                { query: baseQuery, useBbox: !!bbox },
                // Last-resort: repeat without bbox in case the name is genuinely
                // ambiguous (e.g. the place has a non-Thai-sounding name but IS in Thailand)
                ...(bbox && withHint ? [{ query: withHint, useBbox: false }] : []),
        ];

        for (const { query, useBbox } of attempts) {
                const result = await geocodeFallbackChain(query, useBbox ? bbox! : undefined);
                if (!result) continue;
                // Hard reject: result outside expected country bbox.
                if (bbox && !coordInBbox(result.lat, result.lng, bbox)) continue;
                c[k] = { coords: result, t: Date.now() };
                persist();
                return result;
        }

        // Fallback: location-only query pinned to the right city.
        if (input.location || input.address) {
                const locParts = [input.location || input.address, input.countryHint].filter(Boolean) as string[];
                const locOnly = await geocodeFallbackChain(locParts.join(', '), bbox ?? undefined);
                if (locOnly && (!bbox || coordInBbox(locOnly.lat, locOnly.lng, bbox))) {
                        return locOnly;
                }
        }

        return null;
};

/**
 * Geocode a batch of places concurrently (gated to 4) and call back with
 * each resolved coord as soon as it lands so callers can update UI live.
 *
 * Failed items invoke `onFail` (if supplied) so callers can mark them
 * (e.g. `geocodeFailed: true`) and surface a count to the user instead
 * of silently dropping them off the map.
 */
export const geocodePlacesBatch = async <T extends GeocodableInput & { id: string; lat?: number; lng?: number }>(
        items: T[],
        onResolve: (id: string, coords: { lat: number; lng: number }) => void,
        opts?: { concurrency?: number; signal?: AbortSignal; onFail?: (id: string) => void },
): Promise<void> => {
        const queue = items.filter(i => typeof i.lat !== 'number' || typeof i.lng !== 'number');
        const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 4, 8));
        let cursor = 0;

        const worker = async () => {
                while (cursor < queue.length) {
                        if (opts?.signal?.aborted) return;
                        const idx = cursor++;
                        const item = queue[idx];
                        const coords = await geocodePlace(item);
                        if (opts?.signal?.aborted) return;
                        if (coords) {
                                onResolve(item.id, coords);
                        } else {
                                opts?.onFail?.(item.id);
                        }
                        // Polite delay between requests per worker.
                        await new Promise(r => setTimeout(r, 250));
                }
        };

        await Promise.all(Array.from({ length: concurrency }, () => worker()));
};
