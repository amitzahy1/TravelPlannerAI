import { describe, it, expect } from 'vitest';
import {
        inferTripCountry,
        getTripCountryBbox,
        isPlaceInTripScope,
        resolvePlaceCity,
        normalizePlaceName,
        placeDedupeKey,
} from '../utils/tripScope';
import type { Trip } from '../types';

const baseTrip = (overrides: Partial<Trip> = {}): Trip => ({
        id: 't1',
        name: 'Trip',
        dates: '2026-04-01 - 2026-04-10',
        destination: 'Thailand',
        coverImage: '',
        flights: { passengers: [], pnr: '', segments: [] },
        hotels: [],
        restaurants: [],
        attractions: [],
        itinerary: [],
        documents: [],
        ...overrides,
});

describe('inferTripCountry', () => {
        it('resolves country from English destination', () => {
                expect(inferTripCountry(baseTrip({ destination: 'Thailand' }))).toBe('Thailand');
        });
        it('resolves country from Hebrew destination', () => {
                expect(inferTripCountry(baseTrip({ destination: 'תאילנד 26 ימים' }))).toBe('Thailand');
        });
        it('resolves country from city list when no country word', () => {
                expect(inferTripCountry(baseTrip({ destination: 'Bangkok - Pattaya - Koh Chang' }))).toBe('Thailand');
        });
        it('returns null when nothing resolves', () => {
                expect(inferTripCountry(baseTrip({ destination: 'Atlantis' }))).toBeNull();
        });
});

describe('getTripCountryBbox', () => {
        it('returns Thailand bbox for Hebrew destination', () => {
                const bbox = getTripCountryBbox(baseTrip({ destination: 'תאילנד' }));
                expect(bbox).not.toBeNull();
                expect(bbox![0]).toBeCloseTo(97.5, 0);
        });
});

describe('isPlaceInTripScope', () => {
        const trip = baseTrip({ destination: 'Bangkok - Pattaya' });

        it('keeps places in any trip city', () => {
                expect(isPlaceInTripScope(trip, { location: 'Sukhumvit, Bangkok' })).toBe(true);
                expect(isPlaceInTripScope(trip, { location: 'Walking Street, Pattaya' })).toBe(true);
        });
        it('rejects places out of trip', () => {
                expect(isPlaceInTripScope(trip, { location: 'Tour Eiffel, Paris' })).toBe(false);
                expect(isPlaceInTripScope(trip, { location: 'Banff, Canada' })).toBe(false);
        });
        it('keeps placeless items (benefit of doubt)', () => {
                expect(isPlaceInTripScope(trip, {})).toBe(true);
        });
        it('matches Hebrew location strings against Hebrew trip city', () => {
                const heTrip = baseTrip({ destination: 'תאילנד' });
                expect(isPlaceInTripScope(heTrip, { location: 'רחוב סילום, בנגקוק' })).toBe(true);
        });
});

describe('resolvePlaceCity', () => {
        const trip = baseTrip({ destination: 'Bangkok - Pattaya - Koh Chang' });

        // resolvePlaceCity returns whichever language form getTripCities is
        // configured to emit (Hebrew by default in this app). Tests assert
        // that the result matches EITHER Hebrew or English form.
        it('prefers a region that matches a trip city', () => {
                const result = resolvePlaceCity({ region: 'Bangkok', location: 'somewhere' }, trip);
                expect(result).toMatch(/bangkok|בנגקוק/i);
        });
        it('extracts trip city from comma-separated location', () => {
                const result = resolvePlaceCity({ location: 'Walking Street, Pattaya' }, trip);
                expect(result).toMatch(/pattaya|פטאייה/i);
        });
        it('falls back to selectedCity when nothing matches', () => {
                expect(resolvePlaceCity({ location: 'Outer Space' }, trip, 'Phuket')).toBe('Phuket');
        });
        it('does not crash on empty inputs', () => {
                expect(resolvePlaceCity({}, trip)).toBeTruthy();
        });
});

describe('normalizePlaceName + placeDedupeKey', () => {
        it('collapses apostrophe variants', () => {
                expect(normalizePlaceName("Sorn's Bangkok")).toBe(normalizePlaceName('Sorns Bangkok'));
        });
        it('produces same dedupe key for "Sorn Bangkok" and "Sorn, Bangkok"', () => {
                const trip = baseTrip({ destination: 'Bangkok' });
                const k1 = placeDedupeKey({ name: 'Sorn', region: 'Bangkok' }, trip);
                const k2 = placeDedupeKey({ name: 'Sorn', location: 'Sukhumvit, Bangkok' }, trip);
                expect(k1).toBe(k2);
        });
});
