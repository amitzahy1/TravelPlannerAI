/**
 * Shared trip-scope utilities. Replaces the duplicated `inTripScope`,
 * `restaurantMatchesCity`, `attractionMatchesCity`, and ad-hoc
 * `location.split(',').pop()` logic that previously lived inside
 * RestaurantsView and AttractionsView.
 *
 * Pure helpers — no React, no localStorage. Safe to unit-test and to
 * import from any view, hook, or service.
 */

import type { Trip, Restaurant, Attraction } from '../types';
import {
    getTripCities,
    locationMatchesCity,
    getCountryForCity,
    cityKey,
    displayCityName,
} from './geoData';
import { getCountryBbox, toEnglishCountryName } from './geocodePlaces';

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
    place: { name?: string; region?: string; location?: string },
    trip?: Trip,
): string => {
    const name = normalizePlaceName(place.name || '');
    let city = place.region || '';
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
