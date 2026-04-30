import { describe, expect, it } from 'vitest';
import { dedupeTrips, planDuplicateTripCleanup } from '../services/storageService';
import type { Trip } from '../types';

const baseTrip = (overrides: Partial<Trip> = {}): Trip => ({
        id: 'trip-1',
        name: 'תאילנד 26',
        dates: '01/04/2026 - 10/04/2026',
        destination: 'תאילנד',
        coverImage: '',
        flights: { passengers: [], pnr: '', segments: [] },
        hotels: [],
        restaurants: [],
        attractions: [],
        itinerary: [],
        documents: [],
        ...overrides,
});

describe('dedupeTrips', () => {
        it('collapses identical private trip copies created under different ids', () => {
                const trips = dedupeTrips([
                        baseTrip({ id: 'trip-1' }),
                        baseTrip({ id: 'trip-2' }),
                        baseTrip({ id: 'trip-3' }),
                ]);

                expect(trips).toHaveLength(1);
                expect(trips[0].name).toBe('תאילנד 26');
        });

        it('prefers the shared copy when a shared trip mirrors a private original', () => {
                const trips = dedupeTrips([
                        baseTrip({ id: 'original-trip', isShared: false }),
                        baseTrip({
                                id: 'share-123',
                                isShared: true,
                                sharing: {
                                        shareId: 'share-123',
                                        owner: 'user-1',
                                        collaborators: ['user-1'],
                                        createdAt: new Date('2026-01-01T00:00:00Z'),
                                        updatedAt: new Date('2026-01-01T00:00:00Z'),
                                        updatedBy: 'user-1',
                                        role: 'owner',
                                },
                        }),
                ]);

                expect(trips).toHaveLength(1);
                expect(trips[0].id).toBe('share-123');
                expect(trips[0].isShared).toBe(true);
        });
});

describe('planDuplicateTripCleanup', () => {
        it('keeps the preferred/current trip and deletes only private duplicate docs', () => {
                const plan = planDuplicateTripCleanup([
                        baseTrip({ id: 'trip-to-keep' }),
                        baseTrip({ id: 'private-copy-1' }),
                        baseTrip({ id: 'private-copy-2' }),
                ], 'trip-to-keep');

                expect(plan.keepTripIds).toEqual(['trip-to-keep']);
                expect(plan.deletePrivateTripIds.sort()).toEqual(['private-copy-1', 'private-copy-2']);
        });

        it('does not delete shared trip documents during cleanup', () => {
                const plan = planDuplicateTripCleanup([
                        baseTrip({ id: 'private-copy' }),
                        baseTrip({
                                id: 'share-123',
                                isShared: true,
                                sharing: {
                                        shareId: 'share-123',
                                        owner: 'user-1',
                                        collaborators: ['user-1'],
                                        createdAt: new Date('2026-01-01T00:00:00Z'),
                                        updatedAt: new Date('2026-01-01T00:00:00Z'),
                                        updatedBy: 'user-1',
                                        role: 'owner',
                                },
                        }),
                ]);

                expect(plan.keepTripIds).toEqual(['share-123']);
                expect(plan.deletePrivateTripIds).toEqual(['private-copy']);
        });
});
