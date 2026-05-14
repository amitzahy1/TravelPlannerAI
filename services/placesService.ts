/**
 * Google Places API (New) client — for enriching saved restaurants and attractions
 * with opening hours, phone number, website URL, price level.
 *
 * COST DISCIPLINE — read before changing anything in this file.
 *
 *   Tier pricing model (post-2025):
 *     - Essentials (id, displayName, location):           10,000/month free
 *     - Pro (hours, phone, website, priceLevel, search):  5,000/month free
 *     - Enterprise (photos, rating, reviews):             1,000/month free
 *
 *   Google bills every call at the HIGHEST tier requested in its field mask.
 *   We deliberately ask for Pro-tier fields only — never Enterprise.
 *
 *   Per place enriched = 1 Text Search (Pro) + 1 Place Details (Pro) = 2 Pro calls.
 *   ~260 places × 2 = ~520 Pro calls = well inside 5,000/month free.
 *
 * FIELD MASK — never widen this without re-checking cost tiers:
 *   - id, displayName              → Essentials (free)
 *   - regularOpeningHours,
 *     currentOpeningHours,
 *     internationalPhoneNumber,
 *     websiteUri,
 *     googleMapsUri,
 *     priceLevel                   → Pro (5k/month free)
 *
 *   NEVER add: photos, rating, userRatingCount, reviews — all Enterprise tier.
 *   Photos are also $7/1k extra. We rely on AI/curated imagery instead.
 *
 * KILL SWITCH:
 *   - Set VITE_PLACES_DISABLED=true in .env.local to short-circuit every call.
 *   - Every function throws PlacesDisabledError before any fetch.
 *
 * SECURITY:
 *   - Key is in VITE_GOOGLE_MAPS_API_KEY (client-side env).
 *   - Key is HTTP-referrer restricted (localhost + your production host).
 *   - Key is API-restricted to Places API (New) + Maps Embed API only.
 *   - .env.local is gitignored.
 */

const API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const PLACES_HOST = 'https://places.googleapis.com';

// Hard kill switch — set VITE_PLACES_DISABLED=true in .env.local to short-circuit
// every Places call before any fetch. Belt-and-suspenders with the Cloud Console
// per-day quota cap. Cheaper to flip than to revert code.
const PLACES_DISABLED = (import.meta as any).env?.VITE_PLACES_DISABLED === 'true';

// One-time boot log so the user can quickly check from the browser console
// whether the build picked up the key. Truncates the value for safety.
if (typeof window !== 'undefined') {
  if (PLACES_DISABLED) {
    console.log('[GooglePlaces] DISABLED via VITE_PLACES_DISABLED — no API calls will be made');
  } else {
    const present = !!API_KEY;
    const preview = API_KEY ? `${API_KEY.slice(0, 6)}…${API_KEY.slice(-4)}` : '(missing)';
    console.log(`[GooglePlaces] API key on boot: present=${present} preview=${preview}`);
  }
}

export const isPlacesDisabled = () => PLACES_DISABLED;

export class PlacesDisabledError extends Error {
  constructor() {
    super('Google Places API disabled via VITE_PLACES_DISABLED');
    this.name = 'PlacesDisabledError';
  }
}

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'regularOpeningHours',
  'currentOpeningHours',
  'internationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'priceLevel',
  // DROPPED — Enterprise tier (only 1k/month free, ~3x cost): photos, rating, userRatingCount.
].join(',');

const SEARCH_FIELD_MASK = ['places.id', 'places.displayName', 'places.location'].join(',');

export class PlacesQuotaExceededError extends Error {
  constructor() {
    super('הגעת למכסת היומית של Google Maps. נסה שוב מחר.');
    this.name = 'PlacesQuotaExceededError';
  }
}

export class PlacesKeyError extends Error {
  constructor(detail?: string) {
    super(`Google Maps API key error${detail ? ': ' + detail : ''}`);
    this.name = 'PlacesKeyError';
  }
}

export interface PlaceDetails {
  placeId: string;
  displayName?: string;
  phone?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  priceLevel?:
    | 'PRICE_LEVEL_FREE'
    | 'PRICE_LEVEL_INEXPENSIVE'
    | 'PRICE_LEVEL_MODERATE'
    | 'PRICE_LEVEL_EXPENSIVE'
    | 'PRICE_LEVEL_VERY_EXPENSIVE';
  openingHours?: string[]; // weekdayDescriptions, e.g. ["Monday: 9:00 AM – 10:00 PM", ...]
  openNow?: boolean;
}

const headers = (extraMask?: string): HeadersInit => {
  if (!API_KEY) throw new PlacesKeyError('VITE_GOOGLE_MAPS_API_KEY is not set');
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': extraMask ?? DETAILS_FIELD_MASK,
  };
};

async function handleResponse(res: Response): Promise<any> {
  if (res.status === 429) {
    console.warn('[GooglePlaces] 429 quota exceeded — daily cap reached, try again tomorrow');
    throw new PlacesQuotaExceededError();
  }
  if (res.status === 403) {
    const body = await res.text().catch(() => '');
    console.error('[GooglePlaces] 403 forbidden — probably HTTP-referrer restriction blocking the current domain, or wrong API key. Body:', body.slice(0, 400));
    throw new PlacesKeyError(body.slice(0, 200));
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[GooglePlaces] ${res.status} error:`, body.slice(0, 400));
    throw new Error(`Places API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Find a Google placeId by name + biased location. Returns null on no match.
 * Costs 1 Text Search call (~$0.032). Call this only once per saved place —
 * subsequent enrichments should reuse the returned placeId.
 */
export async function findPlaceId(
  name: string,
  lat: number,
  lng: number,
  radiusMeters = 500
): Promise<string | null> {
  if (PLACES_DISABLED) throw new PlacesDisabledError();
  if (!name) return null;
  const body = {
    textQuery: name,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    maxResultCount: 1,
  };
  console.log(`[GooglePlaces] findPlaceId → searchText`, { name, lat, lng });
  const res = await fetch(`${PLACES_HOST}/v1/places:searchText`, {
    method: 'POST',
    headers: headers(SEARCH_FIELD_MASK),
    body: JSON.stringify(body),
  });
  const data = await handleResponse(res);
  const first = data?.places?.[0];
  console.log(`[GooglePlaces] findPlaceId ← `, { name, foundId: first?.id ?? null, foundName: first?.displayName?.text });
  return first?.id ?? null;
}

/**
 * Fetch Place Details by placeId using the Pro-tier FieldMask above.
 * Pure Pro-tier call (~5k/month free). No photos, no rating, no reviews.
 * Cache the result — don't call on every page view.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  if (PLACES_DISABLED) throw new PlacesDisabledError();
  if (!placeId) throw new Error('placeId is required');
  console.log(`[GooglePlaces] getPlaceDetails →`, placeId);
  const res = await fetch(`${PLACES_HOST}/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: headers(),
  });
  const data = await handleResponse(res);
  console.log(`[GooglePlaces] getPlaceDetails ←`, {
    placeId,
    displayName: data?.displayName?.text,
    hasHours: !!(data?.regularOpeningHours?.weekdayDescriptions?.length),
    hasPhone: !!data?.internationalPhoneNumber,
    hasWebsite: !!data?.websiteUri,
  });

  return {
    placeId: data.id,
    displayName: data.displayName?.text,
    phone: data.internationalPhoneNumber,
    websiteUri: data.websiteUri,
    googleMapsUri: data.googleMapsUri,
    priceLevel: data.priceLevel,
    openingHours: data.regularOpeningHours?.weekdayDescriptions,
    openNow: data.currentOpeningHours?.openNow,
  };
}

/**
 * Convenience: find + fetch in one call. Use for the initial enrichment.
 * Re-enrichment by placeId is cheaper — use getPlaceDetails(placeId) directly.
 */
export async function enrichPlaceByName(
  name: string,
  lat: number,
  lng: number
): Promise<PlaceDetails | null> {
  const placeId = await findPlaceId(name, lat, lng);
  if (!placeId) return null;
  return getPlaceDetails(placeId);
}

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function isEnrichmentStale(googleEnrichedAt?: number): boolean {
  if (!googleEnrichedAt) return true;
  return Date.now() - googleEnrichedAt > STALE_AFTER_MS;
}

export interface EnrichableInput {
  name: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
  googleEnrichedAt?: number;
}

export interface EnrichmentPatch {
  googlePlaceId?: string;
  googleEnrichedAt: number;
  googleOpeningHours?: string[];
  googleOpenNow?: boolean;
  googlePhone?: string;
  googleWebsiteUri?: string;
  googleMapsUriCanonical?: string;
  googlePriceLevel?: PlaceDetails['priceLevel'];
  /** True when Text Search returned no match — surfaces an X badge on the card. */
  googleNotFound?: boolean;
}

export interface BulkEnrichInput extends EnrichableInput {
  id: string;
}

export interface BulkEnrichOutcome {
  updated: number;
  skippedCached: number;
  notFound: number;
  failed: number;
  stoppedOnQuota: boolean;
}

/**
 * Sequentially enrich a list of saved places. Skips items that were enriched
 * within the last 30 days (zero cost). Adds a small delay between calls so we
 * stay under the 60/minute quota cap. Stops cleanly on PlacesQuotaExceededError
 * so a partial result is still useful — the rest can resume tomorrow.
 *
 * The `onPatch` callback is called once per successfully-enriched item with
 * the place id and the EnrichmentPatch. The caller is responsible for merging
 * the patch into its data store.
 */
export async function bulkEnrichPlaces(
  places: BulkEnrichInput[],
  onPatch: (id: string, patch: EnrichmentPatch) => void,
  onProgress?: (state: { current: number; total: number; updated: number; skippedCached: number }) => void,
  options: { delayMs?: number; force?: boolean } = {}
): Promise<BulkEnrichOutcome> {
  if (PLACES_DISABLED) throw new PlacesDisabledError();
  const delayMs = options.delayMs ?? 600;
  const outcome: BulkEnrichOutcome = {
    updated: 0,
    skippedCached: 0,
    notFound: 0,
    failed: 0,
    stoppedOnQuota: false,
  };
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    onProgress?.({ current: i, total: places.length, updated: outcome.updated, skippedCached: outcome.skippedCached });
    try {
      const patch = await enrichSavedPlace(place, { force: options.force });
      if (patch) {
        onPatch(place.id, patch);
        if (patch.googleNotFound) outcome.notFound++;
        else outcome.updated++;
      } else if (!isEnrichmentStale(place.googleEnrichedAt)) {
        outcome.skippedCached++;
      } else {
        outcome.notFound++;
      }
    } catch (err: any) {
      if (err instanceof PlacesQuotaExceededError) {
        outcome.stoppedOnQuota = true;
        onProgress?.({ current: i, total: places.length, updated: outcome.updated, skippedCached: outcome.skippedCached });
        return outcome;
      }
      // PlacesKeyError or unexpected error — also stop, surface to caller.
      if (err instanceof PlacesKeyError) throw err;
      outcome.failed++;
      console.warn('[GooglePlaces] bulk enrich failed for', place.name, err);
    }
    if (i < places.length - 1 && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  onProgress?.({ current: places.length, total: places.length, updated: outcome.updated, skippedCached: outcome.skippedCached });
  return outcome;
}

/**
 * Run the full enrichment flow for a saved restaurant/attraction.
 *  - If we already have a placeId, skip Text Search and call Place Details directly.
 *  - If `force` is false and enrichment is fresh (<30 days), returns null
 *    so the caller can skip the API call entirely (zero cost).
 *  - If no placeId yet and lat/lng are missing, returns null (can't bias the search).
 *
 * Returns the EnrichmentPatch to merge into the place object — or null on
 * no-op / no match. Throws PlacesQuotaExceededError or PlacesKeyError on
 * non-recoverable API failures; the caller surfaces a Hebrew toast.
 */
export async function enrichSavedPlace(
  place: EnrichableInput,
  options: { force?: boolean } = {}
): Promise<EnrichmentPatch | null> {
  if (PLACES_DISABLED) throw new PlacesDisabledError();
  // Cache hit — skip API entirely. Also covers the not-found case: once we've
  // tried and failed, we won't re-hit Google for 30 days.
  const cachedAndFresh = !options.force && !isEnrichmentStale(place.googleEnrichedAt);
  if (cachedAndFresh && (place.googlePlaceId || (place as any).googleNotFound)) {
    return null;
  }

  // Need a placeId; either we already have one or we need to find it.
  let placeId = place.googlePlaceId;
  if (!placeId) {
    if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return null;
    const found = await findPlaceId(place.name, place.lat, place.lng);
    if (!found) {
      // Lookup failed — return a patch that records the failure so the caller
      // can show an X badge AND skip Google for the next 30 days.
      return {
        googleEnrichedAt: Date.now(),
        googleNotFound: true,
      };
    }
    placeId = found;
  }

  const details = await getPlaceDetails(placeId);

  return {
    googlePlaceId: details.placeId,
    googleEnrichedAt: Date.now(),
    googleOpeningHours: details.openingHours,
    googleOpenNow: details.openNow,
    googlePhone: details.phone,
    googleWebsiteUri: details.websiteUri,
    googleMapsUriCanonical: details.googleMapsUri,
    googlePriceLevel: details.priceLevel,
    googleNotFound: false, // clear stale flag if a previously-not-found place is now indexed
  };
}
