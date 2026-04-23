/**
 * Real-photo resolver — 100% free (Wikipedia + Wikimedia Commons), zero keys.
 *
 * Critical design lesson from production: naive name-only search is DANGEROUS.
 * 'Sorn' finds a K-pop singer before the Bangkok Michelin restaurant; 'Tep Bar'
 * finds an academic paper about radars; 'Le Du' finds a random French person.
 *
 * This version is strict: it queries with a type-aware keyword (restaurant /
 * attraction) AND validates every result against the returned Wikipedia
 * description. If the description doesn't clearly describe a place of the
 * requested type, we reject the image and fall back to category stock.
 */

type PlaceType = 'restaurant' | 'attraction';

const CACHE_KEY = 'placeImageCache.v3';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedEntry {
        url: string | null;
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

const cacheKey = (name: string, city: string, type: PlaceType) =>
        `${type}|${name.trim().toLowerCase()}|${(city || '').trim().toLowerCase()}`;

// -----------------------------------------------------------------------------
// Validation — reject results that clearly aren't the right type of place
// -----------------------------------------------------------------------------

const RESTAURANT_POSITIVE = [
        'restaurant', 'eatery', 'bistro', 'café', 'cafe', 'coffee shop', 'bar',
        'diner', 'pub', 'bakery', 'pizzeria', 'ramen', 'sushi', 'steakhouse',
        'chef', 'cuisine', 'culinary', 'michelin', 'menu', 'dining', 'tavern',
        'patisserie', 'brewery', 'noodle', 'food hall', 'bbq', 'grill',
        'trattoria', 'osteria', 'izakaya', 'speakeasy', 'cocktail',
];

const ATTRACTION_POSITIVE = [
        'temple', 'shrine', 'church', 'cathedral', 'monastery', 'mosque',
        'palace', 'castle', 'tower', 'monument', 'museum', 'gallery', 'park',
        'garden', 'zoo', 'aquarium', 'market', 'bazaar', 'square', 'plaza',
        'landmark', 'ruins', 'cave', 'waterfall', 'beach', 'mountain', 'island',
        'viewpoint', 'neighborhood', 'district', 'area', 'city', 'town',
        'village', 'theatre', 'theater', 'stadium', 'arena', 'tourist', 'visitor',
];

// Strong negative signals — if the description starts with / contains any of
// these, the article is definitely about a person / song / movie / unrelated
// thing, not a place. Reject outright.
const HARD_NEGATIVE = [
        'singer', 'songwriter', 'rapper', 'musician', 'band', 'actor', 'actress',
        'writer', 'novelist', 'poet', 'painter', 'politician', 'athlete',
        'football', 'soccer', 'basketball', 'album', 'song', 'single', 'ep ',
        'film', 'movie', 'television series', 'tv series', 'novel', 'book',
        'video game', 'manga', 'comic', 'academic', 'journal', 'paper',
        'scientist', 'professor', 'mathematician', 'born in', 'given name',
        'surname', 'disambiguation',
];

const lowerExtract = (page: any): string => {
        const parts: string[] = [];
        if (typeof page?.description === 'string') parts.push(page.description);
        if (typeof page?.extract === 'string') parts.push(page.extract);
        if (typeof page?.terms?.description?.[0] === 'string') parts.push(page.terms.description[0]);
        return parts.join(' ').toLowerCase();
};

const matchesType = (text: string, type: PlaceType): boolean => {
        if (!text) return false;
        if (HARD_NEGATIVE.some(kw => text.includes(kw))) return false;
        const positives = type === 'restaurant' ? RESTAURANT_POSITIVE : ATTRACTION_POSITIVE;
        return positives.some(kw => text.includes(kw));
};

// -----------------------------------------------------------------------------
// Wikipedia: search with description enrichment + type validation
// -----------------------------------------------------------------------------

interface WikiCandidate {
        title: string;
        imageUrl: string | null;
        extract: string;
}

// -----------------------------------------------------------------------------
// Name-match scorer — ensures the Wikipedia title actually refers to this
// specific place, not a generic Wikipedia article on the topic.
//   'Gaggan' → title 'Gaggan' ✓
//   'Tep Bar' → title 'Coffeehouse' ✗ (generic)
//   'Sorn' → title 'Sorn (restaurant)' ✓
//   'Sorn' → title 'Sorn' (K-pop singer) — still fails on type validation
// -----------------------------------------------------------------------------

const titleContainsName = (title: string, name: string): boolean => {
        if (!title || !name) return false;
        const t = title.toLowerCase();
        const n = name.trim().toLowerCase();
        if (!n) return false;
        // Exact substring match of the whole name
        if (t.includes(n)) return true;
        // Multi-word names: every significant word must appear in the title
        // ('Baan Ice' → title needs 'baan' AND 'ice'). Skip tiny stopwords.
        const words = n.split(/\s+/).filter(w => w.length > 2);
        if (words.length >= 2 && words.every(w => t.includes(w))) return true;
        return false;
};

const wikipediaSearch = async (query: string, limit = 5): Promise<WikiCandidate[]> => {
        if (!query) return [];
        try {
                const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|description|extracts&exintro=1&explaintext=1&exsentences=2&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&piprop=original&origin=*`;
                const resp = await fetch(url);
                if (!resp.ok) return [];
                const data = await resp.json();
                const pages = data?.query?.pages;
                if (!pages) return [];
                const list: WikiCandidate[] = [];
                for (const p of Object.values(pages) as any[]) {
                        list.push({
                                title: p.title || '',
                                imageUrl: p.original?.source || p.thumbnail?.source || null,
                                extract: `${p.description || ''} ${p.extract || ''}`.toLowerCase(),
                        });
                }
                // Preserve the search's relevance order — Wikipedia already sorts by
                // query match quality.
                return list.sort((a, b) => {
                        const ai = Number((pages as any)[Object.keys(pages).find((k: any) => (pages as any)[k].title === a.title) as any]?.index ?? 999);
                        const bi = Number((pages as any)[Object.keys(pages).find((k: any) => (pages as any)[k].title === b.title) as any]?.index ?? 999);
                        return ai - bi;
                });
        } catch {
                return [];
        }
};

const findValidWikiImage = async (
        query: string,
        type: PlaceType,
        originalName: string
): Promise<string | null> => {
        const candidates = await wikipediaSearch(query, 5);
        for (const c of candidates) {
                if (!c.imageUrl) continue;
                // Two gates: the Wikipedia title must actually refer to this place
                // (not a generic article that matched on keywords) AND the article's
                // description must describe the right kind of place.
                if (!titleContainsName(c.title, originalName)) continue;
                if (!matchesType(c.extract, type)) continue;
                return c.imageUrl;
        }
        return null;
};

// -----------------------------------------------------------------------------
// Commons: search for a File: page whose title mentions the place
// -----------------------------------------------------------------------------

const commonsSearchImage = async (query: string, originalName: string): Promise<string | null> => {
        if (!query) return null;
        try {
                const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&gsrnamespace=6&iiprop=url&iiurlwidth=800&origin=*`;
                const resp = await fetch(url);
                if (!resp.ok) return null;
                const data = await resp.json();
                const pages = data?.query?.pages;
                if (!pages) return null;
                const nameLower = originalName.trim().toLowerCase();
                // Accept only File: pages whose title contains the place name —
                // otherwise we'll pick up unrelated Commons photos that happened
                // to match on other keywords.
                for (const p of Object.values(pages) as any[]) {
                        const ii = p?.imageinfo?.[0];
                        const title = (p?.title || '').toLowerCase();
                        if (!ii) continue;
                        const u = ii.thumburl || ii.url;
                        if (typeof u !== 'string') continue;
                        if (/\.svg(\?|$)/i.test(u)) continue;
                        if (/(map|coat of arms|flag of|logo of|portrait of|diagram|chart|graph|seal of)/i.test(title)) continue;
                        if (nameLower && !title.includes(nameLower)) continue; // strict: name must be in filename
                        return u;
                }
                return null;
        } catch {
                return null;
        }
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export const resolveRealPlaceImage = async (
        name: string,
        city: string = '',
        type: PlaceType = 'restaurant'
): Promise<string | null> => {
        if (!name) return null;
        const key = cacheKey(name, city, type);

        // Cache check
        const cache = readCache();
        const hit = cache[key];
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.url;

        const nameClean = name.trim();
        const cityClean = (city || '').trim();
        const typeWord = type === 'restaurant' ? 'restaurant' : '';

        let url: string | null = null;

        // Strategy 1: Wikipedia search with type-biased query.
        // Every candidate must: (a) have the place name in its Wikipedia title,
        // (b) describe the right kind of place in its extract. No match → null,
        // so we never show a singer's portrait on a restaurant card again.
        if (cityClean && typeWord) {
                url = await findValidWikiImage(`${nameClean} ${typeWord} ${cityClean}`, type, nameClean);
        }
        if (!url && cityClean) {
                url = await findValidWikiImage(`${nameClean} ${cityClean}`, type, nameClean);
        }
        if (!url && typeWord) {
                url = await findValidWikiImage(`${nameClean} ${typeWord}`, type, nameClean);
        }
        if (!url) {
                url = await findValidWikiImage(nameClean, type, nameClean);
        }

        // Strategy 2: Wikimedia Commons — same name-in-title gate, so we only
        // get Commons images that are specifically FILED under this place name.
        if (!url && cityClean) {
                url = await commonsSearchImage(`${nameClean} ${cityClean} ${typeWord}`.trim(), nameClean);
        }
        if (!url) {
                url = await commonsSearchImage(`${nameClean} ${typeWord}`.trim(), nameClean);
        }

        cache[key] = { url, at: Date.now() };
        writeCache(cache);
        return url;
};

export const clearPlaceImageCache = (name: string, city: string = '', type: PlaceType = 'restaurant') => {
        const cache = readCache();
        delete cache[cacheKey(name, city, type)];
        writeCache(cache);
};
