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

// Maps Hebrew country names to their English equivalents in COUNTRY_BBOXES.
// Needed because trip.destination is often in Hebrew (e.g. "תאילנד 26 ימים").
const HEBREW_COUNTRY_ALIASES: Record<string, string> = {
  'תאילנד': 'thailand', 'יפן': 'japan', 'ישראל': 'israel',
  'צרפת': 'france', 'איטליה': 'italy', 'ספרד': 'spain',
  'פורטוגל': 'portugal', 'גרמניה': 'germany', 'יוון': 'greece',
  'טורקיה': 'turkey', 'ארצות הברית': 'united states',
  'ארה"ב': 'usa', 'מקסיקו': 'mexico', 'אינדונזיה': 'indonesia',
  'ויאטנם': 'vietnam', 'קמבודיה': 'cambodia', 'הודו': 'india',
  'אוסטרליה': 'australia', 'בריטניה': 'united kingdom',
  'אנגליה': 'united kingdom', 'שוויץ': 'switzerland',
  'הולנד': 'netherlands', 'קרואטיה': 'croatia',
  'מצרים': 'egypt', 'מרוקו': 'morocco', 'דרום קוריאה': 'south korea',
  'סינגפור': 'singapore', 'מלזיה': 'malaysia', 'פיליפינים': 'philippines',
  'איחוד האמירויות': 'uae', 'ברזיל': 'brazil', 'ארגנטינה': 'argentina',
  'פרו': 'peru', 'באלי': 'bali', 'מלדיביים': 'maldives',
};

/**
 * Translate a possibly-Hebrew country/destination hint to its English equivalent.
 * Strips numeric suffixes (e.g. "26 ימים") so "תאילנד 26 ימים" → "Thailand".
 */
export const toEnglishCountryName = (hint: string): string => {
  if (!hint) return hint;
  const lower = hint.toLowerCase();
  for (const [heb, en] of Object.entries(HEBREW_COUNTRY_ALIASES)) {
    if (lower.includes(heb)) {
      return en.charAt(0).toUpperCase() + en.slice(1);
    }
  }
  // Strip numeric / day-count suffixes from English strings ("Thailand 26 Days" → "Thailand")
  return hint.replace(/\s+\d[\d\s]*(days?|nights?|ימים?|לילות?)?.*$/i, '').trim();
};

export const getCountryBbox = (hint: string): [number, number, number, number] | null => {
  if (!hint) return null;
  // Translate Hebrew → English then do a case-insensitive substring match.
  const lower = toEnglishCountryName(hint).toLowerCase();
  for (const [key, bbox] of Object.entries(COUNTRY_BBOXES)) {
    if (lower.includes(key)) return bbox;
  }
  return null;
};

export const coordInBbox = (lat: number, lng: number, bbox: [number, number, number, number]): boolean => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLon && lng <= maxLon;
};

// ─────────────────────────────────────────────────────────────────────────
// Per-CITY bbox — solves the chain-restaurant bug where a place tagged
// "Snow Wish Mango Sticky Rice, Pattaya, Thailand" resolves to the
// Bangkok branch because both cities share the Thailand bbox.
//
// Strategy: lazy-cache. First call for a city, geocode its centroid via
// Photon biased by the country bbox, build a ±0.18° square around it,
// persist to localStorage. Subsequent calls are free.
// ─────────────────────────────────────────────────────────────────────────

const CITY_BBOX_KEY = 'tp:cityBbox:v1';
const CITY_BBOX_TTL_MS = 90 * 24 * 3600 * 1000; // 90 days
// Default half-width of the city box in degrees latitude (~20 km).
const DEFAULT_CITY_HALF = 0.18;
// Wider override for big metros that have legitimate places far from the centroid.
const CITY_HALF_OVERRIDE: Record<string, number> = {
        bangkok: 0.30,
        tokyo: 0.30,
        seoul: 0.28,
        beijing: 0.30,
        shanghai: 0.30,
        london: 0.30,
        paris: 0.25,
        'new york': 0.30,
        'mexico city': 0.30,
};

interface CityBboxEntry { centroid: { lat: number; lng: number }; bbox: [number, number, number, number]; t: number }
type CityBboxCache = Record<string, CityBboxEntry>;

const readCityBboxCache = (): CityBboxCache => {
        try {
                if (typeof localStorage === 'undefined') return {};
                return JSON.parse(localStorage.getItem(CITY_BBOX_KEY) || '{}');
        } catch { return {}; }
};
let cityBboxMem: CityBboxCache | null = null;
const cityBboxCache = (): CityBboxCache => (cityBboxMem ??= readCityBboxCache());
const persistCityBbox = () => {
        try {
                if (typeof localStorage === 'undefined' || !cityBboxMem) return;
                localStorage.setItem(CITY_BBOX_KEY, JSON.stringify(cityBboxMem));
        } catch { /* quota */ }
};
const cityBboxKey = (cityName: string, countryHint?: string): string =>
        `${(cityName || '').trim().toLowerCase()}|${(countryHint || '').trim().toLowerCase()}`;

const buildBboxAroundCentroid = (
        cityName: string,
        centroid: { lat: number; lng: number },
): [number, number, number, number] => {
        const half = CITY_HALF_OVERRIDE[cityName.trim().toLowerCase()] ?? DEFAULT_CITY_HALF;
        const minLat = centroid.lat - half;
        const maxLat = centroid.lat + half;
        // Compensate for longitude shrinking with latitude so the box stays roughly square.
        const lngHalf = half / Math.max(0.2, Math.cos(centroid.lat * Math.PI / 180));
        const minLng = centroid.lng - lngHalf;
        const maxLng = centroid.lng + lngHalf;
        return [minLng, minLat, maxLng, maxLat];
};

/**
 * Returns a city-level bbox suitable for biasing Photon and validating
 * geocoded results. Lazy-resolves the city centroid via one Photon call
 * and caches it in localStorage. Returns null only if Photon can't find
 * the city at all.
 */
export const getCityBbox = async (
        cityName: string,
        countryHint?: string,
): Promise<[number, number, number, number] | null> => {
        if (!cityName || !cityName.trim()) return null;
        const key = cityBboxKey(cityName, countryHint);
        const cache = cityBboxCache();
        const hit = cache[key];
        if (hit && Date.now() - hit.t < CITY_BBOX_TTL_MS) return hit.bbox;

        const countryBbox = countryHint ? getCountryBbox(countryHint) : null;
        const query = countryHint ? `${cityName.trim()}, ${countryHint.trim()}` : cityName.trim();
        const centroid = await photonGeocode(query, countryBbox || undefined);
        if (!centroid) return null;
        const bbox = buildBboxAroundCentroid(cityName, centroid);
        cache[key] = { centroid, bbox, t: Date.now() };
        persistCityBbox();
        return bbox;
};

/** Synchronous lookup for cached city bbox — returns null if not yet resolved. */
export const getCityBboxSync = (
        cityName: string,
        countryHint?: string,
): [number, number, number, number] | null => {
        if (!cityName || !cityName.trim()) return null;
        const key = cityBboxKey(cityName, countryHint);
        const hit = cityBboxCache()[key];
        if (!hit) return null;
        if (Date.now() - hit.t >= CITY_BBOX_TTL_MS) return null;
        return hit.bbox;
};

/**
 * Lazy-resolves a city's centroid (lat/lng) using the same Photon cache
 * as `getCityBbox`. Used by placeVerification to reject restaurants that
 * geocode to coordinates more than ~25 km from the trip city centroid —
 * the safety net that catches "Pattaya restaurant resolves to a Pattaya
 * 400 km north" type bugs.
 */
export const getCityCentroid = async (
        cityName: string,
        countryHint?: string,
): Promise<{ lat: number; lng: number } | null> => {
        if (!cityName || !cityName.trim()) return null;
        const key = cityBboxKey(cityName, countryHint);
        const cache = cityBboxCache();
        const hit = cache[key];
        if (hit && Date.now() - hit.t < CITY_BBOX_TTL_MS) return hit.centroid;
        // Falls through to getCityBbox which populates the cache as a side effect.
        await getCityBbox(cityName, countryHint);
        const after = cityBboxCache()[key];
        return after?.centroid || null;
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
        // Order matters: place-pin coords (!3d!4d) must come before viewport
        // coords (@lat,lng) because a typical Google Maps share URL contains
        // BOTH — the @ form is the user's last viewport center (often shifted
        // away from the actual pin) while !3d!4d marks the canonical place
        // location. Real-world example that exposed this bug:
        //   /maps/place/KC+Grande+Resort+Koh+Chang/@12.0957,102.2655,11z/...
        //     !3d12.1102!4d102.2696
        // The viewport (@) sits 2 km away from the pin (!3d!4d) — pinning
        // the hotel via @ rendered it on the mainland instead of the island.
        const matchers: RegExp[] = [
                /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,                               // !3dlat!4dlng (place URLs — most authoritative)
                /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,                              // ?q=lat,lng
                /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,                             // ?ll=lat,lng
                /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/,                          // /maps/search?api=1&query=lat,lng
                /destination=(-?\d+\.\d+),(-?\d+\.\d+)/,                        // /maps/dir destination
                /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/,                         // ?center=lat,lng (newer share pages)
                /[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/,                          // legacy directions destination
                /@(-?\d+\.\d+),(-?\d+\.\d+)/,                                   // /@lat,lng (viewport — last-resort fallback)
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
 * Pull the place's HUMAN-READABLE NAME out of a Google Maps URL when
 * coords aren't directly extractable. Useful as a stronger geocoder input
 * than the AI-generated free-text name — Google's path segment usually
 * has the canonical place name (e.g. "Holiday+Inn+Pattaya").
 *
 * Examples:
 *   /maps/place/Holiday+Inn+Pattaya/@12.9,100.9   → "Holiday Inn Pattaya"
 *   /place/Eiffel+Tower/data=...                  → "Eiffel Tower"
 *   /maps/search/?query=Eiffel%20Tower            → "Eiffel Tower"
 */
export const nameFromMapsUrl = (url?: string): string | null => {
        if (!url) return null;
        // Path-based: /place/<name>/...
        const placeMatch = url.match(/\/place\/([^/?@]+)/);
        if (placeMatch) {
                try {
                        return decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim() || null;
                } catch { return null; }
        }
        // Query-string-based: ?query=<name> or ?q=<name> (only when q isn't lat,lng)
        const queryMatch = url.match(/[?&](?:query|q)=([^&]+)/);
        if (queryMatch) {
                const raw = queryMatch[1];
                if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(raw)) return null; // it's coords, not a name
                try {
                        return decodeURIComponent(raw.replace(/\+/g, ' ')).trim() || null;
                } catch { return null; }
        }
        return null;
};

/**
 * Photon (Komoot) — open-source geocoder over OSM data with proper CORS
 * headers. Nominatim's public endpoint blocks browser requests from
 * github.io, so we avoid calling it from the client.
 */

export interface PhotonFeature {
        lat: number;
        lng: number;
        osmId?: string;        // "<osm_type>:<osm_id>"
        country?: string;
        city?: string;
        name?: string;
        type?: string;         // Photon "type" (e.g. "house", "city")
}

/**
 * Same Photon call, but returns the full feature (osm_id, country,
 * city, name) so callers like placeVerification.ts can do verification
 * checks without paying for a second HTTP round-trip.
 */
export const photonGeocodeRich = async (
        query: string,
        bbox?: [number, number, number, number],
): Promise<PhotonFeature | null> => {
        if (!query) return null;
        try {
                const bboxParam = bbox ? `&bbox=${bbox.join(',')}` : '';
                const res = await fetch(
                        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1${bboxParam}`,
                );
                if (!res.ok) return null;
                const data = await res.json();
                const feat = data?.features?.[0];
                if (!feat) return null;
                const coords = feat?.geometry?.coordinates;
                // Photon returns [lng, lat] (GeoJSON)
                if (!Array.isArray(coords) || coords.length < 2) return null;
                const lng = parseFloat(coords[0]);
                const lat = parseFloat(coords[1]);
                if (!isFinite(lat) || !isFinite(lng)) return null;
                const props = feat.properties || {};
                const osmType = props.osm_type;
                const osmIdRaw = props.osm_id;
                return {
                        lat,
                        lng,
                        osmId: osmType && osmIdRaw ? `${osmType}:${osmIdRaw}` : undefined,
                        country: props.country,
                        city: props.city || props.locality || props.district,
                        name: props.name,
                        type: props.type,
                };
        } catch {
                return null;
        }
};

const photonGeocode = async (
        query: string,
        bbox?: [number, number, number, number],
): Promise<{ lat: number; lng: number } | null> => {
        const feat = await photonGeocodeRich(query, bbox);
        return feat ? { lat: feat.lat, lng: feat.lng } : null;
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
        // City hint — when supplied, Photon is biased to the CITY bbox
        // (not just the country) and results outside that city are rejected.
        // Critical for chain places where the same name resolves to a
        // different city's branch (e.g. "Snow Wish Mango Sticky Rice"
        // resolving to the Bangkok branch when the AI tagged it as Pattaya).
        cityHint?: string;
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
        const countryBbox = getCountryBbox(input.countryHint || '');
        // City bbox: tighter than country, prevents chain branches in other cities.
        // Resolved lazily on first use per (city, country) and persisted to localStorage.
        const cityBbox = input.cityHint
                ? await getCityBbox(input.cityHint, input.countryHint)
                : null;
        // Effective bbox = city when available, otherwise country.
        const bbox = cityBbox || countryBbox;

        const hit = c[k];
        if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
                // Reject cached coords that landed outside the trip's expected bbox.
                // The check now uses the tighter city bbox when available — so a
                // stale cache entry from a previous country-bbox-only run gets
                // re-geocoded under the new tighter constraint.
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

        // Build query variants. With cityHint, prefer "Name, City, Country" first
        // so Photon's relevance ranking is biased toward the right city.
        // We ALSO use the URL-extracted name (e.g. "Holiday Inn Pattaya" pulled
        // from the path of a googleMapsUrl) as a high-confidence query candidate
        // — usually more accurate than the AI's free-text place name.
        const urlName = nameFromMapsUrl(input.googleMapsUrl);
        const baseQuery = [input.name, input.location || input.address].filter(Boolean).join(', ');
        const withCity = input.cityHint ? `${input.name}, ${input.cityHint}${input.countryHint ? `, ${input.countryHint}` : ''}` : null;
        const withHint = input.countryHint ? `${baseQuery}, ${input.countryHint}` : null;
        const urlNameWithCity = urlName && input.cityHint
                ? `${urlName}, ${input.cityHint}${input.countryHint ? `, ${input.countryHint}` : ''}`
                : null;
        const urlNameWithCountry = urlName && input.countryHint
                ? `${urlName}, ${input.countryHint}`
                : null;

        const attempts: Array<{ query: string; useBbox: 'city' | 'country' | 'none' }> = [
                // 0. URL-name + city — highest confidence.
                ...(urlNameWithCity && cityBbox ? [{ query: urlNameWithCity, useBbox: 'city' as const }] : []),
                // 0b. URL-name + country.
                ...(urlNameWithCountry ? [{ query: urlNameWithCountry, useBbox: countryBbox ? 'country' as const : 'none' as const }] : []),
                // 1. City-tagged query (AI name), biased + validated by city bbox.
                ...(withCity && cityBbox ? [{ query: withCity, useBbox: 'city' as const }] : []),
                // 2. Country-tagged query with country bbox.
                ...(withHint ? [{ query: withHint, useBbox: countryBbox ? 'country' as const : 'none' as const }] : []),
                // 3. Base query with country bbox.
                { query: baseQuery, useBbox: countryBbox ? 'country' as const : 'none' as const },
                // 4. Last-resort without bbox in case the name is genuinely ambiguous.
                ...(bbox && withHint ? [{ query: withHint, useBbox: 'none' as const }] : []),
        ];

        for (const { query, useBbox } of attempts) {
                const biasBbox = useBbox === 'city' ? cityBbox : useBbox === 'country' ? countryBbox : null;
                const result = await geocodeFallbackChain(query, biasBbox || undefined);
                if (!result) continue;
                // Hard reject: result outside the effective bbox (city if we have
                // one, otherwise country). Prevents chain restaurants from
                // resolving to a sibling city's branch.
                if (bbox && !coordInBbox(result.lat, result.lng, bbox)) continue;
                c[k] = { coords: result, t: Date.now() };
                persist();
                return result;
        }

        // Fallback: location-only query pinned to the right city/country.
        if (input.location || input.address) {
                const locParts = [input.location || input.address, input.cityHint, input.countryHint]
                        .filter(Boolean) as string[];
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
