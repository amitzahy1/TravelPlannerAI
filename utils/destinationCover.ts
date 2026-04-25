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
        id: string;       // Unsplash photo ID
        keywords: string[];
}

const COVERS: CoverEntry[] = [
        // ── South-East Asia ──
        // Thailand cover: Thai longtail-boat beach (Phi Phi / Krabi vibe). User
        // preferred a tropical beach over the Bangkok skyline — feels more
        // aspirational and reflects the bulk of leisure trips to TH.
        { id: '1552465011-b4e21bf6e79a', keywords: ['thailand', 'תאילנד'] },
        { id: '1508009603885-50cf7c579365', keywords: ['bangkok', 'בנגקוק'] },
        { id: '1528181304800-259b08848526', keywords: ['phuket', 'פוקט'] },
        { id: '1528127269322-539801943592', keywords: ['koh chang', 'koh samui', 'קו צ׳אנג', 'קו צאנג', 'קוה סמוי'] },
        { id: '1552550049-db097c9480d1', keywords: ['pattaya', 'פטאייה'] },
        { id: '1525219137-66c5e3796a17', keywords: ['vietnam', 'וייטנאם', 'hanoi', 'ho chi minh'] },
        { id: '1558005530-a7958896ec60', keywords: ['japan', 'יפן', 'tokyo', 'טוקיו', 'kyoto', 'osaka'] },
        { id: '1513407030348-c983a97b98d8', keywords: ['korea', 'קוריאה', 'seoul'] },
        { id: '1507004063720-b52d2ec1ecd7', keywords: ['bali', 'באלי', 'indonesia', 'אינדונזיה'] },
        { id: '1565971317451-81b5a7a66fd7', keywords: ['philippines', 'פיליפינים', 'manila', 'cebu'] },
        { id: '1525998900-57dfce7ec98f', keywords: ['singapore', 'סינגפור'] },
        { id: '1558611474-c1d948de44fd', keywords: ['hong kong', 'הונג קונג'] },

        // ── Europe ──
        { id: '1513635269975-59663e0ac1ad', keywords: ['london', 'לונדון', 'england', 'uk', 'britain', 'אנגליה', 'בריטניה'] },
        { id: '1502602898536-47ad22581b52', keywords: ['paris', 'פריז', 'france', 'צרפת'] },
        { id: '1516483638261-f4dbaf036963', keywords: ['italy', 'איטליה', 'rome', 'רומא', 'florence', 'פירנצה'] },
        { id: '1515488764276-beab7607c1e6', keywords: ['venice', 'ונציה'] },
        { id: '1555993539-1732b0258235', keywords: ['spain', 'ספרד', 'barcelona', 'ברצלונה', 'madrid', 'מדריד'] },
        { id: '1509803874385-db7c23652552', keywords: ['greece', 'יוון', 'athens', 'אתונה', 'santorini', 'סנטוריני'] },
        { id: '1499856871958-5b9627545d1a', keywords: ['amsterdam', 'אמסטרדם', 'netherlands', 'הולנד'] },
        { id: '1528728329032-2972f65dfb3f', keywords: ['prague', 'פראג', 'czech'] },
        { id: '1534142499731-a32a99a41f46', keywords: ['switzerland', 'שווייץ', 'zurich', 'geneva', 'alps', 'אלפים'] },
        { id: '1505761671935-60b3a7427bad', keywords: ['germany', 'גרמניה', 'berlin', 'ברלין', 'munich'] },
        { id: '1523906834658-6e24ef2386f9', keywords: ['austria', 'אוסטריה', 'vienna', 'וינה'] },
        { id: '1506905925346-21bda4d32df4', keywords: ['portugal', 'פורטוגל', 'lisbon', 'ליסבון'] },
        { id: '1549144511-f099e773c147', keywords: ['georgia', 'גיאורגיה', 'tbilisi', 'טביליסי'] },

        // ── Africa ──
        { id: '1516026672322-bc52d61a55d5', keywords: ['south africa', 'דרום אפריקה', 'cape town', 'קייפטאון', 'johannesburg', 'יוהנסבורג'] },
        { id: '1504432842672-1a79f78e4084', keywords: ['kenya', 'קניה', 'safari', 'סאפרי', 'tanzania', 'טנזניה'] },
        { id: '1539650116574-75c0c6d5f9d0', keywords: ['morocco', 'מרוקו', 'marrakech', 'מרקש'] },
        { id: '1539650116574-8efeb43e2750', keywords: ['egypt', 'מצרים', 'cairo', 'קהיר', 'luxor'] },

        // ── Americas ──
        { id: '1485871981521-5b1fd3805eee', keywords: ['new york', 'ניו יורק', 'nyc', 'manhattan', 'brooklyn'] },
        { id: '1515861461225-1488dfdaf0a8', keywords: ['los angeles', 'לוס אנג׳לס', 'hollywood'] },
        { id: '1504297050568-910d24c426d3', keywords: ['san francisco', 'סן פרנסיסקו'] },
        { id: '1488747279002-c8523379faaa', keywords: ['usa', 'ארהב', 'ארה"ב', 'united states', 'america'] },
        { id: '1518544866330-95a2bec01cfd', keywords: ['canada', 'קנדה', 'toronto', 'vancouver', 'banff'] },
        { id: '1518638150340-f706e86654de', keywords: ['mexico', 'מקסיקו', 'cancun', 'tulum'] },
        { id: '1531816248862-75d61df9e2a6', keywords: ['brazil', 'ברזיל', 'rio', 'ריו'] },
        { id: '1526920929362-c80a23a0edb9', keywords: ['argentina', 'ארגנטינה', 'patagonia', 'buenos aires'] },
        { id: '1587595431973-160d0d94add1', keywords: ['peru', 'פרו', 'machu picchu', 'ליימה'] },

        // ── Middle East / Israel ──
        { id: '1544807571-c80a9c5a59d1', keywords: ['israel', 'ישראל', 'tel aviv', 'תל אביב', 'jerusalem', 'ירושלים'] },
        { id: '1542044896530-05d01b0aceaf', keywords: ['dubai', 'דובאי', 'abu dhabi', 'אבו דאבי', 'uae', 'אמירויות'] },
        { id: '1514849302-984523450cf4', keywords: ['jordan', 'ירדן', 'petra'] },
        { id: '1477346611705-65d1883cee1e', keywords: ['turkey', 'טורקיה', 'istanbul', 'איסטנבול'] },

        // ── Oceania / generic regions ──
        { id: '1523482580672-f109ba8cb9be', keywords: ['australia', 'אוסטרליה', 'sydney', 'סידני'] },
        { id: '1523482580672-f109ba8cb9be', keywords: ['new zealand', 'ניו זילנד'] },

        // ── Broad region fallbacks ──
        { id: '1540202404-a2f29016b523', keywords: ['asia', 'אסיה'] },
        { id: '1524492412937-b28074a5d7da', keywords: ['europe', 'אירופה'] },
        { id: '1519817914152-22d216bb9170', keywords: ['africa', 'אפריקה'] },
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
export const getDestinationCover = (destination?: string, size: number = 1600): string => {
        const toUrl = (id: string) =>
                `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${size}&q=80`;

        if (!destination || !destination.trim()) {
                return toUrl(GENERIC_FALLBACK);
        }

        const q = normalize(destination);

        for (const entry of COVERS) {
                if (entry.keywords.some(kw => q.includes(normalize(kw)))) {
                        return toUrl(entry.id);
                }
        }

        return toUrl(GENERIC_FALLBACK);
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
 * Picks the BEST cover for a trip: a curated keyword-matched cover for the
 * destination beats a stale wizard-uploaded `coverImage` (which was often
 * the same generic boat-on-lake regardless of where the user is going).
 * Falls back to the wizard cover if no keyword matches, then to the generic.
 */
export const pickTripCover = (
        destination?: string,
        wizardCover?: string,
        size: number = 1600
): string => {
        if (hasCuratedCover(destination)) {
                return getDestinationCover(destination, size);
        }
        if (wizardCover && wizardCover.trim()) return wizardCover;
        return getDestinationCover(destination, size);
};
