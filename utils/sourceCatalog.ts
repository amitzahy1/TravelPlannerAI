/**
 * Catalog of recommendation sources used by the AI background research.
 * Each entry provides a short Hebrew description, a homepage URL, and a
 * `searchUrl(name, city)` helper that builds a deep-link to the source's
 * own search results pre-filled with the place name + city.
 *
 * Used by GlobalPlaceModal's source pill popover so a user can verify the
 * recommendation against its claimed authority in one tap.
 */

export interface SourceEntry {
  /** Canonical display name as it appears in the pill. */
  label: string;
  /** Short Hebrew description (1-2 lines) shown above the links. */
  description: string;
  /** Homepage of the source. */
  homepage: string;
  /** Deep-link search builder. Falls back to homepage if not provided. */
  searchUrl?: (name: string, city?: string) => string;
}

const enc = (s: string) => encodeURIComponent((s || '').trim());
const join = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' ').trim();

/**
 * Lookup is case-insensitive and tolerates partial matches like "Michelin"
 * vs. "Michelin Guide". The keys are lowercased canonical names; the
 * `findSource` helper normalises the freeform AI output before matching.
 */
const ENTRIES: Record<string, SourceEntry> = {
  'michelin guide': {
    label: 'Michelin Guide',
    description: 'מדריך מישלן הבינלאומי — דירוג כוכבים ומסעדות Bib Gourmand באיכות מעולה במחיר סביר.',
    homepage: 'https://guide.michelin.com',
    searchUrl: (name, city) => `https://guide.michelin.com/en/search?q=${enc(join([name, city]))}`,
  },
  'wongnai': {
    label: 'Wongnai',
    description: 'אתר ביקורות המסעדות הגדול בתאילנד — סקירות של מקומיים, תפריטים ותמונות מעודכנות.',
    homepage: 'https://www.wongnai.com',
    searchUrl: (name, city) => `https://www.wongnai.com/search?q=${enc(join([name, city]))}`,
  },
  'tabelog': {
    label: 'Tabelog',
    description: 'מאגר המסעדות המוביל ביפן — דירוגים מקומיים מאוד מהימנים, מעל 4.0 נחשב יוצא מן הכלל.',
    homepage: 'https://tabelog.com',
    searchUrl: (name, city) => `https://tabelog.com/en/rstLst/?sw=${enc(join([name, city]))}`,
  },
  'dianping': {
    label: 'Dianping',
    description: 'מאגר ביקורות המסעדות הגדול בסין — שווה ערך ל-Yelp עבור היעדים הסיניים.',
    homepage: 'https://www.dianping.com',
    searchUrl: (name, city) => `https://www.dianping.com/search/keyword/0/0_${enc(join([name, city]))}`,
  },
  'openrice': {
    label: 'OpenRice',
    description: 'אתר ביקורות מסעדות מוביל בהונג קונג, סינגפור ודרום-מזרח אסיה.',
    homepage: 'https://www.openrice.com',
    searchUrl: (name, city) => `https://www.openrice.com/en/asia/restaurants?what=${enc(join([name, city]))}`,
  },
  'tripadvisor': {
    label: 'TripAdvisor',
    description: 'אתר ביקורות התיירים הגדול בעולם — מסנן טוב לאטרקציות ומסעדות פופולריות בקרב מטיילים.',
    homepage: 'https://www.tripadvisor.com',
    searchUrl: (name, city) => `https://www.tripadvisor.com/Search?q=${enc(join([name, city]))}`,
  },
  'lonely planet': {
    label: 'Lonely Planet',
    description: 'מדריכי הטיולים הקלאסיים — נוטה להמלצות איכות ולא רק פופולריות.',
    homepage: 'https://www.lonelyplanet.com',
    searchUrl: (name, city) => `https://www.lonelyplanet.com/search?q=${enc(join([name, city]))}`,
  },
  'atlas obscura': {
    label: 'Atlas Obscura',
    description: 'מקומות מוזרים, ייחודיים ולא שגרתיים בכל יעד — מצוין לאטרקציות שלא יופיעו בכל מדריך.',
    homepage: 'https://www.atlasobscura.com',
    searchUrl: (name, city) => `https://www.atlasobscura.com/search?q=${enc(join([name, city]))}`,
  },
  'unesco': {
    label: 'UNESCO',
    description: 'אתרי מורשת עולמית של אונסק"ו — איכות תרבותית ובטיחות נסיעה ברמה הגבוהה ביותר.',
    homepage: 'https://whc.unesco.org',
    searchUrl: (name) => `https://whc.unesco.org/en/list/?search=${enc(name)}`,
  },
  'time out': {
    label: 'Time Out',
    description: 'מגזין עירוני בינלאומי — המלצות מסעדות, ברים ובילויים עדכניים בערים גדולות.',
    homepage: 'https://www.timeout.com',
    searchUrl: (name, city) => `https://www.timeout.com/search?q=${enc(join([name, city]))}`,
  },
  '50 best': {
    label: 'The World\'s 50 Best',
    description: 'דירוג שנתי של 50 המסעדות הטובות בעולם — מסעדות שף ברמה הגבוהה ביותר.',
    homepage: 'https://www.theworlds50best.com',
    searchUrl: (name) => `https://www.theworlds50best.com/?s=${enc(name)}`,
  },
  'eater': {
    label: 'Eater',
    description: 'אתר תוכן קולינרי שמפרסם מפות ערים מומלצות — עדכון תכוף, נטוי לטעם מקצועי.',
    homepage: 'https://www.eater.com',
    searchUrl: (name, city) => `https://www.eater.com/search?q=${enc(join([name, city]))}`,
  },
  'naver map': {
    label: 'Naver Map',
    description: 'שירות המפות והביקורות הדומיננטי בקוריאה — סקירות בקוריאנית, מצוין למסעדות מקומיות.',
    homepage: 'https://map.naver.com',
    searchUrl: (name, city) => `https://map.naver.com/p/search/${enc(join([name, city]))}`,
  },
  'zomato': {
    label: 'Zomato',
    description: 'פלטפורמת ביקורות מסעדות גדולה (חזקה במיוחד בהודו ובמזרח התיכון).',
    homepage: 'https://www.zomato.com',
    searchUrl: (name, city) => `https://www.zomato.com/search?q=${enc(join([name, city]))}`,
  },
  'top-rated': {
    label: 'Top-Rated',
    description: 'דירוג גבוה מאוד ב-Google ובמקורות צולבים — לא מקור רשמי אחד אלא קונצנזוס איכות.',
    homepage: 'https://www.google.com/maps',
    searchUrl: (name, city) => `https://www.google.com/maps/search/${enc(join([name, city]))}`,
  },
  'local favorite': {
    label: 'Local Favorite',
    description: 'מקום שהמקומיים אוהבים — לפי קונצנזוס בביקורות, פוסטים ברשתות וקבוצות תיירים מקומיות.',
    homepage: 'https://www.google.com/maps',
    searchUrl: (name, city) => `https://www.google.com/maps/search/${enc(join([name, city]))}`,
  },
  'burpple': {
    label: 'Burpple',
    description: 'אפליקציית גילוי מסעדות פופולרית בסינגפור ומלזיה — סקירות קצרות עם תמונות.',
    homepage: 'https://www.burpple.com',
    searchUrl: (name, city) => `https://www.burpple.com/search?q=${enc(join([name, city]))}`,
  },
  'foodpanda': {
    label: 'Foodpanda',
    description: 'שירות משלוחים אסיאתי — דירוגי לקוחות גדולים ומשקפים מקומיים.',
    homepage: 'https://www.foodpanda.com',
    searchUrl: (name, city) => `https://www.foodpanda.com/search?q=${enc(join([name, city]))}`,
  },
};

/**
 * Look up a source entry by the freeform label the AI returned. Tolerates
 * "Michelin", "Michelin Guide", "MICHELIN BIB GOURMAND", etc. Returns null if
 * no match — caller should fall back to the generic Google search link.
 */
export function findSource(rawLabel: string): SourceEntry | null {
  if (!rawLabel) return null;
  const normalized = rawLabel.toLowerCase().trim();
  if (ENTRIES[normalized]) return ENTRIES[normalized];
  for (const key of Object.keys(ENTRIES)) {
    if (normalized.includes(key) || key.includes(normalized)) return ENTRIES[key];
  }
  // "Bib Gourmand" → Michelin Guide
  if (normalized.includes('bib') || normalized.includes('michelin')) return ENTRIES['michelin guide'];
  return null;
}

/**
 * Generic Google search fallback for sources we don't recognise.
 */
export function googleSearchFor(name: string, city?: string): string {
  return `https://www.google.com/search?q=${enc(join([name, city, 'review']))}`;
}
