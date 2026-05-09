/**
 * Canonical helpers for building Google-Maps navigation links.
 *
 * Background: every `googleMapsUrl` we have on a place is AI-generated.
 * The model has produced bogus URLs in the wild — wrong subdomains
 * (`maps.appgoo.gl`), fake Firebase Dynamic Links (`goo.gl/app/maps/...`),
 * even literal placeholder IDs (`.../abcdefghijklmnop`). Without an
 * outbound HTTP check we can't actually verify them in general, so we
 * default to a deterministic search-by-name URL. The one exception is
 * AI URLs that already encode a `place_id` / `cid` / `ftid` — those
 * resolve to a specific Google Maps entity and are kept as-is.
 *
 * The query always includes the trip city + country when available so
 * Google has enough context to land on the right place card instead of
 * the global search results page.
 */

const cleanForQuery = (s: string | undefined | null): string =>
        (s || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

const isPreciseGoogleUrl = (url: string | undefined | null): boolean => {
        if (!url) return false;
        try {
                const u = new URL(url);
                if (!/(^|\.)google\.com$|(^|\.)google\.[a-z.]+$/i.test(u.hostname)) return false;
                if (!/\/maps\//i.test(u.pathname)) return false;
                const hasPid = u.searchParams.has('query_place_id') || u.searchParams.has('place_id');
                const hasCid = u.searchParams.has('cid') || u.searchParams.has('ftid');
                return hasPid || hasCid;
        } catch {
                return false;
        }
};

/**
 * Build a deterministic search URL with city + country hints.
 * `gl` (region) and `hl` (language) tell Google to disambiguate using the
 * trip's country and Hebrew display, which substantially improves the
 * "lands on a place card vs. generic search" rate.
 */
export const buildMapsSearchUrl = (
        name: string,
        address?: string,
        city?: string,
        countryCode?: string,
): string => {
        const parts = [cleanForQuery(name), cleanForQuery(address), cleanForQuery(city)]
                .filter(Boolean)
                .filter((part, i, arr) => arr.indexOf(part) === i); // de-dupe (city may already be in address)
        const query = parts.join(', ');
        const gl = (countryCode || '').toLowerCase().trim();
        const hint = `${gl ? `&gl=${encodeURIComponent(gl)}` : ''}&hl=he`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${hint}`;
};

/**
 * Public helper for popup/CTA navigation links.
 * If the AI-supplied URL already encodes a place_id or cid, we trust it
 * (those values are deterministic). Otherwise we rebuild from name/address/
 * city/country so the user lands on the right place.
 */
export const safeMapsUrl = (
        suppliedUrl: string | undefined | null,
        name: string,
        address?: string,
        city?: string,
        countryCode?: string,
): string => {
        if (isPreciseGoogleUrl(suppliedUrl)) return suppliedUrl as string;
        return buildMapsSearchUrl(name, address, city, countryCode);
};
