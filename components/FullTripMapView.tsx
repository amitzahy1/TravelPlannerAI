/**
 * FullTripMapView — the dedicated experience for the `map_full` tab.
 *
 * Wraps UnifiedMapView and adds the full trip-overview UX layer:
 *   • Top floating pill bar: trip name + share button + city focus chips
 *   • Right sidebar (desktop) / bottom drawer (mobile): LayersPanel
 *   • Bottom row: TripStatsBar + GPS button + keyboard shortcuts hint
 *   • MissingDataSheet — bottom-sheet with gap list + deep-link CTAs
 *   • Keyboard shortcuts: Esc / ? / L
 *   • Persistence: localStorage prefs + URL view state
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trip } from '../types';
import { Keyboard, Layers, LocateFixed, LocateOff, Share2 } from 'lucide-react';
import { UnifiedMapView } from './UnifiedMapView';
import { LayersPanel } from './map/LayersPanel';
import { MissingDataSheet } from './map/MissingDataSheet';
import { TripStatsBar } from './map/TripStatsBar';
import { useMapPreferences } from '../hooks/useMapPreferences';
import { getTripCities } from '../utils/geoData';
import { getMissingDataPoints } from '../utils/tripGaps';
import { useIsMobile } from '../hooks/useMediaQuery';

interface FullTripMapViewProps {
        trip: Trip;
        onSwitchTab?: (tab: string) => void;
        title?: string;
}

type LocateState = 'idle' | 'loading' | 'error';

const SHORTCUTS = [
        { key: '?', desc: 'קיצורי מקלדת' },
        { key: 'L', desc: 'פנל שכבות (מובייל)' },
        { key: 'Esc', desc: 'סגור פאנלים' },
];

export const FullTripMapView: React.FC<FullTripMapViewProps> = ({ trip, onSwitchTab, title }) => {
        const { prefs, setPrefs, view, setView } = useMapPreferences();
        const isMobile = useIsMobile();
        const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
        const [missingSheetOpen, setMissingSheetOpen] = useState(false);
        const [locateState, setLocateState] = useState<LocateState>('idle');
        const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
        const [shareToast, setShareToast] = useState(false);
        const [shortcutsOpen, setShortcutsOpen] = useState(false);
        const shortcutsRef = useRef<HTMLDivElement>(null);

        const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true, lang: 'en' }), [trip]);
        const missingPoints = useMemo(() => getMissingDataPoints(trip), [trip]);

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

        const handleCityFocus = (city: string) => {
                setView({ city: view.city === city ? 'all' : city });
        };

        const handleShare = useCallback(() => {
                navigator.clipboard?.writeText(window.location.href).then(() => {
                        setShareToast(true);
                        setTimeout(() => setShareToast(false), 2000);
                });
        }, []);

        const handleLocate = useCallback(() => {
                if (!navigator.geolocation) return;
                setLocateState('loading');
                navigator.geolocation.getCurrentPosition(
                        pos => {
                                setLocateState('idle');
                                setFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 15 });
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
                                        <div className="flex items-center gap-2">

                                                {/* Trip name + share */}
                                                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/80 px-3 py-2 pointer-events-auto flex-shrink-0 flex items-center gap-2">
                                                        <h2 className="text-sm font-black text-slate-800 truncate max-w-[160px]">
                                                                {title || trip.name}
                                                        </h2>
                                                        <div className="relative">
                                                                <button
                                                                        onClick={handleShare}
                                                                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                                                                        aria-label="שתף קישור למפה"
                                                                        title="שתף קישור למפה"
                                                                >
                                                                        <Share2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                {shareToast && (
                                                                        <div className="absolute top-full mt-1.5 right-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                                                                                הקישור הועתק!
                                                                        </div>
                                                                )}
                                                        </div>
                                                </div>

                                                {/* City chips */}
                                                <div className="flex-1 overflow-x-auto scrollbar-hide pointer-events-auto">
                                                        <div className="flex items-center gap-2 min-w-max px-1">
                                                                <button
                                                                        onClick={() => setView({ city: 'all' })}
                                                                        className={`px-4 py-2 rounded-full text-xs font-black transition-all border whitespace-nowrap ${view.city === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white/95 backdrop-blur border-slate-200 text-slate-600 hover:bg-white'}`}
                                                                >
                                                                        כל הטיול
                                                                </button>
                                                                {tripCities.map(city => (
                                                                        <button
                                                                                key={city}
                                                                                onClick={() => handleCityFocus(city)}
                                                                                className={`px-4 py-2 rounded-full text-xs font-black transition-all border whitespace-nowrap ${view.city === city ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white/95 backdrop-blur border-slate-200 text-slate-600 hover:bg-white'}`}
                                                                        >
                                                                                {city}
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>

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

                                {/* Map */}
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
                                />

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
