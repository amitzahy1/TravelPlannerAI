/**
 * Per-trip dismissed-recommendation set, persisted in localStorage.
 *
 * Lets the user remove an item from the "המלצות לשיפור" panel without
 * actually changing the underlying trip data. Dismissals are local to the
 * device — the same trip on another device starts with no dismissals.
 */

const KEY = (tripId: string) => `weTravel.dismissedRecs.${tripId}`;

const safeParse = (raw: string | null): string[] => {
        if (!raw) return [];
        try {
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
        } catch { return []; }
};

export const getDismissedRecs = (tripId: string): string[] => {
        if (!tripId) return [];
        try { return safeParse(localStorage.getItem(KEY(tripId))); } catch { return []; }
};

export const isDismissed = (tripId: string, recId: string): boolean =>
        getDismissedRecs(tripId).includes(recId);

export const dismissRec = (tripId: string, recId: string): string[] => {
        if (!tripId || !recId) return getDismissedRecs(tripId);
        const cur = getDismissedRecs(tripId);
        if (cur.includes(recId)) return cur;
        const next = [...cur, recId];
        try { localStorage.setItem(KEY(tripId), JSON.stringify(next)); } catch { /* quota */ }
        return next;
};

export const restoreRec = (tripId: string, recId: string): string[] => {
        if (!tripId || !recId) return getDismissedRecs(tripId);
        const next = getDismissedRecs(tripId).filter(id => id !== recId);
        try { localStorage.setItem(KEY(tripId), JSON.stringify(next)); } catch { /* noop */ }
        return next;
};

export const clearDismissedRecs = (tripId: string): void => {
        if (!tripId) return;
        try { localStorage.removeItem(KEY(tripId)); } catch { /* noop */ }
};
