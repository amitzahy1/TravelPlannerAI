/**
 * Real-photo resolver for restaurants and attractions.
 *
 * Strategy (first match wins):
 *   1. Wikipedia REST summary for "{Name} {City}" — returns a real photo
 *      for famous places (attractions, landmarks, chain restaurants).
 *   2. Wikipedia REST summary for "{Name}" alone.
 *   3. Category-based stock photo from imageMapper.ts (existing fallback).
 *
 * All successful resolutions are cached in localStorage so we don't hit
 * Wikipedia repeatedly for the same place on every render.
 */

const CACHE_KEY = 'placeImageCache.v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedEntry {
        url: string | null; // null = no real photo found, don't retry
        at: number;
}

type Cache = Record<string, CachedEntry>;

const readCache = (): Cache => {
        try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (!raw) return {};
                return JSON.parse(raw) as Cache;
        } catch {
                return {};
        }
};

const writeCache = (cache: Cache) => {
        try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {
                /* quota — ignore */
        }
};

const cacheKey = (name: string, city: string) =>
        `${name.trim().toLowerCase()}|${(city || '').trim().toLowerCase()}`;

/**
 * Wikipedia REST summary endpoint — returns a JSON summary with .thumbnail.source
 * when the page exists and has an image. Works for ~all famous attractions and
 * many well-known restaurants (chains, historic spots, Michelin-starred places).
 */
const fetchWikipediaImage = async (query: string): Promise<string | null> => {
        if (!query) return null;
        // Wikipedia prefers title-case with underscores
        const title = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
        try {
                const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
                        headers: { Accept: 'application/json' },
                });
                if (!resp.ok) return null;
                const data = await resp.json();
                // Disambiguation pages have type='disambiguation' — not useful
                if (data.type === 'disambiguation') return null;
                // Prefer the larger originalimage over the thumbnail crop
                const url = data.originalimage?.source || data.thumbnail?.source;
                return typeof url === 'string' ? url : null;
        } catch {
                return null;
        }
};

/**
 * Resolve a real photo URL for a place. Returns `null` if nothing better than
 * a category stock photo was found — callers should fall back to imageMapper
 * in that case.
 */
export const resolveRealPlaceImage = async (
        name: string,
        city: string = ''
): Promise<string | null> => {
        if (!name) return null;
        const key = cacheKey(name, city);

        // Cache check (honours TTL + "null = don't retry")
        const cache = readCache();
        const hit = cache[key];
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
                return hit.url;
        }

        // Attempt 1: name + city (best accuracy for common names — "Joe's" alone is too ambiguous)
        let url: string | null = null;
        if (city) url = await fetchWikipediaImage(`${name} ${city}`);
        // Attempt 2: name alone
        if (!url) url = await fetchWikipediaImage(name);

        // Persist (including null misses so we don't re-query every mount)
        cache[key] = { url, at: Date.now() };
        writeCache(cache);

        return url;
};
