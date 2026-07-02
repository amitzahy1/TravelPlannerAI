/**
 * Detects "missing data" points in a Trip — gaps the user should know
 * about before/during the trip. Surfaced as the ⚠ pill on the unified-map
 * top bar and as warning-coloured pins on the map itself.
 *
 * Pure / side-effect-free so it can be memoised in a React component.
 *
 * Categories detected:
 *   1. no_hotel_for_day      — a day in the trip range with zero hotel coverage
 *   2. no_transport_to_hotel — flight arrival but no onward transport to a hotel within 24h
 *   3. unresolved_geocode    — restaurant/attraction with geocodeFailed=true (no map pin)
 *   4. no_research_for_city  — trip city with zero entries in aiRestaurants AND aiAttractions
 *
 * Each gap optionally carries lat/lng so the caller can drop an amber "?"
 * marker, plus a `deepLink` describing which tab/state should open when
 * the user clicks "fix this".
 */

import { Trip } from '../types';
import { getTripDays } from './tripDays';
import { getTripCities, cityKey, locationMatchesCity } from './geoData';
import { safeMapsUrl } from './mapsUrl';

export type GapKind =
        | 'no_hotel_for_day'
        | 'no_transport_to_hotel'
        | 'unresolved_geocode'
        | 'ambiguous_location'
        | 'no_research_for_city';

export interface MissingPoint {
        id: string;
        kind: GapKind;
        label: string;             // user-facing Hebrew message
        suggestedAction: string;   // CTA copy for the deep-link button
        deepLinkTab: 'hotels' | 'flights' | 'food' | 'attractions' | 'itinerary';
        lat?: number;
        lng?: number;
        // External link the CTA should open in a new tab — e.g. an existing
        // googleMapsUrl or a Google Maps search query for unresolved items.
        externalUrl?: string;
        // Place name + entity id, used by the Data Health "Mark as manual"
        // action and for analytics.
        entityId?: string;
        entityName?: string;
}

export interface MissingDataLayerFlags {
        aiRestaurants?: boolean;   // include AI-restaurant geocode failures?  default true
        aiAttractions?: boolean;   // include AI-attraction geocode failures?  default true
        myLists?: boolean;          // include saved restaurants/attractions?    default true
}

/**
 * `getMissingDataPoints(trip)` — full count, used by Data Health Panel.
 * `getMissingDataPoints(trip, layerFlags)` — filtered count for the map's
 *   "X חסרים" pill, so turning off "AI Restaurants" actually drops the
 *   count of AI-restaurant geocode failures from view.
 *
 * The hotel-day gap and missing-transport gap stay regardless of filters
 * — those are critical pre-trip blockers that don't belong to a layer.
 */
export const getMissingDataPoints = (trip: Trip, layerFlags?: MissingDataLayerFlags): MissingPoint[] => {
        const fl = {
                aiRestaurants: layerFlags?.aiRestaurants !== false,
                aiAttractions: layerFlags?.aiAttractions !== false,
                myLists: layerFlags?.myLists !== false,
        };
        const out: MissingPoint[] = [];

        // --- 1. Days without hotel coverage --------------------------------
        const days = getTripDays(trip);
        days.forEach(day => {
                if (day.hotels.length > 0) return;
                // A travel day (flight on this date) without a hotel is OK if there's
                // a hotel the next day — the user is in transit. Only flag pure gaps
                // where neither flight nor hotel covers the date.
                const hasFlight = day.flights.length > 0;
                if (hasFlight) return;
                out.push({
                        id: `gap-hotel-${day.isoDate}`,
                        kind: 'no_hotel_for_day',
                        label: `אין מלון ל${day.label}`,
                        suggestedAction: 'הוסף מלון ליום זה',
                        deepLinkTab: 'hotels',
                });
        });

        // --- 2. Flight arrivals without onward transport to a hotel --------
        // For each flight arrival, check if there's any transport entry in the
        // same city within the next 24h. If not, and there's a hotel in that
        // city, flag the missing transfer.
        const segments = trip.flights?.segments || [];
        const transports = trip.transports || [];
        segments.forEach(s => {
                if (!s.toCity || !s.date) return;
                const arrivalKey = cityKey(s.toCity);
                if (!arrivalKey) return;

                const hotelInCity = (trip.hotels || []).find(h =>
                        cityKey(h.city || '') === arrivalKey ||
                        locationMatchesCity(h.address || '', s.toCity)
                );
                if (!hotelInCity) return; // no hotel = handled by gap #1

                const hotelKey = cityKey(hotelInCity.name || '');
                const hasOnwardTransport = transports.some(t => {
                        if (!t.date || t.date !== s.date) return false;
                        // Loose containment match on either endpoint. Saved transfers
                        // carry full place names ("Suvarnabhumi Airport (BKK)" →
                        // "Holiday Inn Pattaya"); exact from===arrivalCity never hit,
                        // so booked transfers never cleared this gap.
                        const touches = (raw?: string) => {
                                const k = cityKey(raw || '');
                                if (!k) return false;
                                if (k.includes(arrivalKey) || arrivalKey.includes(k)) return true;
                                return !!hotelKey && (k.includes(hotelKey) || hotelKey.includes(k));
                        };
                        return touches(t.from) || touches(t.to);
                });
                if (hasOnwardTransport) return;

                out.push({
                        id: `gap-transfer-${s.flightNumber}-${s.date}`,
                        kind: 'no_transport_to_hotel',
                        label: `אין תחבורה משדה התעופה ${s.toCode || s.toCity} למלון ${hotelInCity.name}`,
                        suggestedAction: 'הוסף תחבורה',
                        deepLinkTab: 'flights',
                        lat: hotelInCity.lat,
                        lng: hotelInCity.lng,
                });
        });

        // --- 3. Items with geocodeFailed=true ------------------------------
        // Layer flags hide categories the user has toggled off so the count
        // matches what's actually visible on the map.
        //
        // Critical: places that DO have a working `googleMapsUrl` are NOT
        // "missing" — the user can tap that link and navigate to the right
        // place in Google Maps. The fact that our local Photon geocoder
        // failed (tiny street vendors, small bistros) is OUR limitation,
        // not a real gap. Skip them.
        const isReallyMissing = (place: { geocodeFailed?: boolean; googleMapsUrl?: string }) => {
                if (!place.geocodeFailed) return false;
                const url = (place.googleMapsUrl || '').trim();
                if (url.length > 8) return false; // has a working URL → not missing
                return true;
        };
        const failedRestaurants = fl.aiRestaurants
                ? (trip.aiRestaurants || []).flatMap(c => c.restaurants || []).filter(isReallyMissing)
                : [];
        const failedAttractions = fl.aiAttractions
                ? (trip.aiAttractions || []).flatMap(c => c.attractions || []).filter(isReallyMissing)
                : [];
        const failedSavedR = fl.myLists
                ? (trip.restaurants || []).flatMap(c => c.restaurants || []).filter(isReallyMissing)
                : [];
        const failedSavedA = fl.myLists
                ? (trip.attractions || []).flatMap(c => c.attractions || []).filter(isReallyMissing)
                : [];

        const buildSearchUrl = (place: { name?: string; location?: string; googleMapsUrl?: string }) =>
                safeMapsUrl(place.googleMapsUrl, place.name || '', place.location);

        [...failedRestaurants, ...failedSavedR].forEach(r => {
                out.push({
                        id: `gap-geocode-r-${r.id}`,
                        kind: 'unresolved_geocode',
                        label: `${r.name} לא נמצאה במפה`,
                        suggestedAction: 'פתח ב-Google Maps',
                        deepLinkTab: 'food',
                        externalUrl: buildSearchUrl(r),
                        entityId: r.id,
                        entityName: r.name,
                });
        });
        [...failedAttractions, ...failedSavedA].forEach(a => {
                out.push({
                        id: `gap-geocode-a-${a.id}`,
                        kind: 'unresolved_geocode',
                        label: `${a.name} לא נמצאה במפה`,
                        suggestedAction: 'פתח ב-Google Maps',
                        deepLinkTab: 'attractions',
                        externalUrl: buildSearchUrl(a),
                        entityId: a.id,
                        entityName: a.name,
                });
        });

        // --- 3b. Ambiguous verification entries removed entirely -----------
        // The 'ambiguous_location' gap kind ("מיקום לא מאומת") was generating
        // pages of false alarms — Photon often returns 'ambiguous' for places
        // it actually resolved correctly. Per user direction, we no longer
        // surface these as missing. Real geocode failures (3) and real data
        // gaps (1, 2, 4) still produce gaps.

        // --- 4. Trip cities without ANY AI research ------------------------
        const cities = getTripCities(trip, { excludeFlightOnly: true });
        cities.forEach(city => {
                const hasFood = (trip.aiRestaurants || []).some(c =>
                        (c.restaurants || []).some(r => locationMatchesCity(r.location || '', city))
                );
                const hasAttr = (trip.aiAttractions || []).some(c =>
                        (c.attractions || []).some(a => locationMatchesCity(a.location || '', city))
                );
                if (!hasFood && !hasAttr) {
                        out.push({
                                id: `gap-research-${cityKey(city)}`,
                                kind: 'no_research_for_city',
                                label: `אין מחקר AI ל${city}`,
                                suggestedAction: 'הפעל מחקר שוק',
                                deepLinkTab: 'food',
                        });
                }
        });

        return out;
};
