/**
 * Lazy geocoding for places (restaurants / attractions / hotels) that
 * came back from the AI without lat/lng. Strategy:
 *   1. If a googleMapsUrl is present, try to extract @lat,lng from it.
 *   2. Otherwise hit Nominatim (OSM) with "<name>, <location>".
 *
 * Results are cached in localStorage so repeat visits to the map don't
 * burn through the public Nominatim quota. Concurrency is gated to 4
 * to stay polite.
 */

const STORAGE_KEY = 'tp_place_geocode_cache_v1';
const CACHE_TTL_MS = 90 * 24 * 3600 * 1000; // 90 days

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
 * headers. Used as the primary lookup because Nominatim's public endpoint
 * blocks browser requests with CORS + 429 from github.io. Falls back to
 * Nominatim if Photon misses.
 */
const photonGeocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
        if (!query) return null;
        try {
                const res = await fetch(
                        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`,
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

const nominatimGeocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
        if (!query) return null;
        try {
                const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                        { headers: { 'Accept-Language': 'en' } }
                );
                if (!res.ok) return null;
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        if (isFinite(lat) && isFinite(lng)) return { lat, lng };
                }
                return null;
        } catch {
                return null;
        }
};

const geocodeFallbackChain = async (query: string): Promise<{ lat: number; lng: number } | null> => {
        // Photon first (CORS-friendly, no rate-limit on github.io); Nominatim
        // as a fallback when Photon misses for niche queries.
        const photon = await photonGeocode(query);
        if (photon) return photon;
        return await nominatimGeocode(query);
};

export interface GeocodableInput {
        name: string;
        location?: string;
        googleMapsUrl?: string;
        address?: string;
}

/**
 * Resolve coordinates for a single place. Order:
 *   1. localStorage cache
 *   2. extractCoordsFromMapsUrl (free, instant)
 *   3. Nominatim geocode (one HTTP round-trip)
 */
export const geocodePlace = async (input: GeocodableInput): Promise<{ lat: number; lng: number } | null> => {
        const c = cache();
        const k = cacheKey(input.name, input.location || input.address || '');
        const hit = c[k];
        if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.coords;

        const fromUrl = extractCoordsFromMapsUrl(input.googleMapsUrl);
        if (fromUrl) {
                c[k] = { coords: fromUrl, t: Date.now() };
                persist();
                return fromUrl;
        }

        const query = [input.name, input.location || input.address].filter(Boolean).join(', ');
        const fromGeocoder = await geocodeFallbackChain(query);
        if (fromGeocoder) {
                c[k] = { coords: fromGeocoder, t: Date.now() };
                persist();
                return fromGeocoder;
        }

        // Fallback: location-only query so we at least pin the right city.
        if (input.location || input.address) {
                const locOnly = await geocodeFallbackChain(input.location || input.address || '');
                if (locOnly) {
                        // Don't cache loose city-level fallback under the precise key —
                        // future calls might want to retry the more specific lookup.
                        return locOnly;
                }
        }

        return null;
};

/**
 * Geocode a batch of places concurrently (gated to 4) and call back with
 * each resolved coord as soon as it lands so callers can update UI live.
 */
export const geocodePlacesBatch = async <T extends GeocodableInput & { id: string; lat?: number; lng?: number }>(
        items: T[],
        onResolve: (id: string, coords: { lat: number; lng: number }) => void,
        opts?: { concurrency?: number; signal?: AbortSignal },
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
                        if (coords && !opts?.signal?.aborted) {
                                onResolve(item.id, coords);
                        }
                        // Polite delay between requests per worker (Nominatim ToS asks
                        // for ≤1 req/sec, but distributed across N workers it's fine).
                        await new Promise(r => setTimeout(r, 250));
                }
        };

        await Promise.all(Array.from({ length: concurrency }, () => worker()));
};
