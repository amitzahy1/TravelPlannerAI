/**
 * Canonical helpers for building Google-Maps navigation links.
 *
 * Background: every `googleMapsUrl` we have on a place is AI-generated.
 * The model has produced bogus URLs in the wild — wrong subdomains
 * (`maps.appgoo.gl`), fake Firebase Dynamic Links (`goo.gl/app/maps/...`),
 * even literal placeholder IDs (`.../abcdefghijklmnop`). Without an
 * outbound HTTP check we can't actually verify any of them, so we always
 * build a deterministic search-by-name URL instead. That URL works for
 * any real place and produces identical results regardless of which
 * view rendered it (list card, popup, modal, itinerary).
 */

// Strip parenthetical clauses ("Pizza East (Permanently closed)") and squeeze
// whitespace so the search query is the same regardless of caller.
const cleanForQuery = (s: string | undefined | null): string =>
        (s || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

/** Deterministic search-by-name URL — always works, always identical. */
export const buildMapsSearchUrl = (name: string, address?: string): string => {
        const query = [cleanForQuery(name), cleanForQuery(address)].filter(Boolean).join(' ').trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

/**
 * Public helper for popup/CTA navigation links. The signature accepts an
 * AI-supplied URL for backwards compat, but the value is intentionally
 * ignored — see file header.
 */
export const safeMapsUrl = (
        _suppliedUrl: string | undefined | null,
        name: string,
        address?: string,
): string => buildMapsSearchUrl(name, address);
