import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl, { Map as MLMap, Popup as MLPopup, GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowRight, Plane, Sparkles, X } from 'lucide-react';
import { useTrips } from '../hooks/useTrips';
import { Trip, HotelBooking } from '../types';
import { MapItemPopup, PopupItem } from './map/MapItemPopup';

/**
 * MapLibre demo route. Mounted at #/map-v2. Throwaway evaluation route — if
 * the user likes the feel, we port UnifiedMapView to MapLibre. Otherwise we
 * delete this file + the maplibre-gl dep.
 *
 * Showcases the things Leaflet can't do well:
 *   - Smooth GPU-driven pan/zoom on vector tiles.
 *   - Cinematic flyTo curve via { speed, curve }.
 *   - Native cluster with smooth zoom-to-bounds.
 *   - Label fade-in by zoom via interpolate expression.
 *   - Hebrew label fallback via ["coalesce", "name:he", "name:en", "name"].
 *
 * Tile source: OpenFreeMap (https://openfreemap.org) — completely free, no
 * API key needed.
 */

// OpenFreeMap is the primary; MapLibre's official demo tiles are the
// fallback. Both are completely free with no API key. We try OpenFreeMap
// first and fall back if it errors so the demo always renders.
const PRIMARY_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const FALLBACK_STYLE = 'https://demotiles.maplibre.org/style.json';

// Build a flat list of placeable items with lat/lng from the trip
interface MapItem extends PopupItem {
        lat: number;
        lng: number;
}

// Same key the main UnifiedMapView uses. Items that were geocoded in the
// main view have their coords cached here so the demo can pick them up
// without re-geocoding.
const GEO_CACHE_KEY = 'travel_app_geo_cache_v6';

const loadGeoCache = (): Record<string, { lat: number; lng: number }> => {
        try {
                const raw = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}') as Record<string, { lat: number; lng: number; ts?: number }>;
                const out: Record<string, { lat: number; lng: number }> = {};
                Object.entries(raw).forEach(([k, v]) => {
                        if (typeof v?.lat === 'number' && typeof v?.lng === 'number') {
                                out[k] = { lat: v.lat, lng: v.lng };
                        }
                });
                return out;
        } catch { return {}; }
};

/**
 * Resolve coordinates for an item: prefer its own lat/lng, fall back to the
 * shared geocoding cache by address, then by name. Mirrors the resolution
 * logic in UnifiedMapView so the demo sees the same items as the main map.
 */
const resolveCoords = (
        item: { lat?: number; lng?: number; address?: string; name?: string },
        cache: Record<string, { lat: number; lng: number }>,
): { lat: number; lng: number } | null => {
        if (typeof item.lat === 'number' && typeof item.lng === 'number') {
                return { lat: item.lat, lng: item.lng };
        }
        if (item.address && cache[item.address]) return cache[item.address];
        if (item.address && cache[item.address.toLowerCase()]) return cache[item.address.toLowerCase()];
        if (item.name && cache[item.name]) return cache[item.name];
        return null;
};

const buildMapItems = (trip: Trip | null, cache: Record<string, { lat: number; lng: number }>): MapItem[] => {
        if (!trip) return [];
        const out: MapItem[] = [];

        (trip.hotels || []).forEach((h: HotelBooking) => {
                const coords = resolveCoords(h, cache);
                if (coords) {
                        out.push({
                                id: h.id || `hotel-${h.name}`,
                                type: 'hotel',
                                name: h.name,
                                address: h.address,
                                date: h.checkInDate,
                                rating: (h as any).rating || (h as any).googleRating,
                                priceRange: (h as any).price as string | undefined,
                                imageUrl: (h as any).imageUrl,
                                notes: h.notes,
                                googleMapsUrl: (h as any).googleMapsUrl,
                                source: 'saved',
                                lat: coords.lat, lng: coords.lng,
                        });
                }
        });

        (trip.restaurants || []).forEach(cat => {
                (cat.restaurants || []).forEach((r: any) => {
                        const coords = resolveCoords(r, cache);
                        if (coords) {
                                out.push({
                                        id: r.id || `rest-${r.name}`,
                                        type: 'restaurant',
                                        name: r.name,
                                        address: r.address,
                                        rating: r.rating || r.googleRating,
                                        cuisine: r.cuisine || cat.title,
                                        priceRange: r.priceRange,
                                        imageUrl: r.imageUrl,
                                        recommendationSource: r.recommendationSource,
                                        googleMapsUrl: r.googleMapsUrl,
                                        source: 'saved',
                                        lat: coords.lat, lng: coords.lng,
                                });
                        }
                });
        });

        (trip.attractions || []).forEach(cat => {
                (cat.attractions || []).forEach((a: any) => {
                        const coords = resolveCoords(a, cache);
                        if (coords) {
                                out.push({
                                        id: a.id || `attr-${a.name}`,
                                        type: 'attraction',
                                        name: a.name,
                                        address: a.address,
                                        rating: a.rating || a.googleRating,
                                        category: a.type || a.category || cat.title,
                                        imageUrl: a.imageUrl,
                                        recommendationSource: a.recommendationSource,
                                        googleMapsUrl: a.googleMapsUrl,
                                        source: 'saved',
                                        lat: coords.lat, lng: coords.lng,
                                });
                        }
                });
        });

        return out;
};

const computeBounds = (items: MapItem[]): LngLatBoundsLike | null => {
        if (items.length === 0) return null;
        let minLat = items[0].lat, maxLat = items[0].lat, minLng = items[0].lng, maxLng = items[0].lng;
        items.forEach(i => {
                minLat = Math.min(minLat, i.lat); maxLat = Math.max(maxLat, i.lat);
                minLng = Math.min(minLng, i.lng); maxLng = Math.max(maxLng, i.lng);
        });
        return [[minLng - 0.05, minLat - 0.05], [maxLng + 0.05, maxLat + 0.05]];
};

export const MapV2Demo: React.FC = () => {
        const { activeTrip, isLoading } = useTrips();
        const containerRef = useRef<HTMLDivElement>(null);
        const mapRef = useRef<MLMap | null>(null);
        const popupRef = useRef<MLPopup | null>(null);
        const popupRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
        const [styleReady, setStyleReady] = useState(false);
        const [flyingThrough, setFlyingThrough] = useState(false);

        const geoCache = useMemo(() => loadGeoCache(), []);
        const items = useMemo(() => buildMapItems(activeTrip, geoCache), [activeTrip, geoCache]);
        const hotels = useMemo(() => items.filter(i => i.type === 'hotel'), [items]);
        const [mapError, setMapError] = useState<string | null>(null);

        // Diagnostic: how many trip items had no coords (no own lat/lng + not in
        // the geocoding cache). Surfaced in the empty state so the user knows
        // why nothing is showing.
        const totalTripItems = useMemo(() => {
                if (!activeTrip) return 0;
                let n = (activeTrip.hotels || []).length;
                (activeTrip.restaurants || []).forEach(cat => { n += (cat.restaurants || []).length; });
                (activeTrip.attractions || []).forEach(cat => { n += (cat.attractions || []).length; });
                return n;
        }, [activeTrip]);

        // Initialize map once. Wait for items to be available so we can use a
        // sensible center. We also retry with a fallback style if the primary
        // tiles fail (CSP, network, regional blocks).
        useEffect(() => {
                if (!containerRef.current || mapRef.current) return;
                if (items.length === 0) return; // wait until we have data so center is right

                const initialCenter: [number, number] = [items[0].lng, items[0].lat];
                let cancelled = false;

                const initWithStyle = (style: string) => {
                        try {
                                const map = new maplibregl.Map({
                                        container: containerRef.current!,
                                        style,
                                        center: initialCenter,
                                        zoom: 9,
                                        pitch: 0,
                                });
                                mapRef.current = map;
                                map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

                                map.on('error', (e: any) => {
                                        const msg = e?.error?.message || e?.message || 'unknown';
                                        console.warn('[MapV2] map error:', msg, e);
                                        if (style === PRIMARY_STYLE && !mapRef.current?.isStyleLoaded()) {
                                                // Primary style failed — retry with fallback.
                                                map.remove();
                                                mapRef.current = null;
                                                console.info('[MapV2] retrying with fallback style');
                                                if (!cancelled) initWithStyle(FALLBACK_STYLE);
                                        } else {
                                                setMapError(msg);
                                        }
                                });

                                map.on('load', () => {
                                        if (cancelled) return;
                                        const layers = map.getStyle().layers || [];
                                        layers.forEach(layer => {
                                                if (layer.type === 'symbol' && (layer.layout as any)?.['text-field']) {
                                                        try {
                                                                map.setLayoutProperty(layer.id, 'text-field', [
                                                                        'coalesce',
                                                                        ['get', 'name:he'],
                                                                        ['get', 'name:en'],
                                                                        ['get', 'name:latin'],
                                                                        ['get', 'name'],
                                                                ]);
                                                        } catch { /* style may not allow runtime update for some layers */ }
                                                }
                                        });
                                        setStyleReady(true);
                                });
                        } catch (err: any) {
                                console.error('[MapV2] init failed:', err);
                                setMapError(String(err?.message || err));
                        }
                };

                initWithStyle(PRIMARY_STYLE);

                return () => {
                        cancelled = true;
                        if (popupRef.current) popupRef.current.remove();
                        if (mapRef.current) mapRef.current.remove();
                        mapRef.current = null;
                };
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [items.length]);

        // Add data + layers once the style is ready and items are loaded
        useEffect(() => {
                const map = mapRef.current;
                if (!map || !styleReady) return;
                if (items.length === 0) return;

                const fc = {
                        type: 'FeatureCollection' as const,
                        features: items.map(it => ({
                                type: 'Feature' as const,
                                properties: { id: it.id, type: it.type, name: it.name },
                                geometry: { type: 'Point' as const, coordinates: [it.lng, it.lat] },
                        })),
                };

                const SOURCE_ID = 'trip-points';
                const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
                if (existing) {
                        existing.setData(fc as any);
                        return;
                }

                // Derive the font stack from whatever the loaded style actually
                // provides. Hardcoding ['Noto Sans Bold', 'Noto Sans Regular']
                // 404s on OpenFreeMap because it serves each font as a separate
                // single-font stack. This sniff loop reuses an existing symbol
                // layer's text-font so we always pick something valid.
                const sniffFontStack = (): string[] => {
                        try {
                                const layers = map.getStyle().layers || [];
                                for (const layer of layers) {
                                        const f = (layer.layout as any)?.['text-font'];
                                        if (Array.isArray(f) && f.length > 0 && typeof f[0] === 'string') {
                                                return f as string[];
                                        }
                                }
                        } catch { /* ignore */ }
                        return ['Noto Sans Regular'];
                };
                const FONT_STACK = sniffFontStack();

                map.addSource(SOURCE_ID, {
                        type: 'geojson',
                        data: fc as any,
                        cluster: true,
                        clusterMaxZoom: 14,
                        clusterRadius: 48,
                });

                // Cluster bubbles
                map.addLayer({
                        id: 'cluster-fill',
                        type: 'circle',
                        source: SOURCE_ID,
                        filter: ['has', 'point_count'],
                        paint: {
                                'circle-color': [
                                        'step', ['get', 'point_count'],
                                        '#7c3aed', 5,
                                        '#6d28d9', 15,
                                        '#5b21b6',
                                ],
                                'circle-radius': [
                                        'step', ['get', 'point_count'],
                                        18, 5, 22, 15, 28,
                                ],
                                'circle-stroke-width': 3,
                                'circle-stroke-color': '#ffffff',
                        },
                });
                map.addLayer({
                        id: 'cluster-count',
                        type: 'symbol',
                        source: SOURCE_ID,
                        filter: ['has', 'point_count'],
                        layout: {
                                'text-field': '{point_count_abbreviated}',
                                'text-font': FONT_STACK,
                                'text-size': 13,
                        },
                        paint: { 'text-color': '#ffffff' },
                });

                // Single points — different color per type
                map.addLayer({
                        id: 'points-circle',
                        type: 'circle',
                        source: SOURCE_ID,
                        filter: ['!', ['has', 'point_count']],
                        paint: {
                                'circle-color': [
                                        'match', ['get', 'type'],
                                        'hotel', '#0ea5e9',
                                        'restaurant', '#f97316',
                                        'attraction', '#8b5cf6',
                                        '#64748b',
                                ],
                                'circle-radius': [
                                        'case',
                                        ['==', ['get', 'type'], 'hotel'], 9,
                                        7,
                                ],
                                'circle-stroke-width': 3,
                                'circle-stroke-color': '#ffffff',
                        },
                });
                map.addLayer({
                        id: 'points-label',
                        type: 'symbol',
                        source: SOURCE_ID,
                        filter: ['!', ['has', 'point_count']],
                        layout: {
                                'text-field': ['get', 'name'],
                                'text-font': FONT_STACK,
                                'text-size': 12,
                                'text-anchor': 'top',
                                'text-offset': [0, 1.2],
                                'text-allow-overlap': false,
                                'text-optional': true,
                        },
                        paint: {
                                'text-color': '#0f172a',
                                'text-halo-color': '#ffffff',
                                'text-halo-width': 1.5,
                                'text-opacity': [
                                        'interpolate', ['linear'], ['zoom'],
                                        10, 0,
                                        12, [
                                                'case',
                                                ['==', ['get', 'type'], 'hotel'], 1,
                                                0,
                                        ],
                                        13.5, 1,
                                ],
                        },
                });

                // Day connector — straight chronological line through hotels.
                if (hotels.length >= 2) {
                        const lineFc = {
                                type: 'FeatureCollection' as const,
                                features: [{
                                        type: 'Feature' as const,
                                        properties: {},
                                        geometry: {
                                                type: 'LineString' as const,
                                                coordinates: hotels.map(h => [h.lng, h.lat]),
                                        },
                                }],
                        };
                        if (!map.getSource('trip-route')) {
                                map.addSource('trip-route', { type: 'geojson', data: lineFc as any });
                                map.addLayer({
                                        id: 'trip-route-line',
                                        type: 'line',
                                        source: 'trip-route',
                                        layout: { 'line-cap': 'round', 'line-join': 'round' },
                                        paint: {
                                                'line-color': '#0ea5e9',
                                                'line-width': 3,
                                                'line-opacity': 0.85,
                                                'line-dasharray': [2, 2],
                                        },
                                }, 'cluster-fill');
                        } else {
                                (map.getSource('trip-route') as GeoJSONSource).setData(lineFc as any);
                        }
                }

                // Fit to trip bounds
                const bounds = computeBounds(items);
                if (bounds) {
                        map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 });
                }

                // Cluster click → smooth zoom in
                map.on('click', 'cluster-fill', async (e) => {
                        const features = map.queryRenderedFeatures(e.point, { layers: ['cluster-fill'] });
                        const clusterId = features[0]?.properties?.cluster_id;
                        if (clusterId == null) return;
                        const src = map.getSource(SOURCE_ID) as GeoJSONSource;
                        const zoom = await src.getClusterExpansionZoom(clusterId);
                        const geom = features[0].geometry as any;
                        if (geom?.coordinates) {
                                map.easeTo({ center: geom.coordinates, zoom, duration: 700 });
                        }
                });

                // Single point click → flyTo + popup
                const onPointClick = (e: maplibregl.MapMouseEvent) => {
                        const f = map.queryRenderedFeatures(e.point, { layers: ['points-circle'] })[0];
                        if (!f) return;
                        const id = (f.properties as any)?.id;
                        const item = items.find(it => it.id === id);
                        if (!item) return;

                        const targetZoom = item.type === 'hotel' ? 15.5 : 16.5;
                        map.stop();
                        map.flyTo({
                                center: [item.lng, item.lat],
                                zoom: Math.max(map.getZoom(), targetZoom),
                                speed: 1.4,
                                curve: 1.42,
                                essential: true,
                        });

                        // Render popup
                        if (popupRef.current) popupRef.current.remove();
                        if (popupRootRef.current) popupRootRef.current.unmount();
                        const container = document.createElement('div');
                        const root = createRoot(container);
                        popupRootRef.current = root;
                        root.render(<MapItemPopup item={item} />);
                        popupRef.current = new maplibregl.Popup({ offset: 18, closeButton: false, closeOnClick: true, maxWidth: '320px' })
                                .setLngLat([item.lng, item.lat])
                                .setDOMContent(container)
                                .addTo(map);
                };
                map.on('click', 'points-circle', onPointClick);

                // Cursor changes
                map.on('mouseenter', 'cluster-fill', () => map.getCanvas().style.cursor = 'pointer');
                map.on('mouseleave', 'cluster-fill', () => map.getCanvas().style.cursor = '');
                map.on('mouseenter', 'points-circle', () => map.getCanvas().style.cursor = 'pointer');
                map.on('mouseleave', 'points-circle', () => map.getCanvas().style.cursor = '');

                return () => {
                        map.off('click', 'points-circle', onPointClick);
                };
        }, [styleReady, items, hotels]);

        const flyThroughTrip = async () => {
                const map = mapRef.current;
                if (!map || hotels.length === 0 || flyingThrough) return;
                setFlyingThrough(true);
                for (const h of hotels) {
                        await new Promise<void>(resolve => {
                                map.stop();
                                map.flyTo({
                                        center: [h.lng, h.lat],
                                        zoom: 14.5,
                                        speed: 0.9,
                                        curve: 1.42,
                                        essential: true,
                                });
                                map.once('moveend', () => setTimeout(resolve, 1100));
                        });
                }
                // Return to overview
                const bounds = computeBounds(items);
                if (bounds) map.fitBounds(bounds, { padding: 60, duration: 1400, maxZoom: 14 });
                setFlyingThrough(false);
        };

        // Empty / loading states
        if (isLoading) {
                return <div className="min-h-screen flex items-center justify-center text-slate-500" dir="rtl">טוען טיולים…</div>;
        }
        if (!activeTrip) {
                return (
                        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
                                <div className="text-2xl font-black text-brand-navy">אין טיול פעיל</div>
                                <p className="text-slate-500">התחבר/בחר טיול כדי לראות את הדמו.</p>
                                <a href="#/" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm shadow">
                                        <ArrowRight className="w-4 h-4" /> חזרה לאתר
                                </a>
                        </div>
                );
        }
        if (items.length === 0) {
                return (
                        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
                                <div className="text-2xl font-black text-brand-navy">{activeTrip.name}</div>
                                <p className="text-slate-500 max-w-sm">
                                        לטיול הזה יש <strong className="text-brand-navy">{totalTripItems}</strong> פריטים, אבל אף אחד מהם עוד לא נמצא בקאש הקואורדינטות.
                                </p>
                                <p className="text-2xs text-slate-400 max-w-sm leading-relaxed">
                                        טיפ: פתח את האתר הראשי, בקר בלשונית המפה (UnifiedMapView). זה מפעיל את ה-Geocoding ושומר את הקואורדינטות בקאש. אז חזור הנה ותראה את המפה.
                                </p>
                                <a href="#/" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm shadow">
                                        <ArrowRight className="w-4 h-4" /> פתח את המפה הראשית כדי למלא את הקאש
                                </a>
                        </div>
                );
        }

        return (
                <div className="fixed inset-0 bg-slate-100 font-rubik" dir="rtl">
                        {/* Top bar */}
                        <div className="absolute top-0 inset-x-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow">
                                                <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                                <div className="font-black text-brand-navy text-sm truncate">{activeTrip.name} · MAP V2 (Beta)</div>
                                                <div className="text-2xs text-slate-500 truncate">{items.length}/{totalTripItems} פריטים על המפה · MapLibre + OpenFreeMap</div>
                                        </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                        <a
                                                href="#/"
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-black"
                                                title="חזרה לגרסה הראשית"
                                        >
                                                <X className="w-3 h-3" />
                                                סגור
                                        </a>
                                </div>
                        </div>

                        {/* The map — `dir="ltr"` because MapLibre's canvas
                            transforms assume LTR coordinates; an RTL parent
                            inverts hit-testing and breaks the canvas. */}
                        <div
                                ref={containerRef}
                                dir="ltr"
                                className="absolute inset-0 top-[52px] bg-slate-200"
                                style={{ direction: 'ltr' }}
                        />

                        {mapError && (
                                <div className="absolute top-[60px] right-3 left-3 z-20 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-3 text-xs font-bold shadow">
                                        ❌ המפה לא נטענה: {mapError}
                                        <div className="mt-1 text-2xs font-normal text-rose-700">
                                                בדוק את ה-Console (F12) לפרטים נוספים.
                                        </div>
                                </div>
                        )}

                        {/* HUD: fly-through trip button */}
                        {hotels.length >= 2 && (
                                <button
                                        onClick={flyThroughTrip}
                                        disabled={flyingThrough}
                                        className="absolute bottom-4 right-3 z-10 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-500/40 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait"
                                >
                                        <Plane className={`w-4 h-4 ${flyingThrough ? 'animate-pulse' : ''}`} />
                                        {flyingThrough ? 'טס בין מלונות…' : 'טוס דרך הטיול'}
                                </button>
                        )}

                        {/* Beta strip */}
                        <div className="absolute bottom-4 left-3 z-10 bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 max-w-[200px]">
                                Beta · אם זה מרגיש טוב, נחליף את כל המפות לכאן.
                        </div>
                </div>
        );
};
