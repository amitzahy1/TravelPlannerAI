type AppLocation = Pick<Location, 'origin' | 'pathname'>;

const GITHUB_PAGES_PROJECT_PATH = '/TravelPlannerAI/';

const ensureTrailingSlash = (value: string) => value.endsWith('/') ? value : `${value}/`;
const normalizeOrigin = (origin: string) => origin.replace(/\.+$/, '');

const normalizeConfiguredBaseUrl = (value?: string) => {
        const trimmed = value?.trim();
        return trimmed ? ensureTrailingSlash(trimmed) : undefined;
};

const pathLooksLikeFile = (pathname: string) => /\/[^/]+\.[^/]+$/.test(pathname);

export const getAppBaseUrl = (
        location: AppLocation,
        envBase: string = '/',
        configuredBaseUrl?: string,
) => {
        const configured = normalizeConfiguredBaseUrl(configuredBaseUrl);
        if (configured) return configured;

        const origin = normalizeOrigin(location.origin);

        if (origin === 'https://amitzahy1.github.io') {
                return `${origin}${GITHUB_PAGES_PROJECT_PATH}`;
        }

        if (envBase && envBase.startsWith('/') && envBase !== '/') {
                return `${origin}${ensureTrailingSlash(envBase)}`;
        }

        if (origin.endsWith('.github.io') && location.pathname === '/') {
                return `${origin}${GITHUB_PAGES_PROJECT_PATH}`;
        }

        const pathname = location.pathname || '/';
        if (pathname.endsWith('/')) {
                return `${origin}${pathname}`;
        }

        if (pathLooksLikeFile(pathname)) {
                const directory = pathname.slice(0, pathname.lastIndexOf('/') + 1) || '/';
                return `${origin}${directory}`;
        }

        return `${origin}${pathname}/`;
};

export const buildJoinTripUrl = (baseUrl: string, shareId: string) => (
        `${ensureTrailingSlash(baseUrl)}#/join/${encodeURIComponent(shareId)}`
);

export const buildBrowserJoinTripUrl = (shareId: string) => (
        buildJoinTripUrl(
                getAppBaseUrl(
                        window.location,
                        import.meta.env.BASE_URL || '/',
                        import.meta.env.VITE_PUBLIC_APP_URL,
                ),
                shareId,
        )
);

// Worker URL used for shareable invite links. The Worker fetches the
// trip_invites doc, returns HTML with Open Graph tags so WhatsApp etc.
// can build a rich preview card, then redirects humans into the SPA's
// hash route. We use the Worker URL (not the GitHub Pages URL) because
// the SPA uses hash routing — scrapers never see the `#/join/…` part,
// so OG tags can't be derived from the GH Pages page.
//
// Pattern: https://travelplannerai-api.amitzahy1.workers.dev/share/{shareId}?role={role}
// Falls back to the legacy hash URL if VITE_PUBLIC_SHARE_BASE_URL is
// explicitly cleared (useful for local dev when the Worker route isn't
// deployed yet).
const DEFAULT_SHARE_BASE_URL = 'https://travelplannerai-api.amitzahy1.workers.dev';

export const buildShareableInviteUrl = (shareId: string, role: 'viewer' | 'editor'): string => {
        const configured = (import.meta as any).env?.VITE_PUBLIC_SHARE_BASE_URL;
        const base = typeof configured === 'string' && configured.trim()
                ? configured.trim().replace(/\/$/, '')
                : DEFAULT_SHARE_BASE_URL;
        return `${base}/share/${encodeURIComponent(shareId)}?role=${encodeURIComponent(role)}`;
};
