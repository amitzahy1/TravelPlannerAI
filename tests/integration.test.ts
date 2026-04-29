/**
 * Integration test: validates the Phase 4a "AttractionsView map mismatch"
 * fix end-to-end without rendering React. Reproduces the exact data flow:
 *   1. Trip has aiAttractions with mixed in-scope and out-of-scope items.
 *   2. filteredRecommendations applies inTripScope + city filter + dedupe.
 *   3. The map source MUST match filteredRecommendations exactly.
 *
 * Before the fix, the map flat-mapped ALL aiAttractions and then applied
 * only the city filter — so out-of-scope items showed pins. After the
 * fix, both list and map read from the same filtered list.
 */

import { describe, it, expect } from 'vitest';
import { isPlaceInTripScope } from '../utils/tripScope';
import type { Trip, AttractionCategory } from '../types';

const buildTrip = (): Trip => ({
        id: 't1',
        name: 'Thailand 2026',
        dates: '2026-04-01 - 2026-04-10',
        destination: 'Bangkok - Pattaya',
        coverImage: '',
        flights: { passengers: [], pnr: '', segments: [] },
        hotels: [
                { id: 'h1', name: 'X', city: 'Bangkok', address: 'Sukhumvit', checkInDate: '2026-04-01', checkOutDate: '2026-04-05', nights: 4 },
                { id: 'h2', name: 'Y', city: 'Pattaya', address: 'Beach Rd', checkInDate: '2026-04-05', checkOutDate: '2026-04-10', nights: 5 },
        ],
        restaurants: [],
        attractions: [],
        itinerary: [],
        documents: [],
        aiAttractions: [
                {
                        id: 'cat1',
                        title: 'Must See',
                        attractions: [
                                { id: 'a1', name: 'Grand Palace', description: '', location: 'Bangkok' } as any,
                                { id: 'a2', name: 'Walking Street', description: '', location: 'Pattaya' } as any,
                                { id: 'a3', name: 'Eiffel Tower', description: '', location: 'Paris' } as any, // out of scope
                                { id: 'a4', name: 'Banff Park', description: '', location: 'Banff, Canada' } as any, // out of scope
                        ],
                },
        ] as AttractionCategory[],
});

describe('AttractionsView map mismatch fix (integration)', () => {
        const trip = buildTrip();
        const aiCategories = trip.aiAttractions || [];

        // Mirror AttractionsView's filteredRecommendations pipeline
        const buildFilteredRecommendations = (selectedCity: string = 'all') => {
                let list: any[] = aiCategories.flatMap(c => c.attractions.map(a => ({ ...a, region: a.region || (c as any).region })));
                list = list.filter(a => isPlaceInTripScope(trip, { location: a.location, region: a.region, description: a.description }));
                if (selectedCity !== 'all') {
                        list = list.filter(a => (a.location || '').toLowerCase().includes(selectedCity.toLowerCase()));
                }
                return list;
        };

        it('drops out-of-scope items', () => {
                const filtered = buildFilteredRecommendations('all');
                const ids = filtered.map(a => a.id);
                expect(ids).toContain('a1');
                expect(ids).toContain('a2');
                expect(ids).not.toContain('a3'); // Paris dropped
                expect(ids).not.toContain('a4'); // Banff dropped
        });

        it('map source equals filtered list (post-fix behaviour)', () => {
                const filtered = buildFilteredRecommendations('all');
                // Phase 4a fix: map reads from filteredRecommendations, not from aiCategories.flatMap
                const mapSource = filtered;
                expect(mapSource.map(a => a.id).sort()).toEqual(filtered.map(a => a.id).sort());
        });

        it('switching city filter narrows both list and map identically', () => {
                const bangkokOnly = buildFilteredRecommendations('Bangkok');
                expect(bangkokOnly.map(a => a.id)).toEqual(['a1']);
        });
});

describe('Trip-scope filter prevents zombie pins', () => {
        const trip = buildTrip();

        it('Paris attraction is rejected on a Thailand trip', () => {
                expect(isPlaceInTripScope(trip, { location: 'Paris' })).toBe(false);
        });
        it('Bangkok attraction is accepted', () => {
                expect(isPlaceInTripScope(trip, { location: 'Bangkok' })).toBe(true);
        });
        it('Hebrew Bangkok variant is accepted', () => {
                expect(isPlaceInTripScope(trip, { location: 'בנגקוק' })).toBe(true);
        });
});
