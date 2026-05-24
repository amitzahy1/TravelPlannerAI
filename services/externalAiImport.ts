/**
 * External AI import — lets the user enrich a trip with restaurants/attractions
 * by copy-pasting through Gemini / ChatGPT / Claude.ai web. No paid API call
 * from our side: the user runs the prompt themselves, pastes the JSON back.
 *
 * Pairs with `VITE_PLACES_DISABLED=true` (no runtime Places API) — this is the
 * path users without Claude Code use to grow their trip's place catalog.
 */

import type { Trip, Restaurant, Attraction, RestaurantCategory, AttractionCategory } from '../types';
import { parseJsonLenient } from './jsonSanitizer';

export type Kind = 'attractions' | 'restaurants';

const ATTRACTION_CATEGORIES = [
  'אתרי חובה', 'טבע ונופים', 'מוזיאונים ותרבות', 'קניות ושווקים',
  'אקסטרים ופעילויות', 'חופים ומים', 'למשפחות וילדים',
  'היסטוריה ודת', 'חיי לילה ואווירה', 'פינות נסתרות',
];

const RESTAURANT_CATEGORIES = [
  'יוקרה ומישלן', 'מנות חובה מקומיות', 'אוכל רחוב ושווקים',
  'בתי קפה ובוקר', 'בארים וקוקטיילים', 'משפחתי', 'ים ופירות ים', 'צמחוני וטבעוני',
];

/**
 * Split a destination string like "בנגקוק - פטאיה - קו צ'אנג" into individual
 * cities. Handles common separators (dash, comma, slash, " - ", " ו ", " & ").
 */
function splitDestinationCities(destination: string): string[] {
  return destination
    .split(/\s*[-–—,/&]\s*|\s+ו\s+|\s+and\s+/i)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s.length <= 40);
}

export function buildExternalAiPrompt(
  destination: string,
  kind: Kind,
  existingNames: string[] = [],
  /** Optional category scope. When provided, the prompt asks for ONLY this
   *  category (e.g. "Burgers"), single-bucket return shape, with a tighter
   *  quota (10–15 picks). Use this for the per-category refresh flow where
   *  the user already knows which type of place they want. */
  scopeCategory?: string,
): string {
  const isAttr = kind === 'attractions';
  const categories = isAttr ? ATTRACTION_CATEGORIES : RESTAURANT_CATEGORIES;
  const entityWord = isAttr ? 'attractions' : 'restaurants';
  const entityWordHebrew = isAttr ? 'אטרקציות' : 'מסעדות';

  const cities = splitDestinationCities(destination);
  const isMultiCity = cities.length > 1;
  // Single-category mode uses a tighter quota — the user is asking for one
  // specific type, not the full catalogue. 10–15 high-quality picks beats
  // 30 generic ones.
  const targetMin = scopeCategory
    ? 10
    : isMultiCity ? Math.max(18, cities.length * 6) : 18;
  const targetMax = scopeCategory
    ? 15
    : isMultiCity ? Math.max(30, cities.length * 10) : 30;

  const categoryScopeBlock = scopeCategory
    ? `
═══ CATEGORY SCOPE — STRICT ═══
This prompt is scoped to ONE category: "${scopeCategory}".
Return picks for THIS category ONLY. Use the categoryTitle field with
EXACTLY this string. Do not include other categories. If you can't find
${targetMin} solid picks specifically for this category, return what you
have — half-fitting items diluted to fill the quota are a quality failure.
═══════════════════════════════════════════════════════════════════════════════
`
    : '';

  const cityCoverageBlock = isMultiCity
    ? `
═══ MULTI-CITY COVERAGE — CRITICAL ═══
The destination is ${cities.length} cities: ${cities.map(c => `"${c}"`).join(', ')}.
For EACH of these cities, return AT LEAST 5–8 picks across categories. A
result that has 12 picks in one city and 2 in another is a FAILURE. Use
the "location" field to anchor each entry to the correct city.
═══════════════════════════════════════════════════════════════════════════════
`
    : '';

  const excludeBlock = existingNames.length
    ? `
═══ EXCLUSION LIST — ${existingNames.length} PLACES ALREADY IN THE TRIP ═══
DO NOT return any of these — the user already has them:
${existingNames.slice(0, 120).map(n => `- ${n}`).join('\n')}

This list is intentionally long. It means you must DIG DEEPER — find
lesser-known venues, neighborhood favorites, weekend-only stalls, niche
museums, off-the-beaten-path spots. DO NOT respond with "the obvious picks
are excluded so I returned few" — that is a failure. Search the local
language press, Reddit threads, food creators' YouTube/Instagram, recent
articles (last 18 months), and trip-report blogs to surface fresh picks.
═══════════════════════════════════════════════════════════════════════════════
`
    : '';

  return `You are a travel research assistant. Find the best, currently-operating ${entityWord} in "${destination}" using web search.

═══ QUOTA — HARD MINIMUM ═══
Return ${targetMin}–${targetMax} ${entityWord} total. Aim for 3–5 picks per
category that fits the destination. Returning fewer than ${targetMin} is a
quality failure unless the destination genuinely has no more candidates.
Empty categories are OK only when the destination has none for them
(e.g. "חופים ומים" for an inland city).
═══════════════════════════════════════════════════════════════════════════════
${cityCoverageBlock}${categoryScopeBlock}
CATEGORIES (use EXACTLY these Hebrew titles in the "title" field):
${scopeCategory ? `Only one: "${scopeCategory}"` : categories.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

═══ QUALITY BAR — pull picks from authoritative sources, not random blogs ═══
${isAttr
  ? '- Lonely Planet, Time Out, Atlas Obscura, UNESCO, TripAdvisor Travelers\' Choice, the country\'s official tourism authority (e.g. TAT for Thailand), Klook/Viator/GetYourGuide top-rated experiences, Nat Geo "Best of the World", Conde Nast Hot List.'
  : '- Asia\'s 50 Best / World\'s 50 Best Restaurants, Michelin Guide (Stars + Bib Gourmand), Time Out, The Infatuation, Eater, local platforms (Wongnai/Tabelog/TheFork/Yelp/OpenRice), named food creators (Mark Wiens etc.). NO global chains (McDonald\'s, Starbucks, KFC, Pizza Hut, etc.).'}

═══ SEARCH IN THE LOCAL LANGUAGE TOO ═══
The best local picks DO NOT appear in English-only search. For Thailand,
search in Thai. For Japan, in Japanese. For Korea, in Korean. The top
${isAttr ? 'TripAdvisor / Klook' : 'Wongnai / Tabelog'} listings are
usually in the local language — find them and translate the venue name.

NAME INTEGRITY: "name" / "nameEnglish" must be the venue display name —
never a street address, never "Moo X", never coordinates. Omit any place
you can't find a real venue name for.

"recommendationSource" must be the specific list/voice (e.g.
"Asia's 50 Best 2025 #13", "Lonely Planet 2025", "Atlas Obscura — Hidden Gems",
"Time Out Bangkok 2025"). Generic "Top-Rated" / "Local Favorite" is a
quality failure. NEVER invent a list name — if the place is genuinely
recommended but you can't find a specific list, write "Recommended on
TripAdvisor" or "Featured by [outlet name]" honestly.

"googleMapsUrl" — paste the real Google Maps URL you find via search. Omit
if you can't find one. NEVER fabricate.

⚠️ URL FORMAT — CRITICAL: URLs must be RAW JSON strings. NEVER wrap them
in Markdown link syntax. WRONG: \`"[https://maps.google.com/x](https://maps.google.com/x)"\`.
RIGHT: \`"https://maps.google.com/x"\`. The output is parsed as strict JSON.

"lat" / "lng" — approximate decimal coordinates from Google Maps. Omit if unsure.

DESCRIPTIONS IN HEBREW (1–2 short sentences each, traveler-facing). Be
specific — say WHY this place is worth visiting (the unusual exhibit, the
sunset angle, the signature dish) — not generic "great place to visit".
${excludeBlock}
═══ STRING ESCAPING — STRICT ═══
Output is parsed by \`JSON.parse\` (no leniency). Two corruptions we keep seeing:

1. LITERAL NEWLINES inside string values — FORBIDDEN. Every string MUST be on
   ONE LINE. No raw newlines/tabs inside quotes.
   WRONG:  "description": "שורה אחת.
   שורה שנייה."
   RIGHT:  "description": "שורה אחת. שורה שנייה."

2. UNESCAPED DOUBLE QUOTES inside strings — FORBIDDEN. Hebrew acronyms with
   gershayim (להט"ב, צה"ל, ארה"ב) break the JSON. Use the Hebrew gershayim
   \`״\` (U+05F4) instead: \`להט״ב\`, \`צה״ל\`, \`ארה״ב\` (or escape: \`להט\\"ב\`).

If any string value would contain a raw newline or an unescaped \`"\` —
rewrite it before sending.

═══ OUTPUT — JSON ONLY ═══
No prose, no markdown fences, no explanations, no leading/trailing text.

The importer accepts EITHER of two shapes — pick whichever is easier
for you to produce. Both are merged identically into the user's trip:

SHAPE A (PREFERRED — categorized): one object per Hebrew category.
{
  "kind": "${kind}",
  "categories": [
    {
      "title": "<one of the Hebrew titles above>",
      "${entityWord}": [
        {
          "name": "<Hebrew or local-language venue name>",
          "nameEnglish": "<Latin-script venue name>",
          "description": "<Hebrew, 1–2 sentences, specific not generic>",
          "location": "<full address INCLUDING the city name>",
          "lat": <number>,
          "lng": <number>,
          "googleMapsUrl": "<raw URL string — NO [text](url) markdown>",
          "recommendationSource": "<specific source, never invented>",
          "rating": <number 1–5, from Google Maps>,
          "reviewCount": <integer, from Google Maps>${isAttr
            ? `,
          "price": "<display string, e.g. '500 THB' or 'Free'>",
          "type": "<short English type, e.g. 'Buddhist Temple', 'Night Market', 'Beach'>"`
            : `,
          "cuisine": "<short Hebrew cuisine label, e.g. 'תאי', 'איטלקי'>",
          "cuisineTags": ["<lowercase-english>", "..."],
          "isHotelRestaurant": <boolean>`}
        }
      ]
    }
  ]
}

SHAPE B (FALLBACK — flat list): if categories are awkward, just
return a flat array. Each item should still set "categoryTitle" to
one of the Hebrew categories above so the importer can group it.
{
  "${entityWord}": [
    {
      "name": "...", "nameEnglish": "...", "description": "...",
      "location": "...", "lat": <num>, "lng": <num>,
      "googleMapsUrl": "...", "recommendationSource": "...",
      "rating": <num>, "reviewCount": <int>,
      "categoryTitle": "<one of the Hebrew titles above>"${isAttr
        ? `,
      "price": "...", "type": "..."`
        : `,
      "cuisine": "...", "cuisineTags": ["..."], "isHotelRestaurant": <bool>`}
    }
  ]
}

Return ONE valid JSON object. Nothing else. No \`\`\`json fences. ${entityWordHebrew} only.
Whichever shape you pick, the importer will sync it back into the website
correctly — same fields, same merge logic, same display.`;
}

// ---------------------------------------------------------------------------
// Parse + merge
// ---------------------------------------------------------------------------

function stripCodeFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }
  return s.trim();
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();

/**
 * Clean a URL field — Gemini often wraps URLs in Markdown link syntax
 * `[https://x](https://x)` even when told not to. Strip the wrapper and
 * keep just the URL. If the value is already plain, return as-is.
 * Returns undefined for falsy / clearly invalid inputs.
 */
function cleanUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  let s = raw.trim();
  if (!s) return undefined;
  // [url](url) → url   (also handles [text](url) by preferring the parenthesized URL)
  const mdMatch = s.match(/^\[(.*?)\]\((.+?)\)$/);
  if (mdMatch) s = mdMatch[2].trim();
  // Strip leading/trailing brackets, quotes, whitespace
  s = s.replace(/^[\s<\["']+|[\s>\]"']+$/g, '');
  // Must start with http(s):
  if (!/^https?:\/\//i.test(s)) return undefined;
  return s;
}

/**
 * Catch sources that look fabricated. Returns a non-null reason string when
 * the source is suspicious, null when it looks legitimate.
 */
function flagSuspectSource(source: string): string | null {
  if (!source) return null;
  const s = source.toLowerCase();
  // Generic / lazy
  if (/^(top[- ]rated|local favorite|popular|highly recommended|recommended)$/i.test(source.trim())) {
    return 'מקור גנרי';
  }
  // Made-up "Asia's Top X — Y" patterns where Y is an unrelated source
  if (/asia['']s top [a-z ]+ — tripadvisor/i.test(s)) return 'רשימה לא קיימת — TripAdvisor אין כותרת כזו';
  if (/world['']s top [a-z ]+ — (tripadvisor|google)/i.test(s)) return 'רשימה לא קיימת';
  // UNESCO Tentative List — real but easy to invent; flag for review
  if (/unesco tentative/i.test(s)) return 'UNESCO Tentative — אמת ידנית';
  return null;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export interface ParsedExternalAiPayload {
  kind: Kind;
  categories: Array<RestaurantCategory | AttractionCategory>;
  total: number;
  warnings: string[];
}

export function parseExternalAiResponse(raw: string, expectedKind: Kind): ParsedExternalAiPayload {
  const stripped = stripCodeFences(raw);
  let data: any;
  // Lenient parse: strict first, then auto-sanitize control chars / unescaped
  // quotes (the two common LLM corruption patterns) before giving up. Avoids
  // forcing the user to re-paste when the LLM emitted a literal \n inside a
  // string value.
  try {
    data = parseJsonLenient<any>(stripped).value;
  } catch {
    // Try to recover: find first {...} block, retry lenient.
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('לא הצלחתי לזהות JSON תקין בתשובה. ודא שהדבקת רק את ה-JSON.');
    try { data = parseJsonLenient<any>(m[0]).value; }
    catch (err: any) {
      throw new Error(`ה-JSON שהודבק לא תקין. ${err?.message?.slice(0, 100) || 'בדוק שאין פסיקים חסרים או מירכאות שבורות.'}`);
    }
  }

  if (!data || typeof data !== 'object') throw new Error('התשובה לא במבנה צפוי.');

  // Accept BOTH supported shapes:
  //   "Quick" : { kind, categories: [{title, restaurants|attractions: []}] }
  //   "Deep"  : { restaurants: [...], attractions: [...] }   (flat — used by
  //             Deep Research prompts that don't bother with categories)
  // When we see Deep shape, synthesize a single Quick-shape category named
  // "המלצות AI" so the rest of the merger doesn't care which prompt format
  // the user used. Fixes the "שדה categories חסר" error the user hit when
  // pasting a Deep-shape response into the external-AI modal (2026-05-21).
  if (!Array.isArray(data.categories)) {
    const deepItems = (expectedKind === 'attractions' ? data.attractions : data.restaurants);
    if (Array.isArray(deepItems) && deepItems.length > 0) {
      // Wrap the flat array into a single "המלצות AI" category. Items can
      // still carry their own `categoryTitle` field — downstream code reads
      // that first and the wrapper only acts as a fallback bucket.
      const itemKeyForDeep = expectedKind === 'attractions' ? 'attractions' : 'restaurants';
      data = {
        kind: expectedKind,
        categories: [{ title: 'המלצות AI', [itemKeyForDeep]: deepItems }],
      };
    } else {
      throw new Error('ה-JSON שהודבק לא מכיל "categories" וגם לא "restaurants"/"attractions". בדוק שהדבקת את התשובה המלאה מה-AI.');
    }
  }

  if (data.kind && data.kind !== expectedKind) {
    throw new Error(`ה-JSON הוא של ${data.kind} אבל ביקשת ${expectedKind}.`);
  }

  const isAttr = expectedKind === 'attractions';
  const itemKey = isAttr ? 'attractions' : 'restaurants';

  const warnings: string[] = [];
  const suspectSources = new Set<string>();
  let mdUrlCount = 0;

  const cats = data.categories.map((c: any): RestaurantCategory | AttractionCategory => {
    const title = String(c?.title ?? '').trim() || 'כללי';
    const rawItems = Array.isArray(c?.[itemKey]) ? c[itemKey] : [];
    const items = rawItems
      .filter((it: any) => it && typeof it.name === 'string' && it.name.trim())
      .map((it: any): Restaurant | Attraction => {
        // Clean URL — Gemini wraps in [url](url) markdown despite the prompt.
        const rawUrl = it.googleMapsUrl;
        const cleanedUrl = cleanUrl(rawUrl);
        if (typeof rawUrl === 'string' && rawUrl !== cleanedUrl && /\]\(/.test(rawUrl)) {
          mdUrlCount++;
        }

        // Source-quality watchdog
        const source = it.recommendationSource ? String(it.recommendationSource).trim() : '';
        if (source) {
          const reason = flagSuspectSource(source);
          if (reason) suspectSources.add(`${it.name} — "${source}" (${reason})`);
        }

        return {
          id: newId(isAttr ? 'attr' : 'rest'),
          name: String(it.name).trim(),
          nameEnglish: it.nameEnglish ? String(it.nameEnglish).trim() : undefined,
          description: it.description ? String(it.description) : '',
          location: it.location ? String(it.location) : '',
          lat: typeof it.lat === 'number' ? it.lat : undefined,
          lng: typeof it.lng === 'number' ? it.lng : undefined,
          googleMapsUrl: cleanedUrl,
          recommendationSource: source || undefined,
          categoryTitle: title,
          rating: typeof it.rating === 'number' ? it.rating : undefined,
          reviewCount: typeof it.reviewCount === 'number' ? it.reviewCount : undefined,
          ...(isAttr
            ? {
                price: it.price ? String(it.price) : undefined,
                type: it.type ? String(it.type) : undefined,
              }
            : {
                cuisine: it.cuisine ? String(it.cuisine) : undefined,
                cuisineTags: Array.isArray(it.cuisineTags) ? it.cuisineTags.map(String) : undefined,
                isHotelRestaurant: !!it.isHotelRestaurant,
              }),
        };
      }) as any[];

    return {
      id: newId('cat'),
      title,
      ...(isAttr ? { attractions: items } : { restaurants: items, region: '' }),
    } as RestaurantCategory | AttractionCategory;
  });

  const total = cats.reduce(
    (sum, c: any) => sum + (isAttr ? c.attractions.length : c.restaurants.length),
    0,
  );

  if (total === 0) throw new Error('לא נמצאו פריטים תקפים ב-JSON.');

  // Surface quality warnings — the caller (UI) decides whether to show them.
  if (mdUrlCount > 0) {
    warnings.push(`${mdUrlCount} כתובות URL היו עטופות ב-markdown — נוקו אוטומטית.`);
  }
  if (total < 15) {
    warnings.push(`התוצאה דלה — ${total} פריטים בלבד. שקול להריץ שוב או לבקש מ-AI להעמיק.`);
  }
  if (suspectSources.size > 0) {
    const sample = Array.from(suspectSources).slice(0, 3).join('; ');
    warnings.push(`מקורות חשודים (יתכן והומצאו): ${sample}${suspectSources.size > 3 ? '…' : ''}`);
  }

  return { kind: expectedKind, categories: cats, total, warnings };
}

/**
 * Merge parsed external-AI categories into trip.aiAttractions / aiRestaurants.
 * Dedups by normalized name within the matching category title.
 */
export function mergeExternalAiIntoTrip(trip: Trip, parsed: ParsedExternalAiPayload): Trip {
  const isAttr = parsed.kind === 'attractions';
  const existing = (isAttr ? trip.aiAttractions : trip.aiRestaurants) ?? [];

  // Build a lookup by category-title → existing category, plus a name-set per category.
  const byTitle = new Map<string, RestaurantCategory | AttractionCategory>();
  for (const c of existing as any[]) byTitle.set(c.title, c);

  // Also a global name set to skip cross-category duplicates.
  const allNames = new Set<string>();
  for (const c of existing as any[]) {
    const arr = isAttr ? c.attractions : c.restaurants;
    for (const it of arr) allNames.add(normalize(it.name || ''));
  }

  const merged: any[] = existing.map((c: any) => ({ ...c }));

  for (const incoming of parsed.categories as any[]) {
    const items = isAttr ? incoming.attractions : incoming.restaurants;
    const fresh = items.filter((it: any) => !allNames.has(normalize(it.name)));
    fresh.forEach((it: any) => allNames.add(normalize(it.name)));
    if (fresh.length === 0) continue;

    const existingCat = byTitle.get(incoming.title);
    if (existingCat) {
      // Append into existing category in place.
      const idx = merged.findIndex((c: any) => c.id === existingCat.id);
      if (idx >= 0) {
        const target = isAttr ? 'attractions' : 'restaurants';
        merged[idx] = {
          ...merged[idx],
          [target]: [...(merged[idx][target] as any[]), ...fresh],
        };
      }
    } else {
      // Add as new category.
      merged.push({
        ...incoming,
        ...(isAttr ? { attractions: fresh } : { restaurants: fresh, region: incoming.region ?? '' }),
      });
      byTitle.set(incoming.title, incoming);
    }
  }

  return isAttr
    ? { ...trip, aiAttractions: merged as AttractionCategory[] }
    : { ...trip, aiRestaurants: merged as RestaurantCategory[] };
}

/**
 * Returns names of existing aiAttractions / aiRestaurants so the prompt can ask
 * the external AI to skip them. Capped to a sensible length so the prompt stays
 * readable.
 */
export function existingPlaceNames(trip: Trip, kind: Kind): string[] {
  const cats = (kind === 'attractions' ? trip.aiAttractions : trip.aiRestaurants) ?? [];
  const names: string[] = [];
  for (const c of cats as any[]) {
    const arr = kind === 'attractions' ? c.attractions : c.restaurants;
    for (const it of arr) {
      if (it?.nameEnglish) names.push(it.nameEnglish);
      else if (it?.name) names.push(it.name);
    }
  }
  return names;
}
