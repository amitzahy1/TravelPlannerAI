import { cityKey } from './geoData';

/**
 * Aggressive city name normalizer for chip-strip dedup.
 *
 * Why this exists in addition to `cityKey`: cityKey covers most variants
 * via its Hebrew↔English bridge, but real hotel addresses produce edge
 * cases that slip through:
 *   - "Koh Chang" vs "Ko Chang" (different transliteration)
 *   - "Bangkok" + trailing ", Thailand" suffix
 *   - Mixed punctuation (apostrophes, hyphens, double spaces)
 *
 * Strategy: lowercase, strip punctuation, apply a tiny alias table for the
 * Thai/SEA cases that bite us most often, then bridge through cityKey.
 *
 * Returns '' for empty / unrecognised input — callers should treat that as
 * "no canonical city" and drop the candidate.
 */
const COUNTRY_SUFFIXES = [
    ', thailand', ', israel', ', italy', ', japan', ', vietnam', ', france', ', spain',
    ', greece', ', usa', ', united states', ', uk', ', united kingdom',
    ', albania', ', portugal', ', germany', ', austria', ', netherlands', ', belgium',
    ', poland', ', czech republic', ', croatia', ', serbia', ', romania', ', bulgaria',
    ', hungary', ', slovakia', ', turkey', ', morocco', ', egypt', ', jordan', ', uae',
    ', china', ', taiwan', ', south korea', ', korea', ', india', ', sri lanka',
    ', indonesia', ', malaysia', ', singapore', ', philippines', ', cambodia', ', laos',
    ', australia', ', new zealand', ', mexico', ', brazil', ', argentina', ', chile',
    ', canada', ', cyprus',
];

const PROVINCE_OR_COUNTRY = new Set([
    // English country names — any of these as a "city" candidate is dropped
    // from the chip strip, since chips are city-level by design. Keep this
    // list growing whenever a new destination is added — a missing entry
    // makes the country name a chip that swallows every item's location.
    'thailand', 'israel', 'italy', 'japan', 'vietnam', 'france', 'spain',
    'greece', 'usa', 'united states', 'uk', 'united kingdom',
    'albania', 'portugal', 'germany', 'austria', 'netherlands', 'belgium',
    'poland', 'czech republic', 'croatia', 'serbia', 'romania', 'bulgaria',
    'hungary', 'slovakia', 'turkey', 'morocco', 'egypt', 'jordan', 'uae',
    'china', 'taiwan', 'south korea', 'korea', 'india', 'sri lanka',
    'indonesia', 'malaysia', 'singapore', 'philippines', 'cambodia', 'laos',
    'australia', 'new zealand', 'mexico', 'brazil', 'argentina', 'chile',
    'canada', 'cyprus', 'switzerland', 'denmark', 'sweden', 'norway', 'finland',
    'ireland', 'iceland', 'estonia', 'latvia', 'lithuania',
    // Hebrew country names — the destination field is Hebrew, so we need to
    // catch it before it becomes a chip.
    'אלבניה', 'תאילנד', 'יפן', 'ויאטנם', 'איטליה', 'צרפת', 'ספרד', 'יוון',
    'פורטוגל', 'גרמניה', 'אוסטריה', 'הולנד', 'בלגיה', 'פולין', 'צ׳כיה', 'צ\'כיה',
    'קרואטיה', 'סרביה', 'רומניה', 'בולגריה', 'הונגריה', 'סלובקיה', 'טורקיה',
    'מרוקו', 'מצרים', 'ירדן', 'איחוד האמירויות', 'סין', 'טייוואן', 'קוריאה',
    'דרום קוריאה', 'הודו', 'סרי לנקה', 'אינדונזיה', 'מלזיה', 'סינגפור',
    'פיליפינים', 'קמבודיה', 'לאוס', 'אוסטרליה', 'ניו זילנד', 'מקסיקו',
    'ברזיל', 'ארגנטינה', 'צ׳ילה', 'צ\'ילה', 'קנדה', 'קפריסין', 'שווייץ',
    'דנמרק', 'שוודיה', 'נורווגיה', 'פינלנד', 'אירלנד', 'איסלנד',
    // Thai provinces that historically polluted chips
    'chon buri', 'chonburi', 'rayong province', 'phuket province',
    'kathu', 'mueang phuket', 'thalang',
]);

const stripPunctuation = (s: string) =>
    s.replace(/[׳''′"`.\-,]/g, '').replace(/\s+/g, ' ').trim();

const stripCountrySuffix = (s: string) => {
    const lower = s.toLowerCase();
    for (const suf of COUNTRY_SUFFIXES) {
        if (lower.endsWith(suf)) return s.slice(0, s.length - suf.length).trim();
    }
    return s;
};

const ALIAS_RULES: Array<[RegExp, string]> = [
    [/^koh /, 'ko '],          // "Koh Chang" → "ko chang"
    [/^the /, ''],
];

export const normalizeCityForChip = (raw: string): string => {
    if (!raw) return '';
    let s = stripCountrySuffix(raw);
    s = stripPunctuation(s);
    s = s.toLowerCase();
    for (const [pat, repl] of ALIAS_RULES) {
        s = s.replace(pat, repl);
    }
    if (!s) return '';

    // Bridge through cityKey to canonicalize Hebrew↔English where the lookup
    // table knows the city. Keeps "bangkok" and "בנגקוק" colliding to the
    // same key as before.
    const bridged = cityKey(s) || cityKey(raw);
    return bridged || s;
};

/** True when the candidate is a province/country we should NOT show as a chip. */
export const isProvinceOrCountryName = (raw: string): boolean => {
    if (!raw) return false;
    const lower = stripPunctuation(raw).toLowerCase();
    return PROVINCE_OR_COUNTRY.has(lower);
};
