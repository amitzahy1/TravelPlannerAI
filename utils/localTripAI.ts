/**
 * Local-only AI research storage for VIEWERS on shared trips.
 *
 * Viewers can run AI market research the same way owners/editors can, but
 * their results don't write to the shared Firestore document — that would
 * pollute everyone's view of the trip and consume the owner's quota
 * silently. Instead, viewer results live here in browser localStorage,
 * scoped per trip.id.
 *
 * The Restaurants/Attractions views read this layer in addition to
 * `trip.aiRestaurants` / `trip.aiAttractions`, giving viewers a private
 * research workspace on top of the shared one.
 */

import type { RestaurantCategory, AttractionCategory } from '../types';

const KEY = (tripId: string) => `weTravel.localAI.${tripId}`;

interface LocalAI {
        aiRestaurants?: RestaurantCategory[];
        aiAttractions?: AttractionCategory[];
}

const safeParse = (raw: string | null): LocalAI => {
        if (!raw) return {};
        try {
                const obj = JSON.parse(raw);
                return (obj && typeof obj === 'object' ? obj : {}) as LocalAI;
        } catch { return {}; }
};

export const getLocalAI = (tripId: string): LocalAI => {
        if (!tripId) return {};
        try { return safeParse(localStorage.getItem(KEY(tripId))); } catch { return {}; }
};

export const setLocalAI = (tripId: string, patch: Partial<LocalAI>): void => {
        if (!tripId) return;
        try {
                const cur = getLocalAI(tripId);
                const next = { ...cur, ...patch };
                localStorage.setItem(KEY(tripId), JSON.stringify(next));
        } catch { /* private mode / quota — silently ignore */ }
};

export const clearLocalAI = (tripId: string): void => {
        if (!tripId) return;
        try { localStorage.removeItem(KEY(tripId)); } catch { /* noop */ }
};

export const hasLocalAI = (tripId: string): boolean => {
        const cur = getLocalAI(tripId);
        return !!(cur.aiRestaurants?.length || cur.aiAttractions?.length);
};
