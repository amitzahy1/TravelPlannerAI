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
