/**
 * Decomposes a Trip into per-day buckets so the unified-map "Day N" filter
 * can highlight exactly what's planned for each day. Pure / side-effect-free
 * so it can be memoised in a React component.
 *
 * Day inference order:
 *   1. trip.dates if it's a "YYYY-MM-DD - YYYY-MM-DD" range
 *   2. earliest hotel check-in → latest hotel check-out
 *   3. earliest flight departure → latest flight arrival
 *   4. fall back to a single-day bucket
 *
 * Items with no date attached land in `undated` so the UI can still show
 * them when "All days" is selected.
 */

import { Trip, Restaurant, Attraction, HotelBooking, FlightSegment } from '../types';

export interface TripDay {
        dayNumber: number;          // 1-indexed
        isoDate: string;            // YYYY-MM-DD
        label: string;              // "יום 3 · 12.3"
        hotels: HotelBooking[];     // hotels covering this date
        restaurants: Restaurant[];  // restaurants reserved on this date
        attractions: Attraction[];  // attractions scheduled on this date
        flights: FlightSegment[];   // flights departing on this date
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

const parseIso = (s?: string): Date | null => {
        if (!s) return null;
        const m = s.match(ISO_DATE_RE);
        if (!m) return null;
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const parseDmy = (s?: string): Date | null => {
        if (!s) return null;
        const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
        if (!m) return null;
        const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        return new Date(year, Number(m[2]) - 1, Number(m[1]));
};

const parseAny = (s?: string): Date | null => parseIso(s) || parseDmy(s);

const isoOf = (d: Date): string =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayDiff = (a: Date, b: Date): number =>
        Math.round((a.getTime() - b.getTime()) / 86400000);

/** Resolve the trip's [start, end] dates from whatever fields are populated. */
const inferRange = (trip: Trip): { start: Date; end: Date } | null => {
        // 1. Explicit `dates` field e.g. "2026-03-12 - 2026-03-22"
        if (trip.dates) {
                const parts = trip.dates.split(/\s*[-–—]\s*|\s+to\s+/i);
                if (parts.length === 2) {
                        const s = parseAny(parts[0]);
                        const e = parseAny(parts[1]);
                        if (s && e && e >= s) return { start: s, end: e };
                }
        }

        // 2. Hotels' check-in / check-out span
        const hotelDates: Date[] = [];
        trip.hotels?.forEach(h => {
                const ci = parseAny(h.checkInDate);
                const co = parseAny(h.checkOutDate);
                if (ci) hotelDates.push(ci);
                if (co) hotelDates.push(co);
        });
        if (hotelDates.length >= 2) {
                hotelDates.sort((a, b) => a.getTime() - b.getTime());
                return { start: hotelDates[0], end: hotelDates[hotelDates.length - 1] };
        }

        // 3. Flight span
        const flightDates: Date[] = [];
        trip.flights?.segments?.forEach(s => {
                const d = parseAny(s.date);
                if (d) flightDates.push(d);
        });
        if (flightDates.length >= 2) {
                flightDates.sort((a, b) => a.getTime() - b.getTime());
                return { start: flightDates[0], end: flightDates[flightDates.length - 1] };
        }
        if (flightDates.length === 1) {
                return { start: flightDates[0], end: flightDates[0] };
        }

        return null;
};

export const getTripDays = (trip: Trip): TripDay[] => {
        const range = inferRange(trip);
        if (!range) return [];

        const { start, end } = range;
        const totalDays = Math.max(1, dayDiff(end, start) + 1);
        const days: TripDay[] = [];

        // Pre-flatten lists once
        const allRestaurants: Restaurant[] = (trip.restaurants || []).flatMap(c => c.restaurants || []);
        const allAttractions: Attraction[] = (trip.attractions || []).flatMap(c => c.attractions || []);

        for (let i = 0; i < totalDays; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + i);
                const iso = isoOf(date);

                const hotels = (trip.hotels || []).filter(h => {
                        const ci = parseAny(h.checkInDate);
                        const co = parseAny(h.checkOutDate);
                        if (!ci) return false;
                        // A hotel "covers" a day if check-in <= day < check-out.
                        // Check-out is exclusive (you sleep in the hotel up to the
                        // night BEFORE check-out, then leave on the check-out day).
                        if (co && date >= co) return false;
                        return date >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate());
                });

                const restaurants = allRestaurants.filter(r => {
                        const d = parseAny(r.reservationDate);
                        return d ? isoOf(d) === iso : false;
                });

                const attractions = allAttractions.filter(a => {
                        const d = parseAny(a.scheduledDate);
                        return d ? isoOf(d) === iso : false;
                });

                const flights = (trip.flights?.segments || []).filter(s => {
                        const d = parseAny(s.date);
                        return d ? isoOf(d) === iso : false;
                });

                days.push({
                        dayNumber: i + 1,
                        isoDate: iso,
                        label: `יום ${i + 1} · ${date.getDate()}.${date.getMonth() + 1}`,
                        hotels,
                        restaurants,
                        attractions,
                        flights,
                });
        }

        return days;
};

/**
 * Builds a Set of item-IDs that belong to a specific day. Hotels /
 * restaurants / attractions all carry stable `id` fields; flight segments
 * don't, so we synthesize a key from `flightNumber + date`. The caller
 * uses the set membership to dim non-matching pins on the unified map.
 */
export const idsOnDay = (day: TripDay): Set<string> => {
        const ids = new Set<string>();
        day.hotels.forEach(h => h.id && ids.add(h.id));
        day.restaurants.forEach(r => r.id && ids.add(r.id));
        day.attractions.forEach(a => a.id && ids.add(a.id));
        day.flights.forEach(f => ids.add(`${f.flightNumber}_${f.date}`));
        return ids;
};
