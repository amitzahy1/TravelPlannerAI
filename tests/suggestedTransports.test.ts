import { describe, it, expect } from 'vitest';
import { detectSuggestedTransports } from '../utils/suggestedTransports';
import { Trip, Transport } from '../types';

// Reproduces the Thailand-2026 trip (2026-07-02): flight segments store
// HEBREW city names ("בנגקוק"), hotels/transfers store English place names
// ("Suvarnabhumi Airport (BKK)", "KC Grand Resort, Koh Chang"). The gap
// detector must recognise the booked vans across languages and spelling
// variants (Koh/Ko Chang) and stop suggesting transfers the user already has.

const baseTrip = {
        id: 't1',
        name: 'תאילנד 26',
        dates: '06/08/2026 - 26/08/2026',
        destination: "בנגקוק - פטאיה - קו צ'אנג",
        coverImage: '',
        flights: {
                segments: [
                        { fromCode: 'AUH', toCode: 'BKK', fromCity: 'אבו דאבי', toCity: 'בנגקוק', date: '2026-08-07', departureTime: '02:20', arrivalTime: '11:50', airline: 'Etihad', flightNumber: 'EY404', duration: '' },
                        { fromCode: 'TDX', toCode: 'BKK', fromCity: 'טראט', toCity: 'בנגקוק', date: '2026-08-22', departureTime: '13:10', arrivalTime: '14:10', airline: 'Bangkok Airways', flightNumber: 'PG306', duration: '' },
                        { fromCode: 'BKK', toCode: 'AUH', fromCity: 'בנגקוק', toCity: 'אבו דאבי', date: '2026-08-25', departureTime: '20:10', arrivalTime: '', airline: 'Etihad', flightNumber: 'EY407', duration: '' },
                ],
        },
        hotels: [
                { id: 'h1', name: 'Holiday Inn Pattaya', city: 'Pattaya', address: 'Pattaya, Thailand', checkInDate: '2026-08-07', checkOutDate: '2026-08-12', nights: 5 },
                { id: 'h2', name: 'Dinso Resort & Villas Ko Chang, Vignette Collection', city: 'Ko Chang', address: 'Ko Chang, Thailand', checkInDate: '2026-08-12', checkOutDate: '2026-08-17', nights: 5 },
                { id: 'h3', name: 'KC Grande Resort Koh Chang', city: 'Ko Chang', address: 'Koh Chang, Thailand', checkInDate: '2026-08-17', checkOutDate: '2026-08-22', nights: 5 },
                { id: 'h4', name: 'Holiday Inn Bangkok', city: 'Bangkok', address: 'Phloen Chit Road, Bangkok', checkInDate: '2026-08-22', checkOutDate: '2026-08-25', nights: 3 },
        ],
        restaurants: [],
} as unknown as Trip;

const bookedVans: Transport[] = [
        { id: 'tr1', mode: 'transfer', from: 'Suvarnabhumi Airport (BKK)', to: 'Holiday Inn Pattaya', date: '2026-08-07', departureTime: '11:50', arrivalTime: '', sourceArrayKey: 'transports' },
        { id: 'tr2', mode: 'transfer', from: 'Holiday Inn Pattaya', to: 'Dinso Resort and Villas Koh Chang', date: '2026-08-12', departureTime: '09:30', arrivalTime: '', sourceArrayKey: 'transports' },
        { id: 'tr3', mode: 'transfer', from: 'Dinso Resort and Villas, Koh Chang', to: 'KC Grand Resort, Koh Chang', date: '2026-08-17', departureTime: '12:00', arrivalTime: '', sourceArrayKey: 'transports' },
        { id: 'tr4', mode: 'transfer', from: 'KC Grand Resort, Koh Chang', to: 'Trat Airport (TDX)', date: '2026-08-22', departureTime: '08:30', arrivalTime: '', sourceArrayKey: 'transports' },
        { id: 'tr5', mode: 'transfer', from: 'Suvarnabhumi Airport (BKK)', to: 'Holiday Inn Bangkok Phloen Chit Road', date: '2026-08-22', departureTime: '14:10', arrivalTime: '', sourceArrayKey: 'transports' },
        { id: 'tr6', mode: 'transfer', from: 'Holiday Inn Bangkok Phloen Chit', to: 'Suvarnabhumi Airport (BKK)', date: '2026-08-25', departureTime: '17:30', arrivalTime: '', sourceArrayKey: 'transports' },
];

describe('detectSuggestedTransports', () => {
        it('suggests airport transfers + inter-hotel moves when nothing is booked', () => {
                const out = detectSuggestedTransports(baseTrip);
                expect(out.length).toBeGreaterThan(0);
                // At least the same-day BKK-landing → Pattaya hotel gap
                expect(out.some(s => s.date === '2026-08-07')).toBe(true);
        });

        it('clears ALL suggestions when the full van itinerary is booked, despite Hebrew flight cities and Koh/Ko spelling', () => {
                const covered = { ...baseTrip, transports: bookedVans } as Trip;
                const out = detectSuggestedTransports(covered);
                expect(out).toEqual([]);
        });

        it('still flags a genuinely missing leg (no van on the 25th)', () => {
                const partial = { ...baseTrip, transports: bookedVans.slice(0, 5) } as Trip;
                const out = detectSuggestedTransports(partial);
                expect(out.some(s => s.date === '2026-08-25')).toBe(true);
        });
});
