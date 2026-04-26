/**
 * Haversine distance + walking-time helpers used by the unified trip map's
 * "walking circles around the hotel" overlay and the per-pin "🚶 N min" label.
 *
 * Walking speed assumed at 5 km/h — the standard pedestrian average that
 * Google Maps / Apple Maps use for walking-time estimates. We round up to
 * whole minutes because fractional minutes look weird on a UI badge.
 */

export const WALKING_SPEED_KMH = 5;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in kilometres. */
export const haversineKm = (
        a: { lat: number; lng: number },
        b: { lat: number; lng: number },
): number => {
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h =
                Math.sin(dLat / 2) ** 2 +
                Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/** Walking minutes between two coords, rounded up to the next whole minute. */
export const walkingMinutesBetween = (
        a: { lat: number; lng: number },
        b: { lat: number; lng: number },
): number => Math.max(1, Math.ceil((haversineKm(a, b) / WALKING_SPEED_KMH) * 60));

/** Radius in metres for a given walking duration (used by the circle overlay). */
export const walkingRadiusMeters = (minutes: number): number =>
        Math.round((WALKING_SPEED_KMH * 1000 * minutes) / 60);
