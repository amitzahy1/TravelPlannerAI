/**
 * Shared geocoder backed by OpenStreetMap Nominatim (free, no API key,
 * rate-limited per host). Persists results to localStorage under the
 * key UnifiedMapView also reads (`travel_app_geo_cache_v5`), so the
 * two surfaces share the same cache.
 */

const STORAGE_KEY = 'travel_app_geo_cache_v5';

export interface GeoPoint { lat: number; lng: number; }

export const readGeoCache = (): Record<string, GeoPoint> => {
        try {
                if (typeof localStorage === 'undefined') return {};
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch { return {}; }
};

const writeGeoCache = (next: Record<string, GeoPoint>) => {
        try {
                if (typeof localStorage === 'undefined') return;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch { /* ignore quota errors */ }
};

const inFlight = new Map<string, Promise<GeoPoint | null>>();

const rawFetch = async (query: string): Promise<GeoPoint | null> => {
        if (!query) return null;
        try {
                const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                        { headers: { 'User-Agent': 'TravelPlannerPro/2.0' } }
                );
                const data = await res.json();
                if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                return null;
        } catch { return null; }
};

/**
 * Geocode a free-text place (city, address, airport-code-plus-city).
 * Cached per key across the whole app. Deduplicates concurrent calls
 * for the same key so we don't hit Nominatim twice for the same thing.
 */
export const geocode = async (query: string): Promise<GeoPoint | null> => {
        if (!query) return null;
        const cache = readGeoCache();
        if (cache[query]) return cache[query];

        if (inFlight.has(query)) return inFlight.get(query)!;
        const p = rawFetch(query).then(c => {
                if (c) {
                        const next = { ...readGeoCache(), [query]: c };
                        writeGeoCache(next);
                }
                inFlight.delete(query);
                return c;
        });
        inFlight.set(query, p);
        return p;
};
