import { Trip, Transport, TransportMode, FlightSegment, HotelBooking } from '../types';
import { buildUnifiedTransports } from './buildUnifiedTransports';

/**
 * Heuristic-based detector of "transports the user probably needs but
 * hasn't booked yet". Looks at the trip's chronological stops (flights
 * + hotels) and flags gaps where the user has to physically move from
 * one place to another but no transport covers it.
 *
 * Returns Transport-shaped objects with `id` prefixed `suggested-` and
 * a `notes` field that describes the gap. The Transports view renders
 * these in a yellow warning card with a "להוסיף" CTA that opens the
 * AddTransportModal pre-filled with the suggestion's fields.
 */

export interface SuggestedTransport extends Transport {
        suggested: true;
        reason: string;
}

const isoDate = (s?: string): string => (s || '').slice(0, 10);

const sameDay = (a?: string, b?: string): boolean => {
        const ia = isoDate(a); const ib = isoDate(b);
        return !!ia && !!ib && ia === ib;
};

const cityKey = (s?: string): string => (s || '').trim().toLowerCase().replace(/[֐-׿]/g, '');

const cleanCity = (raw?: string): string => {
        if (!raw) return '';
        // Drop ", country" suffix etc.
        return raw.split(',')[0].trim();
};

const transportCovers = (t: Transport, fromCity: string, toCity: string, onDate?: string): boolean => {
        const tFrom = cityKey(t.from);
        const tTo = cityKey(t.to);
        const wantFrom = cityKey(fromCity);
        const wantTo = cityKey(toCity);
        const fromMatch = tFrom.includes(wantFrom) || wantFrom.includes(tFrom);
        const toMatch = tTo.includes(wantTo) || wantTo.includes(tTo);
        if (!fromMatch || !toMatch) return false;
        if (onDate && t.date && isoDate(t.date) !== isoDate(onDate)) return false;
        return true;
};

const newSuggestedId = (kind: string, idx: number) => `suggested-${kind}-${idx}`;

export const detectSuggestedTransports = (trip: Trip): SuggestedTransport[] => {
        const out: SuggestedTransport[] = [];
        const existing = buildUnifiedTransports(trip);

        const flights = trip.flights?.segments || [];
        const hotels = (trip.hotels || []).slice().sort((a, b) =>
                (isoDate(a.checkInDate) || '').localeCompare(isoDate(b.checkInDate) || '')
        );

        // 1. Same-day landing → hotel: for each flight that arrives at an
        //    airport and is followed by a hotel check-in the same day in a
        //    different city, suggest an airport-transfer.
        flights.forEach((seg: FlightSegment, fIdx) => {
                const arrivalDate = isoDate(seg.date);
                const toCity = cleanCity(seg.toCity);
                if (!toCity || !arrivalDate) return;
                const sameDayHotel = hotels.find(h => sameDay(h.checkInDate, arrivalDate));
                if (!sameDayHotel) return;
                const hotelCity = cleanCity(sameDayHotel.city || sameDayHotel.address);
                if (!hotelCity) return;
                // Already covered by an existing transport?
                const covered = existing.some(t => transportCovers(t, toCity, hotelCity, arrivalDate));
                if (covered) return;
                // Same-city airport-to-hotel is OK (e.g. BKK→Holiday Inn Bangkok
                // is reasonable as a single trip-included transfer). Suggest a
                // transfer in that case too — the user probably wants a
                // booking for it.
                out.push({
                        id: newSuggestedId('airport-transfer', fIdx),
                        mode: 'transfer' as TransportMode,
                        from: `${toCity} (שדה תעופה)` ,
                        to: sameDayHotel.name || hotelCity,
                        fromCode: seg.toCode,
                        date: arrivalDate,
                        departureTime: seg.arrivalTime,
                        notes: 'אחרי הנחיתה צריך להגיע למלון — כדאי להזמין הסעה / מונית מראש.',
                        sourceArrayKey: 'transports',
                        suggested: true,
                        reason: `נחיתה ב-${seg.toCode || toCity} ב-${arrivalDate} → ${sameDayHotel.name || hotelCity} באותו יום`,
                });
        });

        // 2. Hotel-to-hotel between cities: for each consecutive pair of
        //    hotels in different cities, if no transport covers the gap,
        //    suggest one. Keep mode 'transfer' generic; the user can change
        //    it when adding (drive / ferry / bus / etc.).
        for (let i = 0; i < hotels.length - 1; i++) {
                const a = hotels[i] as HotelBooking;
                const b = hotels[i + 1] as HotelBooking;
                const fromCity = cleanCity(a.city || a.address);
                const toCity = cleanCity(b.city || b.address);
                if (!fromCity || !toCity) continue;
                if (cityKey(fromCity) === cityKey(toCity)) continue; // same city — no transport needed
                const moveDate = isoDate(b.checkInDate || a.checkOutDate);
                if (!moveDate) continue;
                const covered = existing.some(t => transportCovers(t, fromCity, toCity));
                if (covered) continue;
                out.push({
                        id: newSuggestedId('inter-hotel', i),
                        mode: 'transfer' as TransportMode,
                        from: a.name || fromCity,
                        to: b.name || toCity,
                        date: moveDate,
                        notes: `מעבר בין ערים — ${fromCity} → ${toCity}. לבחור אמצעי תחבורה (נסיעה / מעבורת / רכבת / טיסה).`,
                        sourceArrayKey: 'transports',
                        suggested: true,
                        reason: `מ-${fromCity} ל-${toCity} ב-${moveDate}`,
                });
        }

        // 3. Departure-day hotel → airport: for each flight that DEPARTS
        //    from a city where the user has a hotel checking out the
        //    same day, suggest an airport transfer. Catches the standard
        //    end-of-trip airport-shuttle the user always needs to book.
        flights.forEach((seg: FlightSegment, fIdx) => {
                const departDate = isoDate(seg.date);
                const fromCity = cleanCity(seg.fromCity);
                if (!departDate || !fromCity) return;
                const sameDayCheckout = hotels.find(h => sameDay(h.checkOutDate, departDate));
                if (!sameDayCheckout) return;
                const hotelCity = cleanCity(sameDayCheckout.city || sameDayCheckout.address);
                if (!hotelCity) return;
                const covered = existing.some(t => transportCovers(t, hotelCity, fromCity, departDate));
                if (covered) return;
                out.push({
                        id: newSuggestedId('departure-transfer', fIdx),
                        mode: 'transfer' as TransportMode,
                        from: sameDayCheckout.name || hotelCity,
                        to: `${fromCity} (שדה תעופה)`,
                        toCode: seg.fromCode,
                        date: departDate,
                        arrivalTime: seg.departureTime,
                        notes: 'יום עזיבה — להזמין הסעה למלון → שדה תעופה מבעוד מועד.',
                        sourceArrayKey: 'transports',
                        suggested: true,
                        reason: `צ'ק-אאוט מ-${sameDayCheckout.name || hotelCity} → טיסה ${seg.fromCode || fromCity} ב-${departDate}`,
                });
        });

        return out;
};
