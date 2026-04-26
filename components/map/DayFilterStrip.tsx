/**
 * Horizontal day chip strip — appears on the unified-trip map when the
 * trip has a known date range. Selecting a day highlights that day's
 * items (hotels, restaurants, attractions, flights) on the map and
 * dims everything else.
 */

import React from 'react';
import { TripDay } from '../../utils/tripDays';

interface DayFilterStripProps {
        days: TripDay[];
        selectedDay: number | 'all';
        onSelect: (day: number | 'all') => void;
}

export const DayFilterStrip: React.FC<DayFilterStripProps> = ({ days, selectedDay, onSelect }) => {
        if (!days || days.length === 0) return null;
        return (
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/80 px-1.5 py-1.5 overflow-x-auto scrollbar-hide" dir="rtl">
                        <div className="flex items-center gap-1.5 min-w-max">
                                <button
                                        onClick={() => onSelect('all')}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${selectedDay === 'all' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                >
                                        כל הימים
                                </button>
                                {days.map(d => {
                                        const itemCount = d.hotels.length + d.restaurants.length + d.attractions.length + d.flights.length;
                                        return (
                                                <button
                                                        key={d.dayNumber}
                                                        onClick={() => onSelect(d.dayNumber)}
                                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${selectedDay === d.dayNumber ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
                                                        aria-label={`בחר ${d.label}`}
                                                >
                                                        <span>{d.label}</span>
                                                        {itemCount > 0 && (
                                                                <span className={`text-[9px] px-1 py-0.5 rounded-full font-black ${selectedDay === d.dayNumber ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {itemCount}
                                                                </span>
                                                        )}
                                                </button>
                                        );
                                })}
                        </div>
                </div>
        );
};
