/**
 * Centralised state for the unified-trip map.
 *
 * Two storage layers:
 *   - localStorage (`tp_map_prefs_v1`): user-level "next visit" defaults —
 *     which layers were last toggled on, theme, walking circles. Persists
 *     across trips so the user doesn't reset their preferred view every
 *     time they reopen the app.
 *   - URL search params (hash router-aware): trip-specific *current view* —
 *     active city focus, active day, current centre + zoom. Survives a
 *     copy-paste so a shareable URL opens the exact same view in any
 *     browser. URL takes precedence over localStorage on mount.
 *
 * Single source of truth: when reading, the URL is canonical. localStorage
 * is a hint applied only if the URL didn't specify that piece of state.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'tp_map_prefs_v1';

export interface MapLayers {
        route: boolean;          // flights / drives / ferries polylines + flight pins
        hotels: boolean;         // hotel markers (also gate the always-included-in-bounds anchor)
        myLists: boolean;        // user's saved restaurants + attractions
        aiRestaurants: boolean;  // AI market-research food
        aiAttractions: boolean;  // AI market-research attractions
}

export interface MapExtras {
        walkingCircles: boolean; // 15min/30min rings around hotels
        heatmap: boolean;        // density heatmap mode for AI items
        theme: 'light' | 'dark'; // tile theme
}

export interface MapView {
        city: string;            // active city name from getTripCities, or 'all'
        day: number | 'all';     // 1-indexed day or 'all'
        lat?: number;
        lng?: number;
        zoom?: number;
}

export interface MapPreferences extends MapLayers, MapExtras {}

const DEFAULT_LAYERS: MapLayers = {
        route: true,
        hotels: true,
        myLists: true,
        aiRestaurants: false,    // AI off by default — user opts in
        aiAttractions: false,
};

const DEFAULT_EXTRAS: MapExtras = {
        walkingCircles: false,
        heatmap: false,
        theme: 'light',
};

const DEFAULT_PREFS: MapPreferences = { ...DEFAULT_LAYERS, ...DEFAULT_EXTRAS };

const DEFAULT_VIEW: MapView = { city: 'all', day: 'all' };

// Compact codes used in the URL so the layers param stays readable
// (?layers=R,H,M instead of ?layers=route,hotels,myLists).
const LAYER_CODES: Record<keyof MapLayers, string> = {
        route: 'R',
        hotels: 'H',
        myLists: 'M',
        aiRestaurants: 'F',
        aiAttractions: 'A',
};
const CODE_TO_LAYER: Record<string, keyof MapLayers> = Object.entries(LAYER_CODES).reduce(
        (acc, [k, v]) => ({ ...acc, [v]: k as keyof MapLayers }),
        {} as Record<string, keyof MapLayers>,
);

const readLocal = (): Partial<MapPreferences> => {
        try {
                if (typeof localStorage === 'undefined') return {};
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
};

const writeLocal = (prefs: MapPreferences) => {
        try {
                if (typeof localStorage === 'undefined') return;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch { /* quota / private mode */ }
};

export const useMapPreferences = () => {
        const [searchParams, setSearchParams] = useSearchParams();

        // --- Layers + extras: localStorage backed, URL-overridable -------------
        const [prefs, setPrefsState] = useState<MapPreferences>(() => {
                const local = readLocal();
                const merged: MapPreferences = { ...DEFAULT_PREFS, ...local };

                // URL override for layers
                const layersParam = searchParams.get('layers');
                if (layersParam !== null) {
                        const codes = new Set(layersParam.split(',').map(s => s.trim()));
                        (Object.keys(LAYER_CODES) as Array<keyof MapLayers>).forEach(k => {
                                merged[k] = codes.has(LAYER_CODES[k]);
                        });
                }
                const themeParam = searchParams.get('theme');
                if (themeParam === 'dark' || themeParam === 'light') merged.theme = themeParam;
                const walkingParam = searchParams.get('walking');
                if (walkingParam !== null) merged.walkingCircles = walkingParam === '1';
                const heatmapParam = searchParams.get('heatmap');
                if (heatmapParam !== null) merged.heatmap = heatmapParam === '1';

                return merged;
        });

        const setPrefs = useCallback((updater: Partial<MapPreferences> | ((p: MapPreferences) => MapPreferences)) => {
                setPrefsState(prev => {
                        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
                        writeLocal(next);
                        return next;
                });
        }, []);

        // --- View: URL-only (per-trip view, not a global pref) -----------------
        const view: MapView = useMemo(() => ({
                city: searchParams.get('city') || 'all',
                day: searchParams.get('day') === 'all' || !searchParams.get('day')
                        ? 'all'
                        : Math.max(1, Number(searchParams.get('day')) || 1),
                lat: searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined,
                lng: searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined,
                zoom: searchParams.get('zoom') ? Number(searchParams.get('zoom')) : undefined,
        }), [searchParams]);

        const setView = useCallback((next: Partial<MapView>) => {
                setSearchParams(prev => {
                        const sp = new URLSearchParams(prev);
                        const apply = (key: string, value: string | number | undefined | null) => {
                                if (value === undefined || value === null || value === '' || value === 'all') sp.delete(key);
                                else sp.set(key, String(value));
                        };
                        if (next.city !== undefined) apply('city', next.city);
                        if (next.day !== undefined) apply('day', next.day === 'all' ? null : next.day);
                        if (next.lat !== undefined) apply('lat', Number.isFinite(next.lat) ? Number(next.lat).toFixed(4) : null);
                        if (next.lng !== undefined) apply('lng', Number.isFinite(next.lng) ? Number(next.lng).toFixed(4) : null);
                        if (next.zoom !== undefined) apply('zoom', Number.isFinite(next.zoom) ? Number(next.zoom).toFixed(0) : null);
                        return sp;
                }, { replace: true });
        }, [setSearchParams]);

        // --- Sync prefs back to the URL (so it stays shareable) ----------------
        // Done as an effect to avoid a re-render loop on first mount.
        useEffect(() => {
                setSearchParams(prev => {
                        const sp = new URLSearchParams(prev);
                        const codes = (Object.keys(LAYER_CODES) as Array<keyof MapLayers>)
                                .filter(k => prefs[k])
                                .map(k => LAYER_CODES[k])
                                .join(',');
                        // Only write `layers` to the URL when it differs from the default
                        // — keeps the URL clean for the common case.
                        const isDefault = (Object.keys(DEFAULT_LAYERS) as Array<keyof MapLayers>)
                                .every(k => prefs[k] === DEFAULT_LAYERS[k]);
                        if (isDefault) sp.delete('layers');
                        else sp.set('layers', codes);

                        if (prefs.theme === 'dark') sp.set('theme', 'dark'); else sp.delete('theme');
                        if (prefs.walkingCircles) sp.set('walking', '1'); else sp.delete('walking');
                        if (prefs.heatmap) sp.set('heatmap', '1'); else sp.delete('heatmap');
                        return sp;
                }, { replace: true });
        }, [prefs, setSearchParams]);

        return { prefs, setPrefs, view, setView, defaults: { prefs: DEFAULT_PREFS, view: DEFAULT_VIEW, layerCodes: LAYER_CODES, codeToLayer: CODE_TO_LAYER } };
};
