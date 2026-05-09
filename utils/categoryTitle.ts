/**
 * Render-time normalization for AI category titles.
 *
 * Existing trips persist legacy titles like "🏨 ליד KC Grande Resort Koh
 * Chang — עד 15 דק' הליכה" (or the English variant). The new code stores
 * the short "🏨 קרוב למלון" but a Firestore migration is risky for past
 * data. This helper rewrites old titles at render time so the UI is
 * consistent regardless of what's stored on disk.
 */

const NEAR_HOTEL_HE = /^🏨\s+(?:ליד|קרוב\s+ל)\b/u;
const NEAR_HOTEL_EN = /^🏨\s+(?:Near|Within|Walk)\b/i;
const NEAR_HOTEL_SHORT = '🏨 קרוב למלון';

export const normalizeNearHotelTitle = (title: string | undefined | null): string => {
        const t = (title || '').trim();
        if (!t) return '';
        if (t === NEAR_HOTEL_SHORT) return t;
        if (NEAR_HOTEL_HE.test(t) || NEAR_HOTEL_EN.test(t)) return NEAR_HOTEL_SHORT;
        return t;
};

/** True iff a title is the near-hotel category in any of its known forms. */
export const isNearHotelTitle = (title: string | undefined | null): boolean => {
        const t = (title || '').trim();
        return t === NEAR_HOTEL_SHORT || NEAR_HOTEL_HE.test(t) || NEAR_HOTEL_EN.test(t);
};
