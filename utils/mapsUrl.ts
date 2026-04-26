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

export const isTrustedMapsUrl = (url: string | undefined | null): boolean => {
        if (!url) return false;
        try {
                const u = new URL(url);
                if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
                return GOOGLE_MAPS_HOSTS.has(u.hostname.toLowerCase());
        } catch {
                return false;
        }
};

/** Build a deterministic search-by-name URL as a safe fallback. */
export const buildMapsSearchUrl = (name: string, address?: string): string => {
        const query = [name, address].filter(Boolean).join(' ').trim();
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
