/**
 * Google Places API (New) client — for enriching saved restaurants and attractions
 * with live photos, opening hours, current rating, phone number, website URL.
 *
 * COST DISCIPLINE — read before changing anything in this file.
 *
 *   Pricing (per 1,000 requests):
 *     - Text Search (New, Essentials):       $32
 *     - Place Details (with FieldMask used here, Enterprise+Pro):  ~$25
 *     - Place Photos (per photo load):       $7
 *
 *   Per place fully enriched once = Text Search + Place Details + Photo load
 *     = $0.032 + $0.025 + $0.007 ≈ $0.064 worst case (~$0.025 typical).
 *
 *   30 places × $0.064 = ~$1.92 one-time per trip. Then Firestore cache
 *   serves for 30 days at $0. Manual refresh is the only re-cost.
 *
 *   Google Cloud free credit on Maps Platform = $200/month → effectively $0
 *   for personal-scale usage. Hard daily quotas in Cloud Console cap worst
 *   case regardless.
 *
 * FIELD MASK — never widen this without re-checking cost tiers:
 *   - id, displayName              → Essentials (free)
 *   - regularOpeningHours,
 *     currentOpeningHours,
 *     internationalPhoneNumber,
 *     websiteUri,
 *     googleMapsUri,
 *     priceLevel                   → Pro ($20/1k)
 *   - photos,
 *     rating,
 *     userRatingCount              → Enterprise ($25/1k)
 *
 *   NEVER request `reviews` — it's the most expensive field and we don't use it.
 *
 * SECURITY:
 *   - Key is in VITE_GOOGLE_MAPS_API_KEY (client-side env).
 *   - Key is HTTP-referrer restricted (localhost + your production host).
 *   - Key is API-restricted to Places API (New) + Maps Embed API only.
 *   - .env.local is gitignored.
 */

const API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const PLACES_HOST = 'https://places.googleapis.com';

// One-time boot log so the user can quickly check from the browser console
// whether the build picked up the key. Truncates the value for safety.
if (typeof window !== 'undefined') {
  const present = !!API_KEY;
  const preview = API_KEY ? `${API_KEY.slice(0, 6)}…${API_KEY.slice(-4)}` : '(missing)';
  console.log(`[GooglePlaces] API key on boot: present=${present} preview=${preview}`);
}

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'photos',
  'regularOpeningHours',
  'currentOpeningHours',
  'rating',
  'userRatingCount',
  'internationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'priceLevel',
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
  rating?: number;
  reviewCount?: number;
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
  /** Resolved fully-qualified photo URL (cached, safe to render directly). */
  photoUrl?: string;
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
 * Fetch full Place Details by placeId using the strict FieldMask above.
 * Also resolves the first photo (if any) into a renderable CDN URL.
 *
 * Costs: 1 Place Details call (~$0.025) + 1 photo load if photos exist (~$0.007).
 * Don't call this on every page view — cache the result in Firestore.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
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
    rating: data?.rating,
    reviewCount: data?.userRatingCount,
    hasPhotos: !!(data?.photos?.length),
    hasHours: !!(data?.regularOpeningHours?.weekdayDescriptions?.length),
  });

  // Resolve first photo into a 800px CDN URL. We pass the API key in the
  // query string because the photo media endpoint follows a 302 to a Google
  // CDN that doesn't accept custom headers. The CDN URL is safe to store
  // and serve directly without re-billing — but the redirect URL has a
  // signed expiry so don't cache forever (we refetch via 30-day stale check).
  let photoUrl: string | undefined;
  const photoName: string | undefined = data?.photos?.[0]?.name;
  if (photoName && API_KEY) {
    photoUrl = `${PLACES_HOST}/v1/${photoName}/media?key=${encodeURIComponent(API_KEY)}&maxWidthPx=800`;
  }

  return {
    placeId: data.id,
    displayName: data.displayName?.text,
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    reviewCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : undefined,
    phone: data.internationalPhoneNumber,
    websiteUri: data.websiteUri,
    googleMapsUri: data.googleMapsUri,
    priceLevel: data.priceLevel,
    openingHours: data.regularOpeningHours?.weekdayDescriptions,
    openNow: data.currentOpeningHours?.openNow,
    photoUrl,
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
  googlePlaceId: string;
  googleEnrichedAt: number;
  googlePhotoUrl?: string;
  googleOpeningHours?: string[];
  googleOpenNow?: boolean;
  googlePhone?: string;
  googleWebsiteUri?: string;
  googleMapsUriCanonical?: string;
  googlePriceLevel?: PlaceDetails['priceLevel'];
  // Overwrite the recommendation-based rating with Google's live one
  // (caller decides whether to apply via the merge helper).
  googleRating?: number;
  googleReviewCount?: number;
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
        outcome.updated++;
      } else if (place.googlePlaceId && !isEnrichmentStale(place.googleEnrichedAt)) {
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
  // Cache hit — skip API entirely.
  if (!options.force && place.googlePlaceId && !isEnrichmentStale(place.googleEnrichedAt)) {
    return null;
  }

  // Need a placeId; either we already have one or we need to find it.
  let placeId = place.googlePlaceId;
  if (!placeId) {
    if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return null;
    const found = await findPlaceId(place.name, place.lat, place.lng);
    if (!found) return null;
    placeId = found;
  }

  const details = await getPlaceDetails(placeId);

  return {
    googlePlaceId: details.placeId,
    googleEnrichedAt: Date.now(),
    googlePhotoUrl: details.photoUrl,
    googleOpeningHours: details.openingHours,
    googleOpenNow: details.openNow,
    googlePhone: details.phone,
    googleWebsiteUri: details.websiteUri,
    googleMapsUriCanonical: details.googleMapsUri,
    googlePriceLevel: details.priceLevel,
    googleRating: details.rating,
    googleReviewCount: details.reviewCount,
  };
}
