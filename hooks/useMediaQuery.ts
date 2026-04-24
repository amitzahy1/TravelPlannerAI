import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * Useful for JS-level conditional rendering (e.g. "don't mount the heavy
 * map preview on mobile"). For pure layout changes prefer Tailwind breakpoints.
 */
export const useMediaQuery = (query: string): boolean => {
        const getMatch = () =>
                typeof window !== 'undefined' && typeof window.matchMedia === 'function'
                        ? window.matchMedia(query).matches
                        : false;

        const [matches, setMatches] = useState<boolean>(getMatch);

        useEffect(() => {
                if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
                const mq = window.matchMedia(query);
                const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
                // Sync once in case initial SSR value was stale.
                setMatches(mq.matches);
                // Modern + legacy API
                if (mq.addEventListener) {
                        mq.addEventListener('change', onChange);
                        return () => mq.removeEventListener('change', onChange);
                }
                // @ts-ignore — Safari < 14
                mq.addListener(onChange);
                // @ts-ignore
                return () => mq.removeListener(onChange);
        }, [query]);

        return matches;
};

/** Matches Tailwind `md` breakpoint (768 px). < md = mobile. */
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767px)');

/** `sm` (≥ 640) to `md` (< 1024) — covers small tablets / large phones. */
export const useIsTablet = (): boolean => useMediaQuery('(min-width: 640px) and (max-width: 1023px)');

/** Narrow phone breakpoint — iPhone SE and similar. */
export const useIsSmallPhone = (): boolean => useMediaQuery('(max-width: 414px)');

/** Respects the OS-level Reduce Motion preference. */
export const usePrefersReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)');
