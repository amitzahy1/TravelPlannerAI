/**
 * Pick the best English display name for a restaurant, attraction, or
 * hotel. Priority:
 *   1. nameEnglish — if present and Latin script
 *   2. name — if already Latin script (older AI data sometimes has the
 *      English name directly in `name`)
 *   3. First comma-segment of `location` — the AI prompts require this
 *      field to be in English ("Silom Road, Bangkok"), so it's a safe
 *      last-resort when both name fields are Hebrew
 *   4. nameEnglish or name as-is (might be Hebrew — caller's problem)
 */

const HEBREW_RE = /[֐-׿]/;

export const containsHebrew = (s?: string): boolean =>
    !!s && HEBREW_RE.test(s);

export const getEnglishName = (place: {
    name: string;
    nameEnglish?: string;
    location?: string;
}): string => {
    if (place.nameEnglish && !containsHebrew(place.nameEnglish))
        return place.nameEnglish;
    if (place.name && !containsHebrew(place.name))
        return place.name;
    const fromLocation = (place.location || '').split(',')[0]?.trim();
    if (fromLocation && !containsHebrew(fromLocation))
        return fromLocation;
    return place.nameEnglish || place.name || '';
};
