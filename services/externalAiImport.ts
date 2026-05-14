/**
 * External AI import — lets the user enrich a trip with restaurants/attractions
 * by copy-pasting through Gemini / ChatGPT / Claude.ai web. No paid API call
 * from our side: the user runs the prompt themselves, pastes the JSON back.
 *
 * Pairs with `VITE_PLACES_DISABLED=true` (no runtime Places API) — this is the
 * path users without Claude Code use to grow their trip's place catalog.
 */

import type { Trip, Restaurant, Attraction, RestaurantCategory, AttractionCategory } from '../types';

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

export function buildExternalAiPrompt(
  destination: string,
  kind: Kind,
  existingNames: string[] = []
): string {
  const isAttr = kind === 'attractions';
  const categories = isAttr ? ATTRACTION_CATEGORIES : RESTAURANT_CATEGORIES;
  const entityWord = isAttr ? 'attractions' : 'restaurants';
  const entityWordHebrew = isAttr ? 'אטרקציות' : 'מסעדות';
  const excludeBlock = existingNames.length
    ? `\nEXCLUDE these places already in the trip — do NOT return any of them:\n${existingNames.slice(0, 80).map(n => `- ${n}`).join('\n')}\n`
    : '';

  return `You are a travel research assistant. Find the best, currently-operating ${entityWord} in "${destination}" using web search.

QUOTA: return 12–20 ${entityWord} total, spread across the categories below. Aim for at least 1–2 picks per category that actually fits the destination. Empty categories are fine if the destination genuinely has none.

CATEGORIES (use EXACTLY these Hebrew titles in the "title" field):
${categories.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

QUALITY BAR — pull picks from authoritative sources, not random blogs:
${isAttr
  ? '- Lonely Planet, Time Out, Atlas Obscura, UNESCO, TripAdvisor Travelers\' Choice, the country\'s official tourism authority, Klook/Viator/GetYourGuide top-rated experiences.'
  : '- Asia\'s 50 Best / World\'s 50 Best Restaurants, Michelin Guide (Stars + Bib Gourmand), Time Out, The Infatuation, Eater, local platforms (Wongnai/Tabelog/TheFork/Yelp), named food creators (Mark Wiens etc.). NO global chains (McDonald\'s, Starbucks, etc.).'}

NAME INTEGRITY: "name" / "nameEnglish" must be the venue display name — never a street address, never "Moo X", never coordinates. Omit any place you can't find a real venue name for.

"recommendationSource" must be the specific list/voice (e.g. "Asia's 50 Best 2025 #13", "Lonely Planet 2025", "Atlas Obscura — Hidden Gems", "Time Out Bangkok 2025"). Generic "Top-Rated" / "Local Favorite" is a quality failure.

"googleMapsUrl" — paste the real Google Maps URL you find via search. Omit if you can't find one. NEVER fabricate.

"lat" / "lng" — approximate decimal coordinates from Google Maps. Omit if unsure.

DESCRIPTIONS IN HEBREW (1–2 short sentences each, traveler-facing).
${excludeBlock}
OUTPUT JSON ONLY — no prose, no markdown fences, no explanations. EXACTLY this shape:

{
  "kind": "${kind}",
  "categories": [
    {
      "title": "<one of the Hebrew titles above>",
      "${entityWord}": [
        {
          "name": "<Hebrew or local-language venue name>",
          "nameEnglish": "<Latin-script venue name>",
          "description": "<Hebrew, 1–2 sentences>",
          "location": "<full address>",
          "lat": <number>,
          "lng": <number>,
          "googleMapsUrl": "<URL>",
          "recommendationSource": "<specific source>",
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

Return ONE valid JSON object. Nothing else. No \`\`\`json fences. ${entityWordHebrew} only.`;
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

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export interface ParsedExternalAiPayload {
  kind: Kind;
  categories: Array<RestaurantCategory | AttractionCategory>;
  total: number;
}

export function parseExternalAiResponse(raw: string, expectedKind: Kind): ParsedExternalAiPayload {
  const stripped = stripCodeFences(raw);
  let data: any;
  try {
    data = JSON.parse(stripped);
  } catch {
    // Try to recover: find first {...} block
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('לא הצלחתי לזהות JSON תקין בתשובה. ודא שהדבקת רק את ה-JSON.');
    try { data = JSON.parse(m[0]); }
    catch { throw new Error('ה-JSON שהודבק לא תקין. בדוק שאין פסיקים חסרים או מירכאות שבורות.'); }
  }

  if (!data || typeof data !== 'object') throw new Error('התשובה לא במבנה צפוי.');
  if (data.kind && data.kind !== expectedKind) {
    throw new Error(`ה-JSON הוא של ${data.kind} אבל ביקשת ${expectedKind}.`);
  }
  if (!Array.isArray(data.categories)) throw new Error('שדה "categories" חסר או לא מערך.');

  const isAttr = expectedKind === 'attractions';
  const itemKey = isAttr ? 'attractions' : 'restaurants';

  const cats = data.categories.map((c: any): RestaurantCategory | AttractionCategory => {
    const title = String(c?.title ?? '').trim() || 'כללי';
    const rawItems = Array.isArray(c?.[itemKey]) ? c[itemKey] : [];
    const items = rawItems
      .filter((it: any) => it && typeof it.name === 'string' && it.name.trim())
      .map((it: any): Restaurant | Attraction => ({
        id: newId(isAttr ? 'attr' : 'rest'),
        name: String(it.name).trim(),
        nameEnglish: it.nameEnglish ? String(it.nameEnglish).trim() : undefined,
        description: it.description ? String(it.description) : '',
        location: it.location ? String(it.location) : '',
        lat: typeof it.lat === 'number' ? it.lat : undefined,
        lng: typeof it.lng === 'number' ? it.lng : undefined,
        googleMapsUrl: it.googleMapsUrl ? String(it.googleMapsUrl) : undefined,
        recommendationSource: it.recommendationSource ? String(it.recommendationSource) : undefined,
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
      })) as any[];

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

  return { kind: expectedKind, categories: cats, total };
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
