import { getCountryForCity } from './geoData';

export interface CityTheme {
        bg: string;
        border: string;
        text: string;
        textLight: string; // לימים בשבוע
        badge: string;     // לרקע של התאריך
        icon: string;
}

// ==========================================================================
// Curated palette — 14 maximally distinct hues ordered to zig-zag across the
// colour wheel, so sequential assignments are always visually different.
// Removed the old duplicates (three shades of orange, two purples, etc.) that
// made Pattaya / Bangkok / Abu Dhabi look identical in real trips.
// ==========================================================================
const THEMES: CityTheme[] = [
        // 0. Orange — warm beach
        { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', textLight: 'text-orange-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 1. Blue — urban
        { bg: 'bg-blue-600',   border: 'border-blue-700',   text: 'text-white', textLight: 'text-blue-100',   badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 2. Rose — romantic
        { bg: 'bg-rose-500',   border: 'border-rose-600',   text: 'text-white', textLight: 'text-rose-100',   badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 3. Emerald — nature / lush
        { bg: 'bg-emerald-600',border: 'border-emerald-700',text: 'text-white', textLight: 'text-emerald-100',badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 4. Violet — nightlife
        { bg: 'bg-violet-600', border: 'border-violet-700', text: 'text-white', textLight: 'text-violet-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 5. Amber — historic / gold
        { bg: 'bg-amber-600',  border: 'border-amber-700',  text: 'text-white', textLight: 'text-amber-100',  badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 6. Cyan — aqua
        { bg: 'bg-cyan-600',   border: 'border-cyan-700',   text: 'text-white', textLight: 'text-cyan-100',   badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 7. Fuchsia — modern
        { bg: 'bg-fuchsia-600',border: 'border-fuchsia-700',text: 'text-white', textLight: 'text-fuchsia-100',badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 8. Lime — jungle
        { bg: 'bg-lime-600',   border: 'border-lime-700',   text: 'text-white', textLight: 'text-lime-100',   badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 9. Indigo — royal
        { bg: 'bg-indigo-600', border: 'border-indigo-700', text: 'text-white', textLight: 'text-indigo-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 10. Red — bold
        { bg: 'bg-red-500',    border: 'border-red-600',    text: 'text-white', textLight: 'text-red-100',    badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 11. Sky — coastal light blue
        { bg: 'bg-sky-500',    border: 'border-sky-600',    text: 'text-white', textLight: 'text-sky-100',    badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 12. Teal — ocean green-blue
        { bg: 'bg-teal-600',   border: 'border-teal-700',   text: 'text-white', textLight: 'text-teal-100',   badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 13. Pink — candy
        { bg: 'bg-pink-500',   border: 'border-pink-600',   text: 'text-white', textLight: 'text-pink-100',   badge: 'bg-white/20 text-white', icon: 'text-white' },
];

// Default for flights, unknown, or neutral — slate/navy so it stands apart from any city
const DEFAULT_THEME: CityTheme = {
        bg: 'bg-slate-700',
        border: 'border-slate-800',
        text: 'text-white',
        textLight: 'text-slate-300',
        badge: 'bg-white/20 text-white',
        icon: 'text-slate-300',
};

// --------------------------------------------------------------------------
// Explicit city preferences — first choice of theme, but contextual builder
// will fall back if the preferred theme is already taken by another city in
// the same trip.
// --------------------------------------------------------------------------
const CITY_PREFERENCE: Record<string, number> = {
        // Thailand — each city gets a visually different hue
        'bangkok': 5,       // Amber (historic / temples)
        'phuket': 10,       // Red (sunset)
        'pattaya': 11,      // Sky (beach)
        'ko samui': 6,      // Cyan (island)
        'koh samui': 6,
        'samui': 6,
        'krabi': 12,        // Teal
        'chiang mai': 8,    // Lime (jungle)
        'koh chang': 4,     // Violet (wild island)
        'ko chang': 4,
        'hua hin': 13,      // Pink
        'koh phangan': 7,   // Fuchsia
        'phi phi': 2,       // Rose

        // UAE — desert family but distinct
        'abu dhabi': 0,     // Orange (desert)
        'dubai': 5,         // Amber (gold)

        // Philippines
        'manila': 1,        // Urban Blue
        'makati': 1,
        'cebu': 4,          // Violet
        'boracay': 0,       // Tropical Orange
        'el nido': 3,       // Emerald
        'coron': 6,         // Aqua Cyan
        'bohol': 8,         // Forest Lime
        'siargao': 11,      // Sky

        // Israel
        'tel aviv': 11,     // Sky (coastal)
        'jerusalem': 9,     // Indigo (royal)
        'haifa': 12,        // Teal
        'eilat': 0,         // Orange (desert)

        // Europe
        'london': 1,        // Blue
        'paris': 2,         // Rose
        'rome': 5,          // Amber
        'barcelona': 10,    // Red
        'amsterdam': 3,     // Emerald
        'berlin': 9,        // Indigo
        'prague': 4,        // Violet
        'budapest': 7,      // Fuchsia
        'vienna': 2,        // Rose
        'lisbon': 11,       // Sky

        // Asia
        'tokyo': 7,         // Fuchsia (modern)
        'kyoto': 3,         // Emerald (zen)
        'osaka': 10,        // Red
        'seoul': 9,         // Indigo
        'hong kong': 7,     // Fuchsia
        'singapore': 6,     // Cyan
        'bali': 8,          // Lime
        'denpasar': 8,
        'ubud': 3,          // Emerald (jungle)
        'kuala lumpur': 4,  // Violet

        // Americas
        'new york': 9,      // Indigo
        'miami': 11,        // Sky
        'los angeles': 0,   // Orange
        'san francisco': 1, // Blue
        'mexico city': 5,   // Amber
        'rio': 10,          // Red
        'buenos aires': 2,  // Rose

        // Georgia
        'tbilisi': 4,       // Violet
        'batumi': 11,       // Sky (coastal)
        'kazbegi': 3,       // Emerald (forest)
        'kutaisi': 2,       // Rose
};

// Country-level fallback if city isn't mapped. Returns the theme index a
// generic city in this country will start from.
const COUNTRY_THEMES: Record<string, number> = {
        'Philippines': 1,
        'Thailand': 5,
        'Japan': 7,
        'France': 2,
        'Italy': 5,
        'United Kingdom': 1,
        'United States': 9,
        'United Arab Emirates': 0,
        'Greece': 11,
        'Maldives': 6,
        'Switzerland': 3,
        'Israel': 11,
        'Georgia': 3,
};

const FLIGHT_KEYWORDS = ['טיסה', 'flight', 'חזור', 'חזרה', 'return', 'departure', 'arrival', 'נחית'];

const normalizeCityName = (cityName: string): string => {
        if (!cityName) return '';
        return cityName.trim().toLowerCase();
};

/** Finds the best-fit preferred theme index for a city, using explicit
 *  override → partial-match override → country fallback. Returns `null`
 *  if nothing matches (caller will assign from palette in order). */
const preferredThemeIndex = (cityName: string): number | null => {
        const lowerName = normalizeCityName(cityName);
        if (!lowerName) return null;

        // Flight days always default (neutral)
        if (FLIGHT_KEYWORDS.some(kw => lowerName.includes(kw))) return null;

        if (lowerName in CITY_PREFERENCE) return CITY_PREFERENCE[lowerName];

        for (const [key, index] of Object.entries(CITY_PREFERENCE)) {
                if (lowerName.includes(key)) return index;
        }

        const country = getCountryForCity(cityName);
        if (country && COUNTRY_THEMES[country] !== undefined) {
                return COUNTRY_THEMES[country];
        }

        return null;
};

// ==========================================================================
// Single-city lookup (legacy API — still exported for callers that don't
// know the whole trip's city list).
// Each city reliably gets the SAME colour each render, using the preferred
// table first and a stable hash second.
// ==========================================================================
export const getCityTheme = (cityName: string): CityTheme => {
        if (!cityName) return DEFAULT_THEME;
        const lowerName = normalizeCityName(cityName);
        if (FLIGHT_KEYWORDS.some(kw => lowerName.includes(kw))) return DEFAULT_THEME;

        const preferred = preferredThemeIndex(cityName);
        if (preferred !== null) return THEMES[preferred];

        // Stable hash fallback
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
                hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return THEMES[Math.abs(hash) % THEMES.length];
};

// ==========================================================================
// Trip-aware colour map — GUARANTEES every distinct city in the supplied
// list gets a distinct theme (within the palette size limit). Use this in
// views that render many days at once, so two cities never end up with the
// same colour just because their preferred themes happened to collide.
// ==========================================================================
export const buildCityColorMap = (cities: string[]): Record<string, CityTheme> => {
        // Dedupe, normalise, drop flight/empty entries
        const uniqueCities = Array.from(
                new Set(
                        cities
                                .map(c => (c || '').trim())
                                .filter(c => c.length > 0)
                                .filter(c => !FLIGHT_KEYWORDS.some(kw => c.toLowerCase().includes(kw)))
                )
        );

        const map: Record<string, CityTheme> = {};
        const usedIndexes = new Set<number>();

        // Pass 1 — honour explicit preferences where they don't collide
        const remaining: string[] = [];
        for (const city of uniqueCities) {
                const preferred = preferredThemeIndex(city);
                if (preferred !== null && !usedIndexes.has(preferred)) {
                        map[city.toLowerCase()] = THEMES[preferred];
                        usedIndexes.add(preferred);
                } else {
                        remaining.push(city);
                }
        }

        // Pass 2 — assign remaining cities from palette in natural order,
        // skipping already-used slots. Ensures distinct colours.
        let paletteCursor = 0;
        for (const city of remaining) {
                while (usedIndexes.has(paletteCursor) && usedIndexes.size < THEMES.length) {
                        paletteCursor = (paletteCursor + 1) % THEMES.length;
                }
                if (usedIndexes.size >= THEMES.length) {
                        // More cities than palette slots — wrap around, reusing. Still deterministic.
                        let hash = 0;
                        for (let i = 0; i < city.length; i++) hash = city.charCodeAt(i) + ((hash << 5) - hash);
                        map[city.toLowerCase()] = THEMES[Math.abs(hash) % THEMES.length];
                } else {
                        map[city.toLowerCase()] = THEMES[paletteCursor];
                        usedIndexes.add(paletteCursor);
                        paletteCursor = (paletteCursor + 1) % THEMES.length;
                }
        }

        return map;
};

/** Look up a city's theme from a map built by `buildCityColorMap`, falling
 *  back to the default (slate) for flight days / unknown cities. */
export const lookupCityTheme = (
        map: Record<string, CityTheme>,
        cityName: string
): CityTheme => {
        if (!cityName) return DEFAULT_THEME;
        const lower = normalizeCityName(cityName);
        if (FLIGHT_KEYWORDS.some(kw => lower.includes(kw))) return DEFAULT_THEME;
        return map[lower] || getCityTheme(cityName);
};
