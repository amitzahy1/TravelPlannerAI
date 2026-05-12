/**
 * FullTripMapView — the dedicated experience for the `map_full` tab.
 *
 * Wraps UnifiedMapView and adds the full trip-overview UX layer:
 *   • Top floating pill bar: city focus chips (+ mobile layers button)
 *   • Right sidebar (desktop) / bottom drawer (mobile): LayersPanel
 *   • Bottom row: TripStatsBar + GPS button + keyboard shortcuts hint
 *   • MissingDataSheet — bottom-sheet with gap list + deep-link CTAs
 *   • Keyboard shortcuts: Esc / ? / L
 *   • Persistence: localStorage prefs + URL view state
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trip } from '../types';
import { Keyboard, Layers, LocateFixed, LocateOff } from 'lucide-react';
import { UnifiedMapView } from './UnifiedMapView';
import { LayersPanel } from './map/LayersPanel';
import { MissingDataSheet } from './map/MissingDataSheet';
import { TripStatsBar } from './map/TripStatsBar';
import { CityChipStrip, CityChipDescriptor } from './map/CityChipStrip';
import { useMapPreferences } from '../hooks/useMapPreferences';
import { cityKey, displayCityName, extractRobustCity } from '../utils/geoData';
import { normalizeCityForChip, isProvinceOrCountryName } from '../utils/cityNormalize';
import { getMissingDataPoints } from '../utils/tripGaps';
import { useIsMobile } from '../hooks/useMediaQuery';

interface FullTripMapViewProps {
        trip: Trip;
        onSwitchTab?: (tab: string) => void;
        title?: string;
        onUpdateTrip?: (trip: Trip) => void;
}

type ResolvedItem = { id: string; type: string; name: string; lat: number; lng: number; city?: string };

const cleanCityName = (s: string): string => (s || '').trim();

type LocateState = 'idle' | 'loading' | 'error';

const SHORTCUTS = [
        { key: '?', desc: 'קיצורי מקלדת' },
        { key: 'L', desc: 'פנל שכבות (מובייל)' },
        { key: 'Esc', desc: 'סגור פאנלים' },
];

export const FullTripMapView: React.FC<FullTripMapViewProps> = ({ trip, onSwitchTab, title, onUpdateTrip }) => {
        const { prefs, setPrefs, view, setView } = useMapPreferences();
        const isMobile = useIsMobile();
        const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

        // Deferred map mount: render the page chrome + a loading skeleton
        // INSTANTLY, then mount the heavy UnifiedMapView (Leaflet + AI leg
        // classifier + geocoding pipeline) one tick later. The tab switch
        // feels immediate — the map paints behind a brief spinner instead of
        // hanging on the previous page.
        const [mapMounted, setMapMounted] = useState(false);
        useEffect(() => {
                let cancelled = false;
                // Two rAFs: one to let the skeleton paint, one to let layout settle.
                const r1 = requestAnimationFrame(() => {
                        const r2 = requestAnimationFrame(() => {
                                if (!cancelled) setMapMounted(true);
                        });
                        // store r2 on a ref-like closure so we can cancel
                        (window as any).__mapMountR2 = r2;
                });
                return () => {
                        cancelled = true;
                        cancelAnimationFrame(r1);
                        const r2 = (window as any).__mapMountR2;
                        if (r2) cancelAnimationFrame(r2);
                };
        }, []);
        const [missingSheetOpen, setMissingSheetOpen] = useState(false);
        const [locateState, setLocateState] = useState<LocateState>('idle');
        const [flyTo, setFlyTo] = useState<
                | { lat: number; lng: number; zoom?: number; kind?: 'gps' | 'reveal' }
                | { bounds: [[number, number], [number, number]]; maxZoom?: number; kind?: 'gps' | 'reveal' }
                | null
        >(null);
        const [shortcutsOpen, setShortcutsOpen] = useState(false);
        const shortcutsRef = useRef<HTMLDivElement>(null);

        // Snapshot of resolved items from UnifiedMapView's geocoding pipeline.
        // Used to compute city bounds for the chip-strip click handler — we
        // can't read the geocoder state directly because it's encapsulated
        // inside UnifiedMapView.
        const resolvedItemsRef = useRef<ResolvedItem[]>([]);
        const lastChipClickRef = useRef<{ city: string; ts: number; idx: number } | null>(null);

        // Chip descriptors — derived from trip.hotels in chronological order
        // (checkInDate). Each hotel becomes a sequential stop number; cities
        // visited at multiple chronological points (Bangkok start + Bangkok
        // end) collect both numbers in one chip. This mirrors the on-map
        // grouped stop pills so the chip number always matches the pin.
        const cityDescriptors = useMemo<CityChipDescriptor[]>(() => {
                const sorted = (trip.hotels || [])
                        .map((h, originalIdx) => ({ h, originalIdx }))
                        .sort((a, b) => {
                                const ta = a.h.checkInDate ? new Date(a.h.checkInDate).getTime() : Number.MAX_SAFE_INTEGER - a.originalIdx;
                                const tb = b.h.checkInDate ? new Date(b.h.checkInDate).getTime() : Number.MAX_SAFE_INTEGER - b.originalIdx;
                                return ta - tb;
                        });

                const byKey = new Map<string, CityChipDescriptor>();
                sorted.forEach((entry, chronoIdx) => {
                        const num = chronoIdx + 1;
                        const cityRaw = cleanCityName(extractRobustCity(entry.h.address || '', entry.h.name || '', trip)) || entry.h.city || '';
                        if (!cityRaw) return;
                        // Drop province / country names (e.g. "Thailand", "Chon Buri")
                        // and use aggressive normalization so "Bangkok" / "בנגקוק"
                        // and "Ko Chang" / "Koh Chang" / "קו צ'אנג" collapse to one chip.
                        if (isProvinceOrCountryName(cityRaw)) return;
                        const key = normalizeCityForChip(cityRaw) || cityKey(cityRaw);
                        if (!key) return;
                        const display = displayCityName(cityRaw, 'he');
                        const existing = byKey.get(key);
                        if (existing) {
                                existing.nums.push(num);
                                existing.hotelCount = (existing.hotelCount || 0) + 1;
                        } else {
                                byKey.set(key, { name: display, nums: [num], hotelCount: 1 });
                        }
                });

                return Array.from(byKey.values());
        }, [trip]);

        const handleItemsResolved = useCallback((items: ResolvedItem[]) => {
                resolvedItemsRef.current = items;
        }, []);
        const missingPoints = useMemo(
                () => getMissingDataPoints(trip, {
                        aiRestaurants: prefs.aiRestaurants,
                        aiAttractions: prefs.aiAttractions,
                        myLists: prefs.myLists,
                }),
                [trip, prefs.aiRestaurants, prefs.aiAttractions, prefs.myLists],
        );

        const counts = useMemo(() => ({
                hotels: (trip.hotels || []).length,
                myLists:
                        (trip.restaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0) +
                        (trip.attractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
                aiRestaurants: (trip.aiRestaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0),
                aiAttractions: (trip.aiAttractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
        }), [trip]);

        const totalRestaurants =
                (trip.restaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0) +
                counts.aiRestaurants;
        const totalAttractions =
                (trip.attractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0) +
                counts.aiAttractions;

        // --- Handlers ---

        const handleMissingClick = () => {
                setMissingSheetOpen(true);
                setMobilePanelOpen(false);
        };

        // Click contract — every click ZOOMS, no toggle:
        //   • 'all' chip                  → setView('all'); UnifiedMapView refits whole trip
        //   • Any city chip               → setView(city); UnifiedMapView's dedicated city
        //                                   flyTo effect fits that city's hotels (or the
        //                                   geocoded centroid if hotels haven't resolved yet)
        //   • Same chip within 1.5 s      → step through that city's hotels (next one)
        //
        // Camera is owned by UnifiedMapView's dedicated city flyTo effect.
        // Earlier we ALSO dispatched setFlyTo({bounds}) here — that raced the
        // dedicated effect, sometimes the centroid fly won and produced the
        // "had to click twice" symptom. Single source of truth now.
        const handleCityPick = (cityName: string | 'all') => {
                const now = Date.now();

                if (cityName === 'all') {
                        setView({ city: 'all' });
                        lastChipClickRef.current = null;
                        return;
                }

                // Same chip tapped twice within 1.5 s while already focused → step through its hotels.
                // This branch DOES drive the camera directly because it's a more specific intent
                // (zoom to ONE hotel) than the dedicated city flyTo effect knows how to provide.
                const last = lastChipClickRef.current;
                if (
                        view.city === cityName &&
                        last?.city === cityName &&
                        now - last.ts < 1500
                ) {
                        const targetKey = cityKey(cityName);
                        const cityHotels = resolvedItemsRef.current
                                .filter(i => i.type === 'hotel' && cityKey(i.city || '') === targetKey);
                        if (cityHotels.length > 0) {
                                const nextIdx = (last.idx + 1) % cityHotels.length;
                                const h = cityHotels[nextIdx];
                                setFlyTo({ lat: h.lat, lng: h.lng, zoom: 16, kind: 'reveal' });
                                lastChipClickRef.current = { city: cityName, ts: now, idx: nextIdx };
                                return;
                        }
                }

                // Different city OR same city after the 1.5 s window — let
                // UnifiedMapView's dedicated city flyTo effect handle the camera.
                setView({ city: cityName });
                lastChipClickRef.current = { city: cityName, ts: now, idx: -1 };
        };

        const handleLocate = useCallback(() => {
                if (!navigator.geolocation) return;
                setLocateState('loading');
                navigator.geolocation.getCurrentPosition(
                        pos => {
                                setLocateState('idle');
                                setFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 15, kind: 'gps' });
                        },
                        () => {
                                setLocateState('error');
                                setTimeout(() => setLocateState('idle'), 3000);
                        },
                        { timeout: 8000, maximumAge: 60_000 },
                );
        }, []);

        // Close shortcuts popover on outside click.
        useEffect(() => {
                if (!shortcutsOpen) return;
                const handler = (e: MouseEvent) => {
                        if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node))
                                setShortcutsOpen(false);
                };
                document.addEventListener('mousedown', handler);
                return () => document.removeEventListener('mousedown', handler);
        }, [shortcutsOpen]);

        // --- Keyboard shortcuts ---
        useEffect(() => {
                const onKey = (e: KeyboardEvent) => {
                        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
                        switch (e.key) {
                                case 'Escape':
                                        setMissingSheetOpen(false);
                                        setMobilePanelOpen(false);
                                        setShortcutsOpen(false);
                                        break;
                                case '?':
                                        setShortcutsOpen(p => !p);
                                        break;
                                case 'l':
                                case 'L':
                                        if (isMobile) setMobilePanelOpen(p => !p);
                                        break;
                        }
                };
                window.addEventListener('keydown', onKey);
                return () => window.removeEventListener('keydown', onKey);
        }, [isMobile]);

        return (
                <div className="flex w-full h-[calc(100vh-7rem)] overflow-hidden" dir="ltr">

                        {/* ── Map area ──────────────────────────────────── */}
                        <div className="flex-1 relative overflow-hidden" dir="rtl">

                                {/* Top floating bar */}
                                <div className="absolute top-3 right-3 left-3 z-[1000] flex flex-col gap-2 pointer-events-none">
                                        <div className="flex items-center gap-2 justify-end">
                                                {/* City chip strip removed — was causing duplicate
                                                    Bangkok / Ko Chang variants. City filtering lives
                                                    on the food / attractions pages where it's clean. */}

                                                {/* Mobile layers button */}
                                                {isMobile && (
                                                        <button
                                                                onClick={() => setMobilePanelOpen(true)}
                                                                className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/80 w-10 h-10 flex items-center justify-center pointer-events-auto flex-shrink-0"
                                                                aria-label="פתח פנל שכבות"
                                                        >
                                                                <Layers className="w-4 h-4 text-slate-700" />
                                                                {missingPoints.length > 0 && (
                                                                        <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                                                                                {missingPoints.length}
                                                                        </span>
                                                                )}
                                                        </button>
                                                )}
                                        </div>
                                </div>

                                {/* Map — deferred mount so the page chrome paints first */}
                                {mapMounted ? (
                                        <UnifiedMapView
                                                trip={trip}
                                                title={title}
                                                height="100%"
                                                layers={prefs}
                                                tileTheme={prefs.theme}
                                                compactView={view.city === 'all'}
                                                embedded
                                                activeCity={view.city === 'all' ? null : view.city}
                                                walkingCircles={prefs.walkingCircles}
                                                heatmap={prefs.heatmap}
                                                flyTo={flyTo}
                                                onItemsResolved={handleItemsResolved}
                                                onUpdateTrip={onUpdateTrip}
                                        />
                                ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
                                                <div className="relative w-16 h-16">
                                                        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                                                        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-600 animate-pulse">טוען מפה...</p>
                                                <p className="text-xs text-slate-400">מאתחל מסלולים, מלונות ומקומות</p>
                                        </div>
                                )}

                                {/* Bottom row */}
                                <div className="absolute bottom-4 left-3 right-3 z-[1000] flex items-end justify-center pointer-events-none">
                                        <div className="flex items-center gap-2 pointer-events-auto">
                                                <TripStatsBar
                                                        days={1}
                                                        hotels={counts.hotels}
                                                        restaurants={totalRestaurants}
                                                        attractions={totalAttractions}
                                                        missing={missingPoints.length}
                                                        onMissingClick={handleMissingClick}
                                                />

                                                {/* GPS locate */}
                                                <button
                                                        onClick={handleLocate}
                                                        disabled={locateState === 'loading'}
                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border transition-all flex-shrink-0 ${locateState === 'error' ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-700 hover:bg-white'}`}
                                                        aria-label="מצא אותי"
                                                        title="מצא אותי"
                                                >
                                                        {locateState === 'error'
                                                                ? <LocateOff className="w-4 h-4" />
                                                                : <LocateFixed className={`w-4 h-4 ${locateState === 'loading' ? 'animate-pulse text-indigo-500' : ''}`} />
                                                        }
                                                </button>

                                                {/* Keyboard shortcuts hint (desktop only) */}
                                                {!isMobile && (
                                                        <div className="relative" ref={shortcutsRef}>
                                                                <button
                                                                        onClick={() => setShortcutsOpen(p => !p)}
                                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border transition-all flex-shrink-0 ${shortcutsOpen ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-500 hover:text-slate-700 hover:bg-white'}`}
                                                                        aria-label="קיצורי מקלדת"
                                                                        title="קיצורי מקלדת (?)"
                                                                >
                                                                        <Keyboard className="w-4 h-4" />
                                                                </button>
                                                                {shortcutsOpen && (
                                                                        <div
                                                                                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 p-3 w-44"
                                                                                dir="rtl"
                                                                        >
                                                                                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 px-1">קיצורי מקלדת</div>
                                                                                <div className="space-y-1.5">
                                                                                        {SHORTCUTS.map(s => (
                                                                                                <div key={s.key} className="flex items-center justify-between gap-3 px-1">
                                                                                                        <span className="text-xs font-bold text-slate-700">{s.desc}</span>
                                                                                                        <kbd className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                                                                                {s.key}
                                                                                                        </kbd>
                                                                                                </div>
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                {/* Mobile layers bottom-sheet */}
                                {isMobile && mobilePanelOpen && (
                                        <div
                                                className="absolute inset-0 z-[1100] bg-slate-900/40 backdrop-blur-sm"
                                                onClick={() => setMobilePanelOpen(false)}
                                                role="dialog"
                                                aria-modal="true"
                                                aria-label="פנל שכבות"
                                        >
                                                <div
                                                        className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl"
                                                        onClick={e => e.stopPropagation()}
                                                >
                                                        <div className="flex justify-center pt-2 pb-1">
                                                                <div className="w-12 h-1 rounded-full bg-slate-300" />
                                                        </div>
                                                        <LayersPanel
                                                                prefs={prefs}
                                                                onPrefChange={patch => setPrefs(patch)}
                                                                counts={counts}
                                                                missingCount={missingPoints.length}
                                                                onMissingClick={handleMissingClick}
                                                                onClose={() => setMobilePanelOpen(false)}
                                                        />
                                                </div>
                                        </div>
                                )}

                                {/* Missing data bottom sheet */}
                                <MissingDataSheet
                                        isOpen={missingSheetOpen}
                                        onClose={() => setMissingSheetOpen(false)}
                                        points={missingPoints}
                                        onNavigate={tab => { onSwitchTab?.(tab); setMissingSheetOpen(false); }}
                                />
                        </div>

                        {/* ── Right sidebar (desktop only) ──────────────── */}
                        {!isMobile && (
                                <aside className="w-56 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto" dir="rtl">
                                        <LayersPanel
                                                prefs={prefs}
                                                onPrefChange={patch => setPrefs(patch)}
                                                counts={counts}
                                                missingCount={missingPoints.length}
                                                onMissingClick={handleMissingClick}
                                        />
                                </aside>
                        )}
                </div>
        );
};
