/**
 * Floating stats pill on the unified-trip map. Shows at-a-glance trip
 * counts (days, hotels, places, missing items). Pure presentational.
 */

import React from 'react';
import { Calendar, Building2, Utensils, Star, AlertTriangle } from 'lucide-react';

interface TripStatsBarProps {
        days: number;
        hotels: number;
        restaurants: number;
        attractions: number;
        missing: number;
        onMissingClick?: () => void;
}

export const TripStatsBar: React.FC<TripStatsBarProps> = ({
        days,
        hotels,
        restaurants,
        attractions,
        missing,
        onMissingClick,
}) => {
        return (
                <div
                        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/80 px-3 py-2 flex items-center gap-3 text-xs font-bold text-slate-700"
                        dir="rtl"
                >
                        <Stat icon={<Calendar className="w-3.5 h-3.5 text-blue-500" />} value={days} label="ימים" />
                        <Divider />
                        <Stat icon={<Building2 className="w-3.5 h-3.5 text-sky-500" />} value={hotels} label="מלונות" />
                        <Divider />
                        <Stat icon={<Utensils className="w-3.5 h-3.5 text-orange-500" />} value={restaurants} label="מסעדות" />
                        <Divider />
                        <Stat icon={<Star className="w-3.5 h-3.5 text-violet-500" />} value={attractions} label="אטרקציות" />
                        {missing > 0 && (
                                <>
                                        <Divider />
                                        <button
                                                onClick={onMissingClick}
                                                className="flex items-center gap-1 px-2 py-1 -my-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                                                aria-label={`${missing} פריטים חסרים — פתח רשימה`}
                                        >
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                <span className="font-black">{missing}</span>
                                                <span>חסרים</span>
                                        </button>
                                </>
                        )}
                </div>
        );
};

const Stat: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
        <span className="flex items-center gap-1 whitespace-nowrap">
                {icon}
                <span className="font-black">{value}</span>
                <span className="text-slate-500 hidden sm:inline">{label}</span>
        </span>
);

const Divider = () => <span className="w-px h-4 bg-slate-200 flex-shrink-0" />;
