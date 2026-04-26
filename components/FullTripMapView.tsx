/**
 * FullTripMapView — the dedicated experience for the `map_full` tab.
 *
 * Wraps UnifiedMapView (which handles the actual Leaflet rendering) and
 * adds the trip-overview UX layer:
 *   • Top floating pill bar with city focus chips
 *   • Second row: DayFilterStrip (only when trip has a date range)
 *   • Right-side LayersPanel (desktop) / bottom drawer (mobile)
 *   • Bottom: TripStatsBar with at-a-glance trip counts + missing-data pill
 *   • MissingDataSheet bottom-sheet listing every gap with deep-link buttons
 *   • Persistence — preferences survive in localStorage; current view
 *     (active city, zoom) survives in the URL so the link is shareable.
 */

import React, { useMemo, useState } from 'react';
import { Trip } from '../types';
import { Layers } from 'lucide-react';
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

export const FullTripMapView: React.FC<FullTripMapViewProps> = ({ trip, onSwitchTab, title }) => {
        const { prefs, setPrefs, view, setView } = useMapPreferences();
        const isMobile = useIsMobile();
        const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
        const [missingSheetOpen, setMissingSheetOpen] = useState(false);

        const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true, lang: 'he' }), [trip]);
        const missingPoints = useMemo(() => getMissingDataPoints(trip), [trip]);
        const tripDays = useMemo(() => getTripDays(trip), [trip]);

        // Build a Set of IDs for the active day so UnifiedMapView can dim
        // everything that isn't on that day. null = no filter (all days shown).
        const dayFilterIds = useMemo(() => {
                if (view.day === 'all') return null;
                const day = tripDays[Number(view.day) - 1];
                return day ? idsOnDay(day) : null;
        }, [view.day, tripDays]);

        // At-a-glance counts for TripStatsBar.
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

        const handleMissingClick = () => {
                setMissingSheetOpen(true);
                setMobilePanelOpen(false);
        };

        const handleCityFocus = (city: string) => {
                setView({ city: view.city === city ? 'all' : city });
        };

        return (
                <div className="relative w-full h-[calc(100vh-7rem)] bg-slate-50 overflow-hidden" dir="rtl">
                        {/* Top floating pill bar — trip name + city focus chips */}
                        <div className="absolute top-3 right-3 left-3 z-[1000] flex flex-col gap-2 pointer-events-none">
                                <div className="flex items-center gap-2">
                                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/80 px-4 py-2 pointer-events-auto flex-shrink-0">
                                                <h2 className="text-sm font-black text-slate-800 truncate max-w-[180px]">
                                                        {title || trip.name}
                                                </h2>
                                        </div>

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

                                        {/* Mobile: open layers drawer */}
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

                                {/* Day filter strip — only shown when the trip has a date range */}
                                {tripDays.length > 0 && (
                                        <div className="pointer-events-auto">
                                                <DayFilterStrip
                                                        days={tripDays}
                                                        selectedDay={view.day}
                                                        onSelect={day => setView({ day })}
                                                />
                                        </div>
                                )}
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
                                dayFilterIds={dayFilterIds}
                        />

                        {/* Bottom floating stats bar */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
                                <TripStatsBar
                                        days={tripDays.length || 1}
                                        hotels={counts.hotels}
                                        restaurants={totalRestaurants}
                                        attractions={totalAttractions}
                                        missing={missingPoints.length}
                                        onMissingClick={handleMissingClick}
                                />
                        </div>

                        {/* Desktop: sticky layers panel on the right (RTL = left side visually) */}
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

                        {/* Mobile: bottom-sheet layers drawer */}
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

                        {/* Missing data bottom sheet */}
                        <MissingDataSheet
                                isOpen={missingSheetOpen}
                                onClose={() => setMissingSheetOpen(false)}
                                points={missingPoints}
                                onNavigate={tab => { onSwitchTab?.(tab); setMissingSheetOpen(false); }}
                        />
                </div>
        );
};
