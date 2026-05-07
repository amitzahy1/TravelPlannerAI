/**
 * Hebrew labels for AI-returned cuisine / attraction-type / price strings.
 *
 * The food and attraction filter chips render these labels — keeping the
 * mapping centralised lets multiple call sites collapse "Burger" + "Burgers"
 * + "המבורגר" into a single chip.
 *
 * Values come from the AI in mixed English/Hebrew with arbitrary phrasing,
 * so we normalise via lowercase + substring matching against keyword groups
 * rather than exact lookup. Anything we can't classify falls back to "אחר".
 */

type Group = { he: string; matches: string[] };

// Order matters — earlier entries win on ties so we can put more specific
// before more general ("ramen" before "japanese", "fine dining" before "luxury").
const CUISINE_GROUPS: Group[] = [
        { he: 'ראמן', matches: ['ramen'] },
        { he: 'סושי', matches: ['sushi'] },
        { he: 'יפני', matches: ['japanese', 'izakaya'] },
        { he: 'תאילנדי', matches: ['thai', 'isan'] },
        { he: 'דגים ופירות ים', matches: ['seafood', 'fish ', 'fishery', 'lobster', 'shrimp'] },
        { he: 'סיני', matches: ['chinese', 'dim sum'] },
        { he: 'וייטנאמי', matches: ['vietnam', 'pho'] },
        { he: 'קוריאני', matches: ['korean', 'kbbq', 'kimchi'] },
        { he: 'הודי', matches: ['indian', 'curry'] },
        { he: 'מקסיקני', matches: ['mexican', 'taco', 'burrito'] },
        { he: 'איטלקי', matches: ['italian', 'pasta'] },
        { he: 'פיצה', matches: ['pizza'] },
        { he: 'המבורגרים', matches: ['burger'] },
        { he: 'סטייק ובשרים', matches: ['steak', 'meat', 'grill', 'bbq', 'barbecue'] },
        { he: 'בתי קפה', matches: ['cafe', 'café', 'coffee', 'bakery', 'pastry'] },
        { he: 'קינוחים', matches: ['dessert', 'ice cream', 'gelato', 'sweet'] },
        { he: 'ברים וקוקטיילים', matches: ['cocktail', 'bar ', ' bar', 'pub', 'speakeasy', 'wine bar', 'whisky'] },
        { he: 'יין', matches: ['wine', 'vineyard'] },
        { he: 'יוקרה ושף', matches: ['fine dining', 'michelin', 'gourmet', 'tasting menu', 'chef'] },
        { he: 'אוכל רחוב', matches: ['street food', 'street-food', 'hawker', 'stall', 'night market'] },
        { he: 'מקומי אותנטי', matches: ['local', 'authentic', 'traditional'] },
        { he: 'טבעוני וצמחוני', matches: ['vegan', 'vegetarian', 'plant'] },
        { he: 'משפחתי', matches: ['family'] },
];

const ATTRACTION_GROUPS: Group[] = [
        { he: 'מקדשים', matches: ['temple', 'shrine', 'monastery', 'religious'] },
        { he: 'מוזיאונים', matches: ['museum', 'gallery'] },
        { he: 'שווקים', matches: ['market', 'night market', 'floating market', 'street market'] },
        { he: 'קניות', matches: ['shop', 'mall', 'shopping', 'retail', 'department store'] },
        { he: 'חופים', matches: ['beach', 'shore', 'coast'] },
        { he: 'איים', matches: ['island', 'islet'] },
        { he: 'טבע ופארקים', matches: ['park', 'garden', 'nature', 'forest', 'jungle', 'waterfall', 'mountain', 'hill'] },
        { he: 'אטרקציות מים', matches: ['waterpark', 'aquarium', 'water park', 'lagoon'] },
        { he: 'נקודות תצפית', matches: ['viewpoint', 'view point', 'lookout', 'observation', 'sky walk', 'skywalk'] },
        { he: 'אתרי חובה', matches: ['landmark', 'icon', 'must see', 'must-see', 'palace', 'castle', 'fort'] },
        { he: 'תרבות והיסטוריה', matches: ['culture', 'history', 'historic', 'heritage', 'old town', 'ruin'] },
        { he: 'אומנות', matches: ['art', 'sculpture', 'mural', 'street art'] },
        { he: 'חיי לילה', matches: ['nightlife', 'night life', 'club', 'lounge', 'live music', 'show', 'cabaret'] },
        { he: 'בידור', matches: ['entertainment', 'theme park', 'amusement', 'arcade', 'cinema', 'theatre'] },
        { he: 'הרפתקאות', matches: ['adventure', 'extreme', 'zipline', 'bungee', 'rafting', 'climbing', 'atv'] },
        { he: 'ספא ובריאות', matches: ['spa', 'massage', 'wellness', 'onsen', 'hot spring'] },
        { he: 'משפחות וילדים', matches: ['family', 'kids', "kids'", "children", "kid's"] },
        { he: 'ספורט', matches: ['sport', 'stadium', 'golf'] },
        { he: 'דת ורוחניות', matches: ['spiritual', 'meditation', 'yoga'] },
        { he: 'שייט וסירות', matches: ['boat', 'cruise', 'kayak', 'sailing'] },
];

const matchGroup = (groups: Group[], raw: string): string | null => {
        const lower = raw.toLowerCase().trim();
        if (!lower) return null;
        for (const g of groups) {
                if (g.matches.some(m => lower.includes(m))) return g.he;
        }
        return null;
};

const containsHebrew = (s: string) => /[֐-׿]/.test(s);

/** Hebrew label for a cuisine string. Already-Hebrew input passes through. */
export const cuisineToHebrew = (raw?: string): string => {
        const v = (raw || '').trim();
        if (!v) return 'אחר';
        if (containsHebrew(v)) return v;
        return matchGroup(CUISINE_GROUPS, v) || 'אחר';
};

/** Hebrew label for an attraction type / activity_type string. */
export const attractionTypeToHebrew = (raw?: string): string => {
        const v = (raw || '').trim();
        if (!v) return 'אחר';
        if (containsHebrew(v)) return v;
        return matchGroup(ATTRACTION_GROUPS, v) || 'אחר';
};

/** Canonicalise an arbitrary price string into a small set of buckets. */
export const priceToBucket = (raw?: string): { key: string; label: string } | null => {
        const v = (raw || '').trim();
        if (!v) return null;
        const lower = v.toLowerCase();
        if (/^\$+$/.test(v)) {
                return { key: v, label: v }; // canonical $..$$$$
        }
        if (lower.includes('free') || lower.includes('חינם') || lower.includes('כניסה חופשית')) {
                return { key: 'free', label: 'חינם' };
        }
        if (lower.includes('expensive') || lower.includes('luxury') || lower.includes('יקר')) {
                return { key: '$$$$', label: '$$$$' };
        }
        if (lower.includes('cheap') || lower.includes('budget') || lower.includes('זול')) {
                return { key: '$', label: '$' };
        }
        // Anything else (e.g. "THB for foreigners 1 200", "Paid", "בתשלום") collapses
        return { key: 'paid', label: 'בתשלום' };
};

const PRICE_ORDER = ['free', '$', '$$', '$$$', '$$$$', 'paid'];
export const sortPriceKeys = (a: string, b: string) =>
        PRICE_ORDER.indexOf(a) - PRICE_ORDER.indexOf(b);
