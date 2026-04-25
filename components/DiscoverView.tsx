import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Ticket, Compass, Map as MapIcon } from 'lucide-react';
import { Trip } from '../types';
import { RestaurantsView } from './RestaurantsView';
import { AttractionsView } from './AttractionsView';
import { DiscoverMapView } from './DiscoverMapView';
import { getTripCities } from '../utils/geoData';

type DiscoverTab = 'food' | 'sights' | 'map';

interface DiscoverViewProps {
        trip: Trip;
        onUpdateTrip: (t: Trip) => void;
}

/**
 * Thin shell that unifies "Attractions" + "Restaurants" behind a single
 * "גילויים" tab in the main nav. It does NOT rewrite either underlying
 * view — both keep their own state, filters, and research flow. The shell
 * only adds: (a) a tab toggle, (b) a summary chip that shows how much
 * data is populated across both sides, (c) an intelligent default tab
 * based on which dataset is already populated.
 */
export const DiscoverView: React.FC<DiscoverViewProps> = ({ trip, onUpdateTrip }) => {
        const foodCategoryCount = trip.aiRestaurants?.length || 0;
        const attrCategoryCount = trip.aiAttractions?.length || 0;
        const foodItemCount = useMemo(
                () => (trip.aiRestaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0),
                [trip.aiRestaurants],
        );
        const attrItemCount = useMemo(
                () => (trip.aiAttractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
                [trip.aiAttractions],
        );
        const cityCount = useMemo(
                () => getTripCities(trip, { excludeFlightOnly: true }).length,
                [trip],
        );

        // Default tab: whichever side already has data. Food wins ties.
        const [tab, setTab] = useState<DiscoverTab>(() => {
                if (foodCategoryCount > 0 && attrCategoryCount === 0) return 'food';
                if (attrCategoryCount > 0 && foodCategoryCount === 0) return 'sights';
                return 'food';
        });

        return (
                <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4" dir="rtl">
                        {/* Header: title + tab bar. Mobile is tight — summary
                             counts move inline into the tab labels, no redundant
                             chip row. Desktop keeps the fuller chip strip. */}
                        <header className="mb-3 sm:mb-5">
                                <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                                        <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-purple-500 text-white flex items-center justify-center shadow-card shrink-0">
                                                <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                                <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">גילויים</h1>
                                                <p className="text-2xs sm:text-xs text-slate-500 leading-tight truncate">
                                                        מסעדות ואטרקציות — מחקר AI לכל עיר
                                                </p>
                                        </div>
                                        {cityCount > 0 && (
                                                <span className="hidden sm:inline-flex items-center gap-1.5 text-2xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-pill shrink-0">
                                                        {cityCount} ערים
                                                </span>
                                        )}
                                </div>

                                {/* Desktop-only rich chips */}
                                <div className="hidden sm:flex flex-wrap items-center gap-2 mb-4">
                                        <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-pill ring-1 ring-orange-100">
                                                <Utensils className="w-3 h-3" />
                                                {foodItemCount} מסעדות · {foodCategoryCount} קטגוריות
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-pill ring-1 ring-purple-100">
                                                <Ticket className="w-3 h-3" />
                                                {attrItemCount} אטרקציות · {attrCategoryCount} קטגוריות
                                        </span>
                                </div>

                                {/* Tab bar */}
                                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl" role="tablist">
                                        <button
                                                type="button"
                                                role="tab"
                                                aria-selected={tab === 'food'}
                                                onClick={() => setTab('food')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                        tab === 'food'
                                                                ? 'bg-white text-orange-600 shadow-card'
                                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                                <Utensils className="w-4 h-4" />
                                                <span>אוכל</span>
                                                {foodCategoryCount > 0 && (
                                                        <span className={`text-2xs font-black px-1.5 rounded-pill ${
                                                                tab === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'
                                                        }`}>
                                                                {foodCategoryCount}
                                                        </span>
                                                )}
                                        </button>
                                        <button
                                                type="button"
                                                role="tab"
                                                aria-selected={tab === 'sights'}
                                                onClick={() => setTab('sights')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                        tab === 'sights'
                                                                ? 'bg-white text-purple-600 shadow-card'
                                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                                <Ticket className="w-4 h-4" />
                                                <span>אטרקציות</span>
                                                {attrCategoryCount > 0 && (
                                                        <span className={`text-2xs font-black px-1.5 rounded-pill ${
                                                                tab === 'sights' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'
                                                        }`}>
                                                                {attrCategoryCount}
                                                        </span>
                                                )}
                                        </button>
                                        <button
                                                type="button"
                                                role="tab"
                                                aria-selected={tab === 'map'}
                                                onClick={() => setTab('map')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                        tab === 'map'
                                                                ? 'bg-white text-blue-600 shadow-card'
                                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                                <MapIcon className="w-4 h-4" />
                                                <span>מפה</span>
                                        </button>
                                </div>
                        </header>

                        {/* Active tab content */}
                        <AnimatePresence mode="wait">
                                <motion.div
                                        key={tab}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.18 }}
                                >
                                        {tab === 'food' ? (
                                                <RestaurantsView trip={trip} onUpdateTrip={onUpdateTrip} />
                                        ) : tab === 'sights' ? (
                                                <AttractionsView trip={trip} onUpdateTrip={onUpdateTrip} />
                                        ) : (
                                                <DiscoverMapView trip={trip} onUpdateTrip={onUpdateTrip} />
                                        )}
                                </motion.div>
                        </AnimatePresence>
                </div>
        );
};
