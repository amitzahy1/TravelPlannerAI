import type { Restaurant, Attraction, RestaurantCategory, AttractionCategory, Trip } from '../types';

// Normalize a place name for fuzzy matching:
//  - lowercase, strip diacritics
//  - drop generic suffixes ("restaurant", "cafe", "bar", "ร้าน")
//  - collapse whitespace + punctuation
const normalizeName = (raw?: string): string => {
  if (!raw) return '';
  const stripped = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['"`’]/g, '')
    .replace(/\b(restaurant|cafe|café|bar|kitchen|bistro|eatery|ร้าน)\b/g, '')
    .replace(/[^a-z0-9א-ת฀-๿]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return stripped;
};

// Haversine distance in meters
const distanceMeters = (a?: { lat?: number; lng?: number }, b?: { lat?: number; lng?: number }): number => {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return Infinity;
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const PROXIMITY_M = 150;

// Fields the parser is allowed to fill on an existing restaurant.
// Anything not in this list is treated as user-owned and never touched.
const FILLABLE_RESTAURANT_FIELDS: Array<keyof Restaurant> = [
  'nameEnglish', 'description', 'location', 'lat', 'lng',
  'priceRange', 'priceLevel', 'cuisine', 'must_try_dish',
  'vibe', 'bestTime', 'reservationRequired',
  'googleRating', 'reviewCount', 'michelin',
  'recommendationSource', 'categoryTitle',
  'googleMapsUrl', 'googleSearchQuery',
];
const FILLABLE_ATTRACTION_FIELDS: Array<keyof Attraction> = [
  'nameEnglish', 'description', 'location', 'lat', 'lng',
  'price', 'costNumeric', 'rating', 'reviewCount',
  'activity_type', 'duration', 'best_time_to_visit',
  'recommendationSource', 'categoryTitle', 'googleMapsUrl', 'type',
];

const isEmpty = (v: any): boolean =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

const dedupCaseInsensitive = (a: string[] = [], b: string[] = []): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...a, ...b]) {
    if (!item) continue;
    const k = item.toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
};

export interface MergeStats {
  newRestaurants: number;
  enrichedRestaurants: number;
  skippedRestaurants: number;
  newAttractions: number;
  enrichedAttractions: number;
  skippedAttractions: number;
  enrichedFields: Record<string, number>; // field name → count of fills
}

// ---------- RESTAURANTS ----------

const findExistingRestaurant = (
  incoming: Partial<Restaurant>,
  cats: RestaurantCategory[]
): { cat: RestaurantCategory; r: Restaurant } | null => {
  const targetName = normalizeName(incoming.name);
  const targetEng = normalizeName(incoming.nameEnglish);
  for (const cat of cats) {
    for (const r of cat.restaurants) {
      const sameName =
        (targetName && targetName === normalizeName(r.name)) ||
        (targetEng && targetEng === normalizeName(r.nameEnglish));
      if (!sameName) continue;
      const dist = distanceMeters(
        { lat: incoming.lat, lng: incoming.lng },
        { lat: r.lat, lng: r.lng }
      );
      // If both have coords, require ≤150m. If either lacks coords, name match is enough.
      if (dist <= PROXIMITY_M || !isFinite(dist)) {
        return { cat, r };
      }
    }
  }
  return null;
};

const enrichRestaurant = (
  existing: Restaurant,
  incoming: Partial<Restaurant>,
  stats: MergeStats
): Restaurant => {
  const out: Restaurant = { ...existing };
  for (const field of FILLABLE_RESTAURANT_FIELDS) {
    if (isEmpty(out[field]) && !isEmpty((incoming as any)[field])) {
      (out as any)[field] = (incoming as any)[field];
      stats.enrichedFields[field] = (stats.enrichedFields[field] || 0) + 1;
    }
  }
  // Append-merge for tags / recommendedDishes
  if (incoming.tags?.length) {
    const merged = dedupCaseInsensitive(out.tags || [], incoming.tags);
    if (merged.length !== (out.tags || []).length) {
      out.tags = merged.slice(0, 8);
      stats.enrichedFields['tags'] = (stats.enrichedFields['tags'] || 0) + 1;
    }
  }
  if (incoming.recommendedDishes?.length) {
    const merged = dedupCaseInsensitive(out.recommendedDishes || [], incoming.recommendedDishes);
    if (merged.length !== (out.recommendedDishes || []).length) {
      out.recommendedDishes = merged.slice(0, 8);
      stats.enrichedFields['recommendedDishes'] = (stats.enrichedFields['recommendedDishes'] || 0) + 1;
    }
  }
  // Verification: keep 'verified' (Photon-confirmed) — never downgrade to 'manual'
  // No-op; we already started from existing.
  return out;
};

const buildNewRestaurant = (incoming: Partial<Restaurant>): Restaurant => {
  const id = (globalThis.crypto?.randomUUID?.() || `dr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return {
    id,
    name: incoming.name || incoming.nameEnglish || '',
    nameEnglish: incoming.nameEnglish,
    description: incoming.description || '',
    location: incoming.location || '',
    lat: incoming.lat,
    lng: incoming.lng,
    priceRange: incoming.priceRange,
    priceLevel: incoming.priceLevel,
    cuisine: incoming.cuisine,
    must_try_dish: incoming.must_try_dish,
    recommendedDishes: incoming.recommendedDishes?.slice(0, 5),
    vibe: incoming.vibe,
    bestTime: incoming.bestTime,
    reservationRequired: incoming.reservationRequired,
    googleRating: incoming.googleRating,
    reviewCount: incoming.reviewCount,
    michelin: incoming.michelin,
    tags: incoming.tags?.slice(0, 5),
    recommendationSource: incoming.recommendationSource,
    categoryTitle: incoming.categoryTitle,
    googleMapsUrl: incoming.googleMapsUrl,
    googleSearchQuery: incoming.googleSearchQuery,
    verificationStatus: 'manual',
    verificationSource: 'manual',
    verifiedAt: Date.now(),
  };
};

// ---------- ATTRACTIONS ----------

const findExistingAttraction = (
  incoming: Partial<Attraction>,
  cats: AttractionCategory[]
): { cat: AttractionCategory; a: Attraction } | null => {
  const targetName = normalizeName(incoming.name);
  const targetEng = normalizeName(incoming.nameEnglish);
  for (const cat of cats) {
    for (const a of cat.attractions) {
      const sameName =
        (targetName && targetName === normalizeName(a.name)) ||
        (targetEng && targetEng === normalizeName(a.nameEnglish));
      if (!sameName) continue;
      const dist = distanceMeters(
        { lat: incoming.lat, lng: incoming.lng },
        { lat: a.lat, lng: a.lng }
      );
      if (dist <= PROXIMITY_M || !isFinite(dist)) {
        return { cat, a };
      }
    }
  }
  return null;
};

const enrichAttraction = (
  existing: Attraction,
  incoming: Partial<Attraction>,
  stats: MergeStats
): Attraction => {
  const out: Attraction = { ...existing };
  for (const field of FILLABLE_ATTRACTION_FIELDS) {
    if (isEmpty(out[field]) && !isEmpty((incoming as any)[field])) {
      (out as any)[field] = (incoming as any)[field];
      stats.enrichedFields[field] = (stats.enrichedFields[field] || 0) + 1;
    }
  }
  return out;
};

const buildNewAttraction = (incoming: Partial<Attraction>): Attraction => {
  const id = (globalThis.crypto?.randomUUID?.() || `dr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return {
    id,
    name: incoming.name || incoming.nameEnglish || '',
    nameEnglish: incoming.nameEnglish,
    description: incoming.description || '',
    location: incoming.location || '',
    lat: incoming.lat,
    lng: incoming.lng,
    price: incoming.price,
    costNumeric: incoming.costNumeric,
    rating: incoming.rating,
    reviewCount: incoming.reviewCount,
    type: incoming.type,
    activity_type: incoming.activity_type,
    duration: incoming.duration,
    best_time_to_visit: incoming.best_time_to_visit,
    recommendationSource: incoming.recommendationSource,
    categoryTitle: incoming.categoryTitle,
    googleMapsUrl: incoming.googleMapsUrl,
    verificationStatus: 'manual',
    verificationSource: 'manual',
    verifiedAt: Date.now(),
  };
};

// ---------- TOP-LEVEL MERGE ----------

export interface DeepResearchPayload {
  restaurants?: Partial<Restaurant>[];
  attractions?: Partial<Attraction>[];
  newRestaurantCategories?: string[];
  newAttractionCategories?: string[];
}

const ensureCategory = <T extends RestaurantCategory | AttractionCategory>(
  cats: T[],
  title: string,
  region: string,
  emptyEntries: 'restaurants' | 'attractions'
): T => {
  let existing = cats.find(c => c.title === title);
  if (existing) return existing;
  const id = (globalThis.crypto?.randomUUID?.() || `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const base: any = { id, title, region };
  base[emptyEntries] = [];
  cats.push(base as T);
  return base as T;
};

export const mergeDeepResearchData = (
  trip: Trip,
  payload: DeepResearchPayload
): { trip: Trip; stats: MergeStats } => {
  const stats: MergeStats = {
    newRestaurants: 0,
    enrichedRestaurants: 0,
    skippedRestaurants: 0,
    newAttractions: 0,
    enrichedAttractions: 0,
    skippedAttractions: 0,
    enrichedFields: {},
  };

  // Deep-clone the affected slices so we never mutate the user's current state in place.
  const aiRestaurants: RestaurantCategory[] = JSON.parse(JSON.stringify(trip.aiRestaurants || trip.restaurants || []));
  const aiAttractions: AttractionCategory[] = JSON.parse(JSON.stringify(trip.aiAttractions || trip.attractions || []));

  const region = trip.destination || trip.destinationEnglish || '';

  // ---- RESTAURANTS ----
  for (const incoming of payload.restaurants || []) {
    if (!incoming.name && !incoming.nameEnglish) {
      stats.skippedRestaurants++;
      continue;
    }
    const match = findExistingRestaurant(incoming, aiRestaurants);
    if (match) {
      const before = match.r;
      const after = enrichRestaurant(before, incoming, stats);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      if (changed) {
        const idx = match.cat.restaurants.findIndex(x => x.id === before.id);
        match.cat.restaurants[idx] = after;
        stats.enrichedRestaurants++;
      } else {
        stats.skippedRestaurants++;
      }
    } else {
      const cat = ensureCategory(aiRestaurants, incoming.categoryTitle || 'אוכל מקומי אותנטי', region, 'restaurants');
      cat.restaurants.push(buildNewRestaurant(incoming));
      stats.newRestaurants++;
    }
  }

  // ---- ATTRACTIONS ----
  for (const incoming of payload.attractions || []) {
    if (!incoming.name && !incoming.nameEnglish) {
      stats.skippedAttractions++;
      continue;
    }
    const match = findExistingAttraction(incoming, aiAttractions);
    if (match) {
      const before = match.a;
      const after = enrichAttraction(before, incoming, stats);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      if (changed) {
        const idx = match.cat.attractions.findIndex(x => x.id === before.id);
        match.cat.attractions[idx] = after;
        stats.enrichedAttractions++;
      } else {
        stats.skippedAttractions++;
      }
    } else {
      const cat = ensureCategory(aiAttractions, incoming.categoryTitle || 'אתרי חובה', region, 'attractions');
      cat.attractions.push(buildNewAttraction(incoming));
      stats.newAttractions++;
    }
  }

  return {
    trip: { ...trip, aiRestaurants, aiAttractions },
    stats,
  };
};
