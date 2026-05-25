/**
 * Shared trip-scope utilities. Replaces the duplicated `inTripScope`,
 * `restaurantMatchesCity`, `attractionMatchesCity`, and ad-hoc
 * `location.split(',').pop()` logic that previously lived inside
 * RestaurantsView and AttractionsView.
 *
 * Pure helpers — no React, no localStorage. Safe to unit-test and to
 * import from any view, hook, or service.
 */

import type { Trip, Restaurant, Attraction, HotelBooking } from '../types';
import {
    getTripCities,
    locationMatchesCity,
    getCountryForCity,
    cityKey,
    displayCityName,
} from './geoData';
import { getCountryBbox, coordInBbox, toEnglishCountryName, getCityBbox, getCityBboxSync } from './geocodePlaces';

export interface ScopedPlace {
    name?: string;
    location?: string;
    region?: string;
    description?: string;
}

/**
 * Best-effort country inference for a trip. Tries the destination string
 * first; if that fails (e.g. "Bangkok - Pattaya - Koh Chang" has no
 * country word), walks the trip's cities and returns the first one that
 * resolves to a country in our database.
 *
 * Returns the canonical English country name (e.g. "Thailand") so it can
 * be fed back into `getCountryBbox` and AI prompts that expect English.
 */
export const inferTripCountry = (trip: Trip): string | null => {
    const dest = trip.destinationEnglish || trip.destination || '';
    if (dest) {
        // toEnglishCountryName strips Hebrew aliases and "26 ימים" suffixes.
        const candidate = toEnglishCountryName(dest);
        if (getCountryBbox(candidate)) {
            // Title-case to match WORLD_DESTINATIONS keys.
            return candidate.replace(/\b\w/g, c => c.toUpperCase());
        }
    }

    // Fall back: walk every city we know about for the trip.
    const cities = getTripCities(trip, { excludeFlightOnly: true, lang: 'en' });
    for (const city of cities) {
        const country = getCountryForCity(city);
        if (country) return country;
    }

    // Last resort: include flight-only cities (covers layover-heavy itineraries
    // where the user hasn't booked hotels yet).
    const allCities = getTripCities(trip, { lang: 'en' });
    for (const city of allCities) {
        const country = getCountryForCity(city);
        if (country) return country;
    }

    return null;
};

/**
 * Country bbox for the trip — combines `inferTripCountry` with the
 * existing `getCountryBbox` so callers can geocode-bias without
 * caring how the country was resolved.
 */
export const getTripCountryBbox = (
    trip: Trip,
): [number, number, number, number] | null => {
    const country = inferTripCountry(trip);
    if (!country) return null;
    return getCountryBbox(country);
};

/**
 * Does this place fall inside the trip's scope? A place is in scope if
 * any of its location / region / description fields match any of the
 * trip's cities (case-insensitive, Hebrew/English agnostic).
 *
 * Places with NO location info at all are given the benefit of the
 * doubt — same behaviour the old per-view `inTripScope` had — so AI
 * results that omit a location don't get dropped silently.
 */
export const isPlaceInTripScope = (trip: Trip, place: ScopedPlace): boolean => {
    const loc = place.location || '';
    const region = place.region || '';
    const desc = place.description || '';
    if (!loc && !region && !desc) return true;

    const cities = getTripCities(trip);
    if (cities.length === 0) return true; // no cities resolved → don't filter

    return cities.some(city =>
        locationMatchesCity(loc, city)
        || locationMatchesCity(region, city)
        || locationMatchesCity(desc, city),
    );
};

/**
 * Resolve the most-specific city for a place when saving it to the
 * trip. Preference order:
 *   1. `place.region` if it matches a known trip city
 *   2. last `,`-segment of `place.location` if it matches a trip city
 *   3. caller-supplied `selectedCity` (UI filter state)
 *   4. trip.destination (final fallback so we always return something)
 *
 * Replaces the naive `location.split(',').pop()` heuristic that
 * accidentally returned neighborhood names ("Sukhumvit") instead of
 * cities ("Bangkok").
 */
export const resolvePlaceCity = (
    place: ScopedPlace,
    trip: Trip,
    selectedCity?: string,
): string => {
    const tripCities = getTripCities(trip);

    const matchAgainstTripCities = (candidate: string): string | null => {
        if (!candidate) return null;
        for (const city of tripCities) {
            if (locationMatchesCity(candidate, city)) return city;
        }
        return null;
    };

    // 1. region (most reliable when AI sets it)
    const fromRegion = matchAgainstTripCities(place.region || '');
    if (fromRegion) return fromRegion;

    // 2. last segment of location
    const parts = (place.location || '').split(',').map(s => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
        const fromPart = matchAgainstTripCities(parts[i]);
        if (fromPart) return fromPart;
    }

    // 3. fallback to UI-selected city if provided and not "all"
    if (selectedCity && selectedCity !== 'all') {
        const fromSelected = matchAgainstTripCities(selectedCity);
        if (fromSelected) return fromSelected;
        return selectedCity;
    }

    // 4. last resort — keep current behavior so we never return ""
    if (place.region) return place.region;
    if (parts.length > 0) return parts[parts.length - 1];
    return trip.destination || '';
};

/**
 * Canonical key for dedupe by "same place, different spelling".
 * Combines the existing `cityKey` normalisation with simple
 * apostrophe / whitespace stripping so "Sorn Bangkok" and
 * "Sorn, Bangkok" hash to the same thing.
 */
export const normalizePlaceName = (name: string): string => {
    if (!name) return '';
    return name
        .normalize('NFC')
        .toLowerCase()
        .replace(/[‘’״׳′‵`´']/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[,.;:!?]/g, '')
        .trim();
};

/**
 * Compose a normalized "name + city" dedupe key — used by the Data
 * Health panel to count duplicate restaurants/attractions across
 * categories without false positives from punctuation drift.
 */
export const placeDedupeKey = (
    place: { name?: string; region?: string; location?: string; verifiedCity?: string },
    trip?: Trip,
): string => {
    const name = normalizePlaceName(place.name || '');
    // City preference: verifiedCity (set by reverify — always normalized to
    // the real-world city Photon resolved) > region (AI-assigned, often
    // wrong when the AI duplicated an item across city lists) > location
    // last-segment > trip.destination. Using region as the primary key
    // missed duplicates like "Nouvelle Vague" appearing 3 times under
    // 3 different region tags ("Vlora", "Tirana", "all") even though
    // they all geocode to the same Tirana spot. After reverify writes
    // verifiedCity, the keys collapse and dedupe finds them.
    let city = place.verifiedCity || place.region || '';
    if (!city && place.location) {
        const parts = place.location.split(',').map(s => s.trim()).filter(Boolean);
        city = parts[parts.length - 1] || '';
    }
    if (!city && trip) city = trip.destination || '';
    return `${name}|${cityKey(city)}`;
};

/**
 * Convenience wrappers that accept a `Restaurant` / `Attraction`
 * directly — useful for callers that want type-safe inputs without
 * converting to `ScopedPlace`.
 */
export const restaurantInTripScope = (trip: Trip, r: Restaurant): boolean =>
    isPlaceInTripScope(trip, { location: r.location, region: r.region });

export const attractionInTripScope = (trip: Trip, a: Attraction): boolean =>
    isPlaceInTripScope(trip, {
        location: a.location,
        region: a.region,
        description: a.description,
    });

/**
 * Re-export of `displayCityName` so callers that use the trip scope
 * util don't need a second import for the common Hebrew/English
 * display formatting.
 */
export { displayCityName };

// ─────────────────────────────────────────────────────────────────────────
// Strict trip-country whitelist (used by the full-map view).
// A trip "country" is the set of countries the user is actually visiting,
// derived from hotels + the destination string. The map shows only items
// inside this set — origin/return airports, layovers, and out-of-country
// AI suggestions all get filtered out by a single predicate.
// ─────────────────────────────────────────────────────────────────────────

const HEBREW_TO_ENGLISH_COUNTRY_PARSE = (raw: string): string | null => {
    if (!raw) return null;
    const candidate = toEnglishCountryName(raw);
    if (getCountryBbox(candidate)) {
        return candidate.replace(/\b\w/g, c => c.toUpperCase());
    }
    return null;
};

/** Parse a country out of a hotel address (last comma segment), with Hebrew alias support. */
const countryFromHotelAddress = (address?: string): string | null => {
    if (!address) return null;
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
        const c = HEBREW_TO_ENGLISH_COUNTRY_PARSE(parts[i]);
        if (c) return c;
    }
    return null;
};

/** Resolve the country for a hotel (verifiedCountry → address → city lookup). */
export const getCountryForHotel = (hotel: HotelBooking): string | null => {
    const v = (hotel as any).verifiedCountry as string | undefined;
    if (v) {
        const c = HEBREW_TO_ENGLISH_COUNTRY_PARSE(v);
        if (c) return c;
    }
    const fromAddress = countryFromHotelAddress(hotel.address);
    if (fromAddress) return fromAddress;
    if (hotel.city) {
        const fromCity = getCountryForCity(hotel.city);
        if (fromCity) return fromCity;
    }
    return null;
};

/** Split a multi-country destination string ("Thailand - Vietnam") into individual country names. */
const splitDestinationIntoCountries = (raw: string): string[] => {
    if (!raw) return [];
    return raw
        .split(/[-–—,&]/)
        .map(s => s.trim())
        .map(s => HEBREW_TO_ENGLISH_COUNTRY_PARSE(s))
        .filter((c): c is string => !!c);
};

/**
 * The trip-country whitelist. A country is in the set if (a) any hotel is
 * located there, or (b) it's part of the explicit destination string.
 * Flight origin/destination countries do NOT auto-qualify — that's the
 * whole point of this strict whitelist.
 */
export const getTripCountries = (trip: Trip): Set<string> => {
    const set = new Set<string>();

    // Hotels — primary source of truth.
    (trip.hotels || []).forEach(h => {
        const c = getCountryForHotel(h);
        if (c) set.add(c);
    });

    // Explicit destination string (handles multi-country trips).
    const destStr = trip.destinationEnglish || trip.destination || '';
    splitDestinationIntoCountries(destStr).forEach(c => set.add(c));

    return set;
};

/**
 * Array of bboxes, one per trip country. The map can iterate to test if a
 * lat/lng falls inside any of them.
 */
export const getTripCountryBboxes = (trip: Trip): Array<[number, number, number, number]> => {
    const out: Array<[number, number, number, number]> = [];
    for (const country of getTripCountries(trip)) {
        const bbox = getCountryBbox(country);
        if (bbox) out.push(bbox);
    }
    return out;
};

/** Does this lat/lng fall inside any of the trip's country bboxes? */
export const coordInTripCountries = (lat: number, lng: number, trip: Trip): boolean => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const bboxes = getTripCountryBboxes(trip);
    if (bboxes.length === 0) return true; // permissive when trip has no resolvable country yet
    return bboxes.some(b => coordInBbox(lat, lng, b));
};

// ─────────────────────────────────────────────────────────────────────────
// TRIP-CITY whitelist — TIGHTER than the country whitelist. The country
// check rejects out-of-Thailand items; this rejects in-Thailand items
// that are not in any of the user's actual trip cities (Bangkok, Pattaya,
// Koh Chang). Catches the case where Photon resolved an attraction name
// like "Pearl Beach" or "Kai Bae Viewpoint" to a same-named place
// elsewhere in the country.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve & cache the bboxes for every city in the trip. Async because
 * city centroids may need to be fetched on first use. Subsequent calls
 * are free (localStorage-backed).
 */
export const getTripCityBboxes = async (
    trip: Trip,
): Promise<Array<[number, number, number, number]>> => {
    const cities = getTripCities(trip, { excludeFlightOnly: true, lang: 'en' });
    if (cities.length === 0) return [];
    const country = inferTripCountry(trip) || undefined;
    const bboxes: Array<[number, number, number, number]> = [];
    for (const city of cities) {
        const b = await getCityBbox(city, country);
        if (b) bboxes.push(b);
    }
    return bboxes;
};

/** Synchronous variant — returns only city bboxes already cached. Used by
 *  marker filters that can't wait on a network round-trip. The async
 *  variant should be called once at trip load to warm the cache. */
export const getTripCityBboxesSync = (
    trip: Trip,
): Array<[number, number, number, number]> => {
    const cities = getTripCities(trip, { excludeFlightOnly: true, lang: 'en' });
    const country = inferTripCountry(trip) || undefined;
    const bboxes: Array<[number, number, number, number]> = [];
    for (const city of cities) {
        const b = getCityBboxSync(city, country);
        if (b) bboxes.push(b);
    }
    return bboxes;
};

/**
 * Strict trip-city check: does the lat/lng fall inside ANY of the trip's
 * city bboxes? Returns TRUE if no trip cities are cached yet (permissive
 * on cold start so we never blank-screen a fresh map).
 */
export const coordInTripCities = (lat: number, lng: number, trip: Trip): boolean => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const bboxes = getTripCityBboxesSync(trip);
    if (bboxes.length === 0) return true; // cache cold — be permissive
    return bboxes.some(b => coordInBbox(lat, lng, b));
};

/**
 * The single predicate used everywhere on the map. Order of checks:
 *  1. If we have `verifiedCountry` on the item, compare it to the trip set.
 *  2. If we have lat/lng, check it against the union of country bboxes.
 *  3. Fall back to the existing trip-scope (city-name) check.
 *  4. Default to TRUE (don't false-positive drop incomplete data).
 *
 * This is permissive on missing data and strict on conflicting data —
 * exactly what we want.
 */
export const placeInTripCountries = (
    trip: Trip,
    item: {
        lat?: number;
        lng?: number;
        verifiedCountry?: string;
        location?: string;
        region?: string;
        description?: string;
        address?: string;
    },
): boolean => {
    const tripCountries = getTripCountries(trip);
    if (tripCountries.size === 0) return true; // brand-new trip — be permissive

    // 1. verifiedCountry trump card.
    if (item.verifiedCountry) {
        const c = HEBREW_TO_ENGLISH_COUNTRY_PARSE(item.verifiedCountry);
        if (c) return tripCountries.has(c);
    }

    // 2. Coordinate check.
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        const inBbox = coordInTripCountries(item.lat as number, item.lng as number, trip);
        if (inBbox) return true;
        // Coords disagree with the trip — but only drop if we have ZERO supporting evidence
        // from text fields (some places have wrong cached coords from old sessions).
        const fromAddress = countryFromHotelAddress(item.address || item.location || '');
        if (fromAddress && tripCountries.has(fromAddress)) return true;
        return false;
    }

    // 3. Address / location text → country.
    const fromAddress = countryFromHotelAddress(item.address || item.location || '');
    if (fromAddress) return tripCountries.has(fromAddress);

    // 4. Fall back to the per-city scope check (existing behavior).
    return isPlaceInTripScope(trip, {
        location: item.location,
        region: item.region,
        description: item.description,
    });
};
