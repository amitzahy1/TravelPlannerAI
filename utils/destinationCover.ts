/**
 * Maps a trip destination string (English or Hebrew, one or many cities)
 * to a landscape Unsplash photo that actually matches the place. Replaces
 * the old hardcoded "mountains + lake" default that rendered for every
 * trip regardless of destination.
 *
 * Matching strategy:
 *  - Lowercase + normalise diacritics, then test the input against each
 *    keyword list in order.
 *  - First hit wins; falls through to region-level defaults (e.g. any
 *    mention of "asia" → generic Asia skyline) before reaching the
 *    ultimate travel-luggage fallback.
 */

interface CoverEntry {
        // Curated Unsplash IDs for this destination — first one is the default
        // (used by the legacy single-cover API); additional IDs surface in the
        // cover-picker modal so the trip owner can choose between options.
        ids: string[];
        keywords: string[];
}

// Each Unsplash ID below has been spot-checked to produce a real image at
// the canonical URL `https://images.unsplash.com/photo-{id}?...`. When
// adding a new ID, verify the URL loads (some IDs in the wild are only
// valid via the Unsplash search API, not the direct `photo-` path).
const COVERS: CoverEntry[] = [
        // ── South-East Asia ──
        // Thailand cover: Thai longtail-boat beach (Phi Phi / Krabi vibe).
        { ids: ['1528181304800-259b08848526', '1552465011-b4e21bf6e79a', '1563492065-1a6c30f56b2e'], keywords: ['thailand', 'תאילנד'] },
        { ids: ['1563492065-1a6c30f56b2e', '1508009603885-50cf7c579365', '1552465011-b4e21bf6e79a'], keywords: ['bangkok', 'בנגקוק'] },
        { ids: ['1528181304800-259b08848526', '1552465011-b4e21bf6e79a', '1563492065-1a6c30f56b2e'], keywords: ['phuket', 'פוקט'] },
        { ids: ['1528181304800-259b08848526', '1552465011-b4e21bf6e79a', '1563492065-1a6c30f56b2e'], keywords: ['koh chang', 'koh samui', 'קו צ׳אנג', 'קו צאנג', 'קוה סמוי'] },
        { ids: ['1552550049-db097c9480d1', '1528181304800-259b08848526', '1552465011-b4e21bf6e79a'], keywords: ['pattaya', 'פטאייה'] },
        { ids: ['1535139262971-c51845709a48', '1583417319070-4a69db38a482', '1552465011-b4e21bf6e79a'], keywords: ['vietnam', 'וייטנאם', 'hanoi', 'ho chi minh'] },
        { ids: ['1545569341-9eb8b30979d9', '1480796927426-f609979314bd', '1493976040374-85c8e12f0c0e'], keywords: ['japan', 'יפן', 'tokyo', 'טוקיו', 'kyoto', 'osaka'] },
        { ids: ['1513407030348-c983a97b98d8'], keywords: ['korea', 'קוריאה', 'seoul'] },
        { ids: ['1507004063720-b52d2ec1ecd7', '1537996194471-e657df975ab4', '1518544866330-95a2bec01cfd'], keywords: ['bali', 'באלי', 'indonesia', 'אינדונזיה'] },
        { ids: ['1565971317451-81b5a7a66fd7'], keywords: ['philippines', 'פיליפינים', 'manila', 'cebu'] },
        { ids: ['1525998900-57dfce7ec98f'], keywords: ['singapore', 'סינגפור'] },
        { ids: ['1558611474-c1d948de44fd'], keywords: ['hong kong', 'הונג קונג'] },

        // ── Europe ──
        { ids: ['1513635269975-59663e0ac1ad'], keywords: ['london', 'לונדון', 'england', 'uk', 'britain', 'אנגליה', 'בריטניה'] },
        { ids: ['1502602898536-47ad22581b52'], keywords: ['paris', 'פריז', 'france', 'צרפת'] },
        { ids: ['1516483638261-f4dbaf036963'], keywords: ['italy', 'איטליה', 'rome', 'רומא', 'florence', 'פירנצה'] },
        { ids: ['1515488764276-beab7607c1e6'], keywords: ['venice', 'ונציה'] },
        { ids: ['1555993539-1732b0258235'], keywords: ['spain', 'ספרד', 'barcelona', 'ברצלונה', 'madrid', 'מדריד'] },
        { ids: ['1509803874385-db7c23652552'], keywords: ['greece', 'יוון', 'athens', 'אתונה', 'santorini', 'סנטוריני'] },
        { ids: ['1499856871958-5b9627545d1a'], keywords: ['amsterdam', 'אמסטרדם', 'netherlands', 'הולנד'] },
        { ids: ['1528728329032-2972f65dfb3f'], keywords: ['prague', 'פראג', 'czech'] },
        { ids: ['1534142499731-a32a99a41f46'], keywords: ['switzerland', 'שווייץ', 'zurich', 'geneva', 'alps', 'אלפים'] },
        { ids: ['1505761671935-60b3a7427bad'], keywords: ['germany', 'גרמניה', 'berlin', 'ברלין', 'munich'] },
        { ids: ['1523906834658-6e24ef2386f9'], keywords: ['austria', 'אוסטריה', 'vienna', 'וינה'] },
        { ids: ['1506905925346-21bda4d32df4'], keywords: ['portugal', 'פורטוגל', 'lisbon', 'ליסבון'] },
        { ids: ['1549144511-f099e773c147'], keywords: ['georgia', 'גיאורגיה', 'tbilisi', 'טביליסי'] },

        // ── Africa ──
        { ids: ['1516026672322-bc52d61a55d5'], keywords: ['south africa', 'דרום אפריקה', 'cape town', 'קייפטאון', 'johannesburg', 'יוהנסבורג'] },
        { ids: ['1504432842672-1a79f78e4084'], keywords: ['kenya', 'קניה', 'safari', 'סאפרי', 'tanzania', 'טנזניה'] },
        { ids: ['1539650116574-75c0c6d5f9d0'], keywords: ['morocco', 'מרוקו', 'marrakech', 'מרקש'] },
        { ids: ['1539650116574-8efeb43e2750'], keywords: ['egypt', 'מצרים', 'cairo', 'קהיר', 'luxor'] },

        // ── Americas ──
        { ids: ['1485871981521-5b1fd3805eee'], keywords: ['new york', 'ניו יורק', 'nyc', 'manhattan', 'brooklyn'] },
        { ids: ['1515861461225-1488dfdaf0a8'], keywords: ['los angeles', 'לוס אנג׳לס', 'hollywood'] },
        { ids: ['1504297050568-910d24c426d3'], keywords: ['san francisco', 'סן פרנסיסקו'] },
        { ids: ['1488747279002-c8523379faaa'], keywords: ['usa', 'ארהב', 'ארה"ב', 'united states', 'america'] },
        { ids: ['1518544866330-95a2bec01cfd'], keywords: ['canada', 'קנדה', 'toronto', 'vancouver', 'banff'] },
        { ids: ['1518638150340-f706e86654de'], keywords: ['mexico', 'מקסיקו', 'cancun', 'tulum'] },
        { ids: ['1531816248862-75d61df9e2a6'], keywords: ['brazil', 'ברזיל', 'rio', 'ריו'] },
        { ids: ['1526920929362-c80a23a0edb9'], keywords: ['argentina', 'ארגנטינה', 'patagonia', 'buenos aires'] },
        { ids: ['1587595431973-160d0d94add1'], keywords: ['peru', 'פרו', 'machu picchu', 'ליימה'] },

        // ── Middle East / Israel ──
        { ids: ['1544807571-c80a9c5a59d1'], keywords: ['israel', 'ישראל', 'tel aviv', 'תל אביב', 'jerusalem', 'ירושלים'] },
        { ids: ['1542044896530-05d01b0aceaf'], keywords: ['dubai', 'דובאי', 'abu dhabi', 'אבו דאבי', 'uae', 'אמירויות'] },
        { ids: ['1514849302-984523450cf4'], keywords: ['jordan', 'ירדן', 'petra'] },
        { ids: ['1477346611705-65d1883cee1e'], keywords: ['turkey', 'טורקיה', 'istanbul', 'איסטנבול'] },

        // ── Oceania / generic regions ──
        { ids: ['1523482580672-f109ba8cb9be'], keywords: ['australia', 'אוסטרליה', 'sydney', 'סידני'] },
        { ids: ['1523482580672-f109ba8cb9be'], keywords: ['new zealand', 'ניו זילנד'] },

        // ── Broad region fallbacks ──
        { ids: ['1540202404-a2f29016b523'], keywords: ['asia', 'אסיה'] },
        { ids: ['1524492412937-b28074a5d7da'], keywords: ['europe', 'אירופה'] },
        { ids: ['1519817914152-22d216bb9170'], keywords: ['africa', 'אפריקה'] },
];

const GENERIC_FALLBACK = '1488085061387-422e29b40080'; // travel / luggage / vista

const normalize = (s: string): string =>
        s.toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .trim();

/**
 * Returns a landscape Unsplash URL that best matches the given destination
 * string. Always returns something — never null. The URL has `auto=format`
 * so it loads fast across devices.
 */
const idToUrl = (id: string, size: number) =>
        `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${size}&q=80`;

// Generic travel-feel fallbacks — each verified to load at the canonical
// `images.unsplash.com/photo-${id}` URL. Used when no destination keyword
// matches, and as padding when a curated entry has fewer than `count` IDs.
const GENERIC_CANDIDATES = [
        '1488085061387-422e29b40080', // luggage on a sun-bleached terrace
        '1469854523086-cc02fe5d8800', // open road / windswept highway
        '1507525428034-b723cf961d3e', // beach with footsteps in the sand
        '1503220317375-aaad61436b1b', // mountain horizon at dusk
];

export const getDestinationCover = (destination?: string, size: number = 1600): string => {
        if (!destination || !destination.trim()) {
                return idToUrl(GENERIC_FALLBACK, size);
        }

        const q = normalize(destination);

        for (const entry of COVERS) {
                if (entry.keywords.some(kw => q.includes(normalize(kw)))) {
                        return idToUrl(entry.ids[0], size);
                }
        }

        return idToUrl(GENERIC_FALLBACK, size);
};

/**
 * Returns up to `count` curated cover URLs for a destination. Used by the
 * cover-picker modal so the trip owner can choose between options.
 * Pads with generic candidates when the curated entry has fewer than
 * `count` photos.
 */
export const getDestinationCoverCandidates = (
        destination?: string,
        count: number = 3,
        size: number = 1600,
): string[] => {
        const urls: string[] = [];
        const push = (id: string) => {
                if (!urls.includes(id) && urls.length < count) urls.push(id);
        };
        if (destination && destination.trim()) {
                const q = normalize(destination);
                for (const entry of COVERS) {
                        if (entry.keywords.some(kw => q.includes(normalize(kw)))) {
                                entry.ids.forEach(push);
                                if (urls.length >= count) break;
                        }
                }
        }
        // Pad with generic travel candidates so the picker always has 3 options.
        GENERIC_CANDIDATES.forEach(push);
        return urls.slice(0, count).map(id => idToUrl(id, size));
};

/**
 * Returns true when the destination string matches a curated cover (i.e.
 * not the generic luggage fallback). Lets callers prefer the keyword-based
 * cover over a stale `trip.coverImage` saved from an earlier wizard run.
 */
export const hasCuratedCover = (destination?: string): boolean => {
        if (!destination || !destination.trim()) return false;
        const q = normalize(destination);
        return COVERS.some(entry =>
                entry.keywords.some(kw => q.includes(normalize(kw)))
        );
};

/**
 * Picks the BEST cover for a trip. The cover-picker modal writes user choices
 * straight to `trip.coverImage`, so any non-empty `wizardCover` value here is
 * an explicit user pick and MUST win. The keyword-matched curated cover is
 * the fallback for trips where the user hasn't picked yet.
 *
 * (The previous implementation prioritised the curated cover even when a
 * user pick existed — that was correct when `wizardCover` meant a stale
 * generic boat photo from the old onboarding, but broke once the cover
 * picker shipped.)
 */
export const pickTripCover = (
        destination?: string,
        wizardCover?: string,
        size: number = 1600
): string => {
        if (wizardCover && wizardCover.trim()) return wizardCover;
        if (hasCuratedCover(destination)) return getDestinationCover(destination, size);
        return getDestinationCover(destination, size);
};
