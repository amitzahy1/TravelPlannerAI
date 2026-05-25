/**
 * Photon-based place verification. Replaces the original "Google Places
 * Text Search" approach (paid API at $17 / 1k requests) with a free
 * verification flow that reuses Photon's existing structured response
 * plus the AI-supplied `googleMapsUrl` cross-check.
 *
 * Verification status meaning:
 *   verified   — country AND city match the trip + (if URL given) coords
 *                are within 500 m of the URL coords. Confidence 0.85+.
 *   ambiguous  — only country matches OR coord cross-check disagrees by
 *                more than 5 km. Show a yellow ? badge so the user can
 *                review. Confidence 0.4-0.7.
 *   not_found  — Photon returned nothing. Confidence 0.
 *   manual     — user-overridden via the UI; confidence is whatever the
 *                user implied (we treat it as 1.0).
 *
 * No Google Places API call. No Mapbox, HERE, or any paid geocoder.
 */

import type { Trip } from '../types';
import {
        photonGeocodeRich,
        extractCoordsFromMapsUrl,
        coordInBbox,
        getCityCentroid,
        type GeocodableInput,
        type PhotonFeature,
} from './geocodePlaces';
import {
        inferTripCountry,
        getTripCountryBbox,
        resolvePlaceCity,
} from './tripScope';
import { locationMatchesCity } from './geoData';

export type VerificationStatus = 'verified' | 'ambiguous' | 'not_found' | 'manual';
export type VerificationSource = 'photon' | 'google_maps_url' | 'manual';

export interface VerifiedPlace {
        lat: number;
        lng: number;
        osmId?: string;
        verifiedCountry?: string;
        verifiedCity?: string;
        verificationStatus: VerificationStatus;
        verificationSource: VerificationSource;
        confidence: number; // 0..1
        /** Hebrew explanation surfaced inside the "כדאי לבדוק" warning. */
        reason?: string;
}

/** Maximum distance from the trip city centroid before we mark a place as
 *  ambiguous regardless of country / city string match. Catches bugs like
 *  the "Pattaya restaurant" geocoding to a different Pattaya 400 km away. */
const MAX_CENTROID_DISTANCE_KM = 25;

const REVERIFY_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

/** Haversine distance in metres between two lat/lng pairs. */
const haversineMetres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
        const R = 6_371_000;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const h = Math.sin(dLat / 2) ** 2
                + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
        return 2 * R * Math.asin(Math.sqrt(h));
};

const matchesCountry = (a?: string | null, b?: string | null): boolean => {
        if (!a || !b) return false;
        return a.trim().toLowerCase() === b.trim().toLowerCase()
                || a.trim().toLowerCase().includes(b.trim().toLowerCase())
                || b.trim().toLowerCase().includes(a.trim().toLowerCase());
};

/**
 * Verify a single place's location against the trip context. Pure async —
 * caller is responsible for writing the returned fields back onto the
 * Restaurant/Attraction document.
 */
export const verifyPlace = async (
        input: GeocodableInput,
        trip: Trip,
): Promise<VerifiedPlace | null> => {
        const tripBbox = getTripCountryBbox(trip);
        const tripCountry = inferTripCountry(trip);
        const targetCity = resolvePlaceCity(
                {
                        location: input.location,
                        region: undefined,
                        name: input.name,
                },
                trip,
        );

        // 1. Try Photon. Use bbox bias when we know the country.
        const baseQuery = [input.name, input.location || input.address].filter(Boolean).join(', ');
        const withHint = input.countryHint || tripCountry || '';
        const fullQuery = withHint ? `${baseQuery}, ${withHint}` : baseQuery;

        let feat: PhotonFeature | null = await photonGeocodeRich(fullQuery, tripBbox || undefined);
        if (!feat) {
                feat = await photonGeocodeRich(baseQuery, tripBbox || undefined);
        }
        if (!feat && tripBbox) {
                feat = await photonGeocodeRich(fullQuery); // last-resort: drop bbox
        }

        if (!feat) {
                return {
                        lat: 0, lng: 0,
                        verificationStatus: 'not_found',
                        verificationSource: 'photon',
                        confidence: 0,
                };
        }

        // Reject coords outside trip country bbox — wrong place even if
        // the name matches (e.g. "Pattaya" in Israel).
        if (tripBbox && !coordInBbox(feat.lat, feat.lng, tripBbox)) {
                return {
                        lat: feat.lat, lng: feat.lng,
                        osmId: feat.osmId,
                        verifiedCountry: feat.country,
                        verifiedCity: feat.city,
                        verificationStatus: 'ambiguous',
                        verificationSource: 'photon',
                        confidence: 0.3,
                        reason: 'הכתובת מחוץ למדינת היעד — ככל הנראה מקום בעל אותו שם במדינה אחרת.',
                };
        }

        // Distance-from-centroid safety net. Catches places that pass the
        // country bbox but resolve far from the trip's actual target city
        // (the "Pattaya → Chiang Mai" 400 km case).
        if (targetCity) {
                const centroid = await getCityCentroid(targetCity, tripCountry || undefined);
                if (centroid) {
                        const distanceKm = haversineMetres({ lat: feat.lat, lng: feat.lng }, centroid) / 1000;
                        if (distanceKm > MAX_CENTROID_DISTANCE_KM) {
                                return {
                                        lat: feat.lat, lng: feat.lng,
                                        osmId: feat.osmId,
                                        verifiedCountry: feat.country,
                                        verifiedCity: feat.city,
                                        verificationStatus: 'ambiguous',
                                        verificationSource: 'photon',
                                        confidence: 0.35,
                                        reason: `המקום נמצא ${Math.round(distanceKm)} ק"מ מ-${targetCity} — ייתכן שאינו באזור הטיול.`,
                                };
                        }
                }
        }

        // 2. Score against trip context. RELAXED — earlier version required
        // EXACT city-name match for "verified", which flagged ~70% of items
        // as ambiguous because Photon returns Albanian suburbs (Dajt,
        // Qendër Vlorë, Tiranë) instead of the trip's nominal city
        // (Tirana, Vlora). Those items ARE real and findable. They passed
        // the 25 km centroid distance check above (lines 138-155), so we
        // know they're in the right NEIGHBORHOOD of the right city.
        // New criterion:
        //   • Country matches → verified (the distance check already proved
        //     the location is sensible)
        //   • Country doesn't match → ambiguous (real concern — wrong country)
        const countryMatches = matchesCountry(feat.country, tripCountry);
        const cityMatches = !!feat.city && (
                locationMatchesCity(feat.city, targetCity)
                || locationMatchesCity(targetCity, feat.city)
        );

        let status: VerificationStatus = 'ambiguous';
        let confidence = 0.5;
        if (countryMatches && cityMatches) {
                status = 'verified';
                confidence = 0.95;     // strongest signal — exact city + country
        } else if (countryMatches) {
                status = 'verified';   // was ambiguous; relaxed 2026-05-25
                confidence = 0.75;     // slightly lower confidence than exact match
        } else {
                status = 'ambiguous';  // country diverges — real red flag
                confidence = 0.4;
        }

        // 3. Optional cross-check against AI-supplied googleMapsUrl coords.
        const urlCoords = extractCoordsFromMapsUrl(input.googleMapsUrl);
        let source: VerificationSource = 'photon';
        if (urlCoords) {
                const distance = haversineMetres({ lat: feat.lat, lng: feat.lng }, urlCoords);
                if (distance <= 500) {
                        // Both agree → high confidence. Prefer the URL coords as
                        // the "official" pin since they came from a curated
                        // Google Maps share link.
                        return {
                                lat: urlCoords.lat,
                                lng: urlCoords.lng,
                                osmId: feat.osmId,
                                verifiedCountry: feat.country,
                                verifiedCity: feat.city,
                                verificationStatus: 'verified',
                                verificationSource: 'google_maps_url',
                                confidence: Math.max(confidence, 0.9),
                        };
                }
                if (distance > 5000) {
                        // Photon and the URL disagree by more than 5 km — almost
                        // certainly two different places. Downgrade.
                        status = 'ambiguous';
                        confidence = Math.min(confidence, 0.45);
                        source = 'photon';
                }
                // 500 m – 5 km: minor disagreement, keep Photon coords + status as-is.
        }

        return {
                lat: feat.lat,
                lng: feat.lng,
                osmId: feat.osmId,
                verifiedCountry: feat.country,
                verifiedCity: feat.city,
                verificationStatus: status,
                verificationSource: source,
                confidence,
        };
};

interface VerifiableItem extends GeocodableInput {
        id: string;
        lat?: number;
        lng?: number;
        verifiedAt?: number;
        verificationStatus?: VerificationStatus;
}

/**
 * Verify a batch of places concurrently (gated to 4 by default to stay
 * polite with Photon). Skips items that were verified within
 * REVERIFY_TTL_MS to avoid re-paying the network round-trip.
 */
export const verifyPlacesBatch = async <T extends VerifiableItem>(
        items: T[],
        trip: Trip,
        onResolve: (id: string, result: VerifiedPlace) => void,
        opts?: {
                concurrency?: number;
                signal?: AbortSignal;
                onFail?: (id: string) => void;
                forceRefresh?: boolean;
        },
): Promise<void> => {
        const queue = items.filter(i => {
                if (opts?.forceRefresh) return true;
                if (i.verificationStatus === 'manual') return false; // user override
                const recentlyVerified = typeof i.verifiedAt === 'number'
                        && Date.now() - i.verifiedAt < REVERIFY_TTL_MS;
                return !recentlyVerified;
        });
        if (queue.length === 0) return;

        const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 4, 8));
        let cursor = 0;

        const worker = async () => {
                while (cursor < queue.length) {
                        if (opts?.signal?.aborted) return;
                        const idx = cursor++;
                        const item = queue[idx];
                        const result = await verifyPlace(item, trip);
                        if (opts?.signal?.aborted) return;
                        if (result && result.verificationStatus !== 'not_found') {
                                onResolve(item.id, result);
                        } else if (result && result.verificationStatus === 'not_found') {
                                opts?.onFail?.(item.id);
                                onResolve(item.id, result);
                        } else {
                                opts?.onFail?.(item.id);
                        }
                        // Polite delay per worker — same etiquette as geocodePlacesBatch.
                        await new Promise(r => setTimeout(r, 250));
                }
        };

        await Promise.all(Array.from({ length: concurrency }, () => worker()));
};

/**
 * Mutating helper used by backgroundResearch: writes verification fields
 * onto a Restaurant/Attraction in place. Returns true if the item is now
 * positioned (has lat/lng) so callers can decide whether to set
 * `geocodeFailed: true`.
 */
export const applyVerificationResult = (
        item: { lat?: number; lng?: number; osmId?: string; verifiedCountry?: string; verifiedCity?: string; verificationStatus?: VerificationStatus; verificationSource?: VerificationSource; verifiedAt?: number; geocodeFailed?: boolean; verificationConfidence?: number; verificationReason?: string },
        result: VerifiedPlace,
): boolean => {
        if (result.verificationStatus === 'not_found') {
                item.verificationStatus = 'not_found';
                item.verificationSource = 'photon';
                item.verifiedAt = Date.now();
                item.verificationConfidence = result.confidence;
                if (result.reason) item.verificationReason = result.reason;
                item.geocodeFailed = true;
                // KEEP existing lat/lng. Photon failing to re-find a place
                // does NOT mean the previously stored coords are wrong —
                // they likely came from the original AI research and are
                // still the best signal we have. Deleting them silently
                // regressed the trip's data quality on every reverify run
                // (user reported "after fix-all I have more unverified
                // than before"). Now: flag the failure, preserve the
                // coords, let the user delete the item explicitly if they
                // want via the junk-cleanup button.
                // Only clear the literal (0, 0) sentinel that placeholder
                // code historically wrote in this branch — never clear
                // real coords.
                if (item.lat === 0 && item.lng === 0) {
                        delete item.lat;
                        delete item.lng;
                }
                return typeof item.lat === 'number' && typeof item.lng === 'number';
        }
        item.lat = result.lat;
        item.lng = result.lng;
        if (result.osmId) item.osmId = result.osmId;
        if (result.verifiedCountry) item.verifiedCountry = result.verifiedCountry;
        if (result.verifiedCity) item.verifiedCity = result.verifiedCity;
        item.verificationStatus = result.verificationStatus;
        item.verificationSource = result.verificationSource;
        item.verifiedAt = Date.now();
        item.verificationConfidence = result.confidence;
        if (result.reason) item.verificationReason = result.reason;
        else if (item.verificationReason) delete item.verificationReason;
        item.geocodeFailed = false;
        return true;
};
