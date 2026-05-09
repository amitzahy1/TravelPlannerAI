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
RESEARCH METHODOLOGY  — work CITY by CITY
═══════════════════════════════════════════════════════════════════════════════
For each city above:
  1. Open Google Maps. For each category, search "best <category> in <city>".
     Pull top results with rating ≥ 4.4 AND ≥ 200 reviews.
  2. Cross-reference against editorial sources: Time Out, Eater, Michelin,
     local food blogs, Reddit r/<city>, regional aggregators (Wongnai for
     Thailand, Tabelog for Japan, Burpple for Singapore, etc.).
  3. Read the latest 3–5 reviews. Skip places where recent reviews indicate
     decline, closure, or a chef departure that hurt quality.
  4. Verify operational status — not "Permanently closed", not >12 months
     without a review.

═══════════════════════════════════════════════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════════════════════════════════════════════
EXCLUDE global / regional fast chains: McDonald's, KFC, Burger King, Subway,
Pizza Hut, Domino's, Papa John's, Pizza Company, Pizza Marzano, Starbucks,
Costa, Krispy Kreme, Dunkin', Tim Hortons. Better an empty pick than chain padding.

NAME INTEGRITY (CRITICAL): "name" / "nameEnglish" must be the establishment's
display name. NEVER use a street address, "Moo X", "Soi Y", "464/12", or
coordinates as the name. If you only have an address — OMIT the entry.

═══════════════════════════════════════════════════════════════════════════════
FIELDS PER ENTRY  (omit if you cannot fill with HIGH confidence — never guess)
═══════════════════════════════════════════════════════════════════════════════
  name              original-script display name (Thai / Arabic / Hebrew / etc)
  nameEnglish       Latin-script display name
  description       2–3 Hebrew sentences. Vivid + specific (what makes it special).
  location          full address: street + district + city
  lat, lng          decimal degrees, only if explicitly known
  priceLevel        "$" | "$$" | "$$$" | "$$$$"
  priceRange        display string ("100–300 THB" / "₪80–150")
  cuisine           single label ("Thai", "Italian", "Japanese")
  must_try_dish     the ONE signature dish ordered by 80% of patrons
  recommendedDishes up to 5, lowercase English ("som tam", "moo ping")
  vibe              short phrase ("street-side, plastic stools, no English menu")
  bestTime          "Breakfast" | "Lunch" | "Dinner" | "Late Night"
  reservationRequired  true ONLY if the source explicitly says so
  googleRating      0.0–5.0
  reviewCount       integer
  michelin          true ONLY for Michelin star or Bib Gourmand
  tags              up to 5 short markers ("Spicy", "View", "Romantic",
                    "Family-Friendly")
  recommendationSource  verbatim source ("Time Out Bangkok", "Michelin Guide",
                    "r/Thailand", "Eater", "Wongnai")
  categoryTitle     EXACTLY one of the Hebrew categories above (or one of
                    your proposed new categories — same string in both places)
  nearestHotel      hotel name from above this entry is geographically closest to
  googleMapsUrl     actual URL from Google Maps results — NEVER fabricated

EXAMPLE OF ONE PERFECT ENTRY (use the SHAPE, not the specifics):
{
  "name": "ส้มตำนัว",
  "nameEnglish": "Som Tum Nua",
  "description": "מסעדת איסאן אגדית ליד אנוסאוואארי-ניצחון, מפורסמת בס'ום-טאם החריף שלה ועוף מטוגן זהוב. תור ארוך אבל זז מהר.",
  "location": "392/14 Siam Square Soi 5, Pathum Wan, Bangkok 10330",
  "lat": 13.7449, "lng": 100.5346,
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
  "tags": ["Spicy", "Iconic", "Local Favorite"],
  "recommendationSource": "Michelin Guide (Bib Gourmand)",
  "michelin": true,
  "categoryTitle": "אוכל מקומי אותנטי",
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
RESEARCH METHODOLOGY  — work CITY by CITY
═══════════════════════════════════════════════════════════════════════════════
For each city above:
  1. Open Google Maps. For each category, search "<category> in <city>".
     Pull top results with rating ≥ 4.3 AND ≥ 500 reviews.
  2. Cross-reference against editorial sources: Lonely Planet, Atlas
     Obscura, TripAdvisor "things to do", UNESCO, official tourism
     boards, Reddit r/<city>, local travel blogs.
  3. Read the latest 3–5 reviews. Skip places under indefinite renovation,
     recently closed, or whose reviews describe a steep decline.
  4. Verify operational status — not flagged "temporarily closed" with
     no reopening date, not >12 months without a review.

═══════════════════════════════════════════════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════════════════════════════════════════════
DON'T pad with: malls (unless iconic — "Siam Paragon"), generic shopping
streets, viewing decks of skyscrapers nobody talks about, "free walking
tours" (those are services, not attractions).

NAME INTEGRITY (CRITICAL): "name" / "nameEnglish" must be the venue display
name. NEVER use a street address, road number, or coordinates as the name.
If you only have an address — OMIT the entry.

═══════════════════════════════════════════════════════════════════════════════
FIELDS PER ENTRY  (omit if you cannot fill with HIGH confidence — never guess)
═══════════════════════════════════════════════════════════════════════════════
  name              original-script display name
  nameEnglish       Latin-script display name
  description       2–3 Hebrew sentences. Vivid + specific.
  location          full address
  lat, lng          decimal degrees, only if explicitly known
  price             display string ("Free" / "300 THB" / "Adults 500 / Kids 250")
  costNumeric       single number in local currency (omit if free)
  rating            0.0–5.0
  reviewCount       integer
  type              short label ("Temple", "Beach", "Water park", "Market")
  activity_type     "Adventure" | "Culture" | "Relaxation" | "Shopping" |
                    "Nature" | "Family" | "Nightlife"
  duration          typical visit length ("1–2 hours", "Half day")
  best_time_to_visit  e.g. "Sunset", "Early morning", "Weekday afternoon"
  recommendationSource  verbatim source ("Lonely Planet Top Choice",
                    "Atlas Obscura", "UNESCO", "Tourism Authority of Thailand",
                    "r/Bangkok")
  categoryTitle     EXACTLY one of the Hebrew categories above
  nearestHotel      closest hotel from the list above
  googleMapsUrl     actual URL — NEVER fabricated

EXAMPLE OF ONE PERFECT ENTRY (use the SHAPE, not the specifics):
{
  "name": "วัดพระแก้ว",
  "nameEnglish": "Wat Phra Kaew (Temple of the Emerald Buddha)",
  "description": "המקדש הקדוש ביותר בתאילנד, בתוך מתחם הארמון המלכותי. בודהה הירקרק שנחצב מאבן ירקן יחידה הוא סמל לאומי. הכנסו לפני 09:00 כדי להקדים את האוטובוסים.",
  "location": "Na Phra Lan Rd, Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200",
  "lat": 13.7515, "lng": 100.4924,
  "price": "500 THB",
  "costNumeric": 500,
  "rating": 4.7,
  "reviewCount": 87000,
  "type": "Temple complex",
  "activity_type": "Culture",
  "duration": "2–3 hours",
  "best_time_to_visit": "Early morning (before 10:00)",
  "recommendationSource": "Lonely Planet Top Choice",
  "categoryTitle": "היסטוריה ודת",
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
