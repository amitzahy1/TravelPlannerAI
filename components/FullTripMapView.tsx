/**
 * FullTripMapView — the dedicated experience for the `map_full` tab.
 *
 * Wraps UnifiedMapView and adds the full trip-overview UX layer:
 *   • Top floating pill bar: trip name + share button + city focus chips
 *   • Second row: DayFilterStrip with prev/next day arrows (when date range exists)
 *   • Right-side LayersPanel (desktop) / bottom drawer (mobile)
 *   • Bottom row: TripStatsBar + GPS button + keyboard shortcuts hint
 *   • MissingDataSheet — bottom-sheet with gap list + deep-link CTAs
 *   • Empty-day overlay when the selected day has nothing scheduled
 *   • Keyboard shortcuts: Esc / L / 0–9 / ← →
 *   • Persistence: localStorage prefs + URL view state
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trip } from '../types';
import {
        ChevronLeft, ChevronRight, Keyboard, Layers,
        LocateFixed, LocateOff, Share2, CalendarX,
} from 'lucide-react';
import { UnifiedMapView } from './UnifiedMapView';
import { LayersPanel } from './map/LayersPanel';
import { DayFilterStrip } from './map/DayFilterStrip';
import { MissingDataSheet } from './map/MissingDataSheet';
import { TripStatsBar } from './map/TripStatsBar';
import { useMapPreferences } from '../hooks/useMapPreferences';
import { getTripCities } from '../utils/geoData';
import { getMissingDataPoints } from '../utils/tripGaps';
import { getTripDays, idsOnDay } from '../utils/tripDays';
import { useIsMobile } from '../hooks/useMediaQuery';

interface FullTripMapViewProps {
        trip: Trip;
        onSwitchTab?: (tab: string) => void;
        title?: string;
}

type LocateState = 'idle' | 'loading' | 'error';

const SHORTCUTS = [
        { key: '← / →', desc: 'יום הקודם / הבא' },
        { key: '0', desc: 'כל הימים' },
        { key: '1–9', desc: 'קפיצה ליום N' },
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

        const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true, lang: 'he' }), [trip]);
        const missingPoints = useMemo(() => getMissingDataPoints(trip), [trip]);
        const tripDays = useMemo(() => getTripDays(trip), [trip]);

        const dayFilterIds = useMemo(() => {
                if (view.day === 'all') return null;
                const day = tripDays[Number(view.day) - 1];
                return day ? idsOnDay(day) : null;
        }, [view.day, tripDays]);

        // Check whether the currently-selected day has anything scheduled.
        const activeDayEmpty = useMemo(() => {
                if (view.day === 'all' || tripDays.length === 0) return false;
                const day = tripDays[Number(view.day) - 1];
                if (!day) return false;
                return day.hotels.length + day.restaurants.length + day.attractions.length + day.flights.length === 0;
        }, [view.day, tripDays]);

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

        const stepDay = useCallback((delta: 1 | -1) => {
                if (view.day === 'all') {
                        if (delta === 1 && tripDays.length > 0) setView({ day: 1 });
                } else {
                        const next = Number(view.day) + delta;
                        if (next < 1) setView({ day: 'all' });
                        else if (next <= tripDays.length) setView({ day: next });
                }
        }, [view.day, tripDays.length, setView]);

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
                                case '0':
                                        setView({ day: 'all' });
                                        break;
                                case 'ArrowRight':
                                        stepDay(-1);
                                        break;
                                case 'ArrowLeft':
                                        stepDay(1);
                                        break;
                                default:
                                        if (/^[1-9]$/.test(e.key)) {
                                                const d = Number(e.key);
                                                if (d <= tripDays.length) setView({ day: d });
                                        }
                        }
                };
                window.addEventListener('keydown', onKey);
                return () => window.removeEventListener('keydown', onKey);
        }, [isMobile, stepDay, tripDays.length, setView]);

        return (
                <div className="relative w-full h-[calc(100vh-7rem)] bg-slate-50 overflow-hidden" dir="rtl">

                        {/* ── Top floating bar ─────────────────────────── */}
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

                                {/* Day filter strip + prev/next arrows */}
                                {tripDays.length > 0 && (
                                        <div className="pointer-events-auto flex items-center gap-1.5">
                                                <button
                                                        onClick={() => stepDay(-1)}
                                                        disabled={view.day === 'all'}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-slate-200/80 text-slate-600 hover:bg-white disabled:opacity-30 transition-all flex-shrink-0"
                                                        aria-label="יום קודם"
                                                >
                                                        <ChevronRight className="w-4 h-4" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                        <DayFilterStrip
                                                                days={tripDays}
                                                                selectedDay={view.day}
                                                                onSelect={day => setView({ day })}
                                                        />
                                                </div>
                                                <button
                                                        onClick={() => stepDay(1)}
                                                        disabled={view.day !== 'all' && Number(view.day) >= tripDays.length}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-slate-200/80 text-slate-600 hover:bg-white disabled:opacity-30 transition-all flex-shrink-0"
                                                        aria-label="יום הבא"
                                                >
                                                        <ChevronLeft className="w-4 h-4" />
                                                </button>
                                        </div>
                                )}
                        </div>

                        {/* ── Map ────────────────────────────────────────── */}
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
                                dayFilterIds={dayFilterIds}
                                heatmap={prefs.heatmap}
                                flyTo={flyTo}
                        />

                        {/* ── Empty day overlay ───────────────────────────── */}
                        {activeDayEmpty && (
                                <div className="absolute inset-0 z-[900] flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center" dir="rtl">
                                                <CalendarX className="w-10 h-10 text-slate-300" />
                                                <div>
                                                        <div className="text-base font-black text-slate-700">אין פריטים ביום הזה</div>
                                                        <div className="text-sm text-slate-500 mt-1">עבור לטאב המתאים והוסף מסעדות, אטרקציות או מלונות</div>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* ── Bottom row ─────────────────────────────────── */}
                        <div className="absolute bottom-4 left-3 right-3 z-[1000] flex items-end justify-center pointer-events-none">
                                <div className="flex items-center gap-2 pointer-events-auto">
                                        <TripStatsBar
                                                days={tripDays.length || 1}
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
                                                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 p-3 w-52"
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

                        {/* ── Desktop layers panel ────────────────────────── */}
                        {!isMobile && (
                                <LayersPanel
                                        prefs={prefs}
                                        onPrefChange={patch => setPrefs(patch)}
                                        counts={counts}
                                        missingCount={missingPoints.length}
                                        onMissingClick={handleMissingClick}
                                        layout="desktop"
                                />
                        )}

                        {/* ── Mobile layers bottom-sheet ──────────────────── */}
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
                                                <div className="flex justify-center pt-2">
                                                        <div className="w-12 h-1 rounded-full bg-slate-300" />
                                                </div>
                                                <LayersPanel
                                                        prefs={prefs}
                                                        onPrefChange={patch => setPrefs(patch)}
                                                        counts={counts}
                                                        missingCount={missingPoints.length}
                                                        onMissingClick={handleMissingClick}
                                                        onClose={() => setMobilePanelOpen(false)}
                                                        layout="mobile"
                                                />
                                        </div>
                                </div>
                        )}

                        {/* ── Missing data bottom sheet ───────────────────── */}
                        <MissingDataSheet
                                isOpen={missingSheetOpen}
                                onClose={() => setMissingSheetOpen(false)}
                                points={missingPoints}
                                onNavigate={tab => { onSwitchTab?.(tab); setMissingSheetOpen(false); }}
                        />
                </div>
        );
};
