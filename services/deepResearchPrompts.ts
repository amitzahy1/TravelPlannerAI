import type { Trip } from '../types';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parseLooseDate = (raw?: string): Date | null => {
  if (!raw) return null;
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const fallback = new Date(t);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const formatDateHuman = (d: Date): string => `${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const splitDateRange = (dates?: string): { from?: Date; to?: Date; raw?: string } => {
  if (!dates) return {};
  const m = dates.match(/^\s*(.+?)\s*(?:–|—|to|עד|\-\s|\s\-)\s*(.+?)\s*$/);
  if (!m) return { raw: dates };
  return { from: parseLooseDate(m[1]) ?? undefined, to: parseLooseDate(m[2]) ?? undefined, raw: dates };
};

const nightsBetween = (a?: Date, b?: Date): number | null => {
  if (!a || !b) return null;
  const days = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
};

const cleanAddress = (name: string, address?: string): string => {
  if (!address) return '';
  const lcAddr = address.toLowerCase().trim();
  const lcName = name.toLowerCase().trim();
  if (lcAddr.startsWith(lcName)) {
    const rest = address.slice(name.length).replace(/^[\s,–—-]+/, '').trim();
    return rest || address;
  }
  return address;
};

// Canonical Hebrew categories used elsewhere in the app. The Deep Research
// model should aim to populate as many of these as the destination supports,
// and may add new ones for clearly distinct local clusters.
const CANONICAL_RESTAURANT_CATEGORIES_HE = [
  'אוכל מקומי אותנטי',
  'יוקרה ומישלן',
  'ברי קוקטיילים',
  'מסעדות משפחתיות',
  'ראמן',
  'פיצה',
  'המבורגר',
  'בתי קפה וקינוחים',
  'תאילנדי',
  'יפני',
];
const CANONICAL_ATTRACTION_CATEGORIES_HE = [
  'אתרי חובה',
  'טבע ונופים',
  'מוזיאונים ותרבות',
  'קניות ושווקים',
  'אקסטרים ופעילויות',
  'חופים ומים',
  'למשפחות וילדים',
  'היסטוריה ודת',
  'חיי לילה ואווירה',
  'פינות נסתרות',
];

interface SharedContext {
  dateLine: string;
  nights: number | null;
  destination: string;
  travelers: string;
  cities: string[];
  hotelsBlock: string;
  hasKids: boolean;
}

export interface DeepResearchPromptOptions {
  /** When set, scope the prompt to ONLY this one city (filters hotels +
   *  collapses the volume target so the model can hit 10 per category). */
  city?: string;
}

const getTripCityList = (trip: Trip): string[] => {
  const hotels = (trip.hotels || []).filter(h => h.name);
  const cityKey = (h: any): string => {
    if (h.region) return h.region;
    if (h.address) {
      const parts = h.address.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length >= 2) return parts[parts.length - 2];
    }
    return trip.destination || 'Destination';
  };
  const set = new Set<string>();
  for (const h of hotels) set.add(cityKey(h));
  if (set.size > 0) return Array.from(set);
  if (trip.destination) return trip.destination.split(/[-–,]+/).map(s => s.trim()).filter(Boolean);
  return [];
};

export const getDeepResearchCities = (trip: Trip): string[] => getTripCityList(trip);

const buildSharedContext = (trip: Trip, opts?: DeepResearchPromptOptions): SharedContext => {
  const { from, to, raw } = splitDateRange(trip.dates);
  const dateLine = (from && to) ? `${formatDateHuman(from)} – ${formatDateHuman(to)}` : (raw || 'unspecified');
  const nights = nightsBetween(from, to) ?? trip.days ?? null;

  const t = trip.travelers;
  let travelers = 'one or more adult travelers (composition not specified)';
  let hasKids = false;
  if (t) {
    const parts: string[] = [];
    if (t.adults) parts.push(`${t.adults} adult${t.adults > 1 ? 's' : ''}`);
    if (t.children) { parts.push(`${t.children} child${t.children > 1 ? 'ren' : ''}`); hasKids = true; }
    if (t.babies) { parts.push(`${t.babies} bab${t.babies > 1 ? 'ies' : 'y'}`); hasKids = true; }
    if (parts.length) travelers = parts.join(', ');
  } else if (trip.groupType === 'family') {
    travelers = 'family';
    hasKids = true;
  }

  const hotels = (trip.hotels || []).filter(h => h.name);
  const cityKey = (h: any): string => {
    if (h.region) return h.region;
    if (h.address) {
      const parts = h.address.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (parts.length >= 2) return parts[parts.length - 2];
    }
    return trip.destination || 'Destination';
  };
  const hotelsByCity = new Map<string, typeof hotels>();
  for (const h of hotels) {
    const k = cityKey(h);
    if (!hotelsByCity.has(k)) hotelsByCity.set(k, []);
    hotelsByCity.get(k)!.push(h);
  }

  // Scope to a single city if requested.
  const cityFilter = opts?.city?.trim();
  let cityList = Array.from(hotelsByCity.keys());
  let scopedEntries = Array.from(hotelsByCity.entries());
  if (cityFilter) {
    const lc = cityFilter.toLowerCase();
    scopedEntries = scopedEntries.filter(([city]) => city.toLowerCase() === lc);
    cityList = scopedEntries.map(([c]) => c);
    if (cityList.length === 0) {
      // The selected city has no hotels — still scope the destination to it.
      cityList = [cityFilter];
      scopedEntries = [[cityFilter, []]];
    }
  }

  const formatHotel = (h: any): string => {
    const cleanedAddr = cleanAddress(h.name, h.address);
    const coords = (h.lat && h.lng) ? ` (${h.lat.toFixed(4)}, ${h.lng.toFixed(4)})` : '';
    const dates = (h.checkInDate && h.checkOutDate) ? `, stay ${h.checkInDate}→${h.checkOutDate}` : '';
    return `   • ${h.name}${cleanedAddr ? ` — ${cleanedAddr}` : ''}${coords}${dates}`;
  };
  const hotelsBlock = scopedEntries
    .map(([city, list]) => `- ${city}\n${list.length ? list.map(formatHotel).join('\n') : '   (no hotel booked yet — research the city itself)'}`)
    .join('\n');

  // "destination" in the prompt = the comma-joined list the AI uses for "Cities to cover".
  // Prefer the actual cityList (derived from hotel cities) over trip.destination,
  // because trip.destination is often just the country (e.g. "אלבניה"). When the
  // country-only string lands in "Cities to cover", the AI scatters picks across
  // the whole country instead of focusing on the cities the user is actually in.
  // Trip.destination is kept as a fallback for trips that haven't booked hotels yet.
  const destination = cityFilter
    ? cityFilter
    : (cityList.length > 0
        ? (cityList.length === 1 && trip.destination && trip.destination !== cityList[0]
            ? `${cityList[0]} (in ${trip.destination})`
            : cityList.join(', '))
        : (trip.destination || 'unknown'));

  return {
    dateLine,
    nights,
    destination,
    travelers,
    cities: cityList,
    hotelsBlock: hotelsBlock || '   (no hotels yet)',
    hasKids,
  };
};

// ===========================================================================
// 🍽  RESTAURANTS PROMPT
// ===========================================================================

export const buildDeepRestaurantPrompt = (trip: Trip, opts?: DeepResearchPromptOptions): string => {
  const ctx = buildSharedContext(trip, opts);
  const existing = (trip.aiRestaurants || []).map(c => c.title).filter(Boolean);
  const categoriesToTarget = existing.length ? existing : CANONICAL_RESTAURANT_CATEGORIES_HE;
  const categoriesList = categoriesToTarget.map((c, i) => `   ${i + 1}. "${c}"`).join('\n');
  const cityCount = ctx.cities.length || 1;
  const isSingleCity = !!opts?.city;

  return `MISSION
You are building a curated, deeply-researched RESTAURANT GUIDE for a real
multi-city trip. The output goes directly into a travel-planner app where
the user will browse restaurants by Hebrew category, pick favorites for
each day, and walk to them from their hotels. Your job is to produce the
richest, most accurate, most useful restaurant list a trip planner could
ask for — organized by category, with enough detail per entry that the
user never needs to open another tab to decide where to eat.

ROLE
You are a senior food critic and restaurant researcher with deep web
access (Google Maps, Time Out, Eater, Michelin Guide, Atlas Obscura,
local Hebrew/English food blogs, Reddit r/<city>, Wongnai/Tabelog/OpenRice).
Think like a local resident who happens to be a great editor.

═══════════════════════════════════════════════════════════════════════════════
WHAT "GREAT OUTPUT" LOOKS LIKE
═══════════════════════════════════════════════════════════════════════════════
✓ EVERY category gets AT LEAST 10 strong picks (HARD MINIMUM — see below).
✓ Mix of price points within each category (some $, some $$$).
✓ Mix of iconic must-eats AND insider/local hidden gems.
✓ Every entry verified currently OPERATIONAL (not closed, not under year-long
  renovation, last reviews ≤ 6 months old).
✓ Real Google Maps URLs, real ratings, real coordinates — never fabricated.
✓ Hebrew descriptions that tell the user WHY this place is worth a visit
  (not generic "great food" — specific: "the larb has more chili than rice").

═══════════════════════════════════════════════════════════════════════════════
TRIP DETAILS
═══════════════════════════════════════════════════════════════════════════════
Cities to cover: ${ctx.destination}
Dates: ${ctx.dateLine}${ctx.nights ? `  (${ctx.nights} nights)` : ''}
Travelers: ${ctx.travelers}${ctx.hasKids ? '  — favor kid-friendly when relevant' : ''}

Hotels (used to tag the closest hotel per entry — NOT the main organizing axis):
${ctx.hotelsBlock}

═══════════════════════════════════════════════════════════════════════════════
CATEGORIES TO POPULATE  (these are the EXACT Hebrew strings the app uses)
═══════════════════════════════════════════════════════════════════════════════
You MUST attempt to populate every category below for every city in the trip.
Use the strings VERBATIM in the \`categoryTitle\` field — they are matched
character-by-character against the app's existing categories. Do NOT translate,
abbreviate, paraphrase, or punctuate them differently.

${categoriesList}

When to add a NEW category:
  Only when there is a clearly distinct food cluster the canonical 10
  cannot host (e.g. "אוכל איסאן" in northeastern Thailand, "טאפאס"
  in Spain, "שווארמה ופלאפל" in Israel). Add the new Hebrew title (≤ 5
  words) to \`newRestaurantCategories\` AND use it as the \`categoryTitle\`
  on the relevant entries. Don't add a new category just to host overflow
  from an existing one.

When to leave a category empty:
  ONLY when the destination genuinely has nothing for that category — e.g.
  "ראמן" in a small Italian village. Don't leave one empty just because
  searching was hard. If you cannot reach 10 picks in a category that
  clearly EXISTS in this city, you have not searched broadly enough —
  go back to the methodology section and try more sources.

═══════════════════════════════════════════════════════════════════════════════
COVERAGE TARGETS — HARD MINIMUMS
═══════════════════════════════════════════════════════════════════════════════
Per CATEGORY in a city that supports it: AT LEAST 10 picks. Aim for 12–15.
  • If your first pass yields fewer than 10 in a viable category, expand
    your search: include nearby suburbs, lesser-known neighborhoods,
    weekend-only stalls, hotel restaurants with named chefs, food halls,
    rooftops, etc.
  • Returning 4 picks in "אוכל מקומי אותנטי" for Bangkok is a FAILURE.
    Bangkok has hundreds of credible candidates — find 10+.
${isSingleCity
  ? `THIS RUN IS SCOPED TO ONE CITY: "${ctx.destination}".
Total target for this single city: ~100 restaurants (10 categories × 10
picks each). Aim for 120 if the city supports it.`
  : `Per CITY: at least 100 strong restaurant picks across all categories.
Total for ${cityCount}-city trip: ${cityCount * 100}–${cityCount * 120} restaurants.

⚠️ Producing this many entries in ONE run is hard. If you find yourself
falling short, the user can run this prompt once per city — but try to
do it all in this single run first.`}

Within the city/cities, ensure geographic spread — don't dump 30 picks
in one neighborhood and 2 in another. Every entry sets \`nearestHotel\`
to the closest hotel from the list above (straight-line distance).

═══════════════════════════════════════════════════════════════════════════════
RESEARCH METHODOLOGY  — work CITY by CITY, USE EVERYTHING YOU KNOW
═══════════════════════════════════════════════════════════════════════════════
You have FULL CREATIVE FREEDOM in HOW you research. The goal is to find
the most AMAZING restaurants for this trip — not the most algorithmically
average. Cast as wide a net as you can:

  • Editorial guides: Time Out, Eater, Michelin Guide, Bib Gourmand list,
    World's 50 Best, Asia's 50 Best, La Liste, Gault & Millau, Bon Appétit,
    Infatuation, NYT food, Lonely Planet food picks.
  • Regional aggregators: Wongnai (Thailand), Tabelog (Japan), Dianping
    (China), OpenRice (HK/SG/MY), Burpple (SG/MY), Naver Map (Korea),
    The Fork, OpenTable Diners' Choice — but DON'T limit yourself to these.
  • Forums & communities: Reddit r/<city>, r/AskCulinary, local food
    Facebook groups, expat forums, Hebrew travel groups if relevant.
  • Voice of locals & travelers: chef interviews, food podcasts (e.g.
    "The Sporkful", "Off Menu", local equivalents), YouTube food channels
    (Mark Wiens, Best Ever Food Review Show, Strictly Dumpling, Migrationology),
    TikTok food trend videos for the city, hotel concierge "must-eat" lists.
  • Niche / hidden gem signals: places that show up in chef "where I eat
    on my day off" interviews, restaurants mentioned by name in critic
    reviews of OTHER restaurants ("not as good as X across town"),
    long-running street stalls with multi-decade reputations.
  • Google Maps: useful but DON'T let it gate you. A 20-year-old hole in
    the wall with 60 reviews can be better than a 4,000-review tourist trap.
    Use the rating + review count as ONE signal among many, not a filter.

For each candidate restaurant, ALWAYS verify:
  ✓ Currently OPERATIONAL (not "Permanently closed", not >12 months without
    a review or recent press mention).
  ✓ Quality has not collapsed in the last 12 months (skip places where
    recent reviews report decline, chef departure, or new bad management).

═══════════════════════════════════════════════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════════════════════════════════════════════
INCLUDE freely: Michelin starred, Bib Gourmand, hawker legends, omakase
hideouts, market stalls with cult followings, basement izakaya, beach
shacks, supper clubs, chef's tables — whatever is genuinely great.

EXCLUDE global / regional fast chains: McDonald's, KFC, Burger King, Subway,
Pizza Hut, Domino's, Papa John's, Pizza Company, Pizza Marzano, Starbucks,
Costa, Krispy Kreme, Dunkin', Tim Hortons. Better an empty pick than chain padding.

NAME INTEGRITY (CRITICAL): "name" / "nameEnglish" must be the establishment's
display name. NEVER use a street address, "Moo X", "Soi Y", "464/12", or
coordinates as the name. If you only have an address — OMIT the entry.

═══════════════════════════════════════════════════════════════════════════════
SCHEMA — required fields, strict types
═══════════════════════════════════════════════════════════════════════════════
The output is parsed by an automated importer and rendered on a map. If a
required field is missing or the wrong type, the entry is dropped.

REQUIRED on EVERY entry (omit the whole entry if any are missing):
  name              string — LATIN / ENGLISH display name ALWAYS
                              (e.g. "Som Tum Nua", "Wat Pho", "Baan Tepa").
                              NEVER put Hebrew, Thai, Arabic, Chinese or any
                              non-Latin script in this field. The user's UI
                              displays it as the primary label and renders
                              poorly for non-Latin scripts.
  description       string — 2–3 Hebrew sentences, vivid + specific
  location          string — full address: street + district + city + country
  categoryTitle     string — EXACTLY one of the Hebrew categories above
                              (or one of your proposed new categories — same
                              string also listed in newRestaurantCategories)
  recommendationSource  string — verbatim source name ("Michelin Guide",
                              "Time Out Bangkok", "r/Thailand", "Eater")
  AT LEAST ONE OF:
    - lat (number) AND lng (number)  — decimal degrees, e.g. 13.7449
                                       (ALWAYS preferred — needed for the map)
    - googleMapsUrl (string)         — real Google Maps URL only, never fabricated
                                       (the app will geocode this if no lat/lng)

If you can find NEITHER coordinates NOR a real Google Maps URL — OMIT THE ENTRY.
A restaurant we cannot place on the map has zero value to the user.

STRONGLY ENCOURAGED (drives UX quality):
  priceLevel        string enum — "$" | "$$" | "$$$" | "$$$$"
  cuisine           string — single label ("Thai", "Italian", "Japanese")
  must_try_dish     string — THE one signature dish
  googleRating      number 0.0–5.0 (NUMBER not string — write 4.5 not "4.5")
  reviewCount       integer (NUMBER not string)
  nearestHotel      string — hotel name from above this entry is closest to
                              (use straight-line distance from lat/lng)

OPTIONAL (bonus signal):
  priceRange        string — "100–300 THB" / "₪80–150"
  recommendedDishes array of strings, max 5, lowercase English
  vibe              string — short phrase ("street-side, plastic stools")
  bestTime          string enum — "Breakfast" | "Lunch" | "Dinner" | "Late Night"
  reservationRequired  boolean — true only if the source explicitly says so
  michelin          boolean — true only for Michelin star / Bib Gourmand
  tags              array of strings, max 5 short markers ("Spicy", "View",
                              "Romantic", "Family-Friendly", "Iconic")

DATA TYPE RULES (strict):
  • Numbers as numbers, NOT strings: 4.5 ✅  "4.5" ❌
  • Booleans as booleans: true / false ✅  "true" ❌  "yes" ❌
  • Coordinates as decimal degrees, NOT degrees-minutes-seconds.
  • Empty/unknown values: OMIT the field. NEVER write "", null, "N/A",
    "unknown", 0, or "tbd".
  • Arrays: omit the field if empty. NEVER write [].

EXAMPLE OF ONE PERFECT ENTRY (use the SHAPE, not the specifics):
{
  "name": "Som Tum Nua",
  "description": "מסעדת איסאן אגדית ליד אנוסאוואארי-ניצחון, מפורסמת בס'ום-טאם החריף שלה ועוף מטוגן זהוב. תור ארוך אבל זז מהר.",
  "location": "392/14 Siam Square Soi 5, Pathum Wan, Bangkok 10330, Thailand",
  "lat": 13.7449,
  "lng": 100.5346,
  "categoryTitle": "אוכל מקומי אותנטי",
  "recommendationSource": "Michelin Guide (Bib Gourmand)",
  "priceLevel": "$",
  "priceRange": "80–250 THB",
  "cuisine": "Thai (Isaan)",
  "must_try_dish": "Som Tum Thai with crispy chicken",
  "recommendedDishes": ["som tam", "fried chicken", "sticky rice", "larb"],
  "vibe": "Cramped, energetic, no-frills",
  "bestTime": "Lunch",
  "reservationRequired": false,
  "googleRating": 4.5,
  "reviewCount": 14200,
  "michelin": true,
  "tags": ["Spicy", "Iconic", "Local Favorite"],
  "nearestHotel": "Holiday Inn Bangkok",
  "googleMapsUrl": "https://maps.app.goo.gl/..."
}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════════════════════════════
Your reply must be a single, valid JSON object — and NOTHING ELSE.

Specifically forbidden:
  ✗ NO opening prose ("Here is the JSON…", "I researched…", etc.)
  ✗ NO closing prose ("Let me know if you need more…")
  ✗ NO markdown code fences (\`\`\`json … \`\`\` or \`\`\` … \`\`\`)
  ✗ NO markdown headers (## Restaurants, etc.)
  ✗ NO inline citations / "Sources" section OUTSIDE the JSON.
     (citations belong inside each entry's "recommendationSource" field)
  ✗ NO XML tags like <result> or <response>
  ✗ NO comments

The first character of your reply must be \`{\` and the last must be \`}\`.

Required shape:
{
  "restaurants": [ /* ${Math.max(150, cityCount * 80)}–${Math.max(250, cityCount * 100)} entries — at least 10 per category per city */ ],
  "newRestaurantCategories": [ /* any new Hebrew category titles you proposed */ ]
}

═══════════════════════════════════════════════════════════════════════════════
STRING ESCAPING — STRICT (every string field MUST follow these)
═══════════════════════════════════════════════════════════════════════════════
The output is parsed by \`JSON.parse\` with no leniency. The two failures we
see most often:

1. LITERAL NEWLINES inside string values — FORBIDDEN.
   Every string value (description, location, priceLevel, etc.) MUST be on
   ONE LINE. No raw \\n, \\r, or \\t inside quotes. If you need a paragraph
   break, use the escape sequence \\n IN THE STRING (not a real line break).
   WRONG:  "priceLevel": "
   $$$$
   "
   RIGHT:  "priceLevel": "$$$$"

2. UNESCAPED DOUBLE QUOTES inside string values — FORBIDDEN.
   Hebrew acronyms with gershayim (e.g. להט"ב, צה"ל, ארה"ב) break the JSON
   because the \`"\` looks like a string terminator. Two options, in order
   of preference:
     (a) Use the Hebrew gershayim character \`״\` (U+05F4) — e.g. \`להט״ב\`,
         \`צה״ל\`, \`ארה״ב\`. This is the typographically correct form anyway.
     (b) Escape the double-quote: \`להט\\"ב\`.
   Same rule for English quotes inside Hebrew text (\`he said "hi"\` → write
   \`he said \\"hi\\"\` or use Hebrew quotation marks „ ").

3. NO TABS inside strings. Use a single space.

If your JSON would have ANY raw newline or unescaped \`"\` inside a string
value — REWRITE IT before sending. The parser is strict; corruption forces
a manual cleanup pass.

COMMON MISTAKES TO AVOID  (especially for Gemini Deep Research / Gemini 2.5 Pro)
- Do NOT prepend "Here is the deep research result:" or any preamble.
- Do NOT append a "Sources" / "References" / "Citations" section after the JSON.
- Do NOT wrap in \`\`\`json … \`\`\` or any code fence.
- Do NOT add ## headers, **bold**, bullet lists, or executive summaries OUTSIDE
  the JSON. ALL prose must live inside the JSON \`description\` fields.
- Do NOT emit XML tags like <result> or <response> around the JSON.

FINAL RULES
1. OMIT any field you cannot fill with HIGH confidence. Don't write "" or null.
2. Don't fabricate Google Maps URLs, ratings, lat/lng, or prices.
3. AT LEAST 10 picks per applicable category per city. If your first pass
   yields fewer, search harder — never settle on 4 or 5.
4. Use the canonical Hebrew \`categoryTitle\` strings VERBATIM. Match by
   character, not by meaning.
5. Hebrew \`description\`s. Field NAMES stay English.
6. Return JSON ONLY. The very first character of your reply MUST be \`{\`
   and the very last MUST be \`}\`. Anything else breaks the import.
`;
};

// ===========================================================================
// 🏛  ATTRACTIONS PROMPT
// ===========================================================================

export const buildDeepAttractionPrompt = (trip: Trip, opts?: DeepResearchPromptOptions): string => {
  const ctx = buildSharedContext(trip, opts);
  const existing = (trip.aiAttractions || []).map(c => c.title).filter(Boolean);
  const categoriesToTarget = existing.length ? existing : CANONICAL_ATTRACTION_CATEGORIES_HE;
  const categoriesList = categoriesToTarget.map((c, i) => `   ${i + 1}. "${c}"`).join('\n');
  const cityCount = ctx.cities.length || 1;
  const isSingleCity = !!opts?.city;

  return `MISSION
You are building a curated, deeply-researched ATTRACTIONS GUIDE for a real
multi-city trip. The output goes directly into a travel-planner app where
the user will browse attractions by Hebrew category, pick what to do each
day, and tag them onto their itinerary. Your job is to produce the richest,
most accurate, most useful attractions list a trip planner could ask for —
organized by category, with enough detail per entry that the user never
needs to open another tab to decide what to do.

ROLE
You are a senior travel researcher specializing in attractions, culture
and activities, with deep web access (Google Maps, TripAdvisor, Lonely
Planet, Atlas Obscura, UNESCO, official tourism boards, Reddit r/<city>,
local Hebrew/English travel blogs). Think like a local guide who has
shown around hundreds of travelers and knows when a famous site is
overrated, when a "hidden gem" is genuinely worth the detour, and how
families pace a day differently from solo travelers.

═══════════════════════════════════════════════════════════════════════════════
WHAT "GREAT OUTPUT" LOOKS LIKE
═══════════════════════════════════════════════════════════════════════════════
✓ EVERY category gets AT LEAST 8 strong picks (HARD MINIMUM — see below).
✓ Mix of iconic must-sees AND insider hidden gems.
✓ Mix of free / paid, indoor / outdoor, half-day / full-day visits.
✓ Every entry verified currently OPERATIONAL (not closed, not under
  indefinite renovation, last reviews ≤ 6 months old).
✓ Real Google Maps URLs, real ratings, real coordinates — never fabricated.
✓ Hebrew descriptions that tell the user WHY this place is worth a visit
  AND when to go (sunset / before crowds / weekday). Generic "amazing
  views" doesn't help — say WHAT view, from WHERE, at WHAT TIME.

═══════════════════════════════════════════════════════════════════════════════
TRIP DETAILS
═══════════════════════════════════════════════════════════════════════════════
Cities to cover: ${ctx.destination}
Dates: ${ctx.dateLine}${ctx.nights ? `  (${ctx.nights} nights)` : ''}
Travelers: ${ctx.travelers}${ctx.hasKids ? '  — boost kid-friendly picks (zoos, aquariums, water parks); flag stroller / accessibility issues in description' : ''}

Hotels (used to tag the closest hotel per entry — NOT the main organizing axis):
${ctx.hotelsBlock}

═══════════════════════════════════════════════════════════════════════════════
CATEGORIES TO POPULATE  (these are the EXACT Hebrew strings the app uses)
═══════════════════════════════════════════════════════════════════════════════
You MUST attempt to populate every category below for every city in the trip.
Use the strings VERBATIM in the \`categoryTitle\` field — they are matched
character-by-character against the app's existing categories. Do NOT translate,
abbreviate, paraphrase, or punctuate them differently.

${categoriesList}

When to add a NEW category:
  Only when the destination has a clearly distinct cluster the canonical 10
  cannot host (e.g. "קייאקים ושנירקול" for an island trip, "סקי וסנובורד"
  for the Alps). Add the new Hebrew title (≤ 5 words) to
  \`newAttractionCategories\` AND use it as the \`categoryTitle\` on those
  entries. Don't add a new category just to host overflow.

When to leave a category empty:
  ONLY when the destination genuinely has none — e.g. "חופים ומים" in
  Vienna. Don't leave one empty just because searching was hard.

═══════════════════════════════════════════════════════════════════════════════
COVERAGE TARGETS — HARD MINIMUMS
═══════════════════════════════════════════════════════════════════════════════
Per CATEGORY in a city that supports it: AT LEAST 8 picks. Aim for 10–12.
  • If your first pass yields fewer than 8, expand: include day-trip-distance
    sites, lesser-known neighborhoods, festivals running during the trip dates,
    seasonal attractions, niche museums, local-only spots.
  • Returning 4 picks in "אתרי חובה" for Bangkok is a FAILURE — Bangkok has
    dozens of must-sees.
${isSingleCity
  ? `THIS RUN IS SCOPED TO ONE CITY: "${ctx.destination}".
Total target for this single city: ~80 attractions (10 categories × 8
picks each). Aim for 100 if the city supports it.`
  : `Per CITY: at least 80 strong attraction picks across all categories.
Total for ${cityCount}-city trip: ${cityCount * 80}–${cityCount * 100} attractions.

⚠️ Producing this many entries in ONE run is hard. If you fall short,
run this prompt once per city — try a single combined run first.`}

Within the city/cities, ensure variety of activity types — don't dump 15
temples and 2 of everything else. Set \`nearestHotel\` to the geographically
closest hotel from the list above (straight-line distance).

═══════════════════════════════════════════════════════════════════════════════
RESEARCH METHODOLOGY  — work CITY by CITY, USE EVERYTHING YOU KNOW
═══════════════════════════════════════════════════════════════════════════════
You have FULL CREATIVE FREEDOM in HOW you research. The goal is to find the
most AMAZING attractions for this trip — not the most algorithmically average.
Cast as wide a net as you can:

  • Editorial / reference: Lonely Planet, Atlas Obscura, UNESCO World
    Heritage list, National Geographic Travel, Conde Nast Traveler, Time
    Out city guides, Rick Steves (Europe), Smithsonian, Tour authority
    of the country (e.g. TAT for Thailand, ENIT for Italy, JNTO for Japan).
  • Aggregator / reviews: TripAdvisor "things to do" lists, Klook & KKday
    bestsellers, GetYourGuide top picks, Viator top-rated, Google Maps
    "popular" pins — useful as ONE signal, don't let them gate you.
  • Forums & locals: Reddit r/<city>, local Facebook expat groups, Hebrew
    travel Facebook groups when relevant, blog posts from long-term
    residents, hotel concierge "things to do" sheets.
  • Niche / hidden gems: travel show segments (Anthony Bourdain, Stanley
    Tucci, Somebody Feed Phil), YouTube travel channels with deep local
    knowledge, Substack newsletters from city specialists, archaeological
    society sites for ancient ruins, religious authority sites for active
    temples / churches.
  • Activity-specific authorities: PADI dive shop reviews for dive sites,
    SANParks for South African parks, NPS for US national parks, climbing
    guidebooks for via-ferrata, surf forecasting sites for surf spots.

For each candidate attraction, ALWAYS verify:
  ✓ Currently OPERATIONAL (not under indefinite renovation, not flagged
    "temporarily closed" with no reopening date, not >12 months without
    a review or press mention).
  ✓ Reputation hasn't collapsed (no scandal, no recent bad press, no
    travel-warning advisory specific to the venue).

═══════════════════════════════════════════════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════════════════════════════════════════════
INCLUDE freely: UNESCO sites, world-famous landmarks, ruins, festivals
running during the trip dates, day trips worth a 1–2 hour drive, signature
local experiences (cooking classes from a Michelin chef, scuba in a
specific dive site, sunset boat ride), insider hidden gems known to locals.

DON'T pad with: malls (unless iconic — "Siam Paragon", "Forum"), generic
shopping streets, viewing decks of unremarkable skyscrapers, "free walking
tours" (those are services, not attractions).

NAME INTEGRITY (CRITICAL): "name" / "nameEnglish" must be the venue display
name. NEVER use a street address, road number, or coordinates as the name.
If you only have an address — OMIT the entry.

═══════════════════════════════════════════════════════════════════════════════
SCHEMA — required fields, strict types
═══════════════════════════════════════════════════════════════════════════════
The output is parsed by an automated importer and rendered on a map. If a
required field is missing or the wrong type, the entry is dropped.

REQUIRED on EVERY entry (omit the whole entry if any are missing):
  name              string — original-script display name
  nameEnglish       string — Latin-script display name
  description       string — 2–3 Hebrew sentences, vivid + specific
  location          string — full address: street + district + city + country
  categoryTitle     string — EXACTLY one of the Hebrew categories above
                              (or one of your proposed new categories — same
                              string also listed in newAttractionCategories)
  recommendationSource  string — verbatim source ("Lonely Planet Top Choice",
                              "Atlas Obscura", "UNESCO", "TAT", "r/Bangkok")
  AT LEAST ONE OF:
    - lat (number) AND lng (number)  — decimal degrees, e.g. 13.7515
                                       (ALWAYS preferred — needed for the map)
    - googleMapsUrl (string)         — real Google Maps URL only, never fabricated
                                       (the app will geocode this if no lat/lng)

If you can find NEITHER coordinates NOR a real Google Maps URL — OMIT THE ENTRY.

STRONGLY ENCOURAGED (drives UX quality):
  type              string — short label ("Temple", "Beach", "Water park",
                              "Market", "Museum")
  activity_type     string enum — "Adventure" | "Culture" | "Relaxation" |
                              "Shopping" | "Nature" | "Family" | "Nightlife"
  rating            number 0.0–5.0 (NUMBER not string)
  reviewCount       integer (NUMBER not string)
  nearestHotel      string — hotel name closest to this entry by straight-line distance

OPTIONAL (bonus signal):
  price             string — display ("Free" / "300 THB" / "Adults 500 / Kids 250")
  costNumeric       number — single value in local currency (omit if free)
  duration          string — typical visit length ("1–2 hours", "Half day")
  best_time_to_visit  string — e.g. "Sunset", "Early morning", "Weekday afternoon"

DATA TYPE RULES (strict):
  • Numbers as numbers, NOT strings: 4.7 ✅  "4.7" ❌
  • Booleans as booleans: true / false ✅  "true" ❌
  • Coordinates as decimal degrees, NOT degrees-minutes-seconds.
  • Empty/unknown values: OMIT the field. NEVER write "", null, "N/A",
    "unknown", 0, or "tbd".
  • Arrays: omit the field if empty. NEVER write [].

EXAMPLE OF ONE PERFECT ENTRY (use the SHAPE, not the specifics):
{
  "name": "Wat Phra Kaew (Temple of the Emerald Buddha)",
  "description": "המקדש הקדוש ביותר בתאילנד, בתוך מתחם הארמון המלכותי. בודהה הירקרק שנחצב מאבן ירקן יחידה הוא סמל לאומי. הכנסו לפני 09:00 כדי להקדים את האוטובוסים.",
  "location": "Na Phra Lan Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200, Thailand",
  "lat": 13.7515,
  "lng": 100.4924,
  "categoryTitle": "היסטוריה ודת",
  "recommendationSource": "Lonely Planet Top Choice",
  "type": "Temple complex",
  "activity_type": "Culture",
  "rating": 4.7,
  "reviewCount": 87000,
  "price": "500 THB",
  "costNumeric": 500,
  "duration": "2–3 hours",
  "best_time_to_visit": "Early morning (before 10:00)",
  "nearestHotel": "Holiday Inn Bangkok",
  "googleMapsUrl": "https://maps.app.goo.gl/..."
}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════════════════════════════
Your reply must be a single, valid JSON object — and NOTHING ELSE.

Specifically forbidden:
  ✗ NO opening prose ("Here is the JSON…", "I researched…", etc.)
  ✗ NO closing prose ("Let me know if you need more…")
  ✗ NO markdown code fences (\`\`\`json … \`\`\` or \`\`\` … \`\`\`)
  ✗ NO markdown headers (## Attractions, etc.)
  ✗ NO inline citations / "Sources" section OUTSIDE the JSON.
  ✗ NO XML tags like <result> or <response>
  ✗ NO comments

The first character of your reply must be \`{\` and the last must be \`}\`.

Required shape:
{
  "attractions": [ /* ${Math.max(80, cityCount * 50)}–${Math.max(150, cityCount * 70)} entries — at least 8 per category per city */ ],
  "newAttractionCategories": [ /* any new Hebrew category titles you proposed */ ]
}

═══════════════════════════════════════════════════════════════════════════════
STRING ESCAPING — STRICT (every string field MUST follow these)
═══════════════════════════════════════════════════════════════════════════════
The output is parsed by \`JSON.parse\` with no leniency. The two failures we
see most often:

1. LITERAL NEWLINES inside string values — FORBIDDEN.
   Every string value MUST be on ONE LINE. No raw newlines/tabs inside quotes.
   If you need a paragraph break, use the escape sequence \\n IN THE STRING
   (not a real line break).
   WRONG:  "description": "פסקה ראשונה.
   פסקה שנייה."
   RIGHT:  "description": "פסקה ראשונה. פסקה שנייה."

2. UNESCAPED DOUBLE QUOTES inside string values — FORBIDDEN.
   Hebrew acronyms with gershayim (e.g. להט"ב, צה"ל, ארה"ב) break the JSON
   because the \`"\` looks like a string terminator. Two options:
     (a) Use the Hebrew gershayim character \`״\` (U+05F4) — \`להט״ב\`,
         \`צה״ל\`, \`ארה״ב\`. Typographically correct anyway.
     (b) Escape the double-quote: \`להט\\"ב\`.

3. NO TABS inside strings. Use a single space.

If your JSON would have ANY raw newline or unescaped \`"\` inside a string —
REWRITE IT before sending.

COMMON MISTAKES TO AVOID  (especially for Gemini Deep Research / Gemini 2.5 Pro)
- Do NOT prepend any preamble. Do NOT append a "Sources" section.
- Do NOT wrap in code fences. Do NOT add markdown headers, **bold**, bullets,
  or executive summaries OUTSIDE the JSON.
- Do NOT emit XML tags around the JSON.
- ALL prose must live inside the JSON \`description\` fields.

FINAL RULES
1. OMIT any field you cannot fill with HIGH confidence. Don't write "" or null.
2. Don't fabricate Google Maps URLs, ratings, lat/lng, or prices.
3. AT LEAST 8 picks per applicable category per city. If your first pass
   yields fewer, search harder — never settle on 3 or 4.
4. Use the canonical Hebrew \`categoryTitle\` strings VERBATIM. Match by
   character, not by meaning.
5. Hebrew \`description\`s. Field NAMES stay English.
6. Return JSON ONLY. First char \`{\`, last char \`}\`. Anything else breaks the import.
`;
};
