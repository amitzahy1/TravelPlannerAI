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

// Strip the hotel name from its address if the address starts with the same name —
// avoids "Holiday Inn Pattaya — Holiday Inn Pattaya, Pattaya, Thailand" duplication.
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

const COUNTRY_RESTAURANT_HINTS: Record<string, string[]> = {
  thailand: [
    'אוכל רחוב תאילנדי',
    'מסעדות ים תאילנדיות',
    'אוכל איסאן (צפון-מזרחי)',
    'אוכל דרומי-תאילנדי',
    'בתי קפה בוטיק',
    'ברים על החוף',
  ],
  italy: ['פיצרייה נאפוליטנה', 'טראטוריה משפחתית', 'אנוטקה / יין', 'גלידריה'],
  japan: ['ראמן אזורי', 'סושי שוק / קונבייר', 'איזקאיה', 'בית תה מסורתי'],
};
const COUNTRY_ATTRACTION_HINTS: Record<string, string[]> = {
  thailand: ['מקדשים והיסטוריה', 'שווקי לילה', 'איים ושנירקול', 'פילים וחיות בר', 'פעילויות מים', 'תרבות וטקסים'],
  italy: ['מוזיאוני אומנות', 'אתרי UNESCO', 'גני יין וטוסקנה'],
  japan: ['גני זן ומקדשים', 'תצפיות וגורד שחקים', 'פסטיבלים וחוויות תרבות'],
};

const detectCountry = (destination?: string): keyof typeof COUNTRY_RESTAURANT_HINTS | null => {
  if (!destination) return null;
  if (/(thailand|תאילנד|בנגקוק|פטאיה|פוקט|קו צ|chiang|krabi|samui|chang|bangkok|pattaya)/i.test(destination)) return 'thailand';
  if (/(italy|איטליה|רומא|פלרמו|מילאן|ונציה|טוסקנה|sicily|rome|milan|venice)/i.test(destination)) return 'italy';
  if (/(japan|יפן|טוקיו|קיוטו|אוסקה|tokyo|kyoto|osaka)/i.test(destination)) return 'japan';
  return null;
};

interface SharedContext {
  header: string;
  dateLine: string;
  nights: number | null;
  destination: string;
  travelers: string;
  hotelsBlock: string;
  restaurantCats: string[];
  attractionCats: string[];
  country: keyof typeof COUNTRY_RESTAURANT_HINTS | null;
}

const buildSharedContext = (trip: Trip): SharedContext => {
  const { from, to, raw } = splitDateRange(trip.dates);
  const dateLine = (from && to) ? `${formatDateHuman(from)} – ${formatDateHuman(to)}` : (raw || 'unspecified');
  const nights = nightsBetween(from, to) ?? trip.days ?? null;

  const t = trip.travelers;
  let travelers = 'one or more adult travelers (composition not specified — plan as flexible adult-friendly)';
  if (t) {
    const parts: string[] = [];
    if (t.adults) parts.push(`${t.adults} adult${t.adults > 1 ? 's' : ''}`);
    if (t.children) parts.push(`${t.children} child${t.children > 1 ? 'ren' : ''}`);
    if (t.babies) parts.push(`${t.babies} bab${t.babies > 1 ? 'ies' : 'y'}`);
    if (parts.length) {
      travelers = parts.join(', ');
      if (t.children || t.babies) travelers += ' — favor stroller-friendly, kid-friendly picks';
    }
  } else if (trip.groupType) {
    travelers = `group type: ${trip.groupType}`;
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
    const dates = (h.checkInDate && h.checkOutDate) ? `   Stay: ${h.checkInDate} → ${h.checkOutDate}` : '';
    return [
      `   • ${h.name}`,
      cleanedAddr ? `     ${cleanedAddr}${coords}` : (coords ? `     ${coords.trim()}` : ''),
      dates,
    ].filter(Boolean).join('\n');
  };
  const hotelsBlock = Array.from(hotelsByCity.entries())
    .map(([city, list]) => `- ${city}\n${list.map(formatHotel).join('\n')}`)
    .join('\n');

  const restaurantCats = (trip.aiRestaurants || trip.restaurants || []).map(c => c.title).filter(Boolean);
  const attractionCats = (trip.aiAttractions || trip.attractions || []).map(c => c.title).filter(Boolean);
  const country = detectCountry(trip.destination);

  return {
    header: '',
    dateLine,
    nights,
    destination: trip.destination || 'unknown',
    travelers,
    hotelsBlock: hotelsBlock || '   (no hotels yet — use the destination cities only)',
    restaurantCats,
    attractionCats,
    country,
  };
};

const tripContextBlock = (ctx: SharedContext): string => `═══════════════════════════════════════════════════════════════════════════════
TRIP CONTEXT
═══════════════════════════════════════════════════════════════════════════════
- Dates: ${ctx.dateLine}${ctx.nights ? `  (${ctx.nights} nights)` : ''}
- Destination(s): ${ctx.destination}
- Travelers: ${ctx.travelers}

- Hotels (group by city — find walkable picks for EACH hotel):
${ctx.hotelsBlock}`;

// ===========================================================================
// 🍽  RESTAURANTS PROMPT
// ===========================================================================

export const buildDeepRestaurantPrompt = (trip: Trip): string => {
  const ctx = buildSharedContext(trip);
  const hints = ctx.country ? COUNTRY_RESTAURANT_HINTS[ctx.country] : [];
  const existing = ctx.restaurantCats.length ? ctx.restaurantCats.map(c => `"${c}"`).join(', ') : '(none yet)';

  return `You are a senior food critic and restaurant researcher with deep web access
(Google Maps, Time Out, Eater, Michelin Guide, Atlas Obscura, local food blogs,
Reddit r/<city>, Wongnai/Tabelog/OpenRice). You think like a local resident
who happens to be a great editor. Your goal is the BEST possible restaurant
list for this specific trip — biased toward walkable picks near each hotel,
plus a few iconic must-eats per city.

${tripContextBlock(ctx)}

- Existing restaurant categories (Hebrew — REUSE WHEN POSSIBLE):
   ${existing}
${hints.length ? `- If you must propose new categories, draw from these regional staples:\n   ${hints.map(c => `"${c}"`).join(', ')}` : ''}

═══════════════════════════════════════════════════════════════════════════════
RESEARCH METHODOLOGY  — follow this order, do not skip steps
═══════════════════════════════════════════════════════════════════════════════
For EACH hotel above, in turn:
  1. Open Google Maps. Search "best restaurants near {hotel address}".
     Note candidates with rating ≥ 4.4 AND review count ≥ 200.
  2. Cross-reference each candidate against editorial sources:
     Time Out, Eater, Michelin Guide, local food blogs, Reddit r/<city>.
  3. Read the LATEST 3–5 Google reviews (last 6 months). Skip places
     where recent reviews indicate decline, closure, or chef departure.
  4. Verify each pick is currently OPERATIONAL — not "Permanently closed",
     not "Temporarily closed", not >12 months without a review.

For each city as a whole (not just per-hotel):
  5. Add 3–5 ICONIC must-eat restaurants — places worth a 30-minute taxi
     from any hotel in the city.

═══════════════════════════════════════════════════════════════════════════════
PRIORITY HIERARCHY  &  TARGETS
═══════════════════════════════════════════════════════════════════════════════
Priority 1 — WALKABLE: within ~1.2 km / 15-min walk of the assigned hotel.
              The user wants to walk back tipsy or with tired kids.
              Target: 8–12 walkable per hotel.
Priority 2 — CITY-ICONIC: anywhere in the city, but world-famous or
              award-winning enough to taxi for. Target: 3–5 per city.

Set "nearestHotel" to the hotel within 1.2 km, OR (Priority 2 picks) the
hotel that is geographically closest.

═══════════════════════════════════════════════════════════════════════════════
DIVERSITY  &  EXCLUSIONS
═══════════════════════════════════════════════════════════════════════════════
Mix cuisines per hotel — don't return all 10 picks of the same type.
For a Thai city, aim 50% Thai (street + sit-down), 20% other Asian,
20% international, 10% bars / cafés / dessert. Adjust per country.

EXCLUDE global / regional fast chains — McDonald's, KFC, Burger King, Subway,
Pizza Hut, Domino's, Papa John's, Pizza Company, Pizza Marzano, Starbucks,
Costa, Krispy Kreme, Dunkin'. Better an empty pick than chain padding.

NAME INTEGRITY (CRITICAL): "name" / "nameEnglish" must be the establishment's
display name. NEVER use a street address, "Moo X", "Soi Y", "464/12", or
coordinates as the name. If you only have an address — OMIT the entry.

═══════════════════════════════════════════════════════════════════════════════
FIELDS  (omit if you cannot fill with HIGH confidence — never guess)
═══════════════════════════════════════════════════════════════════════════════
  name              original-script display name (Thai / Arabic / Hebrew / etc)
  nameEnglish       Latin-script display name
  description       2–3 Hebrew sentences, vivid + specific (what makes it special)
  location          full address: street + district + city
  lat, lng          decimal degrees, only if explicitly known
  priceLevel        "$" | "$$" | "$$$" | "$$$$"
  priceRange        display string ("100–300 THB" / "₪80–150")
  cuisine           single label ("Thai", "Italian", "Japanese")
  must_try_dish     the ONE signature dish ordered by 80% of patrons
  recommendedDishes up to 5, lowercase English ("som tam", "moo ping")
  vibe              short phrase ("street-side, plastic stools, no English menu")
  bestTime          "Breakfast" | "Lunch" | "Dinner" | "Late Night"
  reservationRequired  true ONLY if the source explicitly says reservations needed
  googleRating      0.0–5.0 number
  reviewCount       integer
  michelin          true ONLY for Michelin star or Bib Gourmand
  tags              up to 5 short markers ("Spicy", "View", "Romantic",
                    "Family-Friendly")
  recommendationSource  verbatim source name ("Time Out Bangkok",
                    "Michelin Guide", "r/Thailand", "Eater", "Wongnai")
  categoryTitle     reuse one of the existing Hebrew categories above when it
                    fits, OR propose a short Hebrew category name (≤ 5 words)
  nearestHotel      the hotel name from above this entry is closest to
  googleMapsUrl     the actual URL from Google Maps results — never fabricate

EXAMPLE of one PERFECT entry (use the SHAPE, not the specifics):
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
OUTPUT FORMAT — exactly one JSON object, no markdown fences, no prose
═══════════════════════════════════════════════════════════════════════════════
{
  "restaurants": [ /* 60–120 entries across all hotels + city-iconic */ ],
  "newRestaurantCategories": [ /* any new Hebrew category titles you proposed */ ]
}

FINAL RULES
1. OMIT any field you cannot fill with HIGH confidence. Don't write "" or null.
2. Don't fabricate Google Maps URLs, ratings, lat/lng, or prices.
3. Aim for breadth — don't dump 50 entries on one hotel and 2 on another.
4. Hebrew descriptions only. Field NAMES stay English.
5. Return JSON ONLY. No prose. No markdown code fences.
`;
};

// ===========================================================================
// 🏛  ATTRACTIONS PROMPT
// ===========================================================================

export const buildDeepAttractionPrompt = (trip: Trip): string => {
  const ctx = buildSharedContext(trip);
  const hints = ctx.country ? COUNTRY_ATTRACTION_HINTS[ctx.country] : [];
  const existing = ctx.attractionCats.length ? ctx.attractionCats.map(c => `"${c}"`).join(', ') : '(none yet)';
  const hasKids = /child|kid|family|בילד|children/i.test(ctx.travelers) || /family/i.test(trip.groupType || '');

  return `You are a senior travel researcher specializing in attractions, culture and
activities, with deep web access (Google Maps, TripAdvisor, Lonely Planet,
Atlas Obscura, UNESCO, official tourism boards, Reddit r/<city>, local
travel blogs). You think like a local guide who has shown around hundreds
of travelers and knows when a famous site is overrated, when a "hidden gem"
is genuinely worth the detour, and how families pace a day differently
from solo travelers.

${tripContextBlock(ctx)}

- Existing attraction categories (Hebrew — REUSE WHEN POSSIBLE):
   ${existing}
${hints.length ? `- If you must propose new categories, draw from these regional staples:\n   ${hints.map(c => `"${c}"`).join(', ')}` : ''}
${hasKids ? '- TRAVELERS INCLUDE CHILDREN — boost kid-friendly picks (zoos, aquariums, family-friendly water parks). Mark such entries with "Family-Friendly" in tags or note kid-suitability in the description.' : ''}

═══════════════════════════════════════════════════════════════════════════════
RESEARCH METHODOLOGY  — follow this order, do not skip steps
═══════════════════════════════════════════════════════════════════════════════
For EACH hotel above, in turn:
  1. Open Google Maps. Search "things to do near {hotel address}".
     Note candidates with rating ≥ 4.3 AND review count ≥ 500.
  2. Cross-reference each candidate against editorial sources:
     Lonely Planet, Atlas Obscura, TripAdvisor "things to do" lists,
     UNESCO World Heritage list, official tourism boards, Reddit r/<city>.
  3. Read the LATEST 3–5 reviews (last 6 months). Skip places that are
     under indefinite renovation, recently closed, or whose reviews
     describe a steep decline.
  4. Verify operational status — not permanently closed, not flagged
     "temporarily closed" with no reopening date.

For each city as a whole:
  5. Add 5–8 ICONIC must-visit attractions — UNESCO sites, world-famous
     landmarks, iconic experiences (cabaret shows, night markets, etc.).

═══════════════════════════════════════════════════════════════════════════════
PRIORITY HIERARCHY  &  TARGETS
═══════════════════════════════════════════════════════════════════════════════
Priority 1 — WALKABLE: within ~1.2 km / 15-min walk of the assigned hotel.
              Target: 5–8 walkable per hotel.
Priority 2 — CITY-ICONIC: anywhere in the city, world-famous or unique
              enough to taxi for. Target: 5–8 per city.

═══════════════════════════════════════════════════════════════════════════════
DIVERSITY  &  COVERAGE
═══════════════════════════════════════════════════════════════════════════════
Cover diverse activity types per city — don't return only temples or only beaches:
  Culture / History    (temples, museums, heritage, archaeology)
  Nature / Outdoors    (parks, beaches, viewpoints, dive sites)
  Adventure / Active   (water parks, ziplines, kayaking, ATVs)
  Family / Kids        (zoos, aquariums, trampoline parks)
  Shopping / Markets   (night markets, bazaars — only iconic ones)
  Nightlife / Vibes    (rooftop bars, cabaret shows, walking streets)
  Hidden gems          (insider/local picks not in top-10 lists)

NAME INTEGRITY (CRITICAL): "name" / "nameEnglish" must be the venue display
name. NEVER use a street address, road number, or coordinates as the name.
If you only have an address — OMIT the entry.

═══════════════════════════════════════════════════════════════════════════════
FIELDS  (omit if you cannot fill with HIGH confidence — never guess)
═══════════════════════════════════════════════════════════════════════════════
  name              original-script display name
  nameEnglish       Latin-script display name
  description       2–3 Hebrew sentences, vivid + specific
  location          full address
  lat, lng          decimal degrees, only if explicitly known
  price             display string ("Free" / "300 THB" / "Adults 500 / Kids 250")
  costNumeric       single number in local currency (omit if free)
  rating            0.0–5.0 number
  reviewCount       integer
  type              short label ("Temple", "Beach", "Water park", "Market")
  activity_type     "Adventure" | "Culture" | "Relaxation" | "Shopping" |
                    "Nature" | "Family" | "Nightlife"
  duration          typical visit length ("1–2 hours", "Half day")
  best_time_to_visit  e.g. "Sunset", "Early morning", "Weekday afternoon"
  recommendationSource  verbatim source ("Lonely Planet Top Choice",
                    "Atlas Obscura", "UNESCO", "Tourism Authority of Thailand",
                    "r/Bangkok")
  categoryTitle     reuse existing Hebrew category or propose new short one
  nearestHotel      closest hotel from the list above
  googleMapsUrl     the actual URL — never fabricate

EXAMPLE of one PERFECT entry (use the SHAPE, not the specifics):
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
OUTPUT FORMAT — exactly one JSON object, no markdown fences, no prose
═══════════════════════════════════════════════════════════════════════════════
{
  "attractions": [ /* 30–80 entries across all hotels + city-iconic */ ],
  "newAttractionCategories": [ /* any new Hebrew category titles you proposed */ ]
}

FINAL RULES
1. OMIT any field you cannot fill with HIGH confidence. Don't write "" or null.
2. Don't fabricate Google Maps URLs, ratings, lat/lng, or prices.
3. Aim for breadth — don't dump 30 entries on one hotel and 2 on another.
4. Hebrew descriptions only. Field NAMES stay English.
5. Return JSON ONLY. No prose. No markdown code fences.
`;
};
