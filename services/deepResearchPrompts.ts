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

const buildSharedContext = (trip: Trip): SharedContext => {
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
  const formatHotel = (h: any): string => {
    const cleanedAddr = cleanAddress(h.name, h.address);
    const coords = (h.lat && h.lng) ? ` (${h.lat.toFixed(4)}, ${h.lng.toFixed(4)})` : '';
    const dates = (h.checkInDate && h.checkOutDate) ? `, stay ${h.checkInDate}→${h.checkOutDate}` : '';
    return `   • ${h.name}${cleanedAddr ? ` — ${cleanedAddr}` : ''}${coords}${dates}`;
  };
  const cityList = Array.from(hotelsByCity.keys());
  const hotelsBlock = Array.from(hotelsByCity.entries())
    .map(([city, list]) => `- ${city}\n${list.map(formatHotel).join('\n')}`)
    .join('\n');

  return {
    dateLine,
    nights,
    destination: trip.destination || cityList.join(', ') || 'unknown',
    travelers,
    cities: cityList.length ? cityList : (trip.destination ? trip.destination.split(/[-–,]+/).map(s => s.trim()).filter(Boolean) : []),
    hotelsBlock: hotelsBlock || '   (no hotels yet)',
    hasKids,
  };
};

// ===========================================================================
// 🍽  RESTAURANTS PROMPT
// ===========================================================================

export const buildDeepRestaurantPrompt = (trip: Trip): string => {
  const ctx = buildSharedContext(trip);
  const existing = (trip.aiRestaurants || trip.restaurants || []).map(c => c.title).filter(Boolean);
  const categoriesToTarget = existing.length ? existing : CANONICAL_RESTAURANT_CATEGORIES_HE;
  const categoriesList = categoriesToTarget.map((c, i) => `   ${i + 1}. "${c}"`).join('\n');
  const cityCount = ctx.cities.length || 1;

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
✓ Every category has 6–10 strong picks (or honestly empty if the destination
  has nothing for that category — e.g. "ראמן" in Tel Aviv).
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
CATEGORIES TO POPULATE  (Hebrew titles — use EXACTLY these strings)
═══════════════════════════════════════════════════════════════════════════════
${categoriesList}

If the destination has a clearly distinct food cluster that doesn't fit any
of the above (e.g. "מסעדות שוק לח" in Bangkok, "אוכל איסאן" in northeastern
Thailand), propose a NEW Hebrew category — short (≤ 5 words) — and list it
under \`newRestaurantCategories\`.

For non-applicable categories (e.g. "ראמן" in a non-Asian destination),
return an empty entry list rather than padding with weak picks.

═══════════════════════════════════════════════════════════════════════════════
COVERAGE TARGETS
═══════════════════════════════════════════════════════════════════════════════
Per CITY: at least 50 strong restaurant picks across all categories.
Per CATEGORY (in a city that supports it): 6–10 picks.
Total for ${cityCount}-city trip: 60–${Math.max(120, cityCount * 50)} restaurants.

Within each city, ensure geographic spread — don't dump 30 picks in one
neighborhood and 2 in another. Every entry should set \`nearestHotel\` to
the closest hotel from the list above (use straight-line distance).

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
  name              string — original-script display name (Thai/Arabic/Hebrew/Latin)
  nameEnglish       string — Latin-script display name
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
  "name": "ส้มตำนัว",
  "nameEnglish": "Som Tum Nua",
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
  "restaurants": [ /* 60–${Math.max(120, cityCount * 50)} entries */ ],
  "newRestaurantCategories": [ /* any new Hebrew category titles you proposed */ ]
}

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
3. Aim for breadth across all cities AND across all categories — don't dump
   most picks in one city or one category.
4. Hebrew \`description\`s. Field NAMES stay English.
5. Return JSON ONLY. The very first character of your reply MUST be \`{\`
   and the very last MUST be \`}\`. Anything else breaks the import.
`;
};

// ===========================================================================
// 🏛  ATTRACTIONS PROMPT
// ===========================================================================

export const buildDeepAttractionPrompt = (trip: Trip): string => {
  const ctx = buildSharedContext(trip);
  const existing = (trip.aiAttractions || trip.attractions || []).map(c => c.title).filter(Boolean);
  const categoriesToTarget = existing.length ? existing : CANONICAL_ATTRACTION_CATEGORIES_HE;
  const categoriesList = categoriesToTarget.map((c, i) => `   ${i + 1}. "${c}"`).join('\n');
  const cityCount = ctx.cities.length || 1;

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
✓ Every category has 4–8 strong picks (or honestly empty if the destination
  has none — e.g. "חופים ומים" in Vienna).
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
CATEGORIES TO POPULATE  (Hebrew titles — use EXACTLY these strings)
═══════════════════════════════════════════════════════════════════════════════
${categoriesList}

If the destination has a clearly distinct cluster that doesn't fit (e.g.
"קייאקים ושנירקול" for an island trip), propose a NEW Hebrew category
(≤ 5 words) and list it under \`newAttractionCategories\`.

For non-applicable categories (e.g. "חופים ומים" in a landlocked destination),
return an empty entry list rather than padding.

═══════════════════════════════════════════════════════════════════════════════
COVERAGE TARGETS
═══════════════════════════════════════════════════════════════════════════════
Per CITY: at least 30 strong attraction picks across all categories.
Per CATEGORY (in a city that supports it): 4–8 picks.
Total for ${cityCount}-city trip: 30–${Math.max(80, cityCount * 30)} attractions.

Within each city, ensure variety of activity types — don't dump 15 temples
and 2 of everything else. Set \`nearestHotel\` to the geographically closest
hotel from the list above (straight-line distance).

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
  "name": "วัดพระแก้ว",
  "nameEnglish": "Wat Phra Kaew (Temple of the Emerald Buddha)",
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
  "attractions": [ /* 30–${Math.max(80, cityCount * 30)} entries */ ],
  "newAttractionCategories": [ /* any new Hebrew category titles you proposed */ ]
}

COMMON MISTAKES TO AVOID  (especially for Gemini Deep Research / Gemini 2.5 Pro)
- Do NOT prepend any preamble. Do NOT append a "Sources" section.
- Do NOT wrap in code fences. Do NOT add markdown headers, **bold**, bullets,
  or executive summaries OUTSIDE the JSON.
- Do NOT emit XML tags around the JSON.
- ALL prose must live inside the JSON \`description\` fields.

FINAL RULES
1. OMIT any field you cannot fill with HIGH confidence. Don't write "" or null.
2. Don't fabricate Google Maps URLs, ratings, lat/lng, or prices.
3. Aim for breadth across cities AND categories.
4. Hebrew \`description\`s. Field NAMES stay English.
5. Return JSON ONLY. First char \`{\`, last char \`}\`. Anything else breaks the import.
`;
};
