/**
 * Name-indexed lookup over the curated research JSONs. Used as a "first truth"
 * layer: when Gemini's background research returns a restaurant/attraction,
 * we check if the same place exists in our hand-curated dataset and merge in
 * its enriched fields (Google placeId, opening hours, phone, website, price level).
 *
 * The JSONs are bundled by Vite at build time (~270 KB raw / ~80 KB gzipped).
 * If bundle size becomes a concern, swap to dynamic import().
 */

import attractionsAllRaw from '../research/all-attractions.json';
import restaurantsAllRaw from '../research/all-restaurants.json';

export interface ResearchEntry {
  name: string;
  nameEnglish?: string;
  description?: string;
  location?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
  categoryTitle?: string;
  recommendationSource?: string;
  rating?: number;
  reviewCount?: number;
  price?: string;
  costNumeric?: number;
  // Pro-tier Google fields (filled by scripts/enrich-research.ts).
  googlePlaceId?: string;
  googleOpeningHours?: string[];
  googlePhone?: string;
  googleWebsiteUri?: string;
  googlePriceLevel?: string;
  googleEnrichedAt?: number;
  googleNotFound?: boolean;
  [k: string]: any;
}

const attractionsAll = attractionsAllRaw as { attractions: ResearchEntry[] };
const restaurantsAll = restaurantsAllRaw as { restaurants: ResearchEntry[] };

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')           // strip combining diacritics
    .replace(/[^\p{L}\p{N}]+/gu, '')           // keep only letters + digits (Unicode-aware)
    .trim();

function buildIndex(list: ResearchEntry[]): Map<string, ResearchEntry> {
  const idx = new Map<string, ResearchEntry>();
  for (const entry of list) {
    if (entry.name) idx.set(normalize(entry.name), entry);
    if (entry.nameEnglish) idx.set(normalize(entry.nameEnglish), entry);
  }
  return idx;
}

const attractionIndex = buildIndex(attractionsAll.attractions);
const restaurantIndex = buildIndex(restaurantsAll.restaurants);

export function findResearchMatch(
  name: string | undefined,
  kind: 'attraction' | 'restaurant'
): ResearchEntry | null {
  if (!name) return null;
  const key = normalize(name);
  if (!key) return null;
  const idx = kind === 'attraction' ? attractionIndex : restaurantIndex;
  return idx.get(key) ?? null;
}

/**
 * Merge a research-JSON entry into an AI-generated place. Research data wins
 * for "first truth" fields (Google enrichment, coordinates, curated source).
 * AI's description wins because it's freshly written for the trip context.
 */
export function applyResearchEnrichment<T extends Record<string, any>>(
  aiItem: T,
  match: ResearchEntry
): T {
  const merged: Record<string, any> = { ...aiItem };
  // First-truth fields — JSON wins when present.
  if (match.googlePlaceId) merged.googlePlaceId = match.googlePlaceId;
  if (match.googleOpeningHours) merged.googleOpeningHours = match.googleOpeningHours;
  if (match.googlePhone) merged.googlePhone = match.googlePhone;
  if (match.googleWebsiteUri) merged.googleWebsiteUri = match.googleWebsiteUri;
  if (match.googlePriceLevel) merged.googlePriceLevel = match.googlePriceLevel;
  if (match.googleEnrichedAt) merged.googleEnrichedAt = match.googleEnrichedAt;
  if (typeof match.lat === 'number' && typeof match.lng === 'number') {
    merged.lat = match.lat;
    merged.lng = match.lng;
  }
  if (match.googleMapsUrl) merged.googleMapsUrl = match.googleMapsUrl;
  // Fill-when-missing fields — keep AI value if it set one.
  if (!merged.recommendationSource && match.recommendationSource) merged.recommendationSource = match.recommendationSource;
  if (!merged.categoryTitle && match.categoryTitle) merged.categoryTitle = match.categoryTitle;
  // Mark verification short-circuit — these are hand-verified, no need to re-Photon them.
  merged.verificationStatus = 'verified';
  merged.fromResearchJSON = true;
  return merged as T;
}

/** Diagnostics — how many entries we indexed. */
export const researchStats = {
  attractions: attractionsAll.attractions.length,
  restaurants: restaurantsAll.restaurants.length,
};
