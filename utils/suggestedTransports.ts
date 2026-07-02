import { Trip, Transport, TransportMode, FlightSegment, HotelBooking } from '../types';
import { buildUnifiedTransports } from './buildUnifiedTransports';
import { cityKey as geoCityKey } from './geoData';

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

// Normalise common date formats to yyyy-mm-dd.
// Handles: ISO ("2026-08-07T12:00:00"), DD/MM/YYYY ("07/08/2026"),
// MM/DD/YYYY (best-effort), and bare ISO strings.
const isoDate = (s?: string): string => {
        if (!s) return '';
        const raw = String(s).trim();
        // Already ISO yyyy-mm-dd...
        const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        // DD/MM/YYYY → yyyy-mm-dd. Heuristic: if first part > 12 it's day-first.
        const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
                const [, a, b, y] = slashMatch;
                const d = parseInt(a, 10), m = parseInt(b, 10);
                // If first part > 12, must be day; else assume DD/MM (Hebrew/IL convention).
                const isDayFirst = d > 12 || true;
                const day = isDayFirst ? d : m;
                const month = isDayFirst ? m : d;
                return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        // Last-ditch: try Date.parse and reformat.
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return raw.slice(0, 10);
};

const sameDay = (a?: string, b?: string): boolean => {
        const ia = isoDate(a); const ib = isoDate(b);
        return !!ia && !!ib && ia === ib;
};

// Canonicalise a side (city or full place name) for matching:
// 1. geoData's cityKey translates Hebrew ↔ English ("בנגקוק" → "bangkok")
//    and collapses alias variants. Flight segments store Hebrew city names,
//    so the old local normaliser — which STRIPPED Hebrew chars — turned
//    them into empty strings that could never match a booked transfer.
// 2. "koh" → "ko" normalisation so "Koh Chang" embedded in a hotel/transfer
//    name substring-matches the "Ko Chang" city form.
const cityKey = (s?: string): string => {
        if (!s || !s.trim()) return '';
        const canonical = geoCityKey(s) || s.trim().toLowerCase();
        return canonical.toLowerCase().replace(/\bkoh\b/g, 'ko');
};

const cleanCity = (raw?: string): string => {
        if (!raw) return '';
        // Drop ", country" suffix etc.
        return raw.split(',')[0].trim();
};

const sideMatch = (a: string, b: string): boolean => a === b || a.includes(b) || b.includes(a);

const transportCovers = (t: Transport, fromCity: string, toCity: string, onDate?: string): boolean => {
        const tFrom = cityKey(t.from);
        const tTo = cityKey(t.to);
        const wantFrom = cityKey(fromCity);
        const wantTo = cityKey(toCity);
        // Both sides must be non-empty; otherwise empty strings would
        // match everything ("bangkok".includes("")=true) and falsely
        // suppress suggestions.
        if (!tFrom || !tTo || !wantFrom || !wantTo) return false;
        if (onDate && t.date && isoDate(t.date) !== isoDate(onDate)) return false;
        const fromMatch = sideMatch(tFrom, wantFrom);
        const toMatch = sideMatch(tTo, wantTo);
        if (fromMatch && toMatch) return true;
        // One-side fallback: a booked ground/water transport on the EXACT
        // same date that touches either endpoint counts as covering the
        // move. Needed because saved transfers use full place names —
        // "Suvarnabhumi Airport (BKK)" never contains the city name
        // "Bangkok" the detector wants, so requiring both sides made every
        // real airport transfer invisible and its gap card never cleared.
        // Flights are excluded — a flight on that date is usually WHY the
        // ground-transfer gap exists.
        if (onDate && t.date && t.mode !== 'flight' && isoDate(t.date) === isoDate(onDate)) {
                return fromMatch || toMatch;
        }
        return false;
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
                // Two checks: strict route match on any date, plus the date-bound
                // one-side fallback (covers multi-leg moves like van→flight→van
                // where no single transport spans the whole city-to-city route).
                const covered = existing.some(t => transportCovers(t, fromCity, toCity) || transportCovers(t, fromCity, toCity, moveDate));
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
