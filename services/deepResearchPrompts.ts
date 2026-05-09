import type { Trip } from '../types';

const formatDate = (raw?: string): string => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return raw;
};

const daysBetween = (from?: string, to?: string): number | null => {
  if (!from || !to) return null;
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
};

// trip.dates is a free-form display string (e.g. "06/08/2026 - 16/08/2026" or
// "Aug 6 – Aug 16"). Try to split on common separators; otherwise use the
// whole string as the dates label and skip nights computation.
const splitDateRange = (dates?: string): { from?: string; to?: string } => {
  if (!dates) return {};
  const m = dates.match(/^\s*(.+?)\s*(?:–|-|—|to|עד)\s*(.+?)\s*$/);
  if (!m) return {};
  return { from: m[1], to: m[2] };
};

export const buildDeepResearchPrompt = (trip: Trip): string => {
  const { from, to } = splitDateRange(trip.dates);
  const nights = trip.days ?? daysBetween(from, to);
  const t = trip.travelers;
  const travelers = t
    ? [t.adults && `${t.adults} adults`, t.children && `${t.children} children`, t.babies && `${t.babies} babies`]
        .filter(Boolean)
        .join(', ')
    : 'unspecified';

  const hotels = (trip.hotels || [])
    .filter(h => h.name)
    .map(h => {
      const coords = h.lat && h.lng ? ` (${h.lat.toFixed(4)}, ${h.lng.toFixed(4)})` : '';
      const addr = h.address ? ` — ${h.address}` : '';
      const dates = h.checkInDate && h.checkOutDate
        ? ` [${formatDate(h.checkInDate)} → ${formatDate(h.checkOutDate)}]`
        : '';
      return `   * ${h.name}${addr}${coords}${dates}`;
    })
    .join('\n');

  const restaurantCats = (trip.aiRestaurants || trip.restaurants || []).map(c => c.title).filter(Boolean);
  const attractionCats = (trip.aiAttractions || trip.attractions || []).map(c => c.title).filter(Boolean);

  return `ROLE: Senior travel research analyst with deep web access.

TRIP CONTEXT:
- Dates: ${trip.dates || 'unspecified'}${nights ? `  (${nights} nights)` : ''}
- Destination(s): ${trip.destination || 'unknown'}
- Travelers: ${travelers}
- Hotels:
${hotels || '   (none yet)'}

- Existing restaurant categories (Hebrew): ${restaurantCats.length ? restaurantCats.map(c => `"${c}"`).join(', ') : '(none yet)'}
- Existing attraction categories (Hebrew): ${attractionCats.length ? attractionCats.map(c => `"${c}"`).join(', ') : '(none yet)'}

MISSION:
Produce a thoroughly-researched JSON of restaurants AND attractions for
this specific trip. Use multi-source web research: Time Out, Eater, Michelin
Guide, Reddit r/<city>, local food/travel blogs, recent (2025–2026) reviews.
For each entry, indicate which hotel above it is closest to (the user is
mainly interested in walkable picks within ~15 min / 1.2 km of each hotel).
Mix iconic landmarks with insider/local picks. Avoid global chains
(McDonald's, KFC, Pizza Hut, Starbucks, Costa, etc.).

For each RESTAURANT, include EVERY field below if you can find it
(omit if you cannot — never guess):
   * name           — original-script display name (Thai/Arabic/Hebrew/etc.)
   * nameEnglish    — Latin-script transliteration
   * description    — 2–3 Hebrew sentences
   * location       — full address with district/city
   * lat, lng       — decimal degrees
   * priceLevel     — one of "$", "$$", "$$$", "$$$$"
   * priceRange     — display string (e.g. "100-300 THB")
   * cuisine
   * must_try_dish
   * recommendedDishes  — up to 5
   * vibe           — short phrase
   * bestTime       — "Breakfast" / "Lunch" / "Dinner" / "Late Night"
   * reservationRequired  — boolean (only true if explicitly stated)
   * googleRating, reviewCount
   * michelin       — boolean (true only for star/bib gourmand)
   * tags           — up to 5 short markers ("Spicy", "Vegetarian", "View")
   * recommendationSource  — verbatim source name (e.g. "Time Out", "r/Bangkok")
   * categoryTitle  — one of the existing Hebrew categories above, or
                       propose a short Hebrew category name for a clearly
                       distinct cluster
   * nearestHotel   — name of the closest hotel from the list above

For each ATTRACTION, include EVERY field if found:
   * name, nameEnglish, description, location, lat, lng
   * price          — display string ("Free" / "300 THB")
   * costNumeric    — entry cost in local currency (number only)
   * rating, reviewCount
   * activity_type  — "Adventure" / "Culture" / "Relaxation" / "Shopping" / etc.
   * duration       — e.g. "1-2 hours"
   * best_time_to_visit  — e.g. "Sunset", "Early morning"
   * recommendationSource
   * categoryTitle
   * nearestHotel

OUTPUT FORMAT — exactly one JSON object, no markdown fences, no prose:
{
  "restaurants": [...],
  "attractions": [...],
  "newRestaurantCategories": ["..."],
  "newAttractionCategories": ["..."]
}

If you cannot find a field with high confidence, OMIT that field. Do not
guess or fabricate. Return as many entries as you can confidently support
(50–100 total is great for a multi-city trip).
`;
};
