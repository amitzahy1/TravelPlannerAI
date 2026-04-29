/**
 * Helpers for handling Google-Maps URLs supplied by the AI.
 *
 * Even with Google-Search grounding the LLM can occasionally hallucinate
 * close-but-wrong domains (e.g. "maps.appgoo.gl" instead of
 * "maps.app.goo.gl"). Anything outside this whitelist is treated as
 * untrusted; callers should fall back to a deterministic search-by-name
 * URL constructed from the place's name + address.
 */

const GOOGLE_MAPS_HOSTS = new Set<string>([
        'www.google.com',
        'google.com',
        'maps.google.com',
        'maps.app.goo.gl',
        'goo.gl',
]);

// Hosts that ARE the maps service itself — any path on them is a maps deep link.
// For the generic google.com hosts we additionally require a /maps/ path so AI
// hallucinations like "google.com/foo" don't slip through host-only validation.
const MAPS_ONLY_HOSTS = new Set<string>([
        'maps.google.com',
        'maps.app.goo.gl',
        'goo.gl',
]);

export const isTrustedMapsUrl = (url: string | undefined | null): boolean => {
        if (!url) return false;
        try {
                const u = new URL(url);
                if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
                const host = u.hostname.toLowerCase();
                if (!GOOGLE_MAPS_HOSTS.has(host)) return false;
                if (MAPS_ONLY_HOSTS.has(host)) return u.pathname.length > 1;
                // www.google.com / google.com — must be on the /maps/ path
                return u.pathname.toLowerCase().startsWith('/maps/');
        } catch {
                return false;
        }
};

// Strip parenthetical clauses ("Pizza East (Permanently closed)") and squeeze
// whitespace so the search query the user lands on Google Maps with is the
// same regardless of which view built the link.
const cleanForQuery = (s: string | undefined | null): string =>
        (s || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

/** Build a deterministic search-by-name URL as a safe fallback. */
export const buildMapsSearchUrl = (name: string, address?: string): string => {
        const query = [cleanForQuery(name), cleanForQuery(address)].filter(Boolean).join(' ').trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

/**
 * Returns the AI-supplied URL if it's trusted, otherwise a deterministic
 * search-by-name URL. The ergonomic helper for popup CTAs.
 */
export const safeMapsUrl = (
        suppliedUrl: string | undefined | null,
        name: string,
        address?: string,
): string =>
        isTrustedMapsUrl(suppliedUrl) ? suppliedUrl! : buildMapsSearchUrl(name, address);
