/**
 * Hebrew ↔ English category-title translation for AI prompts.
 *
 * The UI stores category titles in Hebrew ("המבורגר", "יוקרה ומישלן") so
 * the Hebrew-first interface reads naturally, but feeding those raw Hebrew
 * strings to a non-Hebrew-trained AI ("find restaurants for category
 * 'המבורגר'") produces lower-quality results — the model doesn't reliably
 * map the Hebrew token to the actual cuisine/category concept when
 * grounding against English-language web sources.
 *
 * Fix: translate Hebrew titles to English BEFORE sending to the model,
 * but keep the original Hebrew so the model can echo it back in the
 * output's `categoryTitle` field (so the trip UI stays consistent).
 *
 * The map is the inverse of the per-view HEBREW_TITLES tables in
 * RestaurantsView / AttractionsView — kept in one place so all three
 * call sites translate consistently.
 */

const HEBREW_TO_ENGLISH: Record<string, string> = {
    // Restaurant categories
    'אוכל מקומי אותנטי': 'Authentic Local Food',
    'יוקרה ומישלן': 'Fine Dining & Michelin',
    'מנות חובה מקומיות': 'Must-Try Local Dishes',
    'אוכל רחוב ושווקים': 'Street Food & Markets',
    'ברי קוקטיילים': 'Cocktail Bars',
    'בארים וקוקטיילים': 'Bars & Cocktails',
    'מסעדות משפחתיות': 'Family Friendly Restaurants',
    'משפחתי': 'Family Friendly',
    'בתי קפה וקינוחים': 'Cafes & Desserts',
    'בתי קפה ובוקר': 'Cafés & Breakfast',
    'ים ופירות ים': 'Seafood',
    'דגים ופירות ים': 'Seafood',
    'דגים': 'Seafood',
    'בשרים': 'BBQ & Grill',
    'בשרים ועל האש': 'BBQ & Grill',
    'צמחוני וטבעוני': 'Vegetarian & Vegan',
    'ראמן': 'Ramen',
    'פיצה': 'Pizza',
    'המבורגר': 'Burger',
    'תאילנדי': 'Thai',
    'יפני': 'Japanese',
    'איטלקי': 'Italian',
    'סטייק ובשרים': 'Steak & Grilled Meats',
    'יקרה': 'Fine Dining',
    'אסיאתי': 'Asian',
    'אוכל מקומי': 'Local Food',
    // Attraction categories
    'אתרי חובה': 'Iconic Landmarks',
    'טבע ונופים': 'Nature & Views',
    'מוזיאונים ותרבות': 'Museums & Culture',
    'קניות ושווקים': 'Shopping & Markets',
    'אקסטרים ופעילויות': 'Adventure & Activities',
    'חופים ומים': 'Beaches & Water',
    'למשפחות וילדים': 'Family & Kids',
    'היסטוריה ודת': 'History & Religion',
    'חיי לילה ואווירה': 'Nightlife & Vibes',
    'פינות נסתרות': 'Hidden Gems',
};

/**
 * Translate a category title to English when possible. Strips any leading
 * emoji ("🏨 קרוב למלון" → "Near Hotel") so the model gets a clean noun
 * phrase. Falls back to the raw input when no mapping exists — better an
 * unfamiliar Hebrew string than dropping the constraint entirely.
 */
export const categoryTitleToEnglish = (raw: string): string => {
    if (!raw) return raw;
    const cleaned = raw.replace(/^[\p{Emoji}☀-➿\s]+/u, '').trim();
    return HEBREW_TO_ENGLISH[cleaned] || raw;
};
