import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyPlace, applyVerificationResult } from '../utils/placeVerification';
import type { Trip } from '../types';

const trip: Trip = {
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
};

const mockPhotonResponse = (feature: any) => ({
        ok: true,
        json: async () => ({ features: feature ? [feature] : [] }),
});

describe('verifyPlace', () => {
        let fetchSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
                fetchSpy = vi.spyOn(globalThis, 'fetch' as any);
        });
        afterEach(() => {
                fetchSpy.mockRestore();
        });

        it('returns verified when country + city match', async () => {
                fetchSpy.mockResolvedValueOnce(mockPhotonResponse({
                        geometry: { coordinates: [100.5018, 13.7563] },
                        properties: { country: 'Thailand', city: 'Bangkok', osm_type: 'N', osm_id: 123 },
                }) as any);

                const res = await verifyPlace({ name: 'Sorn', location: 'Sukhumvit, Bangkok' }, trip);
                expect(res?.verificationStatus).toBe('verified');
                expect(res?.confidence).toBeGreaterThanOrEqual(0.85);
                expect(res?.osmId).toBe('N:123');
        });

        it('returns ambiguous when city does not match', async () => {
                fetchSpy.mockResolvedValueOnce(mockPhotonResponse({
                        geometry: { coordinates: [100.5018, 13.7563] },
                        properties: { country: 'Thailand', city: 'Chiang Mai', osm_type: 'N', osm_id: 999 },
                }) as any);

                // Trip with Pattaya as the only specific city — Photon's "Chiang Mai"
                // is in the same country but a different city, so verification
                // should land on ambiguous (country-only match).
                const cityTrip: Trip = { ...trip, destination: 'Pattaya', hotels: [{ id: 'h1', name: 'X', city: 'Pattaya', address: 'Beach Rd', checkInDate: '', checkOutDate: '', nights: 1 }] };
                const res = await verifyPlace({ name: 'Mystery Cafe', location: 'Pattaya' }, cityTrip);
                expect(res?.verificationStatus).toBe('ambiguous');
        });

        it('returns not_found when Photon returns no features', async () => {
                // All retries (with hint, without hint, no bbox) return no features.
                fetchSpy.mockResolvedValue(mockPhotonResponse(null) as any);

                const res = await verifyPlace({ name: 'Nonexistent Place' }, trip);
                expect(res?.verificationStatus).toBe('not_found');
                expect(res?.confidence).toBe(0);
        });

        it('upgrades to verified when googleMapsUrl coords agree (≤500m)', async () => {
                // Photon returns Bangkok coords; URL has coords ~10m away.
                fetchSpy.mockResolvedValueOnce(mockPhotonResponse({
                        geometry: { coordinates: [100.5018, 13.7563] },
                        properties: { country: 'Thailand', city: 'Bangkok' },
                }) as any);

                const res = await verifyPlace({
                        name: 'Sorn',
                        location: 'Sukhumvit, Bangkok',
                        googleMapsUrl: 'https://maps.google.com/?q=13.75635,100.50185',
                }, trip);

                expect(res?.verificationStatus).toBe('verified');
                expect(res?.verificationSource).toBe('google_maps_url');
                expect(res?.confidence).toBeGreaterThanOrEqual(0.9);
        });

        it('downgrades to ambiguous when URL and Photon disagree by > 5km', async () => {
                fetchSpy.mockResolvedValueOnce(mockPhotonResponse({
                        geometry: { coordinates: [100.5018, 13.7563] }, // Bangkok
                        properties: { country: 'Thailand', city: 'Bangkok' },
                }) as any);

                const res = await verifyPlace({
                        name: 'Sorn',
                        location: 'Sukhumvit, Bangkok',
                        googleMapsUrl: 'https://maps.google.com/?q=14.5,100.5', // ~80km north
                }, trip);

                expect(res?.verificationStatus).toBe('ambiguous');
        });
});

describe('applyVerificationResult', () => {
        it('writes coords + status onto the item', () => {
                const item: any = {};
                applyVerificationResult(item, {
                        lat: 13.7,
                        lng: 100.5,
                        osmId: 'N:1',
                        verifiedCity: 'Bangkok',
                        verifiedCountry: 'Thailand',
                        verificationStatus: 'verified',
                        verificationSource: 'photon',
                        confidence: 0.9,
                });
                expect(item.lat).toBe(13.7);
                expect(item.osmId).toBe('N:1');
                expect(item.verificationStatus).toBe('verified');
                expect(item.verifiedAt).toBeTypeOf('number');
                expect(item.geocodeFailed).toBe(false);
        });

        it('marks geocodeFailed for not_found', () => {
                const item: any = {};
                applyVerificationResult(item, {
                        lat: 0, lng: 0,
                        verificationStatus: 'not_found',
                        verificationSource: 'photon',
                        confidence: 0,
                });
                expect(item.geocodeFailed).toBe(true);
                expect(item.lat).toBeUndefined();
        });
});
